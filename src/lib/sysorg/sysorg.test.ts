import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyze, readiness, traceability } from './analysis';
import { buildFlow, layoutFlow, mermaidLabel, renderMermaidFlow, renderSvg, unreachableSteps } from './diagram';
import { buildOpenItemsCsv, buildRequirementsCsv, buildSpecMarkdown, csvCell } from './exports';
import { fileSlug, parseImport, sanitizeProject, serializeProject } from './io';
import {
  MAX_PROJECTS, MAX_TRASH, addProject, createOrReuse, duplicateProject, isPristine, migratePersisted,
  parseLibrary, removeProject, restoreProject, type Library,
} from './projects';
import { END_TARGET, createProject, newId, projectSchema, type Process, type SysorgProject } from './schema';

function sampleProject(): SysorgProject {
  const actorA = newId(), actorB = newId(), kpi = newId(), data = newId(), rule = newId();
  const s1 = newId(), s2 = newId(), s3 = newId(), s4 = newId(), toBeId = newId();
  const process = {
    id: toBeId, code: 'TOBE-001', name: 'Igénylés', trigger: 'Új igény', rejectionHandling: 'Visszaküldés',
    steps: [
      { id: s1, kind: 'task', actorId: actorA, text: 'Igény beadása', system: 'Portál' },
      { id: s2, kind: 'decision', actorId: actorB, text: 'Jóváhagyható?', branches: [
        { id: newId(), label: 'Nem', targetId: s1 }, { id: newId(), label: 'Igen', targetId: '' },
      ] },
      { id: s3, kind: 'task', actorId: actorB, text: 'Megrendelés', endsProcess: true },
      { id: s4, kind: 'task', actorId: actorB, text: 'Soha nem érhető el' },
    ],
  };
  return projectSchema.parse({
    ...createProject(),
    meta: { title: 'Beszerzés', sponsor: 'Kovács', decisionMaker: 'Nagy' },
    problem: { current: 'Lassú', desiredOutcome: 'Gyors' },
    measures: [{ id: kpi, code: 'KPI-001', label: 'Átfutás', target: '2 nap' }],
    scopeItems: [{ id: newId(), code: 'SCP-001', text: 'Igénylés', status: 'in' }],
    stakeholders: [
      { id: actorA, code: 'STK-001', name: 'Igénylő', goal: 'Gyors igénylés', isApprover: false },
      { id: actorB, code: 'STK-002', name: 'Vezető', isApprover: true },
    ],
    toBe: [process],
    rules: [{ id: rule, code: 'BR-001', name: 'Limit', condition: '> 100 000 Ft', outcome: 'Vezetői jóváhagyás' }],
    dataObjects: [{ id: data, code: 'DAT-001', name: 'Igénylés', sensitivity: 'none' }],
    functions: [{
      id: newId(), code: 'FUN-001', name: 'Jóváhagyás', actorId: actorB, priority: 'must',
      measureIds: [kpi], processIds: [toBeId], ruleIds: [rule], dataIds: [data],
      acceptance: [{ id: newId(), code: 'AC-001', text: 'Jóváhagyás 5 percen belül látszik' }],
    }],
  });
}

test('a projekt export-import körben változatlan marad', () => {
  const project = sampleProject();
  const result = parseImport(serializeProject(project));
  assert.ok(result.ok);
  if (result.ok) {
    assert.deepEqual(result.project, project);
    assert.equal(result.removedReferences, 0);
  }
});

test('az import érthető hibával utasítja el a hibás fájlokat', () => {
  const valid = JSON.parse(serializeProject(sampleProject()));
  const cases: [string, string, RegExp][] = [
    ['nem JSON', '{nem json', /nem érvényes JSON/],
    ['idegen formátum', JSON.stringify({ format: 'masik', version: 1, project: {} }), /nem Alexandra/],
    ['újabb verzió', JSON.stringify({ ...valid, version: 99 }), /újabb formátumverziót/],
    ['rossz típus', JSON.stringify({ ...valid, project: { ...valid.project, functions: [{ id: 'x', priority: 'nagyon' }] } }), /A projektadat hibás/],
    ['ismétlődő azonosító', JSON.stringify({ ...valid, project: { ...valid.project, measures: [{ id: 'dup' }, { id: 'dup' }] } }), /Ismétlődő azonosító/],
    ['túl nagy', 'x'.repeat(5_000_001), /túl nagy/],
  ];
  for (const [name, text, message] of cases) {
    const result = parseImport(text);
    assert.equal(result.ok, false, name);
    if (!result.ok) assert.match(result.error, message, name);
  }
});

