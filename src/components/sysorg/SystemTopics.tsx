'use client';
import { OPERATIONS, type Operation } from '@/lib/sysorg/schema';
import { useSysorgStore } from '@/lib/sysorg/store';
import { L } from '@/lib/sysorg/topics';
import { actorOptions, dataOptions, useListActions } from './hooks';
import { AddButton, Card, CheckField, EmptyState, ItemCard, MultiPick, Notice, SelectField, TextField, useProject } from './ui';

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export function JogosultsagokTopic() {
  const p = useProject();
  const perms = useListActions('permissions');
  const setSection = useSysorgStore((s) => s.setSection);
  const actorName = (id: string) => p.stakeholders.find((s) => s.id === id)?.name || 'Szereplő nincs kiválasztva';
  const dataName = (id: string) => p.dataObjects.find((d) => d.id === id)?.name || 'Adat nincs kiválasztva';
  const x = p.permissionsExtra;
  return (
    <div className="space-y-6">
      {(p.stakeholders.length === 0 || p.dataObjects.length === 0) && (
        <Notice tone="warning">Jogosultság szereplő és adat párosra rögzíthető. Előbb vegyél fel szereplőket (3. téma) és adatobjektumokat (8. téma).</Notice>
      )}
      <Card title="Ki milyen adaton milyen műveletet végezhet?" hint="Egy szereplő–adat párosra egy sor készüljön.">
        {p.permissions.length === 0 && <EmptyState>Még nincs jogosultsági sor.</EmptyState>}
        {p.permissions.map((row) => (
          <ItemCard key={row.id} title={`${actorName(row.actorId)} – ${dataName(row.dataId)}`} subtitle={row.operations.map((o) => L.operation[o]).join(', ')} onRemove={() => perms.remove(row.id)} defaultOpen={!row.actorId || !row.dataId}>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Szereplő" value={row.actorId} options={actorOptions(p).map((a) => ({ value: a.id, label: a.label }))} emptyLabel="– Válassz –" onChange={(actorId) => perms.update(row.id, { actorId })} />
              <SelectField label="Adat" value={row.dataId} options={dataOptions(p).map((d) => ({ value: d.id, label: d.label }))} emptyLabel="– Válassz –" onChange={(dataId) => perms.update(row.id, { dataId })} />
            </div>
            <MultiPick label="Műveletek" options={OPERATIONS.map((o) => ({ id: o, label: L.operation[o] }))} value={row.operations} onChange={(ids) => perms.update(row.id, { operations: ids as Operation[] })} emptyText="" />
            <SelectField label="Hatókör" value={row.scope} options={toOptions(L.permissionScope)} onChange={(scope) => perms.update(row.id, { scope })} />
            <TextField label="Megjegyzés" value={row.note} onChange={(note) => perms.update(row.id, { note })} />
          </ItemCard>
        ))}
        <AddButton onClick={() => perms.add()}>Új jogosultsági sor</AddButton>
      </Card>
      <Card title="Szabályok és ellenőrizhetőség">
        <TextField label="Függ-e a jogosultság az ügy állapotától?" multiline rows={2} unknownKey="permissionsExtra.stateDependent" value={x.stateDependent} onChange={(stateDependent) => setSection('permissionsExtra', { stateDependent })} />
        <CheckField label="Senki nem hagyhatja jóvá a saját műveletét" checked={x.selfApprovalForbidden} onChange={(selfApprovalForbidden) => setSection('permissionsExtra', { selfApprovalForbidden })} />
        <TextField label="Hogyan működik a helyettesítés és a jogosultság visszavonása?" multiline rows={2} unknownKey="permissionsExtra.delegation" value={x.delegation} onChange={(delegation) => setSection('permissionsExtra', { delegation })} />
        <TextField label="Milyen eseményeket kell naplózni?" multiline rows={2} unknownKey="permissionsExtra.auditEvents" value={x.auditEvents} onChange={(auditEvents) => setSection('permissionsExtra', { auditEvents })} />
        <TextField label="Ki férhet hozzá a naplóhoz?" unknownKey="permissionsExtra.auditAccess" value={x.auditAccess} onChange={(auditAccess) => setSection('permissionsExtra', { auditAccess })} />
      </Card>
    </div>
  );
}

