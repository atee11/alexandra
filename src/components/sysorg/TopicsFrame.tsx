'use client';
import { useSysorgStore } from '@/lib/sysorg/store';
import { L } from '@/lib/sysorg/topics';
import type { ScopeItem } from '@/lib/sysorg/schema';
import { useListActions } from './hooks';
import { AddButton, Card, EmptyState, ItemCard, SelectField, TextField, CheckField, useProject } from './ui';

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export function KeretTopic() {
  const p = useProject();
  const setSection = useSysorgStore((s) => s.setSection);
  const set = (patch: Partial<typeof p.meta>) => setSection('meta', patch);
  return (
    <div className="space-y-6">
      <Card title="Mit vizsgálunk?" hint="Először tisztázzuk, milyen helyzetből indulunk ki, és ki felel az eredményért.">
        <SelectField label="A vizsgálat jellege" value={p.meta.kind} onChange={(kind) => set({ kind })} options={toOptions(L.kind)} />
        <TextField label="A kezdeményezés neve" required unknownKey="meta.title" value={p.meta.title} onChange={(title) => set({ title })} placeholder="pl. Beszerzési igénylések digitalizálása" />
        <TextField label="Érintett szervezeti terület" unknownKey="meta.area" value={p.meta.area} onChange={(area) => set({ area })} />
      </Card>
      <Card title="Kik felelnek?">
        <TextField label="Üzleti megrendelő" unknownKey="meta.sponsor" value={p.meta.sponsor} onChange={(sponsor) => set({ sponsor })} />
        <TextField label="Szakmai döntéshozó" unknownKey="meta.decisionMaker" value={p.meta.decisionMaker} onChange={(decisionMaker) => set({ decisionMaker })} />
        <TextField label="Ki tudja hitelesen bemutatni a jelenlegi működést?" unknownKey="meta.subjectExpert" value={p.meta.subjectExpert} onChange={(subjectExpert) => set({ subjectExpert })} />
      </Card>
      <Card title="Rendelkezésre álló anyagok">
        <TextField label="Meglévő rendszerek" multiline unknownKey="meta.existingSystems" value={p.meta.existingSystems} onChange={(existingSystems) => set({ existingSystems })} />
        <TextField label="Dokumentumok, szabályzatok, egyéb források" multiline unknownKey="meta.sources" value={p.meta.sources} onChange={(sources) => set({ sources })} />
      </Card>
    </div>
  );
}

export function UzletiCelTopic() {
  const p = useProject();
  const setSection = useSysorgStore((s) => s.setSection);
  const measures = useListActions('measures');
  const set = (patch: Partial<typeof p.problem>) => setSection('problem', patch);
  return (
    <div className="space-y-6">
      <Card title="Mi a probléma?" hint="Írd le tényszerűen, mi történik ma. A „kell egy új rendszer” nem probléma és nem cél.">
        <TextField label="Mi történik ma, ami problémát okoz?" required multiline rows={4} unknownKey="problem.current" value={p.problem.current} onChange={(current) => set({ current })} />
        <TextField label="Kit érint, milyen gyakran, milyen következménnyel?" multiline unknownKey="problem.affected" value={p.problem.affected} onChange={(affected) => set({ affected })} />
        <TextField label="Egy konkrét eset" multiline unknownKey="problem.example" value={p.problem.example} onChange={(example) => set({ example })} />
        <TextField label="Mi történik, ha nem változtatunk?" multiline unknownKey="problem.consequence" value={p.problem.consequence} onChange={(consequence) => set({ consequence })} />
      </Card>
      <Card title="Mit szeretnénk elérni?">
        <TextField label="Elvárt üzleti eredmény" required multiline unknownKey="problem.desiredOutcome" value={p.problem.desiredOutcome} onChange={(desiredOutcome) => set({ desiredOutcome })} placeholder="pl. A jóváhagyás átlagos ideje két munkanapra csökken." />
      </Card>
      <Card title="Miből látjuk, hogy sikerült?" hint="Minden mutatóhoz tartozzon jelenlegi érték, célérték és mérési mód.">
        {p.measures.length === 0 && <EmptyState>Még nincs mérhető sikerkritérium.</EmptyState>}
        {p.measures.map((m) => (
          <ItemCard key={m.id} code={m.code} title={m.label} subtitle={m.target && `Cél: ${m.target}`} onRemove={() => measures.remove(m.id)} onMove={(d) => measures.move(m.id, d)} defaultOpen={p.measures.length <= 4}>
            <TextField label="Mutató" value={m.label} onChange={(label) => measures.update(m.id, { label })} placeholder="pl. Jóváhagyás átlagos átfutási ideje" />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Jelenlegi érték" unknownKey={`${m.id}.baseline`} context={m.code} value={m.baseline} onChange={(baseline) => measures.update(m.id, { baseline })} />
              <TextField label="Célérték" unknownKey={`${m.id}.target`} context={m.code} value={m.target} onChange={(target) => measures.update(m.id, { target })} />
            </div>
            <TextField label="Hogyan és mikor mérjük?" unknownKey={`${m.id}.method`} context={m.code} value={m.method} onChange={(method) => measures.update(m.id, { method })} />
            <TextField label="Ki méri?" unknownKey={`${m.id}.owner`} context={m.code} value={m.owner} onChange={(owner) => measures.update(m.id, { owner })} />
          </ItemCard>
        ))}
        <AddButton onClick={() => measures.add()}>Új mérhető mutató</AddButton>
      </Card>
    </div>
  );
}

