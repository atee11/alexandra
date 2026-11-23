'use client';
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CircleDashed, CircleDot, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyze, overallProgress, topicStatus } from '@/lib/sysorg/analysis';
import { projectTitle } from '@/lib/sysorg/projects';
import { STORE_KEY, useSaveFailed, useSysorgStore } from '@/lib/sysorg/store';
import { TOPICS, topicHref } from '@/lib/sysorg/topics';
import { TOPIC_IDS, type SysorgProject, type TopicId } from '@/lib/sysorg/schema';
import { Notice } from './ui';

const subscribe = (notify: () => void) => useSysorgStore.persist.onFinishHydration(notify);
const snapshot = () => useSysorgStore.persist.hasHydrated();

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

const RESULTS_HREF = '/sysorg/eredmenyek';

function StatusIcon({ status }: { status: 'empty' | 'started' | 'done' }) {
  if (status === 'done') return <Check size={15} className="shrink-0 text-emerald-600" aria-label="Lezárva" />;
  if (status === 'started') return <CircleDot size={15} className="shrink-0 text-violet-500" aria-label="Folyamatban" />;
  return <CircleDashed size={15} className="shrink-0 text-slate-300" aria-label="Még üres" />;
}

function TopicNav({ project, current, onNavigate }: { project: SysorgProject; current: string; onNavigate?: () => void }) {
  const issues = useMemo(() => analyze(project), [project]);
  return (
    <nav aria-label="Témák" className="space-y-0.5">
      <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Aktuális elemzés</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">{projectTitle(project)}</p>
        <Link href="/sysorg" onClick={onNavigate} className="studio-focus mt-1 inline-flex items-center gap-1 rounded text-xs text-violet-700 hover:underline"><ArrowLeft size={12} aria-hidden="true" />Összes elemzés</Link>
      </div>
      {TOPICS.map((topic) => {
        const blockers = issues.filter((i) => i.topic === topic.id && i.severity === 'blocker').length;
        const active = current === topic.id;
        return (
          <Link
            key={topic.id} href={topicHref(topic.id)} onClick={onNavigate} aria-current={active ? 'page' : undefined}
            className={cn('studio-focus flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
              active ? 'bg-violet-50 font-medium text-violet-900' : 'text-slate-600 hover:bg-slate-50')}
          >
            <StatusIcon status={topicStatus(project, topic.id)} />
            <span className="min-w-0 flex-1 truncate"><span className="text-slate-400">{topic.number}.</span> {topic.label}</span>
            {blockers > 0 && <span className="rounded-full bg-red-50 px-1.5 text-[11px] font-medium text-red-700" title={`${blockers} blokkoló hiány`}>{blockers}</span>}
          </Link>
        );
      })}
      <Link
        href={RESULTS_HREF} onClick={onNavigate} aria-current={current === 'eredmenyek' ? 'page' : undefined}
        className={cn('studio-focus mt-2 flex items-center gap-3 rounded-xl border border-violet-100 px-3 py-2.5 text-sm font-medium transition-colors',
          current === 'eredmenyek' ? 'bg-violet-100 text-violet-900' : 'bg-white text-violet-800 hover:bg-violet-50')}
      >
        <ArrowRight size={15} aria-hidden="true" /> Eredmények és export
      </Link>
    </nav>
  );
}

export function SysorgShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const project = useSysorgStore((s) => s.project);
  const saveFailed = useSaveFailed();
  const [menuOpen, setMenuOpen] = useState(false);
  const segment = pathname.split('/').filter(Boolean)[1] ?? '';
  const isLanding = segment === '';

  useEffect(() => {
    // Másik fülben történt módosítás után újratöltjük az állapotot, hogy ne írjuk felül.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORE_KEY) useSysorgStore.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (hydrated && !project && !isLanding) router.replace('/sysorg');
  }, [hydrated, project, isLanding, router]);

  if (isLanding) return <>{children}</>;
  if (!hydrated || !project) {
    return <div className="studio-surface flex min-h-screen items-center justify-center text-sm text-slate-500" role="status">Projekt betöltése…</div>;
  }

  const index = TOPIC_IDS.indexOf(segment as TopicId);
  const prevHref = segment === 'eredmenyek' ? topicHref('felulvizsgalat') : index > 0 ? topicHref(TOPIC_IDS[index - 1]) : null;
  const nextHref = index >= 0 ? (index < TOPIC_IDS.length - 1 ? topicHref(TOPIC_IDS[index + 1]) : RESULTS_HREF) : null;
  const progress = overallProgress(project);
  const currentTopic = TOPICS.find((t) => t.id === segment);
  const done = index >= 0 && !!project.topicDone[segment as TopicId];

  return (
    <div className="studio-surface flex min-h-screen flex-col md:h-screen md:flex-row md:overflow-hidden">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-white/90 md:flex">
        <Link href="/studio" className="studio-focus m-3 flex items-center gap-2 rounded-xl p-2" aria-label="Alexandra – vissza a területválasztóhoz">
          <Image src="/logo-mark-tight.png" alt="" width={36} height={32} />
          <span>
            <span className="block text-base font-semibold tracking-[0.12em] text-purple-800">Alexandra</span>
            <span className="block text-xs text-slate-500">Rendszerszervezés</span>
          </span>
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"><TopicNav project={project} current={segment} /></div>
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <div className="mb-1.5 flex justify-between"><span>Lezárt témák</span><span>{progress.done} / {progress.total}</span></div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="mt-3 leading-5">Automatikusan mentve a böngészőben.</p>
        </div>
      </aside>

      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 md:hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <Link href="/studio" className="studio-focus rounded-lg p-1" aria-label="Alexandra – vissza a területválasztóhoz"><Image src="/logo-mark-tight.png" alt="" width={33} height={30} /></Link>
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="sysorg-mobile-nav" className="studio-focus flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm">
            <span className="truncate">{currentTopic ? `${currentTopic.number}. ${currentTopic.label}` : 'Eredmények és export'}</span>
            {menuOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>
        </div>
        {menuOpen && <div id="sysorg-mobile-nav" className="max-h-[70vh] overflow-y-auto border-t border-slate-100 p-3"><TopicNav project={project} current={segment} onNavigate={() => setMenuOpen(false)} /></div>}
      </div>

      <main className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
        <div className="flex-1 md:overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
            {saveFailed && (
              <div className="mb-5"><Notice tone="danger">A böngésző nem tudta elmenteni a változásokat (tele lehet a tárhely, vagy le van tiltva). Exportáld a projektet JSON-ba, mielőtt bezárod az oldalt.</Notice></div>
            )}
            {children}
          </div>
        </div>
        {(prevHref || nextHref) && (
          <footer className="sticky bottom-0 flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            {prevHref ? <Link href={prevHref} className="studio-focus inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"><ArrowLeft size={16} aria-hidden="true" />Vissza</Link> : <span />}
            {index >= 0 && segment !== 'felulvizsgalat' && (
              <button
                type="button" aria-pressed={done}
                onClick={() => useSysorgStore.getState().setTopicDone(segment as TopicId, !done)}
                className={cn('studio-focus inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
                  done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
              >
                {done && <Check size={15} aria-hidden="true" />}
                {done ? 'Téma lezárva' : 'Téma lezárása'}
              </button>
            )}
            {nextHref ? <Link href={nextHref} className="studio-focus studio-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white">{nextHref === RESULTS_HREF ? 'Eredmények' : 'Tovább'}<ArrowRight size={16} aria-hidden="true" /></Link> : <span />}
          </footer>
        )}
      </main>
    </div>
  );
}
