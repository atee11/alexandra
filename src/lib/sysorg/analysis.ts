import { unreachableSteps } from './diagram';
import { TOPIC_IDS, type Process, type SysorgProject, type TopicId } from './schema';
import { L, TOPICS, TOPIC_BY_ID } from './topics';

export type Severity = 'blocker' | 'warning' | 'info';

export interface Issue {
  id: string;
  severity: Severity;
  topic: TopicId;
  message: string;
}

const blank = (value: string) => value.trim() === '';

/** Egy mező akkor tekinthető megválaszoltnak, ha ki van töltve, vagy tudatosan ismeretlennek/nem alkalmazhatónak jelölték. */
function missing(project: SysorgProject, key: string, value: string): boolean {
  return blank(value) && !project.unknowns[key];
}

export function analyze(project: SysorgProject): Issue[] {
  const issues: Issue[] = [];
  const add = (severity: Severity, topic: TopicId, id: string, message: string) =>
    issues.push({ id, severity, topic, message });
  const actorName = (id: string) => project.stakeholders.find((s) => s.id === id)?.name || 'névtelen szereplő';
  const label = (code: string, name: string) => `${code} ${name || '(névtelen)'}`.trim();

  // 0. Keret
  if (missing(project, 'meta.title', project.meta.title)) add('warning', 'keret', 'meta.title', 'Nincs megadva a kezdeményezés neve.');
  if (missing(project, 'meta.sponsor', project.meta.sponsor)) add('warning', 'keret', 'meta.sponsor', 'Nincs megadva az üzleti megrendelő.');
  if (missing(project, 'meta.decisionMaker', project.meta.decisionMaker)) add('warning', 'keret', 'meta.decisionMaker', 'Nincs megadva a szakmai döntéshozó.');

  // 1. Cél
  if (missing(project, 'problem.current', project.problem.current)) add('blocker', 'uzleti-cel', 'problem.current', 'Nincs leírva a jelenlegi probléma.');
  if (missing(project, 'problem.desiredOutcome', project.problem.desiredOutcome)) add('blocker', 'uzleti-cel', 'problem.desiredOutcome', 'Nincs megadva az elvárt üzleti eredmény.');
  if (project.measures.length === 0) add('blocker', 'uzleti-cel', 'measures.none', 'Nincs mérhető sikerkritérium.');
  project.measures.forEach((m) => {
    if (missing(project, `${m.id}.target`, m.target)) add('warning', 'uzleti-cel', `measure.target:${m.id}`, `${label(m.code, m.label)}: nincs célérték.`);
    if (!project.functions.some((fn) => fn.measureIds.includes(m.id))) {
      add('warning', 'funkciok', `measure.unlinked:${m.id}`, `${label(m.code, m.label)}: egyetlen funkció sem támogatja.`);
    }
  });

  // 2. Hatókör
  if (!project.scopeItems.some((s) => s.status === 'in')) add('blocker', 'hatokor', 'scope.none', 'Nincs megnevezve, mi tartozik a megoldásba.');
  if (!project.scopeItems.some((s) => s.status === 'out')) add('info', 'hatokor', 'scope.noout', 'Nincs kifejezetten kizárt terület – a hatókör határa nem egyértelmű.');

  // 3. Érintettek
  if (project.stakeholders.length === 0) add('blocker', 'erintettek', 'stk.none', 'Nincs érintett vagy szereplő rögzítve.');
  else if (!project.stakeholders.some((s) => s.isApprover)) add('warning', 'erintettek', 'stk.noapprover', 'Nincs megjelölve jóváhagyó szereplő.');
  project.stakeholders.forEach((s) => {
    if (missing(project, `${s.id}.goal`, s.goal)) add('info', 'erintettek', `stk.goal:${s.id}`, `${label(s.code, s.name)}: nincs megadva a célja.`);
  });

  // 4–5. Folyamatok
  const checkProcess = (process: Process, topic: TopicId) => {
    const name = label(process.code, process.name);
    if (process.steps.length === 0) {
      add(topic === 'to-be' ? 'blocker' : 'warning', topic, `proc.steps:${process.id}`, `${name}: nincs lépés rögzítve.`);
      return;
    }
    process.steps.forEach((step, index) => {
      const where = `${name}, ${index + 1}. lépés`;
      if (blank(step.text)) add('warning', topic, `step.text:${step.id}`, `${where}: nincs megnevezve.`);
      if (!step.actorId) add('warning', topic, `step.actor:${step.id}`, `${where}: nincs felelős szereplő.`);
      if (step.kind === 'decision') {
        if (step.branches.length < 2) add('blocker', topic, `step.branches:${step.id}`, `${where}: a döntésnek legalább két ágat kell tartalmaznia.`);
        step.branches.forEach((b, i) => {
          if (blank(b.label)) add('warning', topic, `branch.label:${b.id}`, `${where}: a(z) ${i + 1}. döntési ág nincs elnevezve.`);
        });
      }
    });
    unreachableSteps(process).forEach((step) => {
      add('warning', topic, `step.unreachable:${step.id}`, `${name}: a(z) „${step.text || 'névtelen lépés'}” lépés nem érhető el az indítástól.`);
    });
  };
  if (project.asIs.length === 0 && project.meta.kind !== 'new_system') {
    add('warning', 'as-is', 'asis.none', 'Meglévő működés vizsgálatánál nincs AS-IS folyamat rögzítve.');
  }
  project.asIs.forEach((p) => checkProcess(p, 'as-is'));
  if (project.toBe.length === 0) add('blocker', 'to-be', 'tobe.none', 'Nincs TO-BE folyamat rögzítve.');
  project.toBe.forEach((p) => {
    checkProcess(p, 'to-be');
    const name = label(p.code, p.name);
    if (missing(project, `${p.id}.rejectionHandling`, p.rejectionHandling)) add('warning', 'to-be', `tobe.reject:${p.id}`, `${name}: nincs leírva elutasítás, visszaküldés vagy visszavonás kezelése.`);
    if (missing(project, `${p.id}.timeoutHandling`, p.timeoutHandling)) add('info', 'to-be', `tobe.timeout:${p.id}`, `${name}: nincs leírva a határidőtúllépés kezelése.`);
    if (p.states.length > 0 && !p.states.some((s) => s.isFinal)) add('warning', 'to-be', `tobe.final:${p.id}`, `${name}: az állapotok között nincs végállapot.`);
    p.states.forEach((s) => {
      const incident = p.transitions.some((t) => t.fromId === s.id || t.toId === s.id);
      if (!incident && p.states.length > 1) add('warning', 'to-be', `state.isolated:${s.id}`, `${name}: a(z) „${s.name || 'névtelen'}” állapothoz nem tartozik átmenet.`);
    });
  });

  // 6. Funkciók
  if (project.functions.length === 0) add('blocker', 'funkciok', 'fn.none', 'Nincs funkció vagy használati eset rögzítve.');
  const referencedRules = new Set(project.functions.flatMap((fn) => fn.ruleIds));
  project.functions.forEach((fn) => {
    const name = label(fn.code, fn.name);
    if (!fn.actorId) add('warning', 'funkciok', `fn.actor:${fn.id}`, `${name}: nincs szereplő megadva.`);
    if (fn.acceptance.length === 0) add(fn.priority === 'must' ? 'blocker' : 'warning', 'funkciok', `fn.acceptance:${fn.id}`, `${name}: nincs elfogadási feltétel.`);
    if (fn.measureIds.length === 0) add('warning', 'funkciok', `fn.goal:${fn.id}`, `${name}: nincs üzleti célhoz (sikerkritériumhoz) kapcsolva.`);
    if (fn.processIds.length === 0) add('info', 'funkciok', `fn.proc:${fn.id}`, `${name}: nincs folyamathoz kapcsolva.`);
    if (missing(project, `${fn.id}.alternatives`, fn.alternatives)) add('info', 'funkciok', `fn.alt:${fn.id}`, `${name}: nincsenek alternatív és hibás esetek.`);
  });

  // 7. Szabályok
  project.rules.forEach((rule) => {
    const name = label(rule.code, rule.name);
    if (blank(rule.condition) || blank(rule.outcome)) add('warning', 'szabalyok', `rule.incomplete:${rule.id}`, `${name}: hiányzik a feltétel vagy az eredmény.`);
    if (missing(project, `${rule.id}.source`, rule.source)) add('info', 'szabalyok', `rule.source:${rule.id}`, `${name}: nincs megadva a szabály forrása.`);
    if (missing(project, `${rule.id}.owner`, rule.owner)) add('info', 'szabalyok', `rule.owner:${rule.id}`, `${name}: nincs megadva a szabály tulajdonosa.`);
    if (rule.validFrom && rule.validTo && rule.validTo < rule.validFrom) add('warning', 'szabalyok', `rule.dates:${rule.id}`, `${name}: az érvényesség vége korábbi, mint a kezdete.`);
    if (!referencedRules.has(rule.id)) add('info', 'szabalyok', `rule.unused:${rule.id}`, `${name}: egyetlen funkció sem hivatkozik rá.`);
  });

  // 8. Adatok
  if (project.dataObjects.length === 0) add('warning', 'adatok', 'data.none', 'Nincs üzleti objektum vagy adat rögzítve.');
  project.dataObjects.forEach((obj) => {
    const name = label(obj.code, obj.name);
    if (blank(obj.definition)) add('info', 'adatok', `data.def:${obj.id}`, `${name}: nincs meghatározva a jelentése.`);
    if (obj.sensitivity !== 'none' && missing(project, `${obj.id}.retention`, obj.retention)) add('warning', 'adatok', `data.retention:${obj.id}`, `${name}: személyes adat megőrzési szabály nélkül.`);
    if (obj.sensitivity === 'none' && obj.attributes.some((a) => a.personal)) add('warning', 'adatok', `data.sensitivity:${obj.id}`, `${name}: személyes adatot tartalmazó mező van, de az objektum nincs személyesnek jelölve.`);
    if (missing(project, `${obj.id}.source`, obj.source)) add('info', 'adatok', `data.source:${obj.id}`, `${name}: nincs megadva a hiteles adatforrás.`);
  });

  // 9. Jogosultságok
  if (project.stakeholders.length > 0 && project.dataObjects.length > 0 && project.permissions.length === 0) {
    add('warning', 'jogosultsagok', 'perm.none', 'Vannak szereplők és adatok, de nincs jogosultság rögzítve.');
  }
  const seenPairs = new Set<string>();
  project.permissions.forEach((row) => {
    const pair = `${row.actorId}|${row.dataId}`;
    const rowName = `${actorName(row.actorId)} – ${project.dataObjects.find((d) => d.id === row.dataId)?.name || 'nincs adat'}`;
    if (!row.actorId || !row.dataId) add('warning', 'jogosultsagok', `perm.incomplete:${row.id}`, 'Hiányos jogosultsági sor (nincs szereplő vagy adat).');
    else if (seenPairs.has(pair)) add('warning', 'jogosultsagok', `perm.dup:${row.id}`, `${rowName}: ugyanarra a párosra több sor van – ellentmondás lehetséges.`);
    seenPairs.add(pair);
    if (row.operations.length === 0) add('warning', 'jogosultsagok', `perm.ops:${row.id}`, `${rowName}: nincs művelet kiválasztva.`);
  });
  const hasPersonal = project.dataObjects.some((d) => d.sensitivity !== 'none' || d.attributes.some((a) => a.personal));
  if (hasPersonal && missing(project, 'permissionsExtra.auditEvents', project.permissionsExtra.auditEvents)) {
    add('warning', 'jogosultsagok', 'perm.audit', 'Személyes adat van, de nincs megadva, milyen eseményeket kell naplózni.');
  }
  if (project.permissions.some((p) => p.operations.includes('approve')) && !project.permissionsExtra.selfApprovalForbidden) {
    add('info', 'jogosultsagok', 'perm.selfapprove', 'A saját művelet jóváhagyása engedélyezett – ellenőrizendő a szabály.');
  }

  // 10. Integráció, migráció
  project.integrations.forEach((item) => {
    const name = label(item.code, item.system);
    if (item.status === 'tbd') add('info', 'integracio', `int.tbd:${item.id}`, `${name}: a technikai részletek egyeztetésre várnak.`);
    if (missing(project, `${item.id}.errorHandling`, item.errorHandling)) add('warning', 'integracio', `int.error:${item.id}`, `${name}: nincs leírva a hibakezelés.`);
    if (missing(project, `${item.id}.owner`, item.owner)) add('info', 'integracio', `int.owner:${item.id}`, `${name}: nincs felelős megnevezve.`);
  });
  if (project.migration.needed === 'unknown' && !project.unknowns['migration.needed']) add('warning', 'integracio', 'mig.unknown', 'Nem tisztázott, kell-e adatot áthozni.');
  if (project.migration.needed === 'yes' && missing(project, 'migration.verification', project.migration.verification)) {
    add('warning', 'integracio', 'mig.verify', 'Adatáthozatal szükséges, de nincs megadva az ellenőrzés módja.');
  }

  // 11. Minőség
  if (project.nfrs.length === 0) add('warning', 'minoseg', 'nfr.none', 'Nincs minőségi követelmény rögzítve.');
  project.nfrs.forEach((n) => {
    if (missing(project, `${n.id}.measure`, n.measure)) add('warning', 'minoseg', `nfr.measure:${n.id}`, `${label(n.code, L.nfrCategory[n.category])}: nincs mérhető érték.`);
  });
  if (missing(project, 'quality.acceptanceBy', project.quality.acceptanceBy)) add('warning', 'minoseg', 'quality.acceptanceBy', 'Nincs megadva, ki fogadja el az eredményt.');

  // 12. Felülvizsgálat
  project.questions.filter((q) => q.status === 'open' && q.blocking).forEach((q) => {
    add('blocker', 'felulvizsgalat', `q.blocking:${q.id}`, `${q.code}: blokkoló nyitott kérdés – ${q.text || '(nincs szöveg)'}`);
  });
  const openQuestions = project.questions.filter((q) => q.status === 'open' && !q.blocking).length;
  if (openQuestions) add('info', 'felulvizsgalat', 'q.open', `${openQuestions} nem blokkoló nyitott kérdés van.`);
  const unconfirmed = project.assumptions.filter((a) => a.status === 'unconfirmed').length;
  if (unconfirmed) add('warning', 'felulvizsgalat', 'asm.unconfirmed', `${unconfirmed} feltételezés még nincs megerősítve.`);
  const unknownCount = Object.keys(project.unknowns).length;
  if (unknownCount) add('info', 'felulvizsgalat', 'unknowns', `${unknownCount} mező „nem ismert” vagy „nem alkalmazható” jelöléssel szerepel.`);

  return issues;
}

