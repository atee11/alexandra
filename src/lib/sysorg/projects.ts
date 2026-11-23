import { topicHasContent } from './analysis';
import { sanitizeProject } from './io';
import { TOPIC_IDS, newId, projectSchema, type SysorgProject } from './schema';

export const MAX_PROJECTS = 50;
export const MAX_TRASH = 5;

/** A böngészőben tárolt elemzések: aktív lista, az aktív azonosítója és a nemrég törölt (visszaállítható) elemek. */
export interface Library {
  projects: SysorgProject[];
  activeId: string | null;
  trash: SysorgProject[];
}

export const EMPTY_LIBRARY: Library = { projects: [], activeId: null, trash: [] };

export type LibraryResult = { ok: true; library: Library; id: string } | { ok: false; error: string };

export const UNTITLED = 'Névtelen kezdeményezés';

export function projectTitle(project: SysorgProject): string {
  return project.meta.title.trim() || UNTITLED;
}

/** Még semmit nem rögzítettek benne – ilyenből nem érdemes újat létrehozni. */
export function isPristine(project: SysorgProject): boolean {
  return TOPIC_IDS.every((topic) => !topicHasContent(project, topic))
    && project.summary.trim() === ''
    && Object.keys(project.unknowns).length === 0
    && !Object.values(project.topicDone).some(Boolean)
    && Object.keys(project.approvals).length === 0;
}

const limitError = `Legfeljebb ${MAX_PROJECTS} elemzés tárolható. Törölj vagy exportálj régieket.`;

export function addProject(library: Library, project: SysorgProject): LibraryResult {
  if (library.projects.length >= MAX_PROJECTS) return { ok: false, error: limitError };
  const unique = library.projects.some((p) => p.id === project.id) ? { ...project, id: newId() } : project;
  return { ok: true, id: unique.id, library: { ...library, projects: [...library.projects, unique], activeId: unique.id } };
}

/** Új elemzés; ha már van teljesen üres, azt nyitja meg, hogy ne gyűljenek a „Névtelen” projektek. */
export function createOrReuse(library: Library, fresh: SysorgProject): LibraryResult {
  const empty = library.projects.find(isPristine);
  if (empty) return { ok: true, id: empty.id, library: { ...library, activeId: empty.id } };
  return addProject(library, fresh);
}

export function openProject(library: Library, id: string): Library {
  return library.projects.some((p) => p.id === id) ? { ...library, activeId: id } : library;
}

export function duplicateProject(library: Library, id: string, now = new Date()): LibraryResult {
  const source = library.projects.find((p) => p.id === id);
  if (!source) return { ok: false, error: 'Az elemzés nem található.' };
  const stamp = now.toISOString();
  return addProject(library, {
    ...structuredClone(source),
    id: newId(),
    createdAt: stamp,
    updatedAt: stamp,
    approvals: {},
    meta: { ...source.meta, title: `${projectTitle(source)} (másolat)`.slice(0, 200) },
  });
}

export function removeProject(library: Library, id: string): Library {
  const target = library.projects.find((p) => p.id === id);
  if (!target) return library;
  return {
    projects: library.projects.filter((p) => p.id !== id),
    activeId: library.activeId === id ? null : library.activeId,
    trash: [target, ...library.trash.filter((p) => p.id !== id)].slice(0, MAX_TRASH),
  };
}

export function restoreProject(library: Library, id: string): LibraryResult {
  const target = library.trash.find((p) => p.id === id);
  if (!target) return { ok: false, error: 'A törölt elemzés már nem áll rendelkezésre.' };
  return addProject({ ...library, trash: library.trash.filter((p) => p.id !== id) }, target);
}

function parseProjects(items: unknown): { good: SysorgProject[]; bad: unknown[] } {
  const good: SysorgProject[] = [];
  const bad: unknown[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(items) ? items : []) {
    const parsed = projectSchema.safeParse(item);
    if (!parsed.success) { bad.push(item); continue; }
    const project = sanitizeProject(parsed.data).project;
    good.push(seen.has(project.id) ? { ...project, id: newId() } : project);
    seen.add(good[good.length - 1].id);
  }
  return { good, bad };
}

/** A tárolt állapot ellenőrzése; a sérült elemek külön kerülnek vissza, hogy ne vesszenek el csendben. */
export function parseLibrary(raw: unknown): { library: Library; corrupt: unknown[] } {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const projects = parseProjects(source.projects);
  const trash = parseProjects(source.trash);
  const activeId = typeof source.activeId === 'string' && projects.good.some((p) => p.id === source.activeId)
    ? source.activeId : null;
  return {
    library: { projects: projects.good.slice(0, MAX_PROJECTS), activeId, trash: trash.good.slice(0, MAX_TRASH) },
    corrupt: [...projects.bad, ...trash.bad],
  };
}

/** 1. verzió (egyetlen `project`) → 2. verzió (projektlista). */
export function migratePersisted(state: unknown, version: number): unknown {
  if (version >= 2) return state;
  const old = (state as { project?: unknown } | null)?.project;
  const id = old && typeof old === 'object' ? (old as { id?: unknown }).id : null;
  return { projects: old ? [old] : [], activeId: typeof id === 'string' ? id : null, trash: [] };
}
