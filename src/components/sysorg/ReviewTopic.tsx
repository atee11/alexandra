'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { analyze, readiness, topicLabel, type Issue, type Severity } from '@/lib/sysorg/analysis';
import { TOPIC_IDS, type TopicId } from '@/lib/sysorg/schema';
import { useSysorgStore } from '@/lib/sysorg/store';
import { L, TOPICS, topicHref } from '@/lib/sysorg/topics';
import { useListActions } from './hooks';
import { AddButton, Card, CheckField, EmptyState, ItemCard, Notice, SelectField, TextField, buttonClass, inputClass, useProject } from './ui';

const SEVERITY: Record<Severity, { title: string; icon: typeof Info; tone: string }> = {
  blocker: { title: 'Blokkoló hiányok', icon: AlertOctagon, tone: 'text-red-700 bg-red-50 border-red-100' },
  warning: { title: 'Figyelmeztetések', icon: AlertTriangle, tone: 'text-amber-800 bg-amber-50 border-amber-100' },
  info: { title: 'Megjegyzések', icon: Info, tone: 'text-slate-700 bg-slate-50 border-slate-200' },
};

function IssueGroup({ severity, issues }: { severity: Severity; issues: Issue[] }) {
  if (issues.length === 0) return null;
  const { title, icon: Icon, tone } = SEVERITY[severity];
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon size={16} aria-hidden="true" />{title} ({issues.length})</h3>
      <ul className="space-y-1.5">
        {issues.map((issue) => (
          <li key={issue.id} className={`rounded-xl border px-3.5 py-2.5 text-sm ${tone}`}>
            <Link href={topicHref(issue.topic)} className="studio-focus rounded hover:underline">
              <span className="font-medium">{topicLabel(issue.topic)}:</span> {issue.message}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FelulvizsgalatTopic() {
  const p = useProject();
  const issues = useMemo(() => analyze(p), [p]);
  const ready = readiness(p, issues);
  const questions = useListActions('questions');
  const assumptions = useListActions('assumptions');
  const decisions = useListActions('decisions');
  const setApproval = useSysorgStore((s) => s.setApproval);
  const topicOptions = TOPICS.map((t) => ({ value: t.id, label: `${t.number}. ${t.label}` }));
  const unknowns = Object.entries(p.unknowns);
  const today = () => new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Card title="Állapot" hint="Az ellenőrzés csak a rögzített adatok hiányait és ellentmondásait jelzi – az üzleti tartalom helyességét a szakértőknek kell megerősíteniük.">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-red-50 p-3"><div className="text-2xl font-semibold text-red-700">{ready.blockers}</div><div className="text-xs text-red-800">blokkoló</div></div>
          <div className="rounded-xl bg-amber-50 p-3"><div className="text-2xl font-semibold text-amber-700">{ready.warnings}</div><div className="text-xs text-amber-800">figyelmeztetés</div></div>
          <div className="rounded-xl bg-slate-50 p-3"><div className="text-2xl font-semibold text-slate-700">{ready.infos}</div><div className="text-xs text-slate-600">megjegyzés</div></div>
        </div>
        {issues.length === 0 ? <Notice tone="success">Nincs jelzett hiány.</Notice> : (
          <div className="space-y-5">
            <IssueGroup severity="blocker" issues={issues.filter((i) => i.severity === 'blocker')} />
            <IssueGroup severity="warning" issues={issues.filter((i) => i.severity === 'warning')} />
            <IssueGroup severity="info" issues={issues.filter((i) => i.severity === 'info')} />
          </div>
        )}
      </Card>

      <Card title="Nyitott kérdések">
        {p.questions.length === 0 && <EmptyState>Nincs rögzített nyitott kérdés.</EmptyState>}
        {p.questions.map((q) => (
          <ItemCard key={q.id} code={q.code} title={q.text} subtitle={`${L.questionStatus[q.status]}${q.blocking ? ' · blokkoló' : ''}`} onRemove={() => questions.remove(q.id)} defaultOpen={!q.text}>
            <TextField label="Kérdés" multiline rows={2} value={q.text} onChange={(text) => questions.update(q.id, { text })} />
            <SelectField label="Melyik témához tartozik?" value={q.topic} options={topicOptions} onChange={(topic) => questions.update(q.id, { topic: topic as TopicId })} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Felelős" value={q.owner} onChange={(owner) => questions.update(q.id, { owner })} />
              <TextField label="Határidő" type="date" value={q.due} onChange={(due) => questions.update(q.id, { due })} />
            </div>
            <SelectField label="Állapot" value={q.status} options={[{ value: 'open', label: L.questionStatus.open }, { value: 'answered', label: L.questionStatus.answered }]} onChange={(status) => questions.update(q.id, { status })} />
            <CheckField label="Blokkoló: a továbblépést akadályozza" checked={q.blocking} onChange={(blocking) => questions.update(q.id, { blocking })} />
            {q.status === 'answered' && <TextField label="Válasz" multiline rows={2} value={q.answer} onChange={(answer) => questions.update(q.id, { answer })} />}
          </ItemCard>
        ))}
        <AddButton onClick={() => questions.add()}>Új nyitott kérdés</AddButton>
      </Card>

      <Card title="Feltételezések" hint="Amit igaznak veszünk, de még nincs megerősítve.">
        {p.assumptions.map((a) => (
          <ItemCard key={a.id} code={a.code} title={a.text} subtitle={L.assumptionStatus[a.status]} onRemove={() => assumptions.remove(a.id)} defaultOpen={!a.text}>
            <TextField label="Feltételezés" multiline rows={2} value={a.text} onChange={(text) => assumptions.update(a.id, { text })} />
            <SelectField label="Állapot" value={a.status} options={(Object.keys(L.assumptionStatus) as (keyof typeof L.assumptionStatus)[]).map((value) => ({ value, label: L.assumptionStatus[value] }))} onChange={(status) => assumptions.update(a.id, { status })} />
            <TextField label="Ki erősítheti meg?" value={a.owner} onChange={(owner) => assumptions.update(a.id, { owner })} />
          </ItemCard>
        ))}
        <AddButton onClick={() => assumptions.add()}>Új feltételezés</AddButton>
      </Card>

      <Card title="Döntések" hint="Csak olyan döntést rögzíts, amelyet valaki ténylegesen meghozott.">
        {p.decisions.map((d) => (
          <ItemCard key={d.id} code={d.code} title={d.text} subtitle={[d.decidedBy, d.date].filter(Boolean).join(' · ')} onRemove={() => decisions.remove(d.id)} defaultOpen={!d.text}>
            <TextField label="Döntés" multiline rows={2} value={d.text} onChange={(text) => decisions.update(d.id, { text })} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Ki döntött?" value={d.decidedBy} onChange={(decidedBy) => decisions.update(d.id, { decidedBy })} />
              <TextField label="Mikor?" type="date" value={d.date} onChange={(date) => decisions.update(d.id, { date })} />
            </div>
            <TextField label="Indoklás" multiline rows={2} value={d.rationale} onChange={(rationale) => decisions.update(d.id, { rationale })} />
          </ItemCard>
        ))}
        <AddButton onClick={() => decisions.add()}>Új döntés</AddButton>
      </Card>

      {unknowns.length > 0 && (
        <Card title="Ismeretlen vagy nem alkalmazható mezők">
          <ul className="divide-y divide-slate-100 text-sm">
            {unknowns.map(([key, mark]) => (
              <li key={key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={topicHref(mark.topic)} className="studio-focus rounded text-slate-700 hover:text-violet-700">{mark.label}</Link>
                <span className="text-xs text-amber-800">{mark.state === 'na' ? 'Nem alkalmazható' : 'Nem ismert'}{mark.reason && ` – ${mark.reason}`}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Jóváhagyások" hint="A jóváhagyás a megadott dátumra érvényes. Ha később módosul a téma, ismételd meg.">
        <div className="space-y-3">
          {TOPIC_IDS.filter((id) => id !== 'felulvizsgalat').map((id) => {
            const approval = p.approvals[id];
            const blockers = issues.filter((i) => i.topic === id && i.severity === 'blocker').length;
            return (
              <div key={id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-800">{topicLabel(id)}</p>
                {approval ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-emerald-800">Jóváhagyta: {approval.by}{approval.date && ` (${approval.date})`}</span>
                    <button type="button" className={buttonClass} onClick={() => setApproval(id, null)}>Visszavonás</button>
                  </div>
                ) : (
                  <ApprovalForm disabledReason={blockers > 0 ? `${blockers} blokkoló hiány miatt nem hagyható jóvá.` : ''} onApprove={(by) => setApproval(id, { by, date: today() })} />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ApprovalForm({ onApprove, disabledReason }: { onApprove: (by: string) => void; disabledReason: string }) {
  return (
    <form
      className="mt-2 flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem('approver') as HTMLInputElement;
        if (input.value.trim()) { onApprove(input.value.trim()); input.value = ''; }
      }}
    >
      <input name="approver" className={inputClass} placeholder="Jóváhagyó neve" aria-label="Jóváhagyó neve" disabled={!!disabledReason} />
      <button type="submit" className={buttonClass} disabled={!!disabledReason}>Jóváhagyom</button>
      {disabledReason && <span className="self-center text-xs text-red-700">{disabledReason}</span>}
    </form>
  );
}
