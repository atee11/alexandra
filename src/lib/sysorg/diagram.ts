import { END_TARGET, type Process, type Step } from './schema';

export type FlowKind = 'start' | 'end' | 'task' | 'decision';

export interface FlowNode {
  id: string;
  kind: FlowKind;
  actorId: string;
  text: string;
  system: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  label: string;
}

const START = 'start';
const END = 'end';

/** A lépéssorrendből és a döntési ágakból felépített folyamatgráf. */
export function buildFlow(process: Process): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const steps = process.steps;
  const first = steps[0];
  const nodes: FlowNode[] = [
    { id: START, kind: 'start', actorId: first?.actorId ?? '', text: process.trigger.trim() || 'Indítás', system: '' },
    ...steps.map<FlowNode>((step) => ({
      id: step.id, kind: step.kind, actorId: step.actorId, text: step.text.trim() || '(nincs megnevezve)', system: step.system.trim(),
    })),
  ];
  const edges: FlowEdge[] = [];
  const nextOf = (index: number) => steps[index + 1]?.id ?? END;
  edges.push({ from: START, to: first?.id ?? END, label: '' });

  steps.forEach((step, index) => {
    if (step.kind === 'decision') {
      step.branches.forEach((branch) => {
        const to = branch.targetId === END_TARGET ? END : branch.targetId || nextOf(index);
        edges.push({ from: step.id, to, label: branch.label.trim() });
      });
    } else {
      edges.push({ from: step.id, to: step.endsProcess ? END : nextOf(index), label: '' });
    }
  });

  if (edges.some((edge) => edge.to === END)) {
    const last = steps[steps.length - 1];
    nodes.push({ id: END, kind: 'end', actorId: last?.actorId ?? '', text: 'Vége', system: '' });
  }
  return { nodes, edges };
}

/** Az indítási pontból el nem érhető lépések. */
export function unreachableSteps(process: Process): Step[] {
  const { edges } = buildFlow(process);
  const reached = new Set<string>([START]);
  const queue = [START];
  while (queue.length) {
    const current = queue.pop() as string;
    for (const edge of edges) {
      if (edge.from === current && !reached.has(edge.to)) {
        reached.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return process.steps.filter((step) => !reached.has(step.id));
}

// ── Elrendezés ────────────────────────────────────────────────────────────

const LANE_W = 240;
const NODE_W = 190;
const HEADER_H = 44;
const PAD = 16;
const ROW_GAP = 36;
const LINE_H = 15;
const WRAP = 27;
const MAX_LINES = 4;

export interface PlacedNode extends FlowNode {
  x: number; y: number; w: number; h: number; lines: string[]; systemLine: string;
}
export interface PlacedPath { d: string; label: string; lx: number; ly: number }
export interface Layout {
  width: number; height: number;
  lanes: { id: string; name: string; x: number }[];
  nodes: PlacedNode[];
  paths: PlacedPath[];
}

export function wrapText(text: string, width = WRAP, maxLines = MAX_LINES): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const raw of words) {
    let word = raw;
    while (word.length > width) {
      if (line) { lines.push(line); line = ''; }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!line) line = word;
    else if ((line + ' ' + word).length <= width) line += ' ' + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].slice(0, width - 1).trimEnd() + '…';
    return cut;
  }
  return lines.length ? lines : [''];
}

