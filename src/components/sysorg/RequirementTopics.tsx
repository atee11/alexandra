'use client';
import { Trash2 } from 'lucide-react';
import { newId } from '@/lib/sysorg/schema';
import { useSysorgStore } from '@/lib/sysorg/store';
import { L } from '@/lib/sysorg/topics';
import { actorOptions, dataOptions, measureOptions, processOptions, ruleOptions, useListActions } from './hooks';
import { AddButton, CheckField, EmptyState, ItemCard, MultiPick, Notice, SelectField, TextField, buttonClass, inputClass, useProject } from './ui';

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export function FunkciokTopic() {
  const p = useProject();
  const fns = useListActions('functions');
  const nextCode = useSysorgStore((s) => s.nextCode);
  return (
    <div className="space-y-6">
      {p.stakeholders.length === 0 && <Notice tone="warning">Funkciót szereplőhöz érdemes kötni – előbb rögzítsd az érintetteket.</Notice>}
      {p.functions.length === 0 && <EmptyState>Funkciónként írd le, melyik szereplő mit szeretne elérni, és miből látszik, hogy sikerült.</EmptyState>}
      {p.functions.map((fn) => (
        <ItemCard key={fn.id} code={fn.code} title={fn.name} subtitle={`${L.priority[fn.priority]} · ${fn.acceptance.length} elfogadási feltétel`} onRemove={() => fns.remove(fn.id)} onMove={(d) => fns.move(fn.id, d)} defaultOpen={p.functions.length <= 3}>
          <TextField label="Funkció neve" value={fn.name} onChange={(name) => fns.update(fn.id, { name })} placeholder="pl. Igénylés jóváhagyása" />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Szereplő" value={fn.actorId} options={actorOptions(p).map((a) => ({ value: a.id, label: a.label }))} emptyLabel="– Válassz szereplőt –" onChange={(actorId) => fns.update(fn.id, { actorId })} />
            <SelectField label="Prioritás" value={fn.priority} options={toOptions(L.priority)} onChange={(priority) => fns.update(fn.id, { priority })} />
          </div>
          <TextField label="Mit szeretne elérni?" multiline rows={2} unknownKey={`${fn.id}.goal`} context={fn.code} value={fn.goal} onChange={(goal) => fns.update(fn.id, { goal })} />
          <TextField label="A prioritás indoka" unknownKey={`${fn.id}.rationale`} context={fn.code} value={fn.rationale} onChange={(rationale) => fns.update(fn.id, { rationale })} />
          <MultiPick label="Melyik üzleti célt támogatja?" options={measureOptions(p)} value={fn.measureIds} onChange={(measureIds) => fns.update(fn.id, { measureIds })} emptyText="Előbb vegyél fel sikerkritériumot az 1. témában." />
          <MultiPick label="Melyik folyamat része?" options={processOptions(p)} value={fn.processIds} onChange={(processIds) => fns.update(fn.id, { processIds })} emptyText="Még nincs folyamat rögzítve." />
          <MultiPick label="Mely szabályokat használja?" options={ruleOptions(p)} value={fn.ruleIds} onChange={(ruleIds) => fns.update(fn.id, { ruleIds })} emptyText="Még nincs üzleti szabály (7. téma)." />
          <MultiPick label="Mely adatokat kezeli?" options={dataOptions(p)} value={fn.dataIds} onChange={(dataIds) => fns.update(fn.id, { dataIds })} emptyText="Még nincs adatobjektum (8. téma)." />
          <TextField label="Előfeltétel" multiline rows={2} unknownKey={`${fn.id}.precondition`} context={fn.code} value={fn.precondition} onChange={(precondition) => fns.update(fn.id, { precondition })} />
          <TextField label="Mi indítja el?" multiline rows={2} unknownKey={`${fn.id}.trigger`} context={fn.code} value={fn.trigger} onChange={(trigger) => fns.update(fn.id, { trigger })} />
          <TextField label="Normál lefutás" multiline rows={4} unknownKey={`${fn.id}.mainFlow`} context={fn.code} value={fn.mainFlow} onChange={(mainFlow) => fns.update(fn.id, { mainFlow })} />
          <TextField label="Alternatív és hibás esetek" multiline rows={3} unknownKey={`${fn.id}.alternatives`} context={fn.code} value={fn.alternatives} onChange={(alternatives) => fns.update(fn.id, { alternatives })} />
          <TextField label="Mi számít sikeres befejezésnek?" multiline rows={2} unknownKey={`${fn.id}.successEnd`} context={fn.code} value={fn.successEnd} onChange={(successEnd) => fns.update(fn.id, { successEnd })} />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Elfogadási feltételek</h4>
            <p className="text-xs text-slate-500">Megfigyelhető, ellenőrizhető állítások – például: „A jóváhagyott igénylés 5 percen belül megjelenik a beszerzőnél.”</p>
            {fn.acceptance.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <span className="mt-2.5 shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{a.code}</span>
                <textarea aria-label={`${a.code} elfogadási feltétel`} rows={2} className={`${inputClass} resize-y`} value={a.text} onChange={(e) => fns.update(fn.id, { acceptance: fn.acceptance.map((x) => (x.id === a.id ? { ...x, text: e.target.value } : x)) })} />
                <button type="button" onClick={() => fns.update(fn.id, { acceptance: fn.acceptance.filter((x) => x.id !== a.id) })} aria-label={`${a.code} törlése`} className="studio-focus mt-1.5 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} aria-hidden="true" /></button>
              </div>
            ))}
            <button type="button" className={buttonClass} onClick={() => fns.update(fn.id, { acceptance: [...fn.acceptance, { id: newId(), code: nextCode('AC'), text: '' }] })}>Új elfogadási feltétel</button>
          </div>
        </ItemCard>
      ))}
      <AddButton onClick={() => fns.add()}>Új funkció</AddButton>
    </div>
  );
}

