'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

const TRIGGER_LABELS: Record<string, string> = {
  workflow_transition: 'Jóváhagyásra küldéskor (állapotváltás)',
  content_created:    'Új tartalom feltöltésekor',
  content_updated:    'Tartalom módosításakor',
};

export function NotificationsStep() {
  const router = useRouter();
  const { project, markStepComplete } = useProjectStore();

  type RuleForm = { trigger: string; notifyRoles: string[]; channel: 'email' | 'in_app' };

  const [rules, setRules] = useState<RuleForm[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTrigger, setNewTrigger] = useState('workflow_transition');
  const [newRoles, setNewRoles]     = useState<string[]>([]);
  const [newChannel, setNewChannel] = useState<'email' | 'in_app'>('email');

  function toggleRole(id: string) {
    setNewRoles((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function addRule() {
    if (!newRoles.length) return;
    setRules([...rules, { trigger: newTrigger, notifyRoles: newRoles, channel: newChannel }]);
    setNewTrigger('workflow_transition');
    setNewRoles([]);
    setNewChannel('email');
    setAdding(false);
  }

  function handleContinue() {
    markStepComplete('notifications');
    router.push('/wizard/external');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Értesítések</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Ki kapjon értesítést milyen esemény esetén?
        </p>
      </div>

      {/* Existing rules */}
      <div className="space-y-2">
        {rules.map((rule, i) => {
          const roleLabels = rule.notifyRoles
            .map((id) => project.roles.find((r) => r.id === id)?.label ?? id)
            .join(', ');
          return (
            <div key={i} className="flex items-start gap-3 p-3.5 bg-white border border-gray-200 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{TRIGGER_LABELS[rule.trigger] ?? rule.trigger}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Értesített: <strong>{roleLabels || '—'}</strong> · {rule.channel === 'email' ? 'E-mail' : 'Appban'}
                </p>
              </div>
              <button onClick={() => setRules(rules.filter((_, j) => j !== i))}
                className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add rule form */}
      {adding ? (
        <div className="p-4 border-2 border-blue-200 bg-blue-50/30 rounded-xl space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Esemény</label>
            <select value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ki kapja az értesítést?</label>
            <div className="space-y-1.5">
              {project.roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-blue-600"
                    checked={newRoles.includes(r.id)}
                    onChange={() => toggleRole(r.id)} />
                  <span className="text-sm text-gray-700">{r.label}</span>
                </label>
              ))}
              {!project.roles.length && <p className="text-xs text-gray-400 italic">Még nincsenek felhasználói csoportok</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Csatorna</label>
              <select value={newChannel} onChange={(e) => setNewChannel(e.target.value as 'email' | 'in_app')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="email">E-mail</option>
                <option value="in_app">Értesítés az oldalon belül</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addRule} disabled={!newRoles.length}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                newRoles.length ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-300 cursor-not-allowed')}>
              Hozzáadás
            </button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">
              Mégsem
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
          <Plus size={16} /> Értesítési szabály hozzáadása
        </button>
      )}

      <button onClick={handleContinue}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
        Mentés és tovább →
      </button>
    </div>
  );
}
