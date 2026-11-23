'use client';
import { createContext, forwardRef, useContext, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOPIC_BY_ID } from '@/lib/sysorg/topics';
import { useSysorgStore } from '@/lib/sysorg/store';
import type { SysorgProject, TopicId } from '@/lib/sysorg/schema';

export function useProject(): SysorgProject {
  const project = useSysorgStore((s) => s.project);
  if (!project) throw new Error('Nincs aktív rendszerszervezési projekt.');
  return project;
}

const TopicContext = createContext<TopicId>('keret');
export const TopicProvider = TopicContext.Provider;

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50';

export const buttonClass =
  'studio-focus inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
export const primaryButtonClass =
  'studio-focus studio-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50';

export function Card({ title, hint, children, className }: { title?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white p-5 sm:p-6', className)}>
      {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
      {hint && <p className="mt-1 text-sm leading-6 text-slate-500">{hint}</p>}
      <div className={cn('space-y-5', (title || hint) && 'mt-5')}>{children}</div>
    </section>
  );
}

interface FieldShellProps {
  label: string;
  hint?: string;
  /** Egyedi kulcs; ha megadott, a mező megjelölhető „nem ismert” / „nem alkalmazható” állapotúnak. */
  unknownKey?: string;
  context?: string;
  required?: boolean;
  children: (props: { id: string; describedBy?: string }) => ReactNode;
}

export function Field({ label, hint, unknownKey, context, required, children }: FieldShellProps) {
  const id = useId();
  const topic = useContext(TopicContext);
  const mark = useSysorgStore((s) => (unknownKey ? s.project?.unknowns[unknownKey] : undefined));
  const setUnknown = useSysorgStore((s) => s.setUnknown);
  const hintId = hint ? `${id}-hint` : undefined;

  const set = (state: 'unknown' | 'na') =>
    unknownKey && setUnknown(unknownKey, {
      state, reason: mark?.reason ?? '', topic, label: [context, label].filter(Boolean).join(' › '),
    });

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="text-sm font-medium text-slate-800">
          {label}{required && <span className="ml-0.5 text-violet-600" aria-hidden="true"> *</span>}
        </label>
        {unknownKey && !mark && (
          <span className="flex gap-3 text-xs text-slate-400">
            <button type="button" onClick={() => set('unknown')} aria-label={`${label}: megjelölés ismeretlenként`} className="studio-focus rounded hover:text-violet-700">Nem ismert</button>
            <button type="button" onClick={() => set('na')} aria-label={`${label}: megjelölés nem alkalmazhatóként`} className="studio-focus rounded hover:text-violet-700">Nem alkalmazható</button>
          </span>
        )}
      </div>
      {hint && <p id={hintId} className="mb-2 text-xs leading-5 text-slate-500">{hint}</p>}
      {mark && unknownKey ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-800"><HelpCircle size={15} aria-hidden="true" />{mark.state === 'na' ? 'Nem alkalmazható' : 'Nem ismert'}</span>
            <button type="button" onClick={() => setUnknown(unknownKey, null)} className="studio-focus rounded text-xs text-slate-600 hover:text-violet-700">Mégis kitöltöm</button>
          </div>
          <input
            id={id}
            className={cn(inputClass, 'mt-2')}
            value={mark.reason}
            placeholder={mark.state === 'na' ? 'Miért nem alkalmazható?' : 'Ki tudja megmondani? Mikorra tisztázható?'}
            onChange={(e) => setUnknown(unknownKey, { ...mark, reason: e.target.value })}
            aria-describedby={hintId}
          />
        </div>
      ) : children({ id, describedBy: hintId })}
    </div>
  );
}

interface TextFieldProps extends Omit<FieldShellProps, 'children'> {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  type?: 'text' | 'date';
}

