'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'Angol (English)' },
  { code: 'de', label: 'Német (Deutsch)' },
  { code: 'fr', label: 'Francia (Français)' },
  { code: 'sk', label: 'Szlovák (Slovenčina)' },
  { code: 'ro', label: 'Román (Română)' },
  { code: 'hr', label: 'Horvát (Hrvatski)' },
];

const URL_STRATEGIES = [
  { id: 'prefix',    label: '/hu/cikk, /en/article',   desc: 'URL előtag per nyelv (ajánlott)' },
  { id: 'domain',    label: 'hu.oldal.hu, en.oldal.hu', desc: 'Aldomain per nyelv' },
  { id: 'directory', label: 'oldal.hu/hu/, oldal.hu/en/', desc: 'Alkönyvtár per nyelv' },
];

export function LanguagesStep() {
  const router = useRouter();
  const { project, markStepComplete } = useProjectStore();
  const cal = project.calibration;

  const [defaultLang]         = useState(project.meta.language ?? 'hu');
  const [additionalLangs, setAdditionalLangs] = useState<string[]>([]);
  const [urlStrategy, setUrlStrategy]         = useState('prefix');
  const [translateContent, setTranslateContent] = useState(true);
  const [translateUI,      setTranslateUI]      = useState(true);

  function toggleLang(code: string) {
    setAdditionalLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  }

  function handleContinue() {
    markStepComplete('languages');
    // Navigate to next visible step
    const vis = project.calibration ? [] : [];
    router.push('/wizard/migration');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Többnyelvűség</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Alap nyelv: <strong>Magyar (hu)</strong> — ez már be van állítva.
          Konfiguráld a további nyelveket és az URL stratégiát.
        </p>
      </div>

      {/* Additional languages */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">
          Milyen további nyelvek kellenek?
        </p>
        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <label key={lang.code} className={cn(
              'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all gradient-card',
              additionalLangs.includes(lang.code) ? 'gradient-card--selected' : 'gradient-card',
            )}>
              <input type="checkbox" className="accent-blue-600 w-4 h-4"
                checked={additionalLangs.includes(lang.code)}
                onChange={() => toggleLang(lang.code)} />
              <span className="text-sm text-gray-800">{lang.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* URL strategy */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">URL struktúra</p>
        <div className="space-y-2">
          {URL_STRATEGIES.map((s) => (
            <label key={s.id} className={cn(
              'flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all gradient-card',
              urlStrategy === s.id ? 'gradient-card--selected' : 'gradient-card',
            )}>
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                urlStrategy === s.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300')}>
                {urlStrategy === s.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900 font-mono">{s.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Translation scope */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800 mb-2">Mit kell fordítani?</p>
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-gray-300 bg-white">
          <input type="checkbox" className="accent-blue-600 w-4 h-4" checked={translateContent} onChange={(e) => setTranslateContent(e.target.checked)} />
          <div>
            <span className="text-sm font-medium text-gray-900">Tartalom fordítás</span>
            <p className="text-xs text-gray-500">Cikkek, oldalak, kategóriák — minden entitás fordítható lesz</p>
          </div>
        </label>
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-gray-300 bg-white">
          <input type="checkbox" className="accent-blue-600 w-4 h-4" checked={translateUI} onChange={(e) => setTranslateUI(e.target.checked)} />
          <div>
            <span className="text-sm font-medium text-gray-900">Felület fordítás</span>
            <p className="text-xs text-gray-500">Drupal admin felület, gombok, rendszerüzenetek</p>
          </div>
        </label>
      </div>

      <button onClick={handleContinue}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
        Mentés és tovább →
      </button>
    </div>
  );
}
