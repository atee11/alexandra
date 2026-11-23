'use client';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useProjectStore } from '@/lib/store';
import { STEP_LABELS } from '@/lib/constants';
import type { WizardStep } from '@/lib/types';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { asset } from '@/lib/utils';

export function WizardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { visibleSteps, completedSteps } = useProjectStore();

  const currentStep = pathname.split('/').pop() as WizardStep;
  const calibrationDone = completedSteps.includes('calibration');

  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-200 w-64 shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-200">
        <Link href="/studio" aria-label="Alexandra – vissza a területválasztóhoz" className="studio-focus flex items-center gap-1.5 rounded-lg">
          <Image src={asset('/logo-mark-tight.png')} alt="Alexandra" width={36} height={32} className="shrink-0" />
          <div style={{ width: 'fit-content', textAlign: 'center' }}>
            <h1 className="font-semibold font-geist leading-none"
                style={{ color: 'oklch(43.8% 0.218 303.724)', letterSpacing: '3.16px', fontSize: '16px' }}>
              Alexandra
            </h1>
            <p className="font-geist text-gray-400" style={{ marginTop: '2px', fontSize: '10.5px', letterSpacing: '0.15px' }}>
              Rendszerarchitektúra
            </p>
          </div>
        </Link>
      </div>

      {/* Step list */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleSteps.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = step === currentStep;
          const isLocked = index > 0 && !calibrationDone && !isCurrent;

          return (
            <button
              key={step}
              onClick={() => !isLocked && router.push(`/wizard/${step}`)}
              disabled={isLocked}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg transition-colors text-sm',
                isCurrent && 'font-medium',
                isCompleted && !isCurrent && 'text-gray-700 hover:bg-gray-50 cursor-pointer',
                isLocked && 'text-gray-300 cursor-not-allowed',
                !isCurrent && !isCompleted && !isLocked && 'text-gray-500 hover:bg-gray-50 cursor-pointer',
              )}
              style={isCurrent ? {
                background: 'linear-gradient(135deg, #EEF4FF 0%, #F3EEFF 100%)',
                color: '#1875FC',
              } : undefined}
            >
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 w-4">
                  {isCompleted ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : isCurrent ? (
                    <Circle size={16} style={{ color: '#1875FC', fill: '#1875FC' }} />
                  ) : isLocked ? (
                    <Lock size={14} className="text-gray-300" />
                  ) : (
                    <Circle size={16} className="text-gray-300" />
                  )}
                </span>
                <span className="truncate leading-snug">{STEP_LABELS[step]}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Progress bar */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Haladás</span>
          <span>{completedSteps.length} / {visibleSteps.length}</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${visibleSteps.length ? (completedSteps.length / visibleSteps.length) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #1875FC 0%, #3865FC 45%, #684BFC 100%)',
            }}
          />
        </div>
      </div>
    </aside>
  );
}
