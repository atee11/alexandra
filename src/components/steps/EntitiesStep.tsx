'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { FIELD_TYPES, ENTITY_TYPES } from '@/lib/constants';
import type { Entity, EntityField, FieldType, EntityType } from '@/lib/types';
import { toMachineName, cn } from '@/lib/utils';
import { getTemplateForProjectTypes } from '@/lib/site-type-templates';
import { Plus, Trash2, ChevronDown, ChevronUp, Database, Sparkles, X } from 'lucide-react';

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  content:      'Tartalom',
  taxonomy:     'Kategória / Csoportosítás',
  media:        'Médiafájl',
  user_profile: 'Felhasználói profil',
  paragraph:    'Rugalmas blokk',
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text:      'Rövid szöveg',
  textarea:  'Hosszú szöveg (formázható)',
  integer:   'Szám',
  boolean:   'Igen / Nem',
  date:      'Dátum / Időpont',
  reference: 'Kapcsolat más adathoz',
  file:      'Fájl',
  image:     'Kép',
  email:     'E-mail cím',
  telephone: 'Telefonszám',
  list:      'Lista / Legördülő',
};

const REF_ENTITY_TYPES = [
  { value: '',              label: 'auto (a kapcsolt adattípusból)' },
  { value: 'node',          label: '→ Tartalom' },
  { value: 'taxonomy_term', label: '→ Kategória' },
  { value: 'media',         label: '→ Médiafájl' },
  { value: 'user',          label: '→ Felhasználó' },
];

