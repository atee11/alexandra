'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const SEARCH_BACKENDS = [
  { id: 'db',    label: 'Database (Search API + DB)',   desc: 'Drupal adatbázisban keres. Kis-közepes oldalakhoz elegendő, egyszerű telepítés.' },
  { id: 'solr',  label: 'Apache Solr',                  desc: 'Külön Solr szerver. Nagy tartalom-mennyiséghez, faceted searchhez ajánlott.' },
  { id: 'es',    label: 'Elasticsearch',                desc: 'Magas teljesítmény, komplex lekérdezések. Enterprise méretekhez.' },
];

export function SearchStep() {
  const router = useRouter();
  const { project, markStepComplete } = useProjectStore();

  const contentEntities = project.entities.filter((e) => e.type === 'content');

  const [backend, setBackend]         = useState('db');
  const [indexedEntities, setIndexed] = useState<string[]>(
    contentEntities.map((e) => e.id),
  );
  const [fullText, setFullText]       = useState(true);
  const [facets, setFacets]           = useState(false);

  function toggleEntity(id: string) {
    setIndexed((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleContinue() {
    markStepComplete('search');
    router.push('/wizard/notifications');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Keresés és listák</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Milyen keresési megoldást szeretnél? Az AGENTS.md tartalmazza a szükséges
          Search API konfigurációt.
        </p>
      </div>

      {/* Search backend */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Keresési motor</p>
        <div className="space-y-2">
          {SEARCH_BACKENDS.map((b) => (
            <label key={b.id} className={cn(
              'flex items-center gap-3.5 p-4 rounded-xl cursor-pointer transition-all gradient-card',
              backend === b.id ? 'gradient-card--selected' : 'gradient-card',
            )}>
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                backend === b.id ? 'border-[#1875FC] bg-[#1875FC]' : 'border-gray-300')}
                onClick={() => setBackend(b.id)}>
                {backend === b.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div onClick={() => setBackend(b.id)}>
                <span className="text-sm font-semibold text-gray-900">{b.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Which entities to index */}
      {contentEntities.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            Melyik tartalmakat kell kereshetővé tenni?
          </p>
          <div className="space-y-2">
            {contentEntities.map((e) => (
              <label key={e.id} className={cn(
                'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all gradient-card',
                indexedEntities.includes(e.id) ? 'gradient-card--selected' : 'gradient-card',
              )}>
                <input type="checkbox" className="accent-blue-600 w-4 h-4"
                  checked={indexedEntities.includes(e.id)}
                  onChange={() => toggleEntity(e.id)} />
                <span className="text-sm text-gray-800">{e.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800 mb-2">Keresési funkciók</p>
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-gray-300 bg-white">
          <input type="checkbox" className="accent-blue-600 w-4 h-4"
            checked={fullText} onChange={(e) => setFullText(e.target.checked)} />
          <div>
            <span className="text-sm font-medium text-gray-900">Teljes szöveges keresés</span>
            <p className="text-xs text-gray-500">Szöveges mezőkben (body, title) is keres</p>
          </div>
        </label>
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-gray-300 bg-white">
          <input type="checkbox" className="accent-blue-600 w-4 h-4"
            checked={facets} onChange={(e) => setFacets(e.target.checked)} />
          <div>
            <span className="text-sm font-medium text-gray-900">Faceted search (szűrők oldalsávban)</span>
            <p className="text-xs text-gray-500">Kategória, dátum, típus szerinti szűrés — Facets modul szükséges</p>
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
