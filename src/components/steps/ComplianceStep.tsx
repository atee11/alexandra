'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const COMPLIANCE_OPTIONS = [
  {
    id: 'gdpr',
    label: 'GDPR megfelelőség',
    desc: 'Személyes adatok kezelése, törlési jog, adatmegőrzési szabályzat szükséges.',
  },
  {
    id: 'audit',
    label: 'Visszakövethetőség (ki mit változtatott)',
    desc: 'Minden módosítás naplózva — ellenőrizhető, ki mikor mit módosított.',
  },
  {
    id: 'revisions',
    label: 'Korábbi verziók visszaállítása',
    desc: 'Minden tartalom korábbi állapotra visszaállítható.',
  },
  {
    id: 'data_retention',
    label: 'Adatmegőrzési időkorlát',
    desc: 'Meghatározott idő után törlendők az adatok (pl. GDPR alapján).',
  },
];

export function ComplianceStep() {
  const router = useRouter();
  const { project, markStepComplete } = useProjectStore();

  const saved = project.compliance;
  const [selected, setSelected]         = useState<string[]>(() => {
    const s: string[] = [];
    if (saved?.auditLog)         s.push('audit');
    if (saved?.revisionHistory)  s.push('revisions');
    if (saved?.gdprPersonalData?.length) s.push('gdpr');
    if (saved?.dataRetentionDays) s.push('data_retention');
    return s;
  });
  const [retentionDays, setRetentionDays] = useState(saved?.dataRetentionDays?.toString() ?? '365');
  const [gdprFields,    setGdprFields]    = useState(saved?.gdprPersonalData?.join(', ') ?? '');

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleContinue() {
    markStepComplete('compliance');
    router.push('/wizard/external');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Megfelelőség és adatkezelés</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Milyen jogi és szervezeti követelmények vonatkoznak a rendszerre?
        </p>
      </div>

      <div className="space-y-2">
        {COMPLIANCE_OPTIONS.map((opt) => (
          <label key={opt.id} className={cn(
            'flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all gradient-card',
            selected.includes(opt.id) ? 'gradient-card--selected' : 'gradient-card',
          )}>
            <input type="checkbox" className="accent-blue-600 w-4 h-4 mt-0.5 shrink-0"
              checked={selected.includes(opt.id)} onChange={() => toggle(opt.id)} />
            <div>
              <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {selected.includes('data_retention') && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Adatmegőrzési időszak (nap)
          </label>
          <input type="number" value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)}
            placeholder="365"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {selected.includes('gdpr') && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Személyes adatokat tartalmazó mezők
          </label>
          <input type="text" value={gdprFields} onChange={(e) => setGdprFields(e.target.value)}
            placeholder="pl. e-mail cím, név, telefonszám"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-gray-400 mt-1">Vesszővel elválasztva</p>
        </div>
      )}

      <button onClick={handleContinue}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
        Mentés és tovább →
      </button>
    </div>
  );
}