export function HatokorTopic() {
  const p = useProject();
  const setSection = useSysorgStore((s) => s.setSection);
  const scope = useListActions('scopeItems');
  const constraints = useListActions('constraints');
  const groups: { status: ScopeItem['status']; title: string; empty: string }[] = [
    { status: 'in', title: 'Benne van', empty: 'Mi tartozik biztosan az első bevezetéshez?' },
    { status: 'out', title: 'Nincs benne', empty: 'Mi marad kifejezetten kívül?' },
    { status: 'later', title: 'Később', empty: 'Mi halasztható?' },
  ];
  return (
    <div className="space-y-6">
      <Card title="Mi tartozik a megoldásba?" hint="Hol kezdődik és hol végződik a vizsgált működés?">
        {groups.map((group) => {
          const items = p.scopeItems.filter((s) => s.status === group.status);
          return (
            <div key={group.status} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">{group.title} <span className="font-normal text-slate-400">({items.length})</span></h3>
              {items.length === 0 && <p className="text-xs text-slate-500">{group.empty}</p>}
              {items.map((s) => (
                <ItemCard key={s.id} code={s.code} title={s.text} onRemove={() => scope.remove(s.id)} defaultOpen={!s.text}>
                  <TextField label="Tétel" multiline rows={2} value={s.text} onChange={(text) => scope.update(s.id, { text })} />
                  <SelectField label="Besorolás" value={s.status} onChange={(status) => scope.update(s.id, { status })} options={toOptions(L.scopeStatus)} />
                  <TextField label="Indoklás" unknownKey={`${s.id}.rationale`} context={s.code} value={s.rationale} onChange={(rationale) => scope.update(s.id, { rationale })} />
                </ItemCard>
              ))}
              <AddButton onClick={() => scope.add({ status: group.status })}>Új tétel: {group.title.toLowerCase()}</AddButton>
            </div>
          );
        })}
      </Card>
      <Card title="Korlátok">
        {p.constraints.map((c) => (
          <ItemCard key={c.id} code={c.code} title={c.text} subtitle={L.constraintKind[c.kind]} onRemove={() => constraints.remove(c.id)} defaultOpen={!c.text}>
            <SelectField label="Fajta" value={c.kind} onChange={(kind) => constraints.update(c.id, { kind })} options={toOptions(L.constraintKind)} />
            <TextField label="Korlát" multiline rows={2} value={c.text} onChange={(text) => constraints.update(c.id, { text })} />
          </ItemCard>
        ))}
        <AddButton onClick={() => constraints.add()}>Új korlát</AddButton>
        <TextField label="Más projektektől, döntésektől való függőségek" multiline unknownKey="scope.dependencies" value={p.scope.dependencies} onChange={(dependencies) => setSection('scope', { dependencies })} />
      </Card>
    </div>
  );
}

export function ErintettekTopic() {
  const p = useProject();
  const actors = useListActions('stakeholders');
  return (
    <Card title="Szereplők" hint="A szervezeti szerepkör, a folyamatfelelősség és a rendszerjogosultság nem ugyanaz – itt a szerepeket rögzítjük, a jogosultságokat a 9. témában.">
      {p.stakeholders.length === 0 && <EmptyState>Add meg, kik használják, működtetik vagy hagyják jóvá a megoldást – beleértve a külső feleket és a kapcsolódó rendszereket.</EmptyState>}
      {p.stakeholders.map((s) => (
        <ItemCard key={s.id} code={s.code} title={s.name} subtitle={L.stakeholderKind[s.kind]} onRemove={() => actors.remove(s.id)} onMove={(d) => actors.move(s.id, d)} defaultOpen={p.stakeholders.length <= 4}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Megnevezés" value={s.name} onChange={(name) => actors.update(s.id, { name })} placeholder="pl. Beszerzési ügyintéző" />
            <SelectField label="Fajta" value={s.kind} onChange={(kind) => actors.update(s.id, { kind })} options={toOptions(L.stakeholderKind)} />
          </div>
          <TextField label="Célja" multiline rows={2} unknownKey={`${s.id}.goal`} context={s.code} value={s.goal} onChange={(goal) => actors.update(s.id, { goal })} />
          <TextField label="Fő feladatai" multiline rows={2} unknownKey={`${s.id}.tasks`} context={s.code} value={s.tasks} onChange={(tasks) => actors.update(s.id, { tasks })} />
          <TextField label="Milyen döntéseket hozhat?" multiline rows={2} unknownKey={`${s.id}.decisions`} context={s.code} value={s.decisions} onChange={(decisions) => actors.update(s.id, { decisions })} />
          <TextField label="Mely folyamatért vagy adatért felel?" multiline rows={2} unknownKey={`${s.id}.owns`} context={s.code} value={s.owns} onChange={(owns) => actors.update(s.id, { owns })} />
          <CheckField label="Jóváhagyja az eredményt" checked={s.isApprover} onChange={(isApprover) => actors.update(s.id, { isApprover })} />
          <TextField label="Ki helyettesítheti?" unknownKey={`${s.id}.deputy`} context={s.code} value={s.deputy} onChange={(deputy) => actors.update(s.id, { deputy })} />
          <TextField label="Érdekellentét más szereplőkkel" multiline rows={2} unknownKey={`${s.id}.conflicts`} context={s.code} value={s.conflicts} onChange={(conflicts) => actors.update(s.id, { conflicts })} />
        </ItemCard>
      ))}
      <AddButton onClick={() => actors.add()}>Új szereplő</AddButton>
    </Card>
  );
}
