'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import type { ViewListing } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus, Trash2, List } from 'lucide-react';

const SORT_LABELS = {
  created: 'Létrehozás dátuma (legújabb)',
  changed: 'Módosítás dátuma',
  title:   'Cím (A-Z)',
};

const DISPLAY_LABELS = {
  page:  'Önálló oldal (/url)',
  block: 'Blokk (oldalelemen belül)',
  both:  'Oldal + blokk verzió',
};

export function ListingsStep() {
  const router = useRouter();
  const { project, setViewListings, markStepComplete } = useProjectStore();
  const [listings, setLocal] = useState<ViewListing[]>(project.viewListings);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const contentEntities = project.entities.filter((e) => e.type === 'content' || e.type === 'taxonomy');

  function addListing() {
    if (!contentEntities.length) return;
    const id = crypto.randomUUID();
    const first = contentEntities[0];
    const newListing: ViewListing = {
      id,
      label: `${first.label} lista`,
      url: `/${first.machineName}k`,
      entityId: first.id,
      filters: [],
      exposedFilters: false,
      sortBy: 'created',
      sortDir: 'desc',
      itemsPerPage: 12,
      displayType: 'page',
    };
    setLocal((prev) => [...prev, newListing]);
    setExpandedId(id);
  }

  function update(id: string, updates: Partial<ViewListing>) {
    setLocal((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
  }

  function addFilter(id: string, fieldMachineName: string) {
    setLocal((prev) => prev.map((l) => {
      if (l.id !== id || l.filters.includes(fieldMachineName)) return l;
      return { ...l, filters: [...l.filters, fieldMachineName] };
    }));
  }

  function removeFilter(id: string, filter: string) {
    setLocal((prev) => prev.map((l) =>
      l.id === id ? { ...l, filters: l.filters.filter((f) => f !== filter) } : l,
    ));
  }

  function handleContinue() {
    setViewListings(listings);
    markStepComplete('listings');
    router.push('/wizard/workflow');
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Listázó oldalak</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Milyen listázó oldalak kellenek? Minden egyes egy Drupal <strong>View</strong> lesz.
          Pl. /cikkek, /dokumentumok, keresési oldal.
        </p>
      </div>

      {!contentEntities.length && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          Még nincsenek entitások definiálva. Menj vissza és add hozzá a content type-okat.
        </div>
      )}

      <div className="space-y-2">
        {listings.map((listing) => {
          const entity = project.entities.find((e) => e.id === listing.entityId);
          const refFields = entity?.fields.filter((f) => f.type === 'reference' || f.type === 'list') ?? [];

          return (
            <div key={listing.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-3.5 py-3">
                <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
                  <List size={14} className="text-indigo-500" />
                </div>
                <input
                  type="text"
                  placeholder="Lista neve (pl. Cikkek listája)"
                  value={listing.label}
                  onChange={(e) => update(listing.id, { label: e.target.value })}
                  className="flex-1 text-sm font-medium bg-transparent border-none outline-none placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="/url"
                  value={listing.url}
                  onChange={(e) => update(listing.id, { url: e.target.value })}
                  className="w-32 text-xs font-mono px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => setExpandedId(expandedId === listing.id ? null : listing.id)}
                  className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
                >
                  {expandedId === listing.id ? '▲ Bezárás' : '▼ Beállítások'}
                </button>
                <button onClick={() => setLocal((prev) => prev.filter((l) => l.id !== listing.id))}
                  className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Settings panel */}
              {expandedId === listing.id && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3">
                  <div className="flex gap-3 flex-wrap">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tartalom típusa</label>
                      <select value={listing.entityId}
                        onChange={(e) => update(listing.id, { entityId: e.target.value })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        {contentEntities.map((e) => (
                          <option key={e.id} value={e.id}>{e.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Rendezés</label>
                      <select value={listing.sortBy}
                        onChange={(e) => update(listing.id, { sortBy: e.target.value as ViewListing['sortBy'] })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        {(Object.entries(SORT_LABELS)).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Oldalanként</label>
                      <select value={listing.itemsPerPage}
                        onChange={(e) => update(listing.id, { itemsPerPage: Number(e.target.value) })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        {[6, 9, 10, 12, 15, 20, 24, 25].map((n) => (
                          <option key={n} value={n}>{n} elem</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Display típus</label>
                      <select value={listing.displayType}
                        onChange={(e) => update(listing.id, { displayType: e.target.value as ViewListing['displayType'] })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        {(Object.entries(DISPLAY_LABELS)).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" className="accent-blue-600"
                      checked={listing.exposedFilters}
                      onChange={(e) => update(listing.id, { exposedFilters: e.target.checked })} />
                    Felhasználó is szűrhet (exposed filters)
                  </label>

                  {refFields.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Szűrők (contextual + exposed):</label>
                      <div className="flex flex-wrap gap-1.5">
                        {refFields.map((f) => {
                          const added = listing.filters.includes(f.id);
                          return (
                            <button key={f.id}
                              onClick={() => added ? removeFilter(listing.id, f.id) : addFilter(listing.id, f.id)}
                              className={cn(
                                'text-xs px-2 py-1 rounded-full border transition-colors',
                                added ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300',
                              )}>
                              {added ? '✓ ' : '+ '}{f.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={addListing} disabled={!contentEntities.length}
        className={cn('w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-sm transition-colors',
          contentEntities.length ? 'border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-500' : 'border-gray-200 text-gray-300 cursor-not-allowed',
        )}>
        <Plus size={16} /> Listázó oldal hozzáadása
      </button>

      <button onClick={handleContinue}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
        Tovább a workflow-hoz ({listings.length} lista) →
      </button>
    </div>
  );
}
