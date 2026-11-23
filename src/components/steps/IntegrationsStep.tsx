'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import type { Integration } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

const COMMON_SYSTEMS = [
  'CRM (Salesforce, HubSpot)',
  'ERP (SAP, Oracle)',
  'E-mail marketing (Mailchimp, Sendinblue)',
  'Google Analytics / GTM',
  'Fizetési rendszer (Barion, SimplePay)',
  'Dokumentumtár (SharePoint, Google Drive)',
  'Egyedi rendszer',
];

const DIRECTION_LABELS = {
  import:        'Import (adatok bekerülnek Drupalba)',
  export:        'Export (adatok kimennek Drupalból)',
  bidirectional: 'Kétirányú szinkronizáció',
};

export function IntegrationsStep() {
  const router = useRouter();
  const { project, markStepComplete } = useProjectStore();

  const [integrations, setIntegrations] = useState<Integration[]>(project.integrations);
  const [adding, setAdding]   = useState(false);
  const [newSystem, setNewSystem]     = useState('');
  const [newDir, setNewDir]           = useState<Integration['direction']>('export');
  const [newTrigger, setNewTrigger]   = useState('content_published');

  function addIntegration() {
    if (!newSystem.trim()) return;
    setIntegrations([...integrations, {
      id: crypto.randomUUID(),
      system: newSystem.trim(),
      direction: newDir,
      trigger: newTrigger,
    }]);
    setNewSystem(''); setNewDir('export'); setNewTrigger('content_published');
    setAdding(false);
  }

  function handleContinue() {
    markStepComplete('integrations');
    router.push('/wizard/external');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Integráció</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Milyen külső rendszerekkel kell kapcsolódni? Az AGENTS.md tartalmazza
          az integráció leírását az AI agent számára.
        </p>
      </div>

      {/* Existing integrations */}
      <div className="space-y-2">
        {integrations.map((integ) => (
          <div key={integ.id} className="flex items-start gap-3 p-3.5 bg-white border border-gray-200 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{integ.system}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {DIRECTION_LABELS[integ.direction]} · Trigger: {integ.trigger}
              </p>
            </div>
            <button onClick={() => setIntegrations(integrations.filter((x) => x.id !== integ.id))}
              className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding ? (
        <div className="p-4 border-2 border-blue-200 bg-blue-50/30 rounded-xl space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Rendszer neve</label>
            <input type="text" value={newSystem} onChange={(e) => setNewSystem(e.target.value)}
              placeholder="pl. Salesforce CRM"
              list="common-systems"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            <datalist id="common-systems">
              {COMMON_SYSTEMS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Irány</label>
              <select value={newDir} onChange={(e) => setNewDir(e.target.value as Integration['direction'])}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {Object.entries(DIRECTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Mikor?</label>
              <select value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="content_published">Tartalom publikálásakor</option>
                <option value="content_created">Tartalom létrehozásakor</option>
                <option value="content_updated">Tartalom módosításakor</option>
                <option value="scheduled">Ütemezetten (cron)</option>
                <option value="manual">Manuálisan (admin gomb)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addIntegration} disabled={!newSystem.trim()}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                newSystem.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-300 cursor-not-allowed')}>
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
          <Plus size={16} /> Integráció hozzáadása
        </button>
      )}

      <button onClick={handleContinue}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
        Mentés és tovább →
      </button>
    </div>
  );
}
