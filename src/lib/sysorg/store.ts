'use client';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  EMPTY_LIBRARY, addProject, createOrReuse, duplicateProject, migratePersisted, openProject,
  parseLibrary, removeProject, restoreProject, type Library, type LibraryResult,
} from './projects';
import { sanitizeProject } from './io';
import {
  CODE_PREFIX, LIST_SCHEMAS, createProject, newId,
  type ListItem, type ListKey, type SectionKey, type SysorgProject, type TopicId, type UnknownMark,
} from './schema';

export const STORE_KEY = 'alexandra-sysorg-v1';
const CORRUPT_KEY = 'alexandra-sysorg-corrupt';
const LEGACY_BACKUP_KEY = 'alexandra-sysorg-backup';

// Kvóta vagy letiltott tárhely esetén jelzünk, nem veszítünk csendben adatot.
let saveFailed = false;
const saveListeners = new Set<() => void>();
function setSaveFailed(value: boolean) {
  if (saveFailed === value) return;
  saveFailed = value;
  saveListeners.forEach((listener) => listener());
}
export function useSaveFailed(): boolean {
  return useSyncExternalStore(
    (listener) => { saveListeners.add(listener); return () => { saveListeners.delete(listener); }; },
    () => saveFailed,
    () => false,
  );
}

const safeStorage: StateStorage = {
  getItem: (name) => { try { return localStorage.getItem(name); } catch { return null; } },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value); setSaveFailed(false); } catch { setSaveFailed(true); }
  },
  removeItem: (name) => { try { localStorage.removeItem(name); } catch { /* nincs tárhely */ } },
};
const noopStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

function stashCorrupt(items: unknown[]) {
  try {
    const previous = JSON.parse(localStorage.getItem(CORRUPT_KEY) ?? '[]') as unknown[];
    localStorage.setItem(CORRUPT_KEY, JSON.stringify([...previous, { savedAt: new Date().toISOString(), data: items }]));
  } catch { /* a mentés nem kritikus */ }
}

/** Az 1. verzió egyetlen biztonsági másolata a törölt elemek közé kerül. */
function takeLegacyBackup(): unknown[] {
  try {
    const raw = localStorage.getItem(LEGACY_BACKUP_KEY);
    if (!raw) return [];
    localStorage.removeItem(LEGACY_BACKUP_KEY);
    const project = (JSON.parse(raw) as { project?: unknown }).project;
    return project ? [project] : [];
  } catch { return []; }
}

interface SysorgState extends Library {
  /** Az aktív elemzés (a `projects` és `activeId` alapján számolt tükör). */
  project: SysorgProject | null;

  createProject: () => LibraryResult;
  openProject: (id: string) => void;
  duplicateProject: (id: string) => LibraryResult;
  deleteProject: (id: string) => void;
  restoreProject: (id: string) => LibraryResult;
  importProject: (project: SysorgProject) => LibraryResult;

  setSection: <K extends SectionKey>(key: K, patch: Partial<SysorgProject[K]>) => void;
  setSummary: (text: string) => void;
  addItem: <K extends ListKey>(key: K, init?: Partial<ListItem<K>>) => string;
  updateItem: <K extends ListKey>(key: K, id: string, patch: Partial<ListItem<K>>) => void;
  removeItem: (key: ListKey, id: string) => void;
  moveItem: (key: ListKey, id: string, direction: -1 | 1) => void;
  nextCode: (prefix: string) => string;
  setUnknown: (key: string, mark: UnknownMark | null) => void;
  setTopicDone: (topic: TopicId, done: boolean) => void;
  setApproval: (topic: TopicId, approval: { by: string; date: string } | null) => void;
}

const touch = (project: SysorgProject): SysorgProject => ({ ...project, updatedAt: new Date().toISOString() });
const withActive = (library: Library) => ({ ...library, project: library.projects.find((p) => p.id === library.activeId) ?? null });