export interface Readiness {
  blockers: number;
  warnings: number;
  infos: number;
  approved: number;
  approvableTopics: number;
  isDraft: boolean;
}

export function readiness(project: SysorgProject, issues = analyze(project)): Readiness {
  const approvable = TOPIC_IDS.filter((id) => id !== 'felulvizsgalat');
  const approved = approvable.filter((id) => project.approvals[id]?.by.trim()).length;
  const count = (severity: Severity) => issues.filter((i) => i.severity === severity).length;
  const blockers = count('blocker');
  return {
    blockers, warnings: count('warning'), infos: count('info'),
    approved, approvableTopics: approvable.length,
    isDraft: blockers > 0 || approved < approvable.length,
  };
}

export type TopicStatus = 'empty' | 'started' | 'done';

export function topicHasContent(project: SysorgProject, topic: TopicId): boolean {
  const any = (...values: string[]) => values.some((value) => value.trim() !== '');
  switch (topic) {
    case 'keret': return any(project.meta.title, project.meta.area, project.meta.sponsor, project.meta.decisionMaker, project.meta.subjectExpert, project.meta.existingSystems, project.meta.sources);
    case 'uzleti-cel': return any(...Object.values(project.problem)) || project.measures.length > 0;
    case 'hatokor': return project.scopeItems.length > 0 || project.constraints.length > 0 || any(project.scope.dependencies);
    case 'erintettek': return project.stakeholders.length > 0;
    case 'as-is': return project.asIs.length > 0;
    case 'to-be': return project.toBe.length > 0;
    case 'funkciok': return project.functions.length > 0;
    case 'szabalyok': return project.rules.length > 0;
    case 'adatok': return project.dataObjects.length > 0;
    case 'jogosultsagok': return project.permissions.length > 0 || any(project.permissionsExtra.stateDependent, project.permissionsExtra.delegation, project.permissionsExtra.auditEvents, project.permissionsExtra.auditAccess);
    case 'integracio': return project.integrations.length > 0 || project.migration.needed !== 'unknown' || any(project.migration.source);
    case 'minoseg': return project.nfrs.length > 0 || any(...Object.values(project.quality));
    case 'felulvizsgalat': return project.questions.length > 0 || project.assumptions.length > 0 || project.decisions.length > 0;
  }
}

