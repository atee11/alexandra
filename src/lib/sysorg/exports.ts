import { analyze, readiness, topicLabel, traceability } from './analysis';
import { renderMermaidFlow, renderMermaidStates } from './diagram';
import type { Process, SysorgProject, TopicId } from './schema';
import { TOPICS, TENTATIVE_NOTE, L } from './topics';

const EMPTY = '_Nincs megadva_';

function inline(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function cell(value: string): string {
  const text = value.replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim();
  return text || '–';
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return '';
  return [
    `| ${headers.map(cell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');
}

function lookups(project: SysorgProject) {
  const actors = new Map(project.stakeholders.map((s) => [s.id, s.name || s.code]));
  const named = <T extends { id: string; code: string }>(items: T[]) => new Map(items.map((i) => [i.id, i.code]));
  return {
    actor: (id: string) => (id ? actors.get(id) ?? '' : ''),
    measures: named(project.measures),
    processes: named([...project.asIs, ...project.toBe]),
    rules: named(project.rules),
    data: named(project.dataObjects),
  };
}

/** Mezőérték, vagy az „ismeretlen / nem alkalmazható” jelölés, vagy hiányjelzés. */
function field(project: SysorgProject, key: string, value: string): string {
  if (value.trim()) return value.trim();
  const mark = project.unknowns[key];
  if (mark) return `_${mark.state === 'na' ? 'Nem alkalmazható' : 'Nem ismert'}${mark.reason ? ` – ${inline(mark.reason)}` : ''}_`;
  return EMPTY;
}

export function draftSummary(project: SysorgProject): string {
  const parts: string[] = [];
  const { meta, problem } = project;
  const head = [meta.title && `Kezdeményezés: ${meta.title}.`, meta.area && `Érintett terület: ${meta.area}.`].filter(Boolean).join(' ');
  if (head) parts.push(head);
  const lines = [
    problem.current && `Jelenlegi probléma: ${problem.current}`,
    problem.affected && `Érintettek: ${problem.affected}`,
    problem.consequence && `Következmény változtatás nélkül: ${problem.consequence}`,
    problem.desiredOutcome && `Elvárt eredmény: ${problem.desiredOutcome}`,
  ].filter(Boolean);
  if (lines.length) parts.push(lines.join('\n'));
  if (project.measures.length) {
    parts.push(['Sikerkritériumok:', ...project.measures.map((m) =>
      `- ${m.code} ${m.label}${m.baseline ? ` (jelenleg: ${m.baseline})` : ''}${m.target ? ` – cél: ${m.target}` : ''}`)].join('\n'));
  }
  const scope = (status: 'in' | 'out' | 'later') => project.scopeItems.filter((s) => s.status === status).map((s) => s.text).filter(Boolean);
  const scopeLines = [
    scope('in').length && `Hatókörben: ${scope('in').join('; ')}.`,
    scope('out').length && `Hatókörön kívül: ${scope('out').join('; ')}.`,
    scope('later').length && `Később: ${scope('later').join('; ')}.`,
  ].filter(Boolean);
  if (scopeLines.length) parts.push(scopeLines.join('\n'));
  parts.push(`Rögzített elemek: ${project.stakeholders.length} szereplő, ${project.toBe.length} TO-BE folyamat, ${project.functions.length} funkció, ${project.rules.length} üzleti szabály, ${project.dataObjects.length} adatobjektum.`);
  return parts.join('\n\n');
}

function processSection(project: SysorgProject, process: Process, heading: string, isToBe: boolean): string {
  const { actor } = lookups(project);
  const f = (key: string, value: string) => field(project, `${process.id}.${key}`, value);
  const out: string[] = [`### ${heading} ${inline(process.code)} – ${inline(process.name) || '(névtelen)'}`];
  const facts: string[][] = [
    ['Indító esemény', f('trigger', process.trigger)],
    ['Bemenet', f('input', process.input)],
    ['Elvárt eredmény', f('output', process.output)],
    ['Gyakoriság', f('frequency', process.frequency)],
    ['Mennyiség', f('volume', process.volume)],
    ['Ügytípusok', f('caseTypes', process.caseTypes)],
    ['Párhuzamos munkavégzés', f('parallelWork', process.parallelWork)],
    ['Kivételes esetek', f('exceptions', process.exceptions)],
  ];
  if (!isToBe) facts.push(['Problémás pontok', f('painPoints', process.painPoints)]);
  else {
    const related = project.asIs.find((p) => p.id === process.relatedAsIsId);
    facts.push(
      ['Kapcsolódó AS-IS folyamat', related ? `${related.code} ${related.name}` : '–'],
      ['Megmarad', f('keep', process.keep)], ['Változik', f('change', process.change)], ['Megszűnik', f('remove', process.remove)],
      ['Automatizálás', f('automation', process.automation)], ['Emberi döntés / ellenőrzés', f('humanChecks', process.humanChecks)],
      ['Elutasítás, visszaküldés, visszavonás', f('rejectionHandling', process.rejectionHandling)],
      ['Határidőtúllépés', f('timeoutHandling', process.timeoutHandling)], ['Értesítések', f('notifications', process.notifications)],
    );
  }
  out.push(table(['Jellemző', 'Tartalom'], facts));
  if (process.steps.length) {
    const rows = process.steps.map((step, index) => [
      String(index + 1), L.stepKind[step.kind], actor(step.actorId), step.text, step.system,
      step.kind === 'decision'
        ? step.branches.map((b) => `${inline(b.label) || '(ág)'} → ${targetName(process, b.targetId, index)}`).join('; ')
        : step.endsProcess ? 'Vége' : (process.steps[index + 1] ? String(index + 2) + '. lépés' : 'Vége'),
    ]);
    out.push(table(['#', 'Típus', 'Szereplő', 'Lépés', 'Rendszer', 'Következő'], rows));
    out.push('```mermaid\n' + renderMermaidFlow(process, actor) + '\n```');
  } else {
    out.push('_Nincs lépés rögzítve._');
  }
  const states = renderMermaidStates(process);
  if (states) out.push('**Ügyállapotok**\n\n```mermaid\n' + states + '\n```');
  return out.join('\n\n');
}

function targetName(process: Process, targetId: string, index: number): string {
  if (targetId === '__end') return 'Vége';
  if (!targetId) return process.steps[index + 1] ? `${index + 2}. lépés` : 'Vége';
  const position = process.steps.findIndex((s) => s.id === targetId);
  return position >= 0 ? `${position + 1}. lépés` : '(ismeretlen)';
}

export function buildSpecMarkdown(project: SysorgProject, now = new Date()): string {
  const lk = lookups(project);
  const issues = analyze(project);
  const ready = readiness(project, issues);
  const f = (key: string, value: string) => field(project, key, value);
  const title = inline(project.meta.title) || 'Névtelen kezdeményezés';
  const doc: string[] = [`# ${title} – követelményspecifikáció`];

  doc.push(ready.isDraft
    ? `> **${TENTATIVE_NOTE}**\n> Jóváhagyott témák: ${ready.approved}/${ready.approvableTopics}. Blokkoló hiányok: ${ready.blockers}, figyelmeztetések: ${ready.warnings}.`
    : '> Minden téma jóváhagyva, nincs blokkoló hiány.');
  doc.push(`Generálva: ${now.toISOString().slice(0, 10)} · Alexandra rendszerszervezés. A tartalom a rögzített válaszokból készült; nem tartalmaz kitalált üzleti tényt.`);

  doc.push('## 1. Vezetői összefoglaló', project.summary.trim() || '_Az összefoglaló még nincs megírva._');

  doc.push('## 2. A vizsgálat kerete', table(['Jellemző', 'Tartalom'], [
    ['Típus', L.kind[project.meta.kind]], ['Terület', f('meta.area', project.meta.area)],
    ['Üzleti megrendelő', f('meta.sponsor', project.meta.sponsor)], ['Szakmai döntéshozó', f('meta.decisionMaker', project.meta.decisionMaker)],
    ['Szakmai tapasztalatot adó személy', f('meta.subjectExpert', project.meta.subjectExpert)],
    ['Meglévő rendszerek', f('meta.existingSystems', project.meta.existingSystems)], ['Források, dokumentumok', f('meta.sources', project.meta.sources)],
  ]));

  doc.push('## 3. Üzleti probléma és cél', table(['Kérdés', 'Válasz'], [
    ['Jelenlegi probléma', f('problem.current', project.problem.current)], ['Érintettek, gyakoriság', f('problem.affected', project.problem.affected)],
    ['Konkrét eset', f('problem.example', project.problem.example)], ['Következmény változtatás nélkül', f('problem.consequence', project.problem.consequence)],
    ['Elvárt eredmény', f('problem.desiredOutcome', project.problem.desiredOutcome)],
  ]));
  if (project.measures.length) {
    doc.push('**Sikerkritériumok**', table(['Kód', 'Mutató', 'Jelenlegi érték', 'Célérték', 'Mérés módja', 'Felelős'],
      project.measures.map((m) => [m.code, m.label, m.baseline, m.target, m.method, m.owner])));
  }

  doc.push('## 4. Hatókör és rendszerhatár');
  doc.push(project.scopeItems.length
    ? table(['Kód', 'Állapot', 'Tétel', 'Indoklás'], project.scopeItems.map((s) => [s.code, L.scopeStatus[s.status], s.text, s.rationale]))
    : EMPTY);
  if (project.constraints.length) doc.push('**Korlátok**', table(['Kód', 'Fajta', 'Korlát'], project.constraints.map((c) => [c.code, L.constraintKind[c.kind], c.text])));
  doc.push(`**Függőségek:** ${f('scope.dependencies', project.scope.dependencies)}`);

  doc.push('## 5. Érintettek és felelősségek');
  doc.push(project.stakeholders.length
    ? table(['Kód', 'Szereplő', 'Fajta', 'Cél', 'Feladatok', 'Döntések', 'Felelősség', 'Jóváhagyó', 'Helyettes', 'Érdekellentét'],
      project.stakeholders.map((s) => [s.code, s.name, L.stakeholderKind[s.kind], s.goal, s.tasks, s.decisions, s.owns, s.isApprover ? 'Igen' : 'Nem', s.deputy, s.conflicts]))
    : EMPTY);

  doc.push('## 6. Folyamatok');
  doc.push(...(project.asIs.length ? project.asIs.map((p) => processSection(project, p, 'AS-IS', false)) : ['_Nincs AS-IS folyamat rögzítve._']));
  doc.push(...(project.toBe.length ? project.toBe.map((p) => processSection(project, p, 'TO-BE', true)) : ['_Nincs TO-BE folyamat rögzítve._']));

  doc.push('## 7. Funkciók és használati esetek');
  if (project.functions.length === 0) doc.push(EMPTY);
  project.functions.forEach((fn) => {
    const key = (name: string) => `${fn.id}.${name}`;
    doc.push(`### ${inline(fn.code)} – ${inline(fn.name) || '(névtelen)'}`, table(['Jellemző', 'Tartalom'], [
      ['Szereplő', lk.actor(fn.actorId)], ['Cél', f(key('goal'), fn.goal)], ['Prioritás', L.priority[fn.priority]], ['Prioritás indoka', f(key('rationale'), fn.rationale)],
      ['Üzleti cél', fn.measureIds.map((id) => lk.measures.get(id)).join(', ')], ['Folyamat', fn.processIds.map((id) => lk.processes.get(id)).join(', ')],
      ['Szabályok', fn.ruleIds.map((id) => lk.rules.get(id)).join(', ')], ['Adatok', fn.dataIds.map((id) => lk.data.get(id)).join(', ')],
      ['Előfeltétel', f(key('precondition'), fn.precondition)], ['Indító esemény', f(key('trigger'), fn.trigger)],
      ['Normál lefutás', f(key('mainFlow'), fn.mainFlow)], ['Alternatív és hibás esetek', f(key('alternatives'), fn.alternatives)],
      ['Sikeres befejezés', f(key('successEnd'), fn.successEnd)],
    ]));
    doc.push(fn.acceptance.length ? table(['Kód', 'Elfogadási feltétel'], fn.acceptance.map((a) => [a.code, a.text])) : '_Nincs elfogadási feltétel._');
  });

  doc.push('## 8. Üzleti szabályok és döntések');
  doc.push(project.rules.length
    ? table(['Kód', 'Szabály', 'Feltétel', 'Eredmény', 'Egyidejű szabályok', 'Kivétel', 'Kivétel engedélyezője', 'Forrás', 'Tulajdonos', 'Érvényes'],
      project.rules.map((r) => [r.code, r.name, r.condition, r.outcome, r.conflicts, r.exceptions, r.exceptionApprover, r.source, r.owner,
        [r.validFrom, r.validTo].filter(Boolean).join(' – ')]))
    : EMPTY);

  doc.push('## 9. Adatok és életciklusuk');
  if (project.dataObjects.length === 0) doc.push(EMPTY);
  project.dataObjects.forEach((obj) => {
    doc.push(`### ${inline(obj.code)} – ${inline(obj.name) || '(névtelen)'}`, table(['Jellemző', 'Tartalom'], [
      ['Jelentés', f(`${obj.id}.definition`, obj.definition)], ['Besorolás', L.sensitivity[obj.sensitivity]],
      ['Hiteles forrás', f(`${obj.id}.source`, obj.source)], ['Ki hozhatja létre / módosíthatja', f(`${obj.id}.creators`, obj.creators)],
      ['Megőrzés', f(`${obj.id}.retention`, obj.retention)], ['Életciklus (archiválás, törlés)', f(`${obj.id}.lifecycle`, obj.lifecycle)],
    ]));
    if (obj.attributes.length) doc.push(table(['Adat', 'Kötelező', 'Egyedi', 'Személyes', 'Ellenőrzés'],
      obj.attributes.map((a) => [a.name, a.required ? 'Igen' : 'Nem', a.unique ? 'Igen' : 'Nem', a.personal ? 'Igen' : 'Nem', a.validation])));
    if (obj.relations.length) doc.push('Kapcsolatok:\n' + obj.relations.map((r) => `- ${lk.data.get(r.targetId) ?? '(nincs megadva)'}: ${inline(r.label) || 'nincs leírva'}`).join('\n'));
  });

  doc.push('## 10. Jogosultságok és ellenőrizhetőség');
  doc.push(project.permissions.length
    ? table(['Szereplő', 'Adat', 'Műveletek', 'Hatókör', 'Megjegyzés'], project.permissions.map((p) => [
      lk.actor(p.actorId), project.dataObjects.find((d) => d.id === p.dataId)?.name ?? '', p.operations.map((o) => L.operation[o]).join(', '), L.permissionScope[p.scope], p.note]))
    : EMPTY);
  doc.push(table(['Kérdés', 'Válasz'], [
    ['Állapottól függő jogosultság', f('permissionsExtra.stateDependent', project.permissionsExtra.stateDependent)],
    ['Saját művelet jóváhagyása tiltott', project.permissionsExtra.selfApprovalForbidden ? 'Igen' : 'Nem'],
    ['Helyettesítés, visszavonás', f('permissionsExtra.delegation', project.permissionsExtra.delegation)],
    ['Naplózandó események', f('permissionsExtra.auditEvents', project.permissionsExtra.auditEvents)],
    ['Napló elérése', f('permissionsExtra.auditAccess', project.permissionsExtra.auditAccess)],
  ]));

  doc.push('## 11. Külső kapcsolatok és migráció');
  if (project.integrations.length) {
    doc.push(table(['Kód', 'Rendszer', 'Irány', 'Adatok', 'Indító', 'Gyakoriság', 'Felelős', 'Hibakezelés', 'Egyeztetés', 'Állapot'],
      project.integrations.map((i) => [i.code, i.system, L.direction[i.direction], i.dataIds.map((id) => lk.data.get(id)).join(', '), i.trigger, i.frequency, i.owner, i.errorHandling, i.reconciliation, L.integrationStatus[i.status]])));
  }
  doc.push(table(['Migráció', 'Tartalom'], [
    ['Szükséges?', L.migrationNeeded[project.migration.needed]], ['Forrás', f('migration.source', project.migration.source)],
    ['Érintett adatok', f('migration.scope', project.migration.scope)], ['Teljesség és helyesség ellenőrzése', f('migration.verification', project.migration.verification)],
  ]));

  doc.push('## 12. Minőségi és bevezetési követelmények');
  if (project.nfrs.length) doc.push(table(['Kód', 'Kategória', 'Követelmény', 'Mérhető érték'], project.nfrs.map((n) => [n.code, L.nfrCategory[n.category], n.text, n.measure])));
  const q = project.quality;
  doc.push(table(['Terület', 'Tartalom'], [
    ['Felhasználók száma', f('quality.users', q.users)], ['Terhelés', f('quality.load', q.load)], ['Rendelkezésre állás', f('quality.availability', q.availability)],
    ['Elfogadható kiesés', f('quality.acceptableDowntime', q.acceptableDowntime)], ['Elfogadható adatvesztés', f('quality.acceptableDataLoss', q.acceptableDataLoss)],
    ['Oktatás', f('quality.training', q.training)], ['Próbaüzem', f('quality.pilot', q.pilot)], ['Fokozatos bevezetés', f('quality.phasing', q.phasing)],
    ['Üzemeltető', f('quality.operator', q.operator)], ['Támogatás', f('quality.support', q.support)],
    ['Átvételt végző', f('quality.acceptanceBy', q.acceptanceBy)], ['Átvétel bizonyítéka', f('quality.acceptanceEvidence', q.acceptanceEvidence)],
  ]));

  doc.push('## 13. Nyomonkövethetőség', '_Üzleti cél → folyamat → funkció → szabály / adat → elfogadási feltétel._');
  const trace = traceability(project);
  doc.push(trace.length
    ? table(['Üzleti cél', 'Folyamat', 'Funkció', 'Szabály', 'Adat', 'Elfogadási feltételek'],
      trace.map((r) => [r.goals.join(', '), r.processes.join(', '), `${r.functionCode} ${r.functionName}`, r.rules.join(', '), r.data.join(', '), String(r.acceptance)]))
    : EMPTY);

  doc.push('## 14. Nyitott kérdések, feltételezések, döntések');
  const open = openItems(project);
  doc.push(open.length ? table(['Típus', 'Kód', 'Téma', 'Tartalom', 'Felelős', 'Határidő', 'Állapot', 'Blokkoló', 'Válasz / indoklás'],
    open.map((r) => [r.type, r.code, r.topic, r.text, r.owner, r.due, r.status, r.blocking, r.note])) : EMPTY);

  doc.push('## 15. Jóváhagyások');
  doc.push(table(['Téma', 'Jóváhagyta', 'Dátum'], TOPICS.filter((t) => t.id !== 'felulvizsgalat').map((t) => {
    const a = project.approvals[t.id];
    return [topicLabel(t.id), a?.by ?? 'Még nincs jóváhagyva', a?.date ?? ''];
  })));

  return doc.join('\n\n') + '\n';
}

export interface OpenItemRow {
  type: string; code: string; topic: string; text: string; owner: string; due: string; status: string; blocking: string; note: string;
}

export function openItems(project: SysorgProject): OpenItemRow[] {
  const topic = (id: TopicId) => topicLabel(id);
  return [
    ...project.questions.map((x) => ({
      type: 'Kérdés', code: x.code, topic: topic(x.topic), text: x.text, owner: x.owner, due: x.due,
      status: L.questionStatus[x.status], blocking: x.blocking ? 'Igen' : 'Nem', note: x.answer,
    })),
    ...project.assumptions.map((x) => ({
      type: 'Feltételezés', code: x.code, topic: '', text: x.text, owner: x.owner, due: '',
      status: L.assumptionStatus[x.status], blocking: '', note: '',
    })),
    ...project.decisions.map((x) => ({
      type: 'Döntés', code: x.code, topic: '', text: x.text, owner: x.decidedBy, due: x.date,
      status: 'Rögzítve', blocking: '', note: x.rationale,
    })),
    ...Object.values(project.unknowns).map((x) => ({
      type: 'Ismeretlen mező', code: '', topic: topic(x.topic), text: x.label, owner: '', due: '',
      status: x.state === 'na' ? 'Nem alkalmazható' : 'Nem ismert', blocking: '', note: x.reason,
    })),
  ];
}

// ── CSV ───────────────────────────────────────────────────────────────────

/** CSV-injekció ellen: képletnek látszó cellák elé aposztróf kerül. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: string[][]): string {
  // Magyar Excel pontosvesszőt vár; a BOM az ékezetek miatt kell.
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

export function buildRequirementsCsv(project: SysorgProject): string {
  const lk = lookups(project);
  const join = (ids: string[], map: Map<string, string>) => ids.map((id) => map.get(id)).filter(Boolean).join(', ');
  const rows: string[][] = [['Kód', 'Típus', 'Megnevezés', 'Leírás', 'Szereplő', 'Prioritás', 'Üzleti cél', 'Folyamat', 'Szabály', 'Adat', 'Elfogadási feltétel kódja', 'Elfogadási feltétel', 'Állapot']];
  project.functions.forEach((fn) => {
    const base = [fn.code, 'Funkció', fn.name, fn.mainFlow, lk.actor(fn.actorId), L.priority[fn.priority], join(fn.measureIds, lk.measures),
      join(fn.processIds, lk.processes), join(fn.ruleIds, lk.rules), join(fn.dataIds, lk.data)];
    if (fn.acceptance.length === 0) rows.push([...base, '', '', 'Tervezet']);
    fn.acceptance.forEach((a) => rows.push([...base, a.code, a.text, 'Tervezet']));
  });
  project.rules.forEach((r) => rows.push([r.code, 'Üzleti szabály', r.name, `Ha ${r.condition} → ${r.outcome}`, r.owner, '', '', '', '', '', '', '', 'Tervezet']));
  project.nfrs.forEach((n) => rows.push([n.code, 'Minőségi követelmény', L.nfrCategory[n.category], n.text, '', '', '', '', '', '', '', n.measure, 'Tervezet']));
  return toCsv(rows);
}

export function buildOpenItemsCsv(project: SysorgProject): string {
  return toCsv([
    ['Típus', 'Kód', 'Téma', 'Tartalom', 'Felelős / döntéshozó', 'Határidő / dátum', 'Állapot', 'Blokkoló', 'Válasz / indoklás'],
    ...openItems(project).map((r) => [r.type, r.code, r.topic, r.text, r.owner, r.due, r.status, r.blocking, r.note]),
  ]);
}
