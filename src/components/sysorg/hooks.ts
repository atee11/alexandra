'use client';
import { useSysorgStore } from '@/lib/sysorg/store';
import type { ListItem, ListKey, SysorgProject } from '@/lib/sysorg/schema';

export function useListActions<K extends ListKey>(key: K) {
  const store = useSysorgStore();
  return {
    add: (init?: Partial<ListItem<K>>) => store.addItem(key, init),
    update: (id: string, patch: Partial<ListItem<K>>) => store.updateItem(key, id, patch),
    remove: (id: string) => store.removeItem(key, id),
    move: (id: string, direction: -1 | 1) => store.moveItem(key, id, direction),
  };
}

export const actorOptions = (p: SysorgProject) =>
  p.stakeholders.map((s) => ({ id: s.id, label: `${s.code} ${s.name || 'névtelen'}`.trim() }));
export const dataOptions = (p: SysorgProject) =>
  p.dataObjects.map((d) => ({ id: d.id, label: `${d.code} ${d.name || 'névtelen'}`.trim() }));
export const ruleOptions = (p: SysorgProject) =>
  p.rules.map((r) => ({ id: r.id, label: `${r.code} ${r.name || 'névtelen'}`.trim() }));
export const measureOptions = (p: SysorgProject) =>
  p.measures.map((m) => ({ id: m.id, label: `${m.code} ${m.label || 'névtelen'}`.trim() }));
export const processOptions = (p: SysorgProject) =>
  [...p.asIs, ...p.toBe].map((x) => ({ id: x.id, label: `${x.code} ${x.name || 'névtelen'}`.trim() }));

export function actorNameOf(p: SysorgProject) {
  const map = new Map(p.stakeholders.map((s) => [s.id, s.name]));
  return (id: string) => map.get(id) ?? '';
}