export function EntitiesStep() {
  const router = useRouter();
  const { project, setEntities, markStepComplete } = useProjectStore();
  const [entities, setLocal] = useState<Entity[]>(project.entities);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const useParagraphs =
    project.calibration?.flexibleLayouts === true &&
    project.calibration?.layoutEngine === 'paragraphs';

  const availableEntityTypes = useParagraphs
    ? ENTITY_TYPES
    : ENTITY_TYPES.filter((t) => t !== 'paragraph');

  // Suggestions from site-type-templates
  const projectTypes = project.contextAnswers?.projectTypes ?? [];
  const templateEntities = useMemo(
    () => projectTypes.length > 0 ? getTemplateForProjectTypes(projectTypes).entities : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectTypes.join(',')],
  );
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const showSuggestions = !suggestionsDismissed && templateEntities.length > 0;
  const addedEntityMachineNames = new Set(entities.map((e) => e.machineName));

  function addEntity() {
    const id = crypto.randomUUID();
    setLocal((prev) => [...prev, { id, label: '', machineName: '', type: 'content', fields: [] }]);
    setExpandedId(id);
  }

  function addAllSuggestions() {
    setLocal(templateEntities);
    setSuggestionsDismissed(true);
  }

  function updateEntity(id: string, updates: Partial<Entity>) {
    setLocal((prev) => prev.map((e) => e.id === id ? { ...e, ...updates } : e));
  }

  function removeEntity(id: string) {
    setLocal((prev) => prev.filter((e) => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function addField(entityId: string) {
    const field: EntityField = {
      id: crypto.randomUUID(),
      label: '',
      type: 'text',
      required: false,
      cardinality: 'single',
    };
    setLocal((prev) => prev.map((e) =>
      e.id === entityId ? { ...e, fields: [...e.fields, field] } : e,
    ));
  }

  function updateField(entityId: string, fieldId: string, updates: Partial<EntityField>) {
    setLocal((prev) => prev.map((e) => {
      if (e.id !== entityId) return e;
      return { ...e, fields: e.fields.map((f) => f.id === fieldId ? { ...f, ...updates } : f) };
    }));
  }

  function removeField(entityId: string, fieldId: string) {
    setLocal((prev) => prev.map((e) => {
      if (e.id !== entityId) return e;
      return { ...e, fields: e.fields.filter((f) => f.id !== fieldId) };
    }));
  }

  const validCount = entities.filter((e) => e.label.trim()).length;

  function handleContinue() {
    if (!validCount) return;
    setEntities(entities.filter((e) => e.label.trim()));
    markStepComplete('entities');
    router.push('/wizard/listings');
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mit tárol a rendszer?</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Sorolja fel a főbb dolgokat, amiket a rendszer nyilvántart.
          Pl. Cikk, Esemény, Termék, Pályázat, Kategória...
        </p>
      </div>
      {/* Javaslatok a site-type-templates alapján */}
      {showSuggestions && (
        <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  Javasolt adattípusok a rendszerhez
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Tipikus adattípusok ehhez a rendszerhez — mezőkkel előre kitöltve.
                </p>
              </div>
            </div>
            <button onClick={() => setSuggestionsDismissed(true)}
              className="text-blue-300 hover:text-blue-500 transition-colors shrink-0 mt-0.5">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-1.5">
            {templateEntities.map((e) => {
              const alreadyAdded = addedEntityMachineNames.has(e.machineName);
              return (
              <div key={e.id}
                className={cn(
                  'flex items-center justify-between border rounded-lg px-3 py-2',
                  alreadyAdded ? 'bg-gray-50 border-gray-200 opacity-50' : 'bg-white border-blue-200',
                )}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{e.label}</span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    e.type === 'content'      ? 'bg-purple-50 text-purple-600' :
                    e.type === 'taxonomy'     ? 'bg-green-50 text-green-600'   :
                    e.type === 'user_profile' ? 'bg-orange-50 text-orange-600' :
                    e.type === 'paragraph'    ? 'bg-pink-50 text-pink-600'     :
                    'bg-gray-50 text-gray-500',
                  )}>
                    {ENTITY_TYPE_LABELS[e.type as EntityType] ?? e.type}
                  </span>
                  {e.fields.length > 0 && (
                    <span className="text-xs text-gray-400">{e.fields.length} mező</span>
                  )}
                  {e.urlPattern && (
                    <span className="text-xs font-mono text-gray-400">{e.urlPattern}</span>
                  )}
                </div>
                {alreadyAdded ? (
                  <span className="text-xs text-green-600 font-medium whitespace-nowrap ml-2">✓ Hozzáadva</span>
                ) : (
                  <button
                    onClick={() => { setLocal((prev) => [...prev, e]); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors whitespace-nowrap ml-2"
                  >
                    + Hozzáadás
                  </button>
                )}
              </div>
              );
            })}
          </div>
          <button onClick={addAllSuggestions}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Összes hozzáadása ({templateEntities.length} adattípus)
          </button>
        </div>
      )}
      <div className="space-y-2">
        {entities.map((entity) => (
          <div key={entity.id} className={cn(
            'border rounded-xl overflow-hidden bg-white transition-all',
            entity.label.trim() ? 'border-gray-200' : 'border-dashed border-gray-200',
          )}>
            {/* Header row */}
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <div className="p-1.5 bg-purple-50 rounded-lg shrink-0">
                <Database size={14} className="text-purple-500" />
              </div>
              <input
                type="text"
                placeholder="Neve (pl. Cikk, Esemény, Termék)"
                value={entity.label}
                onChange={(e) => updateEntity(entity.id, {
                  label: e.target.value,
                  machineName: toMachineName(e.target.value),
                })}
                className="flex-1 text-sm font-medium bg-transparent border-none outline-none placeholder-gray-400"
              />
              <select
                value={entity.type}
                onChange={(e) => updateEntity(entity.id, { type: e.target.value as EntityType })}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {availableEntityTypes.map((t) => (
                  <option key={t} value={t}>{ENTITY_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 shrink-0">
                {entity.fields.length} mező
              </span>
              <button
                onClick={() => setExpandedId(expandedId === entity.id ? null : entity.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {expandedId === entity.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                onClick={() => removeEntity(entity.id)}
                className="text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Fields panel */}
            {expandedId === entity.id && (
              <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3">

                {/* URL pattern — only for content type */}
                {entity.type === 'content' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Webcím minta (pl. /hirek/[cim])
                    </p>
                    <input
                      type="text"
                      placeholder={`/${entity.machineName || 'adattipus'}/[node:title]`}
                      value={entity.urlPattern ?? ''}
                      onChange={(e) => updateEntity(entity.id, { urlPattern: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Mezők
                  </p>
                  {entity.fields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2 flex-wrap mb-2">
                    <input
                      type="text"
                      placeholder="Mező neve (pl. Cím)"
                      value={field.label}
                      onChange={(e) => updateField(entity.id, field.id, { label: e.target.value })}
                      className="w-32 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(entity.id, field.id, { type: e.target.value as FieldType })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    {field.type === 'reference' && (
                      <>
                        <select
                          value={field.referenceTarget ?? ''}
                          onChange={(e) => updateField(entity.id, field.id, { referenceTarget: e.target.value })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="">→ Melyik adattípushoz?</option>
                          {entities.filter((e) => e.id !== entity.id).map((e) => (
                            <option key={e.id} value={e.id}>{e.label || '(névtelen)'}</option>
                          ))}
                        </select>
                        {/* Manual override if target not in list */}
                        {!field.referenceTarget && (
                          <select
                            value={field.referenceEntityType ?? ''}
                            onChange={(e) => updateField(entity.id, field.id, {
                              referenceEntityType: (e.target.value || undefined) as typeof field.referenceEntityType,
                            })}
                            className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-blue-700"
                          >
                            {REF_ENTITY_TYPES.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </>
                    )}
                    <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(entity.id, field.id, { required: e.target.checked })}
                        className="accent-blue-600"
                      />
                      kötelező
                    </label>
                    <button
                      onClick={() => removeField(entity.id, field.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                  <button
                    onClick={() => addField(entity.id)}
                    className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 py-1 transition-colors"
                  >
                    <Plus size={13} /> Mező hozzáadása
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addEntity}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-colors"
      >
        <Plus size={16} /> Adattípus hozzáadása
      </button>

      <button
        onClick={handleContinue}
        disabled={!validCount}
        className={cn(
          'w-full py-3 rounded-xl font-medium text-sm transition-all',
          validCount
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed',
        )}
      >
        Tovább — jóváhagyási folyamat ({validCount} adattípus) →
      </button>
    </div>
  );
}
