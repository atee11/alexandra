'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';

const EXTERNAL_OPTIONS = [
  { id: 'email',    label: 'E-mail küldés',              desc: 'pl. értesítések, regisztráció-visszaigazolás' },
  { id: 'files',    label: 'Fájlfeltöltés',              desc: 'PDF-ek, képek, dokumentumok tárolása' },
  { id: 'api',      label: 'API / más rendszer kapcsolat',desc: 'CRM, ERP, külső adatforrás' },
  { id: 'gdpr',     label: 'GDPR / személyes adatok',    desc: 'nevek, e-mail címek, naplózás kötelezettsége' },
  { id: 'audit',    label: 'Audit trail',                desc: 'ki mikor mit változtatott — visszakövethetőség' },
  { id: 'schedule', label: 'Ütemezett publikálás',       desc: 'tartalom megjelenjen/eltűnjön meghatározott időpontban' },
];

export function ExternalStep() {
  const router = useRouter();
  const { project, markStepComplete, setExternalSelections } = useProjectStore();
  const [selected, setSelected] = useState<string[]>(project.externalSelections);
  const [notes, setNotes] = useState('');

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    setExternalSelections(next);
  }

  function handleFinish() {
    markStepComplete('external');
    router.push('/wizard/summary');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Külső kapcsolatok és korlátok</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Pipáld be ami releváns a projekthez — ezek alapján kerülnek be az összefoglalóba.
        </p>
      </div>

      <div className="space-y-2">
        {EXTERNAL_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className={cn(
              'flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all',
              selected.includes(opt.id)
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white',
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 accent-blue-600 w-4 h-4"
              checked={selected.includes(opt.id)}
              onChange={() => toggle(opt.id)}
            />
            <div>
              <span className="text-sm font-medium text-gray-900">{opt.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Egyéb megjegyzés (opcionális)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="pl. GDPR szerint 5 évig kell megőrizni az adatokat..."
          rows={3}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 mb-4 text-center">
          Ez az utolsó szekció — ezután letölthető az összefoglaló.
        </p>
        <button
          onClick={handleFinish}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all shadow-sm"
        >
          <Download size={18} />
          Összefoglaló és letöltés
        </button>
      </div>
    </div>
  );
}