test('veszélyes kulcsok az importban elutasítva', () => {
  const valid = JSON.parse(serializeProject(sampleProject()));
  const text = JSON.stringify({ ...valid, project: { ...valid.project, unknowns: { x: { state: 'unknown' } } } })
    .replace('"x"', '"__proto__"');
  const result = parseImport(text);
  assert.equal(result.ok, false);
  assert.equal(({} as Record<string, unknown>).state, undefined);
});

test('a hiányos importadat alapértékekkel kiegészül, a feleslegest eldobjuk', () => {
  const minimal = JSON.stringify({ format: 'alexandra.sysorg', version: 1, project: { id: 'p1', createdAt: 'a', updatedAt: 'b', evil: '<script>' } });
  const result = parseImport(minimal);
  assert.ok(result.ok);
  if (result.ok) {
    assert.deepEqual(result.project.functions, []);
    assert.equal('evil' in result.project, false);
  }
});

test('a megszűnt elemekre mutató hivatkozások törlődnek', () => {
  const project = sampleProject();
  const broken = {
    ...project,
    stakeholders: project.stakeholders.slice(1),
    dataObjects: [],
    permissions: [{ id: newId(), actorId: project.stakeholders[0].id, dataId: project.dataObjects[0].id, operations: ['read' as const], scope: 'own' as const, note: '' }],
    unknowns: { [`${project.stakeholders[0].id}.goal`]: { state: 'unknown' as const, reason: '', label: 'x', topic: 'erintettek' as const } },
  };
  const { project: clean, removed } = sanitizeProject(broken);
  assert.equal(clean.permissions.length, 0);
  assert.equal(clean.functions[0].dataIds.length, 0);
  assert.equal(clean.toBe[0].steps[0].actorId, '');
  assert.deepEqual(clean.unknowns, {});
  assert.ok(removed >= 4);
});

test('CSV: képletinjekció elleni védelem, idézőjelek, BOM és elfogadási sorok', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+1'), `"'+1"`);
  assert.equal(csvCell('szöveg; pontosvesszővel'), '"szöveg; pontosvesszővel"');
  const csv = buildRequirementsCsv(sampleProject());
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"FUN-001";"Funkció";"Jóváhagyás".*"AC-001";"Jóváhagyás 5 percen belül látszik"/);
  assert.match(csv, /"BR-001";"Üzleti szabály"/);
});

test('a nyitott tételek exportja tartalmazza az ismeretlen mezőket', () => {
  const project = { ...sampleProject(), unknowns: { 'meta.area': { state: 'unknown' as const, reason: 'Pénzügy tudja', label: 'Kerete › Terület', topic: 'keret' as const } } };
  const csv = buildOpenItemsCsv(project);
  assert.match(csv, /"Ismeretlen mező";"";"0\. A vizsgálat kerete";"Kerete › Terület".*"Pénzügy tudja"/);
});

test('folyamatgráf: hurok, vég és el nem érhető lépés', () => {
  const process = sampleProject().toBe[0];
  const { edges } = buildFlow(process);
  const [s1, s2, s3] = process.steps;
  assert.ok(edges.some((e) => e.from === s2.id && e.to === s1.id && e.label === 'Nem'), 'visszalépő ág');
  assert.ok(edges.some((e) => e.from === s2.id && e.to === s3.id && e.label === 'Igen'), 'üres cél = következő lépés');
  assert.ok(edges.some((e) => e.from === s3.id && e.to === 'end'), 'záró lépés a végre mutat');
  assert.deepEqual(unreachableSteps(process).map((s) => s.text), ['Soha nem érhető el']);
});