export function SzabalyokTopic() {
  const p = useProject();
  const rules = useListActions('rules');
  return (
    <div className="space-y-6">
      {p.rules.length === 0 && <EmptyState>Itt rögzítsd azokat a feltételeket, értékhatárokat és kivételeket, amelyek alapján döntés születik.</EmptyState>}
      {p.rules.map((r) => (
        <ItemCard key={r.id} code={r.code} title={r.name} subtitle={r.owner && `Tulajdonos: ${r.owner}`} onRemove={() => rules.remove(r.id)} onMove={(d) => rules.move(r.id, d)} defaultOpen={p.rules.length <= 3}>
          <TextField label="Szabály neve" value={r.name} onChange={(name) => rules.update(r.id, { name })} />
          <TextField label="Feltétel" multiline rows={3} value={r.condition} onChange={(condition) => rules.update(r.id, { condition })} placeholder="Milyen helyzetben, milyen értékhatárnál vagy időkorlátnál érvényes?" />
          <TextField label="Eredmény" multiline rows={3} value={r.outcome} onChange={(outcome) => rules.update(r.id, { outcome })} />
          <TextField label="Mi történik, ha több szabály egyszerre teljesül?" multiline rows={2} unknownKey={`${r.id}.conflicts`} context={r.code} value={r.conflicts} onChange={(conflicts) => rules.update(r.id, { conflicts })} />
          <TextField label="Kivételek" multiline rows={2} unknownKey={`${r.id}.exceptions`} context={r.code} value={r.exceptions} onChange={(exceptions) => rules.update(r.id, { exceptions })} />
          <TextField label="Ki engedélyezheti a kivételt?" unknownKey={`${r.id}.exceptionApprover`} context={r.code} value={r.exceptionApprover} onChange={(exceptionApprover) => rules.update(r.id, { exceptionApprover })} />
          <TextField label="Forrás (jogszabály, szabályzat, döntés)" unknownKey={`${r.id}.source`} context={r.code} value={r.source} onChange={(source) => rules.update(r.id, { source })} />
          <TextField label="Tulajdonos" unknownKey={`${r.id}.owner`} context={r.code} value={r.owner} onChange={(owner) => rules.update(r.id, { owner })} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Érvényes ettől" type="date" value={r.validFrom} onChange={(validFrom) => rules.update(r.id, { validFrom })} />
            <TextField label="Érvényes eddig" type="date" value={r.validTo} onChange={(validTo) => rules.update(r.id, { validTo })} />
          </div>
        </ItemCard>
      ))}
      <AddButton onClick={() => rules.add()}>Új üzleti szabály</AddButton>
    </div>
  );
}