export function layoutFlow(process: Process, actorName: (id: string) => string): Layout {
  const { nodes, edges } = buildFlow(process);
  const laneIds: string[] = [];
  for (const node of nodes) if (!laneIds.includes(node.actorId)) laneIds.push(node.actorId);
  const lanes = laneIds.map((id, index) => ({
    id, name: id ? actorName(id) || 'Ismeretlen szereplő' : 'Nincs szereplő megadva', x: PAD + index * LANE_W,
  }));

  let y = HEADER_H + PAD;
  const placed: PlacedNode[] = nodes.map((node) => {
    const lines = wrapText(node.text);
    const systemLine = node.system ? wrapText(`⚙ ${node.system}`, WRAP, 1)[0] : '';
    const h = Math.max(34, lines.length * LINE_H + 18 + (systemLine ? LINE_H : 0));
    const lane = lanes[laneIds.indexOf(node.actorId)];
    const item: PlacedNode = { ...node, x: lane.x + (LANE_W - NODE_W) / 2, y, w: NODE_W, h, lines, systemLine };
    y += h + ROW_GAP;
    return item;
  });

  const byId = new Map(placed.map((node, index) => [node.id, { node, index }]));
  const sideCount = new Map<number, number>();
  const paths: PlacedPath[] = [];
  for (const edge of edges) {
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (!source || !target) continue;
    const a = source.node;
    const b = target.node;
    if (target.index === source.index + 1) {
      const sx = a.x + a.w / 2, sy = a.y + a.h, tx = b.x + b.w / 2, ty = b.y;
      const mid = sy + ROW_GAP / 2;
      paths.push({ d: `M${sx} ${sy} V${mid} H${tx} V${ty}`, label: edge.label, lx: sx + 6, ly: sy + 13 });
    } else {
      const laneIndex = Math.max(laneIds.indexOf(a.actorId), laneIds.indexOf(b.actorId));
      const used = sideCount.get(laneIndex) ?? 0;
      sideCount.set(laneIndex, used + 1);
      const routeX = lanes[laneIndex].x + LANE_W - 11 - (used % 3) * 6;
      const sy = a.y + a.h / 2, ty = b.y + b.h / 2;
      const sx = a.x + a.w, tx = b.x + b.w;
      paths.push({ d: `M${sx} ${sy} H${routeX} V${ty} H${tx}`, label: edge.label, lx: sx + 4, ly: sy - 5 });
    }
  }

  const labelRight = Math.max(0, ...paths.filter((p) => p.label).map((p) => p.lx + Math.min(p.label.length, 18) * 6.5));
  const baseWidth = PAD * 2 + lanes.length * LANE_W - PAD;
  return { width: Math.ceil(Math.max(baseWidth, labelRight + PAD)), height: y - ROW_GAP + PAD, lanes, nodes: placed, paths };
}

// ── SVG ───────────────────────────────────────────────────────────────────

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

const LANE_COLORS = ['#EEF4FF', '#F5F0FF', '#ECFDF5', '#FFF7ED', '#F1F5F9'];

export function renderSvg(process: Process, actorName: (id: string) => string, heading: string): string {
  const layout = layoutFlow(process, actorName);
  const title = `${heading}: ${process.name || 'névtelen folyamat'}`;
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" role="img" font-family="Arial, Helvetica, sans-serif" font-size="12">`);
  out.push(`<title>${escapeXml(title)}</title>`);
  out.push('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#64748B"/></marker></defs>');
  out.push(`<rect width="${layout.width}" height="${layout.height}" fill="#FFFFFF"/>`);
  layout.lanes.forEach((lane, index) => {
    out.push(`<rect x="${lane.x}" y="8" width="${LANE_W - 8}" height="${layout.height - 16}" rx="12" fill="${LANE_COLORS[index % LANE_COLORS.length]}"/>`);
    out.push(`<text x="${lane.x + (LANE_W - 8) / 2}" y="30" text-anchor="middle" font-weight="700" fill="#1E293B">${escapeXml(wrapText(lane.name, 30, 1)[0])}</text>`);
  });
  layout.paths.forEach((path) => {
    out.push(`<path d="${path.d}" fill="none" stroke="#64748B" stroke-width="1.5" marker-end="url(#arrow)"/>`);
    if (path.label) out.push(`<text x="${path.lx}" y="${path.ly}" font-size="11" fill="#475569">${escapeXml(wrapText(path.label, 18, 1)[0])}</text>`);
  });
  layout.nodes.forEach((node) => {
    const { x, y, w, h } = node;
    if (node.kind === 'decision') {
      const c = 14;
      out.push(`<polygon points="${x + c},${y} ${x + w - c},${y} ${x + w},${y + h / 2} ${x + w - c},${y + h} ${x + c},${y + h} ${x},${y + h / 2}" fill="#FFF7E6" stroke="#D97706" stroke-width="1.5"/>`);
    } else if (node.kind === 'task') {
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#FFFFFF" stroke="#3865FC" stroke-width="1.5"/>`);
    } else {
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${node.kind === 'start' ? '#E8F0FF' : '#F1F5F9'}" stroke="#684BFC" stroke-width="1.5"/>`);
    }
    const textHeight = node.lines.length * LINE_H + (node.systemLine ? LINE_H : 0);
    let ty = y + (h - textHeight) / 2 + 11;
    node.lines.forEach((line) => {
      out.push(`<text x="${x + w / 2}" y="${ty}" text-anchor="middle" fill="#0F172A">${escapeXml(line)}</text>`);
      ty += LINE_H;
    });
    if (node.systemLine) out.push(`<text x="${x + w / 2}" y="${ty}" text-anchor="middle" font-size="10.5" fill="#64748B">${escapeXml(node.systemLine)}</text>`);
  });
  out.push('</svg>');
  return out.join('\n');
}

