'use client';
import { useParams } from 'next/navigation';
import type { WizardStep } from '@/lib/types';
import { STEP_LABELS, STEP_DESCRIPTIONS } from '@/lib/constants';
import { Construction } from 'lucide-react';

export function PlaceholderStep() {
  const params = useParams();
  const step = params.step as WizardStep;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{STEP_LABELS[step] ?? step}</h2>
        <p className="text-gray-500 mt-1.5 text-sm">{STEP_DESCRIPTIONS[step] ?? ''}</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-2xl text-center">
        <Construction size={32} className="text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-400">Ez a szekció hamarosan elkészül</p>
        <p className="text-xs text-gray-300 mt-1">Scope 2–5 keretein belül</p>
      </div>
    </div>
  );
}
