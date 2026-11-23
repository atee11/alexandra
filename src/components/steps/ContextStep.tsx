'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const PROJECT_TYPES = [
  { id: 'marketing', label: 'Marketing / céges bemutatkozó', desc: 'Nyilvános oldal, amely ügyfeleket szólít meg és bizalmat épít' },
  { id: 'news',      label: 'Hírportál / médiaoldal',       desc: 'Rendszeres cikkek, kategóriák, szerzők — tartalom-intenzív oldal' },
  { id: 'intranet',  label: 'Belső intranet',               desc: 'Csak a csapatnak: dokumentumok, hírek, folyamatok, HR' },
  { id: 'docs',      label: 'Dokumentáció / tudásbázis',    desc: 'Strukturált tudásanyag, könnyen kereshető és frissíthető' },
  { id: 'community', label: 'Közösségi / tagsági platform', desc: 'Regisztrált felhasználók, tagság, felhasználói tartalmak' },
  { id: 'events',    label: 'Rendezvény- és eseménykezelő', desc: 'Eseménynaptár, regisztráció, helyszínek, időpontok' },
  { id: 'catalog',   label: 'Termék- vagy szolgáltatáskatalógus', desc: 'Rendezett, szűrhető lista — nem webshop, csak bemutató' },
  { id: 'custom',    label: 'Egyedi / más típusú rendszer', desc: 'Fent nem szereplő, speciális igény' },
];

const PAIN_OPTIONS = [
  { id: 'dev_needed',  label: 'Minden változtatáshoz fejlesztő kell',  desc: 'Szöveg, kép, ár — semmi nem frissíthető belső erőforrás nélkül' },
  { id: 'outdated',    label: 'Az oldal elavult és nem mobilbarát',     desc: 'Lassú betöltés, régi kinézet, rossz felhasználói élmény' },
  { id: 'no_process',  label: 'Kaotikus, átláthatatlan folyamat',       desc: 'Nincs szabály: kire mi kerül ki — mindenki máshogy csinálja' },
  { id: 'no_access',   label: 'Rossz jogosultságkezelés',               desc: 'Mindenki mindent lát, vagy mindenki mindenhez hozzáfér' },
  { id: 'scattered',   label: 'Szétszórt adatok és tartalmak',          desc: 'Emailek, Excel fájlok, mappák — nehéz összeszedni és naprakészen tartani' },
];

const GOAL_OPTIONS = [
  { id: 'modern_presence', label: 'Modern, meggyőző online jelenlét',        desc: 'Az oldal tükrözze a márkát, legyen átlátható és keltsen bizalmat' },
  { id: 'self_service',    label: 'Önálló tartalomkezelés',                  desc: 'A csapat fejlesztő nélkül, saját maga frissítse az oldalt' },
  { id: 'leads',           label: 'Ügyfelek és leadek szerzése',             desc: 'A látogatókból érdeklődőket és vásárlókat kell generálni' },
  { id: 'internal_ops',    label: 'Belső folyamatok és csapatkommunikáció',  desc: 'Dokumentumok, jóváhagyások, feladatok — egy helyen, átláthatóan' },
  { id: 'content_scale',   label: 'Nagy tartalom- vagy adatmennyiség',       desc: 'Rendezett katalógus, kereshetőség, szűrők, archívum' },
  { id: 'compliance',      label: 'Biztonság, hozzáférések és kontroll',     desc: 'Ki mit lát és szerkeszthet — jogosultságok, változáskövetés' },
];

