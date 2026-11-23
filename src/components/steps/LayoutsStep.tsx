'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import type { Entity, EntityType, FieldType } from '@/lib/types';
import { toMachineName, cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

const PARAGRAPH_PRESETS = [
  { id: 'text_block',    label: 'Szöveges blokk',      desc: 'Cím + szöveg (CKEditor 5)', fields: ['Cím', 'Szöveg'] },
  { id: 'image_text',    label: 'Kép + szöveg',         desc: 'Kép bal/jobb, mellette szöveg', fields: ['Kép', 'Szöveg', 'Elrendezés'] },
  { id: 'cta',           label: 'CTA (felhívás)',        desc: 'Kiemelő doboz, gomb', fields: ['Cím', 'Szöveg', 'Gomb felirat', 'Gomb URL'] },
  { id: 'gallery',       label: 'Képgaléria',            desc: 'Több kép egymás után', fields: ['Képek'] },
  { id: 'video_embed',   label: 'Videó (YouTube/Vimeo)', desc: 'Beágyazott videó', fields: ['Videó URL', 'Felirat'] },
  { id: 'accordion',     label: 'Összecsukható szekció', desc: 'FAQ stílusú tartalom', fields: ['Kérdés', 'Válasz'] },
  { id: 'quote',         label: 'Idézet / Kiemelés',    desc: 'Formázott idézet doboz', fields: ['Szöveg', 'Szerző'] },
];

export function LayoutsStep() {
  const router = useRouter();
  const { project, addEntity, markStepComplete } = useProjectStore();

  const layoutEngine = project.calibration?.layoutEngine;
  const existingParagraphs = project.entities.filter((e) => e.type === 'paragraph');
  const [selected, setSelected] = useState<string[]>(
    existingParagraphs.map((e) => e.machineName),
  );

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleContinue() {
    // Add selected paragraphs as entities
    for (const preset of PARAGRAPH_PRESETS) {
      if (!selected.includes(preset.id)) continue;
      if (project.entities.some((e) => e.machineName === preset.id)) continue;
      addEntity({
        id: crypto.randomUUID(),
        label: preset.label,
        machineName: preset.id,
        type: 'paragraph' as EntityType,
        description: preset.desc,
        fields: preset.fields.map((label) => ({
          id: crypto.randomUUID(),
          label,
          type: label.toLowerCase().includes('kép') ? 'image' as FieldType
              : label.toLowerCase().includes('url') ? 'text' as FieldType
              : 'textarea' as FieldType,
          required: label === 'Cím' || label === 'Szöveg',
          cardinality: label === 'Képek' ? 'multiple' : 'single',
        })),
      });
    }
    markStepComplete('layouts');
    router.push('/wizard/external');
  }

  if (layoutEngine === 'layout_builder') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Oldal-elrendezés</h2>
          <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
            A kalibrációban <strong>Layout Builder</strong> lett kiválasztva.
          </p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-semibold text-blue-800 mb-2">Layout Builder konfiguráció az AGENTS.md-ben:</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Enable Layout Builder per content type: Structure → Content Types → Manage Display</li>
            <li>Sections: full-width, two-column, three-column</li>
            <li>Custom block types: create as needed via Structure → Block types</li>
            <li>Disable Layout Builder for taxonomy and media types</li>
          </ul>
        </div>
        <button onClick={handleContinue}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
          Rendben, tovább →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Paragraph típusok</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          A kalibrációban <strong>Paragraphs modul</strong> lett kiválasztva.
          Válaszd ki, milyen tartalom-blokkokra van szükség.
        </p>
      </div>

      <div className="space-y-2">
        {PARAGRAPH_PRESETS.map((p) => (
          <label key={p.id} className={cn(
            'flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all gradient-card',
            selected.includes(p.id) ? 'gradient-card--selected' : 'gradient-card',
          )}>
            <input type="checkbox" className="accent-blue-600 w-4 h-4 mt-0.5 shrink-0"
              checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
            <div>
              <span className="text-sm font-semibold text-gray-900">{p.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
              <p className="text-xs text-gray-400 mt-0.5">Mezők: {p.fields.join(', ')}</p>
            </div>
          </label>
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-xl">
          {selected.length} paragraph típus kerül az entitásokhoz (paragraph.type.*).
          Az article content type-on egy <code>field_components</code> (entity_reference_revisions) mező fog ezekre mutatni.
        </p>
      )}

      <button onClick={handleContinue}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
        Mentés és tovább ({selected.length} típus) →
      </button>
    </div>
  );
}