export function TextField({ value, onChange, multiline, rows = 3, placeholder, type = 'text', ...shell }: TextFieldProps) {
  return (
    <Field {...shell}>
      {({ id, describedBy }) => multiline ? (
        <textarea id={id} aria-describedby={describedBy} className={cn(inputClass, 'resize-y leading-6')} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} aria-describedby={describedBy} type={type} className={inputClass} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

interface SelectFieldProps<T extends string> extends Omit<FieldShellProps, 'children'> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  emptyLabel?: string;
}

export function SelectField<T extends string>({ value, onChange, options, emptyLabel, ...shell }: SelectFieldProps<T>) {
  return (
    <Field {...shell}>
      {({ id, describedBy }) => (
        <select id={id} aria-describedby={describedBy} className={inputClass} value={value} onChange={(e) => onChange(e.target.value as T)}>
          {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

export function CheckField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600" />
      <label htmlFor={id} className="text-sm text-slate-800">
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </label>
    </div>
  );
}

/** Több elem kiválasztása (pl. egy funkcióhoz kapcsolódó folyamatok). */
export function MultiPick({ label, hint, options, value, onChange, emptyText }: {
  label: string; hint?: string; options: { id: string; label: string }[]; value: string[];
  onChange: (ids: string[]) => void; emptyText: string;
}) {
  const legendId = useId();
  return (
    <div role="group" aria-labelledby={legendId}>
      <p id={legendId} className="mb-1.5 text-sm font-medium text-slate-800">{label}</p>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {options.length === 0 ? <p className="text-xs text-slate-500">{emptyText}</p> : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const on = value.includes(o.id);
            return (
              <button
                key={o.id} type="button" aria-pressed={on}
                onClick={() => onChange(on ? value.filter((id) => id !== o.id) : [...value, o.id])}
                className={cn('studio-focus rounded-lg border px-3 py-1.5 text-xs transition-colors',
                  on ? 'border-violet-300 bg-violet-50 font-medium text-violet-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
              >{o.label}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ItemCard({ code, title, subtitle, onRemove, onMove, defaultOpen = true, children }: {
  code?: string; title: string; subtitle?: string; onRemove: () => void;
  onMove?: (direction: -1 | 1) => void; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dialog = useRef<HTMLDialogElement>(null);
  const bodyId = useId();
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/40">
      <div className="flex items-center gap-2 p-3 sm:p-4">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={bodyId} className="studio-focus flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left">
          {open ? <ChevronUp size={16} className="shrink-0 text-slate-400" aria-hidden="true" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" aria-hidden="true" />}
          {code && <span className="shrink-0 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{code}</span>}
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-900">{title || 'Névtelen elem'}</span>
            {subtitle && <span className="block truncate text-xs text-slate-500">{subtitle}</span>}
          </span>
        </button>
        {onMove && (
          <span className="flex shrink-0">
            <button type="button" onClick={() => onMove(-1)} aria-label={`${title || 'Elem'}: mozgatás feljebb`} className="studio-focus rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"><ChevronUp size={15} aria-hidden="true" /></button>
            <button type="button" onClick={() => onMove(1)} aria-label={`${title || 'Elem'}: mozgatás lejjebb`} className="studio-focus rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"><ChevronDown size={15} aria-hidden="true" /></button>
          </span>
        )}
        <button type="button" onClick={() => dialog.current?.showModal()} aria-label={`${title || 'Elem'}: törlés`} className="studio-focus shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} aria-hidden="true" /></button>
      </div>
      {open && <div id={bodyId} className="space-y-5 border-t border-slate-200 bg-white p-4 sm:p-5 rounded-b-2xl">{children}</div>}
      <ConfirmDialog
        ref={dialog}
        title="Biztosan törlöd?"
        text={`„${title || 'Névtelen elem'}” és a hozzá kapcsolódó hivatkozások eltűnnek. Ez nem vonható vissza.`}
        confirmLabel="Törlés"
        onConfirm={onRemove}
      />
    </article>
  );
}

export const ConfirmDialog = forwardRef<HTMLDialogElement, {
  title: string; text: string; confirmLabel: string; onConfirm: () => void; tone?: 'danger' | 'primary';
  extra?: ReactNode;
}>(function ConfirmDialog({ title, text, confirmLabel, onConfirm, tone = 'danger', extra }, ref) {
  const id = useId();
  return (
    <dialog ref={ref} className="studio-reset-dialog rounded-2xl bg-white p-6 text-slate-900 sm:p-8" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
      <h2 id={`${id}-t`} className="text-xl font-semibold">{title}</h2>
      <p id={`${id}-d`} className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
      <div className="mt-6 flex flex-col gap-3">
        {extra}
        <form method="dialog"><button className={cn(buttonClass, 'w-full')}>Mégsem</button></form>
        <form method="dialog">
          <button
            onClick={onConfirm}
            className={cn('studio-focus w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white', tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700')}
          >{confirmLabel}</button>
        </form>
      </div>
    </dialog>
  );
});

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="studio-focus flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 px-4 py-3 text-sm font-medium text-violet-800 transition-colors hover:bg-violet-50">
      <Plus size={16} aria-hidden="true" />{children}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">{children}</p>;
}

export function Notice({ tone = 'info', children, onClose }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode; onClose?: () => void }) {
  const tones = {
    info: 'border-blue-100 bg-blue-50 text-blue-900', warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900', success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm leading-6', tones[tone])}>
      <div>{children}</div>
      {onClose && <button type="button" onClick={onClose} aria-label="Üzenet bezárása" className="studio-focus rounded p-1 opacity-70 hover:opacity-100"><X size={14} aria-hidden="true" /></button>}
    </div>
  );
}

export function PageHeader({ topic }: { topic: TopicId }) {
  const t = TOPIC_BY_ID[topic];
  return (
    <header className="mb-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-700">{t.number}. téma</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{t.label}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t.question} <span className="text-slate-500">{t.hint}</span></p>
    </header>
  );
}

export function nameOf(label: string, fallback: string) {
  return label.trim() || fallback;
}