export function ContextStep() {
  const router = useRouter();
  const { project, setProjectLabel, setContext, setContextAnswers, markStepComplete } = useProjectStore();
  const saved = project.contextAnswers;

  // Derived from Step 0: if hasMigration=true → existing system → show pain options
  const hasMigration = project.calibration?.hasMigration ?? false;

  const [label,        setLabel]        = useState(project.meta.label);
  const [projectTypes, setProjectTypes] = useState<string[]>(saved?.projectTypes ?? []);
  const [pains,        setPains]        = useState<string[]>(saved?.pains ?? []);
  const [goals,        setGoals]        = useState<string[]>(saved?.goals ?? []);

  const isComplete =
    label.trim().length >= 3 &&
    projectTypes.length >= 1 &&
    (!hasMigration || pains.length >= 1) &&
    goals.length >= 1;

  function toggleMulti(id: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function handleContinue() {
    if (!isComplete) return;
    const typeText = projectTypes.map((id) => PROJECT_TYPES.find((o) => o.id === id)?.label).join(', ');
    const painText = !hasMigration ? 'Zöldmezős projekt' : pains.map((id) => PAIN_OPTIONS.find((o) => o.id === id)?.label).join('; ');
    const goalText = goals.map((id) => GOAL_OPTIONS.find((o) => o.id === id)?.label).join(', ');
    setContextAnswers({ projectTypes, pains, goals });
    setProjectLabel(label.trim());
    setContext(`Típus: ${typeText}\nKiindulópont: ${painText}\nCélok: ${goalText}`);
    markStepComplete('context');
    router.push('/wizard/roles');
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kontextus és cél</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Még semmi technikai — csak az üzleti helyzet.
        </p>
      </div>

      {/* Projekt neve */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          Mi a projekt neve? *
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="pl. Vállalati Weboldal, Hírportál, Dokumentumtár"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Projekt típusa */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-1.5">
          Milyen rendszert építünk? *{' '}
          <span className="font-normal text-gray-400">(több is választható)</span>
        </p>
        <div className="space-y-2">
          {PROJECT_TYPES.map((opt) => (
            <label key={opt.id} className={cn(
              'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all gradient-card',
              projectTypes.includes(opt.id) ? 'gradient-card--selected' : 'gradient-card',
            )}>
              <input type="checkbox" className="accent-blue-600 w-4 h-4 shrink-0"
                checked={projectTypes.includes(opt.id)}
                onChange={() => toggleMulti(opt.id, projectTypes, setProjectTypes)} />
              <div>
                <p className="text-sm font-medium text-gray-800 leading-snug">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Probléma — csak ha van meglévő rendszer */}
      {hasMigration && (
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-1">
          Mi a fő probléma a jelenlegi megoldással? *{' '}
          <span className="font-normal text-gray-400">(több is választható)</span>
        </p>
        <div className="space-y-2">
          {PAIN_OPTIONS.map((opt) => (
            <label key={opt.id} className={cn(
              'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all gradient-card',
              pains.includes(opt.id) ? 'gradient-card--selected' : 'gradient-card',
            )}>
              <input type="checkbox" className="accent-blue-600 w-4 h-4 shrink-0"
                checked={pains.includes(opt.id)}
                onChange={() => toggleMulti(opt.id, pains, setPains)} />
              <div>
                <p className="text-sm font-medium text-gray-800 leading-snug">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      )}

      {/* Célok */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-1.5">
          Mi a legfontosabb, amit el szeretnél érni? *{' '}
          <span className="font-normal text-gray-400">(több is választható)</span>
        </p>
        <div className="space-y-2">
          {GOAL_OPTIONS.map((opt) => (
            <label key={opt.id} className={cn(
              'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all gradient-card',
              goals.includes(opt.id) ? 'gradient-card--selected' : 'gradient-card',
            )}>
              <input type="checkbox" className="accent-blue-600 w-4 h-4 shrink-0"
                checked={goals.includes(opt.id)}
                onChange={() => toggleMulti(opt.id, goals, setGoals)} />
              <div>
                <p className="text-sm font-medium text-gray-800 leading-snug">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!isComplete}
        className={cn(
          'w-full py-3 rounded-xl font-medium text-sm transition-all',
          isComplete
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed',
        )}
      >
        Tovább a szereplőkhöz →
      </button>
    </div>
  );
}