export const useSysorgStore = create<SysorgState>()(persist((set, get) => {
  const library = (): Library => ({ projects: get().projects, activeId: get().activeId, trash: get().trash });
  const apply = (result: LibraryResult): LibraryResult => {
    if (result.ok) set(withActive(result.library));
    return result;
  };
  const mutate = (fn: (project: SysorgProject) => SysorgProject) =>
    set((state) => {
      if (!state.activeId) return state;
      const projects = state.projects.map((p) => (p.id === state.activeId ? touch(fn(p)) : p));
      return withActive({ projects, activeId: state.activeId, trash: state.trash });
    });

  return {
    ...EMPTY_LIBRARY,
    project: null,

    createProject: () => apply(createOrReuse(library(), createProject())),
    openProject: (id) => set(withActive(openProject(library(), id))),
    duplicateProject: (id) => apply(duplicateProject(library(), id)),
    deleteProject: (id) => set(withActive(removeProject(library(), id))),
    restoreProject: (id) => apply(restoreProject(library(), id)),
    // Az importált elemzés mindig új elemzésként kerül a listába, soha nem ír felül meglévőt.
    importProject: (project) => {
      const result = addProject(library(), project);
      if (!result.ok) return result;
      set(withActive({ ...result.library, activeId: get().activeId }));
      return result;
    },

    setSection: (key, patch) => mutate((p) => ({ ...p, [key]: { ...p[key], ...patch } })),
    setSummary: (summary) => mutate((p) => ({ ...p, summary })),

    nextCode: (prefix) => {
      const project = get().project;
      if (!project) return '';
      const value = (project.counters[prefix] ?? 0) + 1;
      mutate((p) => ({ ...p, counters: { ...p.counters, [prefix]: value } }));
      return `${prefix}-${String(value).padStart(3, '0')}`;
    },

    addItem: (key, init) => {
      const id = newId();
      const prefix = CODE_PREFIX[key];
      const code = prefix ? get().nextCode(prefix) : '';
      const item = (LIST_SCHEMAS[key] as { parse: (value: unknown) => unknown }).parse({ ...init, id, ...(prefix ? { code } : {}) });
      mutate((p) => ({ ...p, [key]: [...(p[key] as unknown[]), item] }));
      return id;
    },

    updateItem: (key, id, patch) =>
      mutate((p) => ({
        ...p,
        [key]: (p[key] as { id: string }[]).map((item) => (item.id === id ? { ...item, ...patch } : item)),
      })),

    removeItem: (key, id) =>
      mutate((p) => sanitizeProject({ ...p, [key]: (p[key] as { id: string }[]).filter((item) => item.id !== id) }).project),

    moveItem: (key, id, direction) =>
      mutate((p) => {
        const items = [...(p[key] as { id: string }[])];
        const from = items.findIndex((item) => item.id === id);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= items.length) return p;
        [items[from], items[to]] = [items[to], items[from]];
        return { ...p, [key]: items };
      }),

    setUnknown: (key, mark) =>
      mutate((p) => {
        const unknowns = { ...p.unknowns };
        if (mark) unknowns[key] = mark; else delete unknowns[key];
        return { ...p, unknowns };
      }),

    setTopicDone: (topic, done) => mutate((p) => ({ ...p, topicDone: { ...p.topicDone, [topic]: done } })),

    setApproval: (topic, approval) =>
      mutate((p) => {
        const approvals = { ...p.approvals };
        if (approval) approvals[topic] = approval; else delete approvals[topic];
        return { ...p, approvals };
      }),
  };
}, {
  name: STORE_KEY,
  version: 2,
  storage: createJSONStorage(() => (typeof window === 'undefined' ? noopStorage : safeStorage)),
  partialize: (state) => ({ projects: state.projects, activeId: state.activeId, trash: state.trash }),
  migrate: (persisted, version) => {
    const migrated = migratePersisted(persisted, version) as { trash?: unknown[] };
    return version < 2 ? { ...migrated, trash: [...takeLegacyBackup(), ...(migrated.trash ?? [])] } : migrated;
  },
  merge: (persisted, current) => {
    if (persisted == null) return current;
    const { library, corrupt } = parseLibrary(persisted);
    if (corrupt.length) stashCorrupt(corrupt);
    return { ...current, ...withActive(library) };
  },
}));