// ── Mermaid ───────────────────────────────────────────────────────────────

export function mermaidLabel(value: string, max = 120): string {
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, max)
    .replace(/#/g, '#35;').replace(/"/g, '#quot;').replace(/</g, '#lt;').replace(/>/g, '#gt;')
    .replace(/[[\]{}()|`\\]/g, (char) => `#${char.charCodeAt(0)};`);
  return clean || '-';
}

export function renderMermaidFlow(process: Process, actorName: (id: string) => string): string {
  const { nodes, edges } = buildFlow(process);
  const ids = new Map(nodes.map((node, index) => [node.id, `n${index}`]));
  const lanes: string[] = [];
  nodes.forEach((node) => { if (!lanes.includes(node.actorId)) lanes.push(node.actorId); });
  const lines = ['flowchart TD'];
  lanes.forEach((laneId, laneIndex) => {
    lines.push(`  subgraph L${laneIndex}["${mermaidLabel(laneId ? actorName(laneId) || 'Ismeretlen szereplő' : 'Nincs szereplő megadva', 60)}"]`);
    nodes.filter((node) => node.actorId === laneId).forEach((node) => {
      const id = ids.get(node.id);
      const label = mermaidLabel(node.text);
      lines.push(
        node.kind === 'decision' ? `    ${id}{"${label}"}`
          : node.kind === 'task' ? `    ${id}["${label}"]`
            : `    ${id}(["${label}"])`,
      );
    });
    lines.push('  end');
  });
  edges.forEach((edge) => {
    const from = ids.get(edge.from), to = ids.get(edge.to);
    if (!from || !to) return;
    lines.push(edge.label ? `  ${from} -->|"${mermaidLabel(edge.label, 40)}"| ${to}` : `  ${from} --> ${to}`);
  });
  return lines.join('\n');
}

export function renderMermaidStates(process: Process): string | null {
  if (process.states.length === 0) return null;
  const ids = new Map(process.states.map((state, index) => [state.id, `S${index + 1}`]));
  const lines = ['stateDiagram-v2'];
  process.states.forEach((state) => lines.push(`  state "${mermaidLabel(state.name || 'Névtelen állapot', 60)}" as ${ids.get(state.id)}`));
  lines.push(`  [*] --> ${ids.get(process.states[0].id)}`);
  process.transitions.forEach((t) => {
    const from = ids.get(t.fromId), to = ids.get(t.toId);
    if (from && to) lines.push(`  ${from} --> ${to}${t.condition.trim() ? `: ${mermaidLabel(t.condition, 60)}` : ''}`);
  });
  process.states.filter((state) => state.isFinal).forEach((state) => lines.push(`  ${ids.get(state.id)} --> [*]`));
  return lines.join('\n');
}