export function AdatokTopic() {
  const p = useProject();
  const data = useListActions('dataObjects');
  return (
    <div className="space-y-6">
      <Notice>Ez fogalmi adatmodell: az üzleti jelentésre és kapcsolatokra koncentrál, nem adatbázistervet készít.</Notice>
      {p.dataObjects.length === 0 && <EmptyState>Vedd fel az üzleti objektumokat, például „Igénylés”, „Szerződés” vagy „Ügyfél”.</EmptyState>}
      {p.dataObjects.map((d) => (
        <ItemCard key={d.id} code={d.code} title={d.name} subtitle={`${d.attributes.length} adat · ${L.sensitivity[d.sensitivity]}`} onRemove={() => data.remove(d.id)} onMove={(dir) => data.move(d.id, dir)} defaultOpen={p.dataObjects.length <= 3}>
          <TextField label="Objektum neve" value={d.name} onChange={(name) => data.update(d.id, { name })} />
          <TextField label="Mit jelent pontosan?" multiline rows={2} value={d.definition} onChange={(definition) => data.update(d.id, { definition })} />
          <SelectField label="Besorolás" value={d.sensitivity} options={toOptions(L.sensitivity)} onChange={(sensitivity) => data.update(d.id, { sensitivity })} />
          <TextField label="Honnan származik, melyik rendszer a hiteles forrása?" unknownKey={`${d.id}.source`} context={d.code} value={d.source} onChange={(source) => data.update(d.id, { source })} />
          <TextField label="Ki hozhatja létre vagy módosíthatja?" unknownKey={`${d.id}.creators`} context={d.code} value={d.creators} onChange={(creators) => data.update(d.id, { creators })} />
          <TextField label="Meddig kell megőrizni?" unknownKey={`${d.id}.retention`} context={d.code} value={d.retention} onChange={(retention) => data.update(d.id, { retention })} />
          <TextField label="Mikor archiválható, törölhető vagy anonimizálható?" multiline rows={2} unknownKey={`${d.id}.lifecycle`} context={d.code} value={d.lifecycle} onChange={(lifecycle) => data.update(d.id, { lifecycle })} />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Adatok</h4>
            {d.attributes.map((a) => (
              <div key={a.id} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center gap-2">
                  <input aria-label="Adat neve" className={inputClass} value={a.name} placeholder="Adat neve" onChange={(e) => data.update(d.id, { attributes: d.attributes.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)) })} />
                  <button type="button" onClick={() => data.update(d.id, { attributes: d.attributes.filter((x) => x.id !== a.id) })} aria-label={`${a.name || 'Adat'} törlése`} className="studio-focus rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} aria-hidden="true" /></button>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <CheckField label="Kötelező" checked={a.required} onChange={(required) => data.update(d.id, { attributes: d.attributes.map((x) => (x.id === a.id ? { ...x, required } : x)) })} />
                  <CheckField label="Egyedi" checked={a.unique} onChange={(unique) => data.update(d.id, { attributes: d.attributes.map((x) => (x.id === a.id ? { ...x, unique } : x)) })} />
                  <CheckField label="Személyes adat" checked={a.personal} onChange={(personal) => data.update(d.id, { attributes: d.attributes.map((x) => (x.id === a.id ? { ...x, personal } : x)) })} />
                </div>
                <input aria-label={`${a.name || 'Adat'} ellenőrzése`} className={inputClass} value={a.validation} placeholder="Ellenőrzési szabály (opcionális)" onChange={(e) => data.update(d.id, { attributes: d.attributes.map((x) => (x.id === a.id ? { ...x, validation: e.target.value } : x)) })} />
              </div>
            ))}
            <button type="button" className={buttonClass} onClick={() => data.update(d.id, { attributes: [...d.attributes, { id: newId(), name: '', required: false, unique: false, validation: '', personal: false }] })}>Új adat</button>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Kapcsolatok más objektumokhoz</h4>
            {d.relations.map((r) => (
              <div key={r.id} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                <select aria-label="Kapcsolódó objektum" className={inputClass} value={r.targetId} onChange={(e) => data.update(d.id, { relations: d.relations.map((x) => (x.id === r.id ? { ...x, targetId: e.target.value } : x)) })}>
                  <option value="">– Válassz objektumot –</option>
                  {dataOptions(p).filter((o) => o.id !== d.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <input aria-label="Kapcsolat leírása" className={inputClass} value={r.label} placeholder="pl. egy igényléshez több tétel tartozik" onChange={(e) => data.update(d.id, { relations: d.relations.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)) })} />
                <button type="button" onClick={() => data.update(d.id, { relations: d.relations.filter((x) => x.id !== r.id) })} aria-label="Kapcsolat törlése" className="studio-focus rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} aria-hidden="true" /></button>
              </div>
            ))}
            {p.dataObjects.length > 1 && <button type="button" className={buttonClass} onClick={() => data.update(d.id, { relations: [...d.relations, { id: newId(), targetId: '', label: '' }] })}>Új kapcsolat</button>}
          </div>
        </ItemCard>
      ))}
      <AddButton onClick={() => data.add()}>Új adatobjektum</AddButton>
    </div>
  );
}