test('az SVG és a Mermaid kimenet nem enged ki felhasználói jelölést', () => {
  const base = sampleProject();
  const evil: Process = {
    ...base.toBe[0],
    name: '"><script>alert(1)</script>',
    steps: [{ ...base.toBe[0].steps[0], text: '<img src=x onerror=alert(1)> & "idézet" [x] {y} (z) | `k`', system: '</text><script>' }],
  };
  const svg = renderSvg(evil, () => '<b>Szereplő</b>', 'TO-BE');
  assert.doesNotMatch(svg, /<script|<img|<b>/);
  assert.match(svg, /&lt;img/);
  const mermaid = renderMermaidFlow(evil, () => 'A "B"');
  const labels = mermaid.split('\n').filter((line) => line.startsWith('    n'));
  assert.ok(labels.length > 0);
  for (const line of labels) assert.doesNotMatch(line.replace(/^\s*n\d+[[({]+"|"[\])}]+$/g, ''), /["<>[\]{}()|`]/);
  assert.equal(mermaidLabel('a"b#c'), 'a#quot;b#35;c');
});

test('az elrendezés minden élt kirajzol, és hurok esetén sem ad NaN-t', () => {
  const layout = layoutFlow(sampleProject().toBe[0], (id) => id);
  assert.ok(layout.paths.length >= 4);
  assert.doesNotMatch(JSON.stringify(layout), /NaN|Infinity|null/);
  assert.ok(layout.width > 0 && layout.height > 0);
  const empty = layoutFlow({ ...sampleProject().toBe[0], steps: [] }, (id) => id);
  assert.equal(empty.nodes.length, 2);
});

test('az elemzés jelzi a hiányokat, de az ismeretlen jelölés megválaszoltnak számít', () => {
  const empty = createProject();
  const blockers = analyze(empty).filter((i) => i.severity === 'blocker').map((i) => i.id);
  for (const id of ['problem.current', 'measures.none', 'scope.none', 'stk.none', 'tobe.none', 'fn.none']) assert.ok(blockers.includes(id), id);
  assert.equal(readiness(empty).isDraft, true);

  const marked = { ...empty, unknowns: { 'problem.current': { state: 'unknown' as const, reason: '', label: 'x', topic: 'uzleti-cel' as const } } };
  assert.ok(!analyze(marked).some((i) => i.id === 'problem.current'));

  const project = sampleProject();
  const ids = analyze(project).map((i) => i.id);
  assert.ok(ids.some((id) => id.startsWith('step.unreachable:')));
  assert.ok(!ids.some((id) => id.startsWith('fn.acceptance:')));
  const noAcceptance = { ...project, functions: [{ ...project.functions[0], acceptance: [] }] };
  assert.ok(analyze(noAcceptance).some((i) => i.severity === 'blocker' && i.id.startsWith('fn.acceptance:')));
});

test('a tervezet jelölés csak teljes jóváhagyás és blokkoló hiányok nélkül tűnik el', () => {
  const project = sampleProject();
  const approvals = Object.fromEntries(
    ['keret', 'uzleti-cel', 'hatokor', 'erintettek', 'as-is', 'to-be', 'funkciok', 'szabalyok', 'adatok', 'jogosultsagok', 'integracio', 'minoseg']
      .map((id) => [id, { by: 'Kovács', date: '2026-01-01' }]),
  );
  const approved = { ...project, approvals };
  const ready = readiness(approved);
  assert.equal(ready.approved, ready.approvableTopics);
  assert.equal(ready.isDraft, ready.blockers > 0);
  assert.equal(readiness(project).isDraft, true);
});

test('a specifikáció nem talál ki tartalmat, és védi a táblázatot', () => {
  const project = sampleProject();
  project.stakeholders[0].goal = 'a | b\nsor';
  const md = buildSpecMarkdown(project, new Date('2026-05-01T00:00:00Z'));
  assert.match(md, /TERVEZET/);
  assert.match(md, /a \\\| b<br>sor/);
  assert.match(md, /_Nincs megadva_/);
  assert.match(md, /```mermaid\nflowchart TD/);
  assert.match(md, /Generálva: 2026-05-01/);
  assert.doesNotMatch(md, /undefined|NaN|\[object/);
  const withUnknown = { ...project, unknowns: { 'meta.area': { state: 'na' as const, reason: 'Nincs', label: 'x', topic: 'keret' as const } } };
  assert.match(buildSpecMarkdown(withUnknown), /_Nem alkalmazható – Nincs_/);
});

test('a nyomonkövethetőség a kódokat köti össze', () => {
  const [row] = traceability(sampleProject());
  assert.deepEqual(row.goals, ['KPI-001']);
  assert.deepEqual(row.processes, ['TOBE-001']);
  assert.deepEqual(row.rules, ['BR-001']);
  assert.deepEqual(row.data, ['DAT-001']);
  assert.equal(row.acceptance, 1);
});

test('fájlnév ékezetek és speciális karakterek nélkül', () => {
  assert.equal(fileSlug('Árvíztűrő tükörfúrógép / 2026!'), 'arvizturo-tukorfurogep-2026');
  assert.equal(fileSlug('???'), 'rendszerszervezes');
  assert.equal(END_TARGET, '__end');
});

const empty = (): Library => ({ projects: [], activeId: null, trash: [] });

test('új elemzés: üres projekt újrahasznosul, tartalmas mellé új készül', () => {
  const first = createOrReuse(empty(), createProject());
  assert.ok(first.ok && first.library.projects.length === 1);
  if (!first.ok) return;
  assert.ok(isPristine(first.library.projects[0]));
  const again = createOrReuse(first.library, createProject());
  assert.ok(again.ok && again.library.projects.length === 1 && again.id === first.id, 'üres projektet nyit meg');

  const filled = { ...first.library, projects: [sampleProject()] };
  assert.equal(isPristine(filled.projects[0]), false);
  const second = createOrReuse(filled, createProject());
  assert.ok(second.ok && second.library.projects.length === 2 && second.library.activeId === second.id);
});

test('a tárolható elemzések száma korlátos, az azonosító-ütközés feloldódik', () => {
  const project = sampleProject();
  const full: Library = { ...empty(), projects: Array.from({ length: MAX_PROJECTS }, () => ({ ...sampleProject(), id: newId() })) };
  const result = addProject(full, project);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Legfeljebb 50/);

  const lib: Library = { ...empty(), projects: [project], activeId: project.id };
  const added = addProject(lib, project);
  assert.ok(added.ok && added.library.projects.length === 2 && added.id !== project.id);
  if (added.ok) assert.equal(added.library.projects[0].id, project.id, 'az eredeti érintetlen');
});

test('duplikálás: független másolat, jóváhagyás nélkül', () => {
  const source = { ...sampleProject(), approvals: { keret: { by: 'Kovács', date: '2026-01-01' } } };
  const lib: Library = { ...empty(), projects: [source], activeId: source.id };
  const result = duplicateProject(lib, source.id);
  assert.ok(result.ok);
  if (!result.ok) return;
  const copy = result.library.projects.find((p) => p.id === result.id);
  assert.ok(copy);
  assert.equal(copy.meta.title, 'Beszerzés (másolat)');
  assert.deepEqual(copy.approvals, {});
  assert.equal(copy.stakeholders[0].name, source.stakeholders[0].name);
  copy.stakeholders[0].name = 'Módosítva';
  assert.notEqual(source.stakeholders[0].name, 'Módosítva', 'mély másolat');
  assert.equal(duplicateProject(lib, 'nincs').ok, false);
});

test('törlés a kukába kerül, visszaállítható, a kuka korlátos', () => {
  let lib: Library = { ...empty(), projects: [], activeId: null };
  const items = Array.from({ length: MAX_TRASH + 2 }, (_, i) => ({ ...sampleProject(), id: newId(), meta: { ...sampleProject().meta, title: `P${i}` } }));
  lib = { projects: items, activeId: items[0].id, trash: [] };
  for (const item of items) lib = removeProject(lib, item.id);
  assert.equal(lib.projects.length, 0);
  assert.equal(lib.activeId, null);
  assert.equal(lib.trash.length, MAX_TRASH);
  assert.equal(lib.trash[0].meta.title, `P${MAX_TRASH + 1}`, 'a legutóbbi elöl');

  const restored = restoreProject(lib, lib.trash[0].id);
  assert.ok(restored.ok);
  if (restored.ok) {
    assert.equal(restored.library.projects.length, 1);
    assert.equal(restored.library.trash.length, MAX_TRASH - 1);
  }
  assert.equal(restoreProject(lib, 'nincs').ok, false);
  assert.equal(removeProject(lib, 'nincs'), lib);
});

test('az 1. verziós tárolt adat átkerül a listába, a sérült elem külön marad', () => {
  const project = sampleProject();
  const migrated = migratePersisted({ project }, 1);
  const { library, corrupt } = parseLibrary(migrated);
  assert.equal(library.projects.length, 1);
  assert.equal(library.activeId, project.id);
  assert.equal(corrupt.length, 0);
  assert.equal((migratePersisted({ project: null }, 1) as Library).projects.length, 0);

  const mixed = parseLibrary({
    projects: [project, { id: 5, functions: 'rossz' }, { ...project }],
    activeId: 'nem létezik',
    trash: [{ nem: 'projekt' }],
  });
  assert.equal(mixed.library.projects.length, 2);
  assert.notEqual(mixed.library.projects[0].id, mixed.library.projects[1].id, 'ismétlődő azonosító javítva');
  assert.equal(mixed.library.activeId, null);
  assert.equal(mixed.corrupt.length, 2);
  assert.deepEqual(parseLibrary(undefined).library, empty());
});