export function topicStatus(project: SysorgProject, topic: TopicId): TopicStatus {
  if (project.topicDone[topic]) return 'done';
  return topicHasContent(project, topic) ? 'started' : 'empty';
}

export function overallProgress(project: SysorgProject): { done: number; total: number } {
  const topics = TOPICS.filter((t) => t.id !== 'felulvizsgalat');
  return { done: topics.filter((t) => project.topicDone[t.id]).length, total: topics.length };
}

export interface TraceRow {
  goals: string[];
  processes: string[];
  functionCode: string;
  functionName: string;
  rules: string[];
  data: string[];
  acceptance: number;
}

/** Üzleti cél → folyamat → követelmény → szabály/adat → elfogadási feltétel nyomonkövethetőség. */
export function traceability(project: SysorgProject): TraceRow[] {
  const code = <T extends { id: string; code: string }>(items: T[], ids: string[]) =>
    ids.map((id) => items.find((item) => item.id === id)?.code).filter((c): c is string => !!c);
  const processes = [...project.asIs, ...project.toBe];
  return project.functions.map((fn) => ({
    goals: code(project.measures, fn.measureIds),
    processes: code(processes, fn.processIds),
    functionCode: fn.code,
    functionName: fn.name,
    rules: code(project.rules, fn.ruleIds),
    data: code(project.dataObjects, fn.dataIds),
    acceptance: fn.acceptance.length,
  }));
}

export function topicLabel(id: TopicId): string {
  return `${TOPIC_BY_ID[id].number}. ${TOPIC_BY_ID[id].label}`;
}
