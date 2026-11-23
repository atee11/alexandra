'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import type { WizardStep } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WizardFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const { visibleSteps, completedSteps } = useProjectStore();

  const currentStep = pathname.split('/').pop() as WizardStep;
  const currentIndex = visibleSteps.indexOf(currentStep);
  const prevStep = currentIndex > 0 ? visibleSteps[currentIndex - 1] : null;
  const nextStep = currentIndex < visibleSteps.length - 1 ? visibleSteps[currentIndex + 1] : null;
  const isCurrentComplete = completedSteps.includes(currentStep);

  const isLast = !nextStep;
  // Csak a Kalibráció kötelező belépő (ez dönti el a látható lépéseket); utána szabadon lehet lépkedni.
  const calibrationDone = completedSteps.includes('calibration');
  const canAdvance = currentStep === 'calibration' ? isCurrentComplete : calibrationDone;

  // Don't show footer on summary or any non-wizard route
  if (currentIndex === -1) return null;

  return (
    <footer className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white shrink-0">
      {/* Back */}
      <button
        onClick={() => prevStep && router.push(`/wizard/${prevStep}`)}
        disabled={!prevStep}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
          prevStep
            ? 'text-gray-600 hover:bg-gray-100'
            : 'text-gray-300 cursor-not-allowed',
        )}
      >
        <ChevronLeft size={16} />
        Vissza
      </button>

      {/* Step indicator */}
      <div className="flex gap-1.5">
        {visibleSteps.map((step) => (
          <div
            key={step}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              step === currentStep ? 'w-6 bg-blue-500' :
              completedSteps.includes(step) ? 'w-1.5 bg-green-400' :
              'w-1.5 bg-gray-200',
            )}
          />
        ))}
      </div>

      {/* Next / Finish */}
      <button
        onClick={() => {
          if (isLast) router.push('/wizard/summary');
          else if (nextStep) router.push(`/wizard/${nextStep}`);
        }}
        disabled={!canAdvance}
        className={cn(
          'flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg font-medium transition-colors',
          canAdvance
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed',
        )}
      >
        {isLast ? 'Befejezés' : 'Tovább'}
        <ChevronRight size={16} />
      </button>
    </footer>
  );
}
