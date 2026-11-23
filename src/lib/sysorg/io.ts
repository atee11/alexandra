import {
  END_TARGET, SECTION_KEYS, SYSORG_FORMAT, SYSORG_VERSION, envelopeSchema, projectSchema,
  type SysorgProject,
} from './schema';

export const MAX_IMPORT_BYTES = 5_000_000;

/** Eltávolítja a már nem létező elemekre mutató hivatkozásokat. */
export function sanitizeProject(project: SysorgProject): { project: SysorgProject; removed: number } {
  let removed = 0;
  const idsOf = (items: { id: string }[]) => new Set(items.map((item) => item.id));
  const actors = idsOf(project.stakeholders);
  const measures = idsOf(project.measures);
  const rules = idsOf(project.rules);
  const data = idsOf(project.dataObjects);
  const asIs = idsOf(project.asIs);
  const processes = new Set([...asIs, ...idsOf(project.toBe)]);

  const one = (id: string, valid: Set<string>) => {
    if (id && !valid.has(id)) { removed++; return ''; }
    return id;
  };
  const many = (ids: string[], valid: Set<string>) => {
    const kept = ids.filter((id) => valid.has(id));
    removed += ids.length - kept.length;
    return kept;
  };

  const cleanProcess = (process: SysorgProject['asIs'][number]) => {
    const steps = new Set([...idsOf(process.steps), END_TARGET]);
    const states = idsOf(process.states);
    return {
      ...process,
      relatedAsIsId: one(process.relatedAsIsId, asIs),
      steps: process.steps.map((step) => ({
        ...step,
        actorId: one(step.actorId, actors),
        branches: step.branches.map((branch) => ({ ...branch, targetId: one(branch.targetId, steps) })),
      })),
      transitions: process.transitions.map((t) => ({
        ...t, fromId: one(t.fromId, states), toId: one(t.toId, states), actorId: one(t.actorId, actors),
      })),
    };
  };

  const permissions = project.permissions.filter((row) => {
    const dangling = (row.actorId && !actors.has(row.actorId)) || (row.dataId && !data.has(row.dataId));
    if (dangling) removed++;
    return !dangling;
  });

  const cleaned: SysorgProject = {
    ...project,
    asIs: project.asIs.map(cleanProcess),
    toBe: project.toBe.map(cleanProcess),
    functions: project.functions.map((fn) => ({
      ...fn,
      actorId: one(fn.actorId, actors),
      measureIds: many(fn.measureIds, measures),
      processIds: many(fn.processIds, processes),
      ruleIds: many(fn.ruleIds, rules),
      dataIds: many(fn.dataIds, data),
    })),
    dataObjects: project.dataObjects.map((obj) => ({
      ...obj, relations: obj.relations.map((rel) => ({ ...rel, targetId: one(rel.targetId, data) })),
    })),
    integrations: project.integrations.map((item) => ({ ...item, dataIds: many(item.dataIds, data) })),
    permissions,
  };

  const live = collectIds(cleaned);
  const sections = new Set<string>(SECTION_KEYS);
  const unknowns = Object.fromEntries(Object.entries(cleaned.unknowns).filter(([key]) => {
    const owner = key.split('.')[0];
    return sections.has(owner) || live.has(owner);
  }));
  removed += Object.keys(cleaned.unknowns).length - Object.keys(unknowns).length;

  return { project: { ...cleaned, unknowns }, removed };
}

function collectIds(project: SysorgProject): Set<string> {
  const ids = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === 'object') {
      const id = (value as { id?: unknown }).id;
      if (typeof id === 'string') ids.add(id);
      Object.values(value).forEach(walk);
    }
  };
  const { unknowns: _unknowns, ...rest } = project;
  void _unknowns;
  walk(rest);
  return ids;
}

export function serializeProject(project: SysorgProject, now = new Date()): string {
  return JSON.stringify({
    format: SYSORG_FORMAT,
    version: SYSORG_VERSION,
    exportedAt: now.toISOString(),
    project,
  }, null, 2);
}

export type ImportResult =
  | { ok: true; project: SysorgProject; removedReferences: number }
  | { ok: false; error: string };

export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'A fájl túl nagy (legfeljebb 5 MB engedélyezett).' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'A fájl nem érvényes JSON.' };
  }
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) return { ok: false, error: 'Ez nem Alexandra rendszerszervezési export.' };
  if (envelope.data.version > SYSORG_VERSION) {
    return { ok: false, error: `A fájl újabb formátumverziót (${envelope.data.version}) használ, mint amit ez az alkalmazás ismer (${SYSORG_VERSION}).` };
  }
  const parsed = projectSchema.safeParse(envelope.data.project);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? ` (${first.path.join(' › ')})` : '';
    return { ok: false, error: `A projektadat hibás${where}: ${first?.message ?? 'ismeretlen hiba'}.` };
  }
  const { project, removed } = sanitizeProject(parsed.data);
  return { ok: true, project, removedReferences: removed };
}

export function fileSlug(title: string, fallback = 'rendszerszervezes'): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