export function IntegracioTopic() {
  const p = useProject();
  const items = useListActions('integrations');
  const setSection = useSysorgStore((s) => s.setSection);
  const m = p.migration;
  return (
    <div className="space-y-6">
      <Card title="Külső rendszerek" hint="Az ismeretlen technikai részletek egyeztetendő pontok – ne találd ki őket.">
        {p.integrations.length === 0 && <EmptyState>Nincs külső kapcsolat rögzítve. Ha nincs ilyen, ezt a témát is lezárhatod.</EmptyState>}
        {p.integrations.map((i) => (
          <ItemCard key={i.id} code={i.code} title={i.system} subtitle={`${L.direction[i.direction]} · ${L.integrationStatus[i.status]}`} onRemove={() => items.remove(i.id)} defaultOpen={p.integrations.length <= 3}>
            <TextField label="Rendszer" value={i.system} onChange={(system) => items.update(i.id, { system })} />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Irány" value={i.direction} options={toOptions(L.direction)} onChange={(direction) => items.update(i.id, { direction })} />
              <SelectField label="Részletek állapota" value={i.status} options={toOptions(L.integrationStatus)} onChange={(status) => items.update(i.id, { status })} />
            </div>
            <MultiPick label="Milyen adatokat adunk át?" options={dataOptions(p)} value={i.dataIds} onChange={(dataIds) => items.update(i.id, { dataIds })} emptyText="Előbb vegyél fel adatobjektumot (8. téma)." />
            <TextField label="Mi indítja az átadást?" unknownKey={`${i.id}.trigger`} context={i.code} value={i.trigger} onChange={(trigger) => items.update(i.id, { trigger })} />
            <TextField label="Milyen gyakran történik?" unknownKey={`${i.id}.frequency`} context={i.code} value={i.frequency} onChange={(frequency) => items.update(i.id, { frequency })} />
            <TextField label="Melyik fél felel az adatért és a kapcsolatért?" unknownKey={`${i.id}.owner`} context={i.code} value={i.owner} onChange={(owner) => items.update(i.id, { owner })} />
            <TextField label="Mi történik kiesés, hibás válasz vagy ismételt üzenet esetén?" multiline rows={2} unknownKey={`${i.id}.errorHandling`} context={i.code} value={i.errorHandling} onChange={(errorHandling) => items.update(i.id, { errorHandling })} />
            <TextField label="Hogyan derül ki és javítható az eltérés?" multiline rows={2} unknownKey={`${i.id}.reconciliation`} context={i.code} value={i.reconciliation} onChange={(reconciliation) => items.update(i.id, { reconciliation })} />
          </ItemCard>
        ))}
        <AddButton onClick={() => items.add()}>Új külső kapcsolat</AddButton>
      </Card>
      <Card title="Adatáthozatal (migráció)">
        <SelectField label="Kell régi adatot áthozni?" value={m.needed} options={toOptions(L.migrationNeeded)} onChange={(needed) => setSection('migration', { needed })} />
        {m.needed === 'yes' && (
          <>
            <TextField label="Honnan?" multiline rows={2} unknownKey="migration.source" value={m.source} onChange={(source) => setSection('migration', { source })} />
            <TextField label="Mely adatok érintettek?" multiline rows={2} unknownKey="migration.scope" value={m.scope} onChange={(scope) => setSection('migration', { scope })} />
            <TextField label="Hogyan ellenőrizzük a teljességet és helyességet?" multiline rows={2} unknownKey="migration.verification" value={m.verification} onChange={(verification) => setSection('migration', { verification })} />
          </>
        )}
      </Card>
    </div>
  );
}

export function MinosegTopic() {
  const p = useProject();
  const nfrs = useListActions('nfrs');
  const setSection = useSysorgStore((s) => s.setSection);
  const q = p.quality;
  const set = (patch: Partial<typeof q>) => setSection('quality', patch);
  return (
    <div className="space-y-6">
      <Card title="Minőségi követelmények" hint="Mérhető állítások: például „A lista 3 másodpercen belül betölt 200 egyidejű felhasználónál.”">
        {p.nfrs.length === 0 && <EmptyState>Még nincs minőségi követelmény.</EmptyState>}
        {p.nfrs.map((n) => (
          <ItemCard key={n.id} code={n.code} title={n.text} subtitle={L.nfrCategory[n.category]} onRemove={() => nfrs.remove(n.id)} defaultOpen={!n.text}>
            <SelectField label="Kategória" value={n.category} options={toOptions(L.nfrCategory)} onChange={(category) => nfrs.update(n.id, { category })} />
            <TextField label="Követelmény" multiline rows={2} value={n.text} onChange={(text) => nfrs.update(n.id, { text })} />
            <TextField label="Mérhető érték és mérési mód" unknownKey={`${n.id}.measure`} context={n.code} value={n.measure} onChange={(measure) => nfrs.update(n.id, { measure })} />
          </ItemCard>
        ))}
        <AddButton onClick={() => nfrs.add()}>Új minőségi követelmény</AddButton>
      </Card>
      <Card title="Használat és üzemeltetés">
        <TextField label="Hány felhasználó várható?" unknownKey="quality.users" value={q.users} onChange={(users) => set({ users })} />
        <TextField label="Mekkora terhelés várható?" unknownKey="quality.load" value={q.load} onChange={(load) => set({ load })} />
        <TextField label="Mikor kell rendelkezésre állnia?" unknownKey="quality.availability" value={q.availability} onChange={(availability) => set({ availability })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Mennyi kiesés fogadható el?" unknownKey="quality.acceptableDowntime" value={q.acceptableDowntime} onChange={(acceptableDowntime) => set({ acceptableDowntime })} />
          <TextField label="Mennyi adatvesztés fogadható el?" unknownKey="quality.acceptableDataLoss" value={q.acceptableDataLoss} onChange={(acceptableDataLoss) => set({ acceptableDataLoss })} />
        </div>
      </Card>
      <Card title="Bevezetés és átvétel">
        <TextField label="Oktatás" multiline rows={2} unknownKey="quality.training" value={q.training} onChange={(training) => set({ training })} />
        <TextField label="Próbaüzem" multiline rows={2} unknownKey="quality.pilot" value={q.pilot} onChange={(pilot) => set({ pilot })} />
        <TextField label="Fokozatos bevezetés" multiline rows={2} unknownKey="quality.phasing" value={q.phasing} onChange={(phasing) => set({ phasing })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Ki üzemelteti?" unknownKey="quality.operator" value={q.operator} onChange={(operator) => set({ operator })} />
          <TextField label="Ki nyújt támogatást?" unknownKey="quality.support" value={q.support} onChange={(support) => set({ support })} />
        </div>
        <TextField label="Ki fogadja el az eredményt?" required unknownKey="quality.acceptanceBy" value={q.acceptanceBy} onChange={(acceptanceBy) => set({ acceptanceBy })} />
        <TextField label="Milyen bizonyíték alapján?" multiline rows={2} unknownKey="quality.acceptanceEvidence" value={q.acceptanceEvidence} onChange={(acceptanceEvidence) => set({ acceptanceEvidence })} />
      </Card>
    </div>
  );
}
