'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import type { CalibrationAnswers, WizardStep } from '@/lib/types';
import { CORE_STEPS } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Option<T> = { value: T; label: string; description: string };

const USER_COUNT_OPTIONS: Option<CalibrationAnswers['editorCount']>[] = [
  { value: 'few',   label: 'Kis csapat',    description: '1–5 szerkesztő / tartalomfeltöltő' },
  { value: 'team',  label: 'Közepes csapat', description: '5–20 szerkesztő' },
  { value: 'large', label: 'Nagy szervezet', description: '20+ szerkesztő, esetleg külön szerkesztőségek' },
];

const VISIBILITY_OPTIONS: Option<CalibrationAnswers['visibility']>[] = [
  { value: 'internal', label: 'Csak belső', description: 'Intranet, csak munkatársak látják' },
  { value: 'public',   label: 'Nyilvános',  description: 'Bárki elérheti az interneten' },
  { value: 'both',     label: 'Mindkettő',  description: 'Van belső és nyilvános rész is' },
];

const EXT_OPTIONS: Option<boolean>[] = [
  { value: false, label: 'Nem',       description: 'Önálló rendszer, nincs külső kapcsolat' },
  { value: true,  label: 'Igen',      description: 'Meglévő rendszerekhez kell kapcsolódni' },
];

const THEME_APPROACH_OPTIONS: Option<'custom' | 'contrib' | 'none'>[] = [
  { value: 'none',    label: 'Nem kell egyedi arculat',          description: 'Belső rendszer vagy adminisztrációs felület — a szabványos megjelenés elegendő' },
  { value: 'custom',  label: 'Teljesen egyedi megjelenést tervezünk', description: 'Grafikus tervek alapján egyedi arculat készül — a fejlesztői csomag tartalmazza a teljes fájlstruktúrát' },
  { value: 'contrib', label: 'Kész sablon alapján dolgozunk',    description: 'Egy elterjedt megjelenési sablont szabunk testre a márka arculatához' },
];

