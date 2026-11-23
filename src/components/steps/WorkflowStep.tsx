'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import type { Workflow, WorkflowState, WorkflowTransition } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getTemplateForProjectTypes } from '@/lib/site-type-templates';
import { Plus, Trash2, ArrowRight, Sparkles } from 'lucide-react';

const DEFAULT_STATES: Omit<WorkflowState, 'id'>[] = [
  { label: 'Vázlat',             isPublished: false },
  { label: 'Jóváhagyásra vár',   isPublished: false },
  { label: 'Publikált',          isPublished: true  },
  { label: 'Visszaküldve',       isPublished: false },
];

export function WorkflowStep() {
  const router = useRouter();
  const { project, setWorkflows, markStepComplete } = useProjectStore();

  // Get template workflow from site-type-templates
  const projectTypes = project.contextAnswers?.projectTypes ?? [];
  const templateWorkflow = useMemo(() => {
    if (projectTypes.length === 0) return null;
    const wf = getTemplateForProjectTypes(projectTypes).workflows[0];
    return wf ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectTypes.join(',')]);

  // Smart defaults: use template if no saved workflow
  const getDefaultStates = (): WorkflowState[] => {
    if (templateWorkflow?.states.length) return templateWorkflow.states.map((s) => ({ ...s }));
    return [
      { id: crypto.randomUUID(), label: 'Vázlat',           isPublished: false },
      { id: crypto.randomUUID(), label: 'Jóváhagyásra vár', isPublished: false },
      { id: crypto.randomUUID(), label: 'Publikált',        isPublished: true  },
      { id: crypto.randomUUID(), label: 'Visszaküldve',     isPublished: false },
    ];
  };

  const getDefaultTransitions = (): WorkflowTransition[] => {
    if (!templateWorkflow?.transitions.length) return [];
    // Map template role IDs to actual project role IDs by matching role index
    // Since roles were likely added from the same template, try to match by position
    return templateWorkflow.transitions.map((t) => ({
      id:           crypto.randomUUID(),
      from:         t.from,
      to:           t.to,
      label:        t.label,
      allowedRoles: project.roles.map((r) => r.id), // all roles by default, user refines
    }));
  };

  const [hasWorkflow, setHasWorkflow] = useState<boolean | null>(
    project.workflows.length > 0 ? true : null,
  );

  const [appliesTo, setAppliesTo] = useState<string[]>(
    project.workflows[0]?.appliesTo ??
    project.entities.filter((e) => e.type === 'content').map((e) => e.id),
  );

  const [states, setStates] = useState<WorkflowState[]>(
    project.workflows[0]?.states ?? getDefaultStates(),
  );

  const [transitions, setTransitions] = useState<WorkflowTransition[]>(
    project.workflows[0]?.transitions ?? getDefaultTransitions(),
  );

  const [newStateName, setNewStateName] = useState('');
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');

  const usingTemplate = !project.workflows.length && !!templateWorkflow;

  function addState() {
    if (!newStateName.trim()) return;
    setStates([...states, {
      id: crypto.randomUUID(),
      label: newStateName.trim(),
      isPublished: false,
    }]);
    setNewStateName('');
  }

  function addTransition() {
    if (!newFrom || !newTo || newFrom === newTo) return;
    const fromLabel = states.find((s) => s.id === newFrom)?.label ?? '';
    const toLabel   = states.find((s) => s.id === newTo)?.label ?? '';
    setTransitions([...transitions, {
      id: crypto.randomUUID(),
      from: newFrom,
      to: newTo,
      label: `${fromLabel} → ${toLabel}`,
      allowedRoles: project.roles.map((r) => r.id),
    }]);
    setNewFrom(''); setNewTo('');
  }

  function toggleTransitionRole(transId: string, roleId: string) {
    setTransitions(transitions.map((t) => {
      if (t.id !== transId) return t;
      const has = t.allowedRoles.includes(roleId);
      return {
        ...t,
        allowedRoles: has
          ? t.allowedRoles.filter((r) => r !== roleId)
          : [...t.allowedRoles, roleId],
      };
    }));
  }

  function handleContinue() {
    if (hasWorkflow === false) {
      setWorkflows([]);
      markStepComplete('workflow');
      router.push('/wizard/permissions');
      return;
    }
    if (!appliesTo.length || !states.length) return;
    const workflow: Workflow = {
      id: crypto.randomUUID(),
      label: 'Fő workflow',
      appliesTo,
      states,
      transitions,
    };
    setWorkflows([workflow]);
    markStepComplete('workflow');
    router.push('/wizard/permissions');
  }

  const canContinue = hasWorkflow === false || (hasWorkflow === true && appliesTo.length > 0 && states.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Jóváhagyási folyamat</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Mielőtt egy tartalom megjelenik az oldalon, kell-e valakinek jóváhagynia?
        </p>
      </div>

      {/* Template betöltve jelzés */}
      {usingTemplate && hasWorkflow === null && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          <Sparkles size={13} className="shrink-0" />
          A projektípus alapján előre betöltött állapotokat és átmeneteket javaslunk — szerkesztheted őket.
        </div>
      )}

      {/* Yes/No */}
      <div className="space-y-2">
        {[
          { value: true,  label: 'Igen, van jóváhagyási folyamat',    desc: 'pl. vázlat → jóváhagyásra → publikált' },
          { value: false, label: 'Nem, tartalom közvetlenül megjelenik', desc: 'bárki azonnal publikálhat' },
        ].map((opt) => (
          <label key={String(opt.value)} className={cn(
            'flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all gradient-card',
            hasWorkflow === opt.value ? 'gradient-card--selected' : 'gradient-card',
          )}>
            <input type="radio" className="mt-0.5 accent-blue-600" checked={hasWorkflow === opt.value}
              onChange={() => setHasWorkflow(opt.value)} />
            <div>
              <span className="text-sm font-medium text-gray-900">{opt.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {hasWorkflow === true && (
        <>
          {/* Which entities */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Melyik adattípusokra vonatkozik?</p>
            <div className="space-y-1.5">
              {project.entities.map((entity) => (
                <label key={entity.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="accent-blue-600"
                    checked={appliesTo.includes(entity.id)}
                    onChange={(e) => setAppliesTo(
                      e.target.checked ? [...appliesTo, entity.id] : appliesTo.filter((id) => id !== entity.id),
                    )} />
                  <span className="text-sm text-gray-700">{entity.label || '(névtelen adattípus)'}</span>
                </label>
              ))}
              {!project.entities.length && (
                <p className="text-xs text-gray-400 italic">Még nincs adattípus megadva</p>
              )}
            </div>
          </div>

          {/* States */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Állapotok</p>
            <div className="space-y-1.5 mb-2">
              {states.map((state) => (
                <div key={state.id} className="flex items-center gap-2">
                  <div className={cn(
                    'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
                    state.isPublished ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700',
                  )}>
                    <span>{state.label}</span>
                    {state.isPublished && <span className="text-xs text-green-600 ml-auto">✓ nyilvános</span>}
                  </div>
                  <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap cursor-pointer">
                    <input type="checkbox" className="accent-green-600" checked={state.isPublished}
                      onChange={(e) => setStates(states.map((s) =>
                        s.id === state.id ? { ...s, isPublished: e.target.checked } : s,
                      ))} />
                    nyilvános
                  </label>
                  <button onClick={() => setStates(states.filter((s) => s.id !== state.id))}
                    className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Új állapot neve" value={newStateName}
                onChange={(e) => setNewStateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addState()}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button onClick={addState} disabled={!newStateName.trim()}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  newStateName.trim() ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-300 cursor-not-allowed',
                )}>
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Transitions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Lépések — ki léphet tovább?</p>
            <div className="space-y-2 mb-2">
              {transitions.map((t) => (
                <div key={t.id} className="p-3 border border-gray-200 rounded-xl bg-white space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                      {states.find((s) => s.id === t.from)?.label}
                    </span>
                    <ArrowRight size={14} className="text-gray-400" />
                    <span className="px-2 py-0.5 bg-blue-50 rounded text-blue-600">
                      {states.find((s) => s.id === t.to)?.label}
                    </span>
                    <button onClick={() => setTransitions(transitions.filter((x) => x.id !== t.id))}
                      className="ml-auto text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">Ki teheti meg:</span>
                    {project.roles.map((role) => (
                      <label key={role.id} className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" className="accent-blue-600"
                          checked={t.allowedRoles.includes(role.id)}
                          onChange={() => toggleTransitionRole(t.id, role.id)} />
                        {role.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {states.length >= 2 && (
              <div className="flex items-center gap-2">
                <select value={newFrom} onChange={(e) => setNewFrom(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Honnan?</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <ArrowRight size={14} className="text-gray-400 shrink-0" />
                <select value={newTo} onChange={(e) => setNewTo(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Hova?</option>
                  {states.filter((s) => s.id !== newFrom).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button onClick={addTransition} disabled={!newFrom || !newTo}
                  className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    newFrom && newTo ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-300 cursor-not-allowed',
                  )}>
                  <Plus size={15} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <button onClick={handleContinue} disabled={!canContinue}
        className={cn('w-full py-3 rounded-xl font-medium text-sm transition-all',
          canContinue ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-100 text-gray-300 cursor-not-allowed',
        )}>
        Tovább — ki mit tehet? →
      </button>
    </div>
  );
}
