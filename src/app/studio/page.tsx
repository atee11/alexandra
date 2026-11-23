'use client';

import { useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, GitBranch, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { useProjectStore } from '@/lib/store';
import { useSysorgStore } from '@/lib/sysorg/store';
import { asset } from '@/lib/utils';

const subscribeToHydration = (notify: () => void) =>
  useProjectStore.persist.onFinishHydration(notify);
const getHydrationSnapshot = () => useProjectStore.persist.hasHydrated();
const subscribeToSysorg = (notify: () => void) =>
  useSysorgStore.persist.onFinishHydration(notify);
const getSysorgSnapshot = () => useSysorgStore.persist.hasHydrated();
const getServerSnapshot = () => false;

export default function StudioPage() {
  const router = useRouter();
  const { project, completedSteps, visibleSteps, resetProject } = useProjectStore();
  const hydrated = useSyncExternalStore(subscribeToHydration, getHydrationSnapshot, getServerSnapshot);
  const sysHydrated = useSyncExternalStore(subscribeToSysorg, getSysorgSnapshot, getServerSnapshot);
  const sysCount = useSysorgStore((s) => s.projects.length);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const hasProject = hydrated && (
    completedSteps.length > 0 ||
    project.meta.label.trim().length > 0 ||
    project.meta.language !== 'hu' ||
    project.meta.complexity !== 'standard' ||
    Object.entries(project).some(([key, value]) => {
      if (key === 'meta' || value == null) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return true;
    })
  );
  const nextStep = visibleSteps.find((step) => !completedSteps.includes(step));
  const resumeHref = nextStep ? `/wizard/${nextStep}` : '/wizard/summary';
  const completedCount = visibleSteps.filter((step) => completedSteps.includes(step)).length;

  function startProject() {
    if (hasProject) {
      resetDialog.current?.showModal();
      return;
    }
    router.push('/wizard/calibration');
  }

  return (
    <main className="studio-surface min-h-screen px-5 py-6 sm:px-8 sm:py-8">
      <div className="relative mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="studio-focus flex items-center gap-2 rounded-xl" aria-label="Alexandra – nyitóoldal">
            <Image src={asset('/logo-mark-tight.png')} alt="" width={40} height={36} />
            <span className="text-lg font-semibold tracking-[0.12em] text-purple-800">Alexandra</span>
          </Link>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Tervezőtér</span>
        </header>

        <section className="studio-enter pb-10 pt-14 sm:pt-20" aria-labelledby="studio-title">
          <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-violet-700">
            <Sparkles size={15} aria-hidden="true" /> Egy ötlet. Több lehetőség.
          </p>
          <h1 id="studio-title" className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Miben segíthet <span className="studio-gradient-text">Alexandra?</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Válassz területet, és adj formát az elképzelésednek.
            Lépésről lépésre, a megfelelő kérdésekkel.
          </p>
        </section>

        {hasProject && (
          <section aria-label="Mentett architektúraprojekt" className="mb-6 flex flex-col gap-5 rounded-2xl border border-violet-100 bg-white/90 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-violet-700">Folytasd, ahol abbahagytad</p>
              <h2 className="mt-1 break-words font-semibold text-slate-900">{project.meta.label.trim() || 'Névtelen architektúraprojekt'}</h2>
              <p className="mt-1 text-sm text-slate-500">Rendszerarchitektúra · {completedCount} / {visibleSteps.length} lépés kész</p>
            </div>
            <Link href={resumeHref} className="studio-focus inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-50 px-5 py-3 text-sm font-medium text-violet-800 transition-colors hover:bg-violet-100">
              Projekt folytatása <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="architecture-title" className="studio-card studio-card-active">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-2xl bg-blue-50 p-3 text-blue-600"><Layers3 size={25} aria-hidden="true" /></span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"><Check size={12} aria-hidden="true" /> Elérhető</span>
            </div>
            <div className="studio-map studio-map-architecture" aria-hidden="true">
              <span className="studio-map-node">Szerepkörök</span><i /><span className="studio-map-node studio-map-node-main">Rendszer</span><i /><span className="studio-map-node">Adatok</span>
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600">Ötletből rendszer</p>
            <h2 id="architecture-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Rendszerarchitektúra</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Tervezd meg a rendszered alapjait: mit tárol, kik használják, és hogyan kapcsolódnak az elemei.</p>
            <ul className="mb-8 mt-5 flex flex-wrap gap-2 text-xs text-slate-600" aria-label="Érintett témák">
              {['Adatmodellek', 'Jogosultságok', 'Integrációk'].map((topic) => <li key={topic} className="rounded-lg bg-slate-50 px-2.5 py-1.5">{topic}</li>)}
            </ul>
            <button type="button" onClick={startProject} disabled={!hydrated} className="studio-primary studio-focus mt-auto flex w-full items-center justify-between gap-3 rounded-xl px-5 py-3.5 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60">
              {!hydrated ? 'Mentett állapot betöltése…' : hasProject ? 'Új architektúraprojekt' : 'Tervezés indítása'}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <p className="mt-3 text-xs leading-5 text-slate-500">Kimenet: fejlesztői brief, AI-utasításfájl és JSON.</p>
          </section>

          <section aria-labelledby="analysis-title" aria-describedby="analysis-status" className="studio-card studio-card-active">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-2xl bg-violet-50 p-3 text-violet-600"><GitBranch size={25} aria-hidden="true" /></span>
              <span id="analysis-status" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"><Check size={12} aria-hidden="true" /> Elérhető</span>
            </div>
            <div className="studio-map studio-map-analysis" aria-hidden="true">
              <span className="studio-map-node">Igény</span><i /><span className="studio-map-node studio-map-node-main">Folyamat</span><i /><span className="studio-map-node">Megoldás</span>
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-600">Igényből összefüggés</p>
            <h2 id="analysis-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Rendszerszervezés</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Tárd fel az üzleti igényeket, a szereplőket és a folyamatokat egy átlátható követelményrendszerhez.</p>
            <ul className="mb-8 mt-5 flex flex-wrap gap-2 text-xs text-slate-600" aria-label="Érintett témák">
              {['Üzleti folyamatok', 'Szereplők', 'Követelmények'].map((topic) => <li key={topic} className="rounded-lg bg-slate-50 px-2.5 py-1.5">{topic}</li>)}
            </ul>
            <Link href="/sysorg" className="studio-primary studio-focus mt-auto flex w-full items-center justify-between gap-3 rounded-xl px-5 py-3.5 text-sm font-medium text-white">
              {sysHydrated && sysCount > 0 ? 'Elemzések megnyitása' : 'Tervezés indítása'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {sysHydrated && sysCount > 0
                ? `${sysCount} mentett elemzés.`
                : 'Kimenet: követelményspecifikáció, folyamatábrák, CSV és JSON.'}
            </p>
          </section>

        </div>

        <footer className="flex flex-col gap-4 py-8 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="studio-focus inline-flex w-fit items-center gap-2 rounded-md hover:text-violet-700"><ArrowLeft size={14} aria-hidden="true" /> Vissza a nyitóoldalra</Link>
          <p className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> A projekt a böngésződben tárolódik. Biztonsági másolathoz használd a JSON-exportot.</p>
        </footer>
      </div>

      <dialog ref={resetDialog} className="studio-reset-dialog rounded-2xl bg-white p-6 text-slate-900 sm:p-8" aria-labelledby="reset-title" aria-describedby="reset-description">
        <h2 id="reset-title" className="text-xl font-semibold">Új projektet kezdesz?</h2>
        <p id="reset-description" className="mt-3 text-sm leading-6 text-slate-600">Jelenleg egy architektúraprojekt tárolható. Az új projekt indítása törli a jelenlegi válaszokat. Ha meg szeretnéd őrizni őket, előbb exportáld a projektet.</p>
        <div className="mt-6 flex flex-col gap-3">
          <form method="dialog"><button className="studio-focus w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium hover:bg-slate-50">Mégsem, megtartom a projektet</button></form>
          <button type="button" className="studio-focus rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700" onClick={() => {
            resetProject();
            resetDialog.current?.close();
            router.push('/wizard/calibration');
          }}>Meglévő projekt törlése és új indítása</button>
        </div>
      </dialog>
    </main>
  );
}
