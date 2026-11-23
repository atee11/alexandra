'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const SOURCE_TYPES = [
  { id: 'drupal7',   label: 'Drupal 7',         desc: 'Migrate Drupal modul, JSON:API, SQL közvetlen' },
  { id: 'drupal9',   label: 'Drupal 9/10',       desc: 'Content JSON export / Recipe alapú migráció' },
  { id: 'wordpress', label: 'WordPress',          desc: 'WP REST API → Drupal Migrate' },
  { id: 'excel_csv', label: 'Excel / CSV fájlok', desc: 'Migrate Source CSV modul' },
  { id: 'custom_db', label: 'Egyedi adatbázis',   desc: 'Egyedi Migrate plugin szükséges' },
  { id: 'other',     label: 'Más rendszer',       desc: 'Leírással pontosítandó' },
];

export function MigrationStep() {
  const router = useRouter();
  const { markStepComplete } = useProjectStore();

  const [sourceType, setSourceType] = useState('');
  const [description, setDescription] = useState('');
  const [whatToMigrate, setWhatToMigrate] = useState<string[]>([]);

  const MIGRATE_ITEMS = ['Tartalom (cikkek, oldalak)', 'Felhasználók', 'Média / fájlok', 'Taxonómia términek', 'Megjegyzések', 'Konfigurációk'];

  function toggle(item: string) {
    setWhatToMigrate((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
  }

  function handleContinue() {
    markStepComplete('migration');
    router.push('/wizard/integrations');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Migráció</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Honnan érkeznek az adatok és mit kell áthozni?
          Az AGENTS.md tartalmazza a szükséges Migrate modul konfigurációt.
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Forrásrendszer típusa</p>
        <div className="space-y-2">
          {SOURCE_TYPES.map((s) => (
            <label key={s.id} className={cn(
              'flex items-center gap-3.5 p-3.5 rounded-xl cursor-pointer transition-all gradient-card',
              sourceType === s.id ? 'gradient-card--selected' : 'gradient-card',
            )}>
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                sourceType === s.id ? 'border-[#1875FC] bg-[#1875FC]' : 'border-gray-300')}>
                {sourceType === s.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">{s.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Mit kell migrálni? <span className="font-normal text-gray-400">(több is)</span></p>
        <div className="space-y-2">
          {MIGRATE_ITEMS.map((item) => (
            <label key={item} className={cn(
              'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all gradient-card',
              whatToMigrate.includes(item) ? 'gradient-card--selected' : 'gradient-card',
            )}>
              <input type="checkbox" className="accent-blue-600 w-4 h-4"
                checked={whatToMigrate.includes(item)} onChange={() => toggle(item)} />
              <span className="text-sm text-gray-800">{item}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          Egyéb megjegyzés (opcionális)
        </label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="pl. ~5000 cikk, 2010-től, a képek S3-on vannak..."
          rows={3}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      <button onClick={handleContinue}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
        Mentés és tovább →
      </button>
    </div>
  );
}