function RadioGroup<T>({
  label, options, value, onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-800 mb-3">{label}</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-3.5 p-4 rounded-xl cursor-pointer transition-all gradient-card',
              value === opt.value
              ? 'gradient-card--selected'
              : 'gradient-card',
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
              value === opt.value ? 'border-[#1875FC] bg-[#1875FC]' : 'border-gray-300',
            )}>
              {value === opt.value && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

export function CalibrationStep() {
  const router = useRouter();
  const { project, setCalibration, setVisibleSteps, markStepComplete } = useProjectStore();
  const saved = project.calibration;

  const [isHeadless,            setIsHeadless]            = useState<boolean | undefined>(saved?.isHeadless);
  const [editorCount,            setEditorCount]            = useState<CalibrationAnswers['editorCount'] | undefined>(saved?.editorCount);
  const [visibility,             setVisibility]             = useState<CalibrationAnswers['visibility'] | undefined>(saved?.visibility);
  const [hasExternalConnections, setHasExternalConnections] = useState<boolean | undefined>(saved?.hasExternalConnections);
  const [multilingual,           setMultilingual]           = useState<boolean | undefined>(saved?.multilingual);
  const [hasMigration,           setHasMigration]           = useState<boolean | undefined>(saved?.hasMigration);
  const [flexibleLayouts,        setFlexibleLayouts]        = useState<boolean | undefined>(saved?.flexibleLayouts);
  const [layoutEngine,           setLayoutEngine]           = useState<'paragraphs' | 'layout_builder' | undefined>(saved?.layoutEngine);
  const [themeApproach,          setThemeApproach]          = useState<'custom' | 'contrib' | 'none' | undefined>(saved?.themeApproach);
  const [themeMachineName,       setThemeMachineName]       = useState<string>(saved?.themeMachineName ?? '');

  const isComplete =
    isHeadless !== undefined &&
    editorCount !== undefined &&
    visibility !== undefined &&
    hasExternalConnections !== undefined &&
    multilingual !== undefined &&
    hasMigration !== undefined &&
    flexibleLayouts !== undefined &&
    (isHeadless === true || themeApproach !== undefined);

  function deriveLayoutEngine(): 'paragraphs' | 'layout_builder' | undefined {
    if (!flexibleLayouts) return undefined;
    // Marketing/landing page jellegű → Layout Builder, minden más → Paragraphs
    const projectTypes = project.contextAnswers?.projectTypes ?? [];
    const isMarketing = projectTypes.some((t) => ['marketing'].includes(t));
    return isMarketing ? 'layout_builder' : 'paragraphs';
  }

  function handleContinue() {
    if (!isComplete) return;

    const answers: CalibrationAnswers = {
      isHeadless, editorCount, visibility, hasExternalConnections, multilingual, hasMigration, flexibleLayouts,
      layoutEngine: flexibleLayouts ? (deriveLayoutEngine() ?? 'paragraphs') : undefined,
      themeApproach: isHeadless ? undefined : themeApproach,
      themeMachineName: themeApproach === 'custom' && themeMachineName.trim() ? themeMachineName.trim() : undefined,
    };

    const visible: WizardStep[] = [...CORE_STEPS];
    if (editorCount !== 'few') visible.push('search');
    visible.push('notifications');
    if (visibility === 'internal' || editorCount === 'large') visible.push('sso');
    if (multilingual) visible.push('languages');
    if (flexibleLayouts) visible.push('layouts');
    if (hasMigration) visible.push('migration');
    if (hasExternalConnections) visible.push('integrations');
    if (visibility === 'internal' || editorCount === 'large') visible.push('compliance');

    setCalibration(answers);
    setVisibleSteps(visible);
    markStepComplete('calibration');
    router.push('/wizard/context');
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Projekt kalibráció</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Néhány kérdés, hogy csak a releváns szekciókat mutassuk meg.
          Bármikor visszajöhetsz és módosíthatod.
        </p>
      </div>

      <RadioGroup
        label="0. A tartalom csak a weboldalon jelenik meg, vagy más helyen is szükséges?"
        options={[
          { value: false, label: 'Csak a weboldalon',       description: 'A rendszer egy weboldalat hajt meg — ez a tipikus eset.' },
          { value: true,  label: 'Más helyen is kell',      description: 'pl. mobilalkalmazás, külső portál vagy digitális kijelző is megkapja a tartalmat.' },
        ]}
        value={isHeadless}
        onChange={setIsHeadless}
      />

      <RadioGroup
        label="1. Kb. hány ember fog tartalmat szerkeszteni / feltölteni?"
        options={USER_COUNT_OPTIONS}
        value={editorCount}
        onChange={setEditorCount}
      />

      <RadioGroup
        label="2. Ez belső rendszer vagy nyilvános weboldal?"
        options={VISIBILITY_OPTIONS}
        value={visibility}
        onChange={setVisibility}
      />

      <RadioGroup
        label="3. Kell-e kapcsolódni meglévő rendszerekhez? (pl. céges login, CRM)"
        options={EXT_OPTIONS}
        value={hasExternalConnections}
        onChange={setHasExternalConnections}
      />

      <RadioGroup
        label="4. Kell-e a tartalom több nyelven megjelenni?"
        options={[
          { value: false, label: 'Nem, csak egy nyelv',         description: 'Minden tartalom egynyelvű' },
          { value: true,  label: 'Igen, legalább 2 nyelv kell', description: 'pl. magyar + angol, vagy több piaci nyelv' },
        ]}
        value={multilingual}
        onChange={setMultilingual}
      />

      <RadioGroup
        label="5. Van meglévő weboldal / rendszer, amelynek adatait át kell hozni?"
        options={[
          { value: false, label: 'Nem, teljesen új rendszer', description: 'Nulláról indulunk, nincs mit migrálni' },
          { value: true,  label: 'Igen, van mit áthozni',     description: 'Meglévő tartalom, felhasználók vagy adatok migrációja szükséges' },
        ]}
        value={hasMigration}
        onChange={setHasMigration}
      />

      <RadioGroup
        label="6. Kell-e, hogy a szerkesztők az oldalak elrendezését is szabadon alakíthassák?"
        options={[
          { value: false, label: 'Nem, fix sablonok elégségesek',  description: 'A szerkesztők csak a tartalmat szerkesztik (szöveg, kép) — az oldal szerkezete nem változik.' },
          { value: true,  label: 'Igen, rugalmas szerkesztés kell', description: 'A szerkesztők szekciókból, blokkokból összerakhatják az oldalakat.' },
        ]}
        value={flexibleLayouts}
        onChange={(v) => { setFlexibleLayouts(v); if (!v) setLayoutEngine(undefined); }}
      />

      {isHeadless === false && (
        <>
          <RadioGroup
            label="7. Hogyan tervezi a weboldal arculatát?"
            options={THEME_APPROACH_OPTIONS}
            value={themeApproach}
            onChange={(v) => { setThemeApproach(v); if (v !== 'custom') setThemeMachineName(''); }}
          />

          {themeApproach === 'custom' && (
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1.5">Arculat belső neve</p>
              <p className="text-xs text-gray-500 mb-2">Kisbetűk és _ jel, szóköz nélkül. pl. <code className="bg-gray-100 px-1 rounded">korossy_theme</code></p>
              <input
                type="text"
                value={themeMachineName}
                onChange={(e) => setThemeMachineName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="pl. mysite_theme"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </>
      )}

      <button
        onClick={handleContinue}
        disabled={!isComplete}
        className={cn(
          'w-full py-3 px-6 rounded-xl font-medium text-sm transition-all',
          isComplete
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed',
        )}
      >
        Tovább a projekt leírásához →
      </button>
    </div>
  );
}
