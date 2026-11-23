'use client';
import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { renderSvg } from '@/lib/sysorg/diagram';
import { END_TARGET, newId, type Process, type Step, type SysorgProject } from '@/lib/sysorg/schema';
import { L } from '@/lib/sysorg/topics';
import { actorNameOf, actorOptions, useListActions } from './hooks';
import { AddButton, Card, CheckField, EmptyState, ItemCard, Notice, SelectField, TextField, buttonClass, inputClass, useProject } from './ui';

export function FlowPreview({ process, project, heading }: { process: Process; project: SysorgProject; heading: string }) {
  const svg = useMemo(() => renderSvg(process, actorNameOf(project), heading), [process, project, heading]);
  if (process.steps.length === 0) return null;
  return (
    <figure className="overflow-auto rounded-xl border border-slate-200 bg-white p-2" aria-label={`${heading} folyamatábra`}>
      {/* A generált SVG képként töltődik be, így a felhasználói szöveg nem tud scriptet futtatni. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`${heading}: ${process.name || 'folyamat'} – ${process.steps.length} lépés, a lépések listája fent olvasható`} className="max-w-none" />
    </figure>
  );
}

function StepEditor({ process, variant }: { process: Process; variant: 'asIs' | 'toBe' }) {
  const p = useProject();
  const { update } = useListActions(variant);
  const actors = actorOptions(p);
  const steps = process.steps;
  const setSteps = (next: Step[]) => update(process.id, { steps: next });
  const patch = (id: string, change: Partial<Step>) => setSteps(steps.map((s) => (s.id === id ? { ...s, ...change } : s)));
  const move = (index: number, d: -1 | 1) => {
    const next = [...steps];
    const to = index + d;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setSteps(next);
  };
  const targets = (own: string) => [
    { value: '', label: 'A sorrendben következő lépés' },
    { value: END_TARGET, label: 'A folyamat vége' },
    ...steps.map((s, i) => ({ value: s.id, label: `${i + 1}. ${s.text || '(névtelen lépés)'}`.slice(0, 70) })).filter((o) => o.value !== own),
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-800">Lépések</h4>
      {steps.length === 0 && <EmptyState>Add hozzá a lépéseket időrendben. A döntések ágai külön elnevezhetők.</EmptyState>}
      {steps.map((step, index) => (
        <div key={step.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-violet-700">{index + 1}. lépés</span>
            <span className="flex">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`${index + 1}. lépés feljebb`} className="studio-focus rounded-lg p-1.5 text-slate-400 hover:bg-white disabled:opacity-30"><ArrowUp size={15} aria-hidden="true" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label={`${index + 1}. lépés lejjebb`} className="studio-focus rounded-lg p-1.5 text-slate-400 hover:bg-white disabled:opacity-30"><ArrowDown size={15} aria-hidden="true" /></button>
              <button type="button" onClick={() => update(process.id, { steps: steps.filter((s) => s.id !== step.id).map((s) => ({ ...s, branches: s.branches.map((b) => (b.targetId === step.id ? { ...b, targetId: '' } : b)) })) })} aria-label={`${index + 1}. lépés törlése`} className="studio-focus rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} aria-hidden="true" /></button>
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Típus" value={step.kind} onChange={(kind) => patch(step.id, { kind, branches: kind === 'decision' && step.branches.length === 0 ? [{ id: newId(), label: 'Igen', targetId: '' }, { id: newId(), label: 'Nem', targetId: '' }] : step.branches })} options={[{ value: 'task', label: L.stepKind.task }, { value: 'decision', label: L.stepKind.decision }]} />
            <SelectField label="Ki végzi?" value={step.actorId} onChange={(actorId) => patch(step.id, { actorId })} options={actors.map((a) => ({ value: a.id, label: a.label }))} emptyLabel="– Válassz szereplőt –" />
          </div>
          <div className="mt-4 space-y-4">
            <TextField label={step.kind === 'decision' ? 'Mit döntünk el?' : 'Mi történik?'} value={step.text} onChange={(text) => patch(step.id, { text })} />
            <TextField label="Használt rendszer vagy dokumentum" value={step.system} onChange={(system) => patch(step.id, { system })} />
            {step.kind === 'task' && <CheckField label="Ez a lépés lezárja a folyamatot" checked={step.endsProcess} onChange={(endsProcess) => patch(step.id, { endsProcess })} />}
          </div>
          {step.kind === 'decision' && (
            <div className="mt-4 space-y-2 rounded-xl bg-amber-50/60 p-3">
              <p className="text-xs font-semibold text-amber-900">Döntési ágak</p>
              {step.branches.map((b, bi) => (
                <div key={b.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input aria-label={`${index + 1}. lépés, ${bi + 1}. ág neve`} className={inputClass} value={b.label} placeholder="Ág neve, pl. Jóváhagyva" onChange={(e) => patch(step.id, { branches: step.branches.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)) })} />
                  <select aria-label={`${index + 1}. lépés, ${bi + 1}. ág célja`} className={inputClass} value={b.targetId} onChange={(e) => patch(step.id, { branches: step.branches.map((x) => (x.id === b.id ? { ...x, targetId: e.target.value } : x)) })}>
                    {targets(step.id).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button type="button" onClick={() => patch(step.id, { branches: step.branches.filter((x) => x.id !== b.id) })} aria-label={`${bi + 1}. ág törlése`} className="studio-focus rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} aria-hidden="true" /></button>
                </div>
              ))}
              <button type="button" className={buttonClass} onClick={() => patch(step.id, { branches: [...step.branches, { id: newId(), label: '', targetId: '' }] })}>Új ág</button>
            </div>
          )}
        </div>
      ))}
      <AddButton onClick={() => setSteps([...steps, { id: newId(), kind: 'task', actorId: steps[steps.length - 1]?.actorId ?? '', text: '', system: '', endsProcess: false, branches: [] }])}>Új lépés</AddButton>
    </div>
  );
}

function StatesEditor({ process }: { process: Process }) {
  const p = useProject();
  const { update } = useListActions('toBe');
  const states = process.states;
  const stateOptions = states.map((s) => ({ value: s.id, label: s.name || '(névtelen állapot)' }));
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-800">Ügyállapotok és átmenetek</h4>
      <p className="text-xs text-slate-500">Az első állapot a kezdőállapot. A végállapotot jelöld meg.</p>
      {states.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center gap-3">
          <input aria-label="Állapot neve" className={`${inputClass} flex-1 min-w-48`} value={s.name} placeholder="pl. Jóváhagyásra vár" onChange={(e) => update(process.id, { states: states.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)) })} />
          <CheckField label="Végállapot" checked={s.isFinal} onChange={(isFinal) => update(process.id, { states: states.map((x) => (x.id === s.id ? { ...x, isFinal } : x)) })} />
          <button type="button" onClick={() => update(process.id, { states: states.filter((x) => x.id !== s.id), transitions: process.transitions.filter((t) => t.fromId !== s.id && t.toId !== s.id) })} aria-label={`${s.name || 'Állapot'} törlése`} className="studio-focus rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} aria-hidden="true" /></button>
        </div>
      ))}
      <button type="button" className={buttonClass} onClick={() => update(process.id, { states: [...states, { id: newId(), name: '', isFinal: false }] })}>Új állapot</button>
      {process.transitions.map((t) => (
        <div key={t.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
          <SelectField label="Honnan" value={t.fromId} options={stateOptions} emptyLabel="–" onChange={(fromId) => update(process.id, { transitions: process.transitions.map((x) => (x.id === t.id ? { ...x, fromId } : x)) })} />
          <SelectField label="Hová" value={t.toId} options={stateOptions} emptyLabel="–" onChange={(toId) => update(process.id, { transitions: process.transitions.map((x) => (x.id === t.id ? { ...x, toId } : x)) })} />
          <TextField label="Milyen feltétellel?" value={t.condition} onChange={(condition) => update(process.id, { transitions: process.transitions.map((x) => (x.id === t.id ? { ...x, condition } : x)) })} />
          <SelectField label="Ki indíthatja?" value={t.actorId} options={actorOptions(p).map((a) => ({ value: a.id, label: a.label }))} emptyLabel="–" onChange={(actorId) => update(process.id, { transitions: process.transitions.map((x) => (x.id === t.id ? { ...x, actorId } : x)) })} />
          <div className="sm:col-span-2"><button type="button" className={buttonClass} onClick={() => update(process.id, { transitions: process.transitions.filter((x) => x.id !== t.id) })}>Átmenet törlése</button></div>
        </div>
      ))}
      {states.length >= 2 && <button type="button" className={buttonClass} onClick={() => update(process.id, { transitions: [...process.transitions, { id: newId(), fromId: '', toId: '', condition: '', actorId: '' }] })}>Új átmenet</button>}
    </div>
  );
}

export function ProcessTopic({ variant }: { variant: 'asIs' | 'toBe' }) {
  const p = useProject();
  const isToBe = variant === 'toBe';
  const list = isToBe ? p.toBe : p.asIs;
  const actions = useListActions(variant);
  const heading = isToBe ? 'TO-BE' : 'AS-IS';
  const k = (process: Process, name: string) => ({ unknownKey: `${process.id}.${name}`, context: process.code });

  return (
    <div className="space-y-6">
      {!isToBe && p.meta.kind === 'new_system' && (
        <Notice>Új rendszer tervezésénél az AS-IS rész lehet rövid, ha nincs meglévő folyamat. Ha mégis van kézi vagy rendszerek közötti működés, érdemes rögzíteni.</Notice>
      )}
      {list.length === 0 && <EmptyState>{isToBe ? 'Még nincs elvárt működés. Egy folyamattal kezdd.' : 'Még nincs jelenlegi folyamat rögzítve.'}</EmptyState>}
      {list.map((process) => (
        <ItemCard key={process.id} code={process.code} title={process.name} subtitle={`${process.steps.length} lépés`} onRemove={() => actions.remove(process.id)} onMove={(d) => actions.move(process.id, d)} defaultOpen={list.length <= 2}>
          <TextField label="A folyamat neve" value={process.name} onChange={(name) => actions.update(process.id, { name })} />
          {isToBe && (
            <SelectField label="Melyik jelenlegi folyamatot váltja ki?" value={process.relatedAsIsId} options={p.asIs.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))} emptyLabel="– Nincs kapcsolódó AS-IS folyamat –" onChange={(relatedAsIsId) => actions.update(process.id, { relatedAsIsId })} />
          )}
          <TextField label="Mi indítja el?" multiline rows={2} {...k(process, 'trigger')} value={process.trigger} onChange={(trigger) => actions.update(process.id, { trigger })} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Bemenet" multiline rows={2} {...k(process, 'input')} value={process.input} onChange={(input) => actions.update(process.id, { input })} />
            <TextField label="Elvárt eredmény" multiline rows={2} {...k(process, 'output')} value={process.output} onChange={(output) => actions.update(process.id, { output })} />
            <TextField label="Gyakoriság" {...k(process, 'frequency')} value={process.frequency} onChange={(frequency) => actions.update(process.id, { frequency })} />
            <TextField label="Mennyiség" {...k(process, 'volume')} value={process.volume} onChange={(volume) => actions.update(process.id, { volume })} />
          </div>
          <StepEditor process={process} variant={variant} />
          <FlowPreview process={process} project={p} heading={heading} />
          <TextField label="Eltérő ügytípusok" multiline rows={2} {...k(process, 'caseTypes')} value={process.caseTypes} onChange={(caseTypes) => actions.update(process.id, { caseTypes })} />
          <TextField label="Párhuzamos munkavégzés" multiline rows={2} {...k(process, 'parallelWork')} value={process.parallelWork} onChange={(parallelWork) => actions.update(process.id, { parallelWork })} />
          <TextField label="Kivételes esetek" multiline rows={2} {...k(process, 'exceptions')} value={process.exceptions} onChange={(exceptions) => actions.update(process.id, { exceptions })} />
          {!isToBe && <TextField label="Hol van hibázás, ismételt adatrögzítés, kézi kerülőmegoldás?" multiline {...k(process, 'painPoints')} value={process.painPoints} onChange={(painPoints) => actions.update(process.id, { painPoints })} />}
          {isToBe && (
            <>
              <Card title="Mi változik?">
                <TextField label="Mi marad meg?" multiline rows={2} {...k(process, 'keep')} value={process.keep} onChange={(keep) => actions.update(process.id, { keep })} />
                <TextField label="Mi változik?" multiline rows={2} {...k(process, 'change')} value={process.change} onChange={(change) => actions.update(process.id, { change })} />
                <TextField label="Mi szűnik meg?" multiline rows={2} {...k(process, 'remove')} value={process.remove} onChange={(remove) => actions.update(process.id, { remove })} />
                <TextField label="Mit automatizálunk?" multiline rows={2} {...k(process, 'automation')} value={process.automation} onChange={(automation) => actions.update(process.id, { automation })} />
                <TextField label="Hol kell emberi döntés vagy ellenőrzés?" multiline rows={2} {...k(process, 'humanChecks')} value={process.humanChecks} onChange={(humanChecks) => actions.update(process.id, { humanChecks })} />
              </Card>
              <Card title="Hibás és megszakított lefutás">
                <TextField label="Elutasítás, visszaküldés, visszavonás, újranyitás" multiline {...k(process, 'rejectionHandling')} value={process.rejectionHandling} onChange={(rejectionHandling) => actions.update(process.id, { rejectionHandling })} />
                <TextField label="Határidőtúllépés" multiline rows={2} {...k(process, 'timeoutHandling')} value={process.timeoutHandling} onChange={(timeoutHandling) => actions.update(process.id, { timeoutHandling })} />
                <TextField label="Ki kap értesítést, és mit kell utána tennie?" multiline rows={2} {...k(process, 'notifications')} value={process.notifications} onChange={(notifications) => actions.update(process.id, { notifications })} />
              </Card>
              <StatesEditor process={process} />
            </>
          )}
        </ItemCard>
      ))}
      <AddButton onClick={() => actions.add()}>{isToBe ? 'Új TO-BE folyamat' : 'Új AS-IS folyamat'}</AddButton>
      {MultiPickHint(p)}
    </div>
  );
}

function MultiPickHint(p: SysorgProject) {
  if (p.stakeholders.length > 0) return null;
  return <Notice tone="warning">A lépésekhez szereplőt csak az „Érintettek” témában rögzített szereplők közül lehet választani. Előbb vegyél fel szereplőket.</Notice>;
}
