'use client';
import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Copy, Download, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { overallProgress, readiness } from '@/lib/sysorg/analysis';
import { MAX_TRASH, projectTitle } from '@/lib/sysorg/projects';
import type { SysorgProject } from '@/lib/sysorg/schema';
import { useSysorgStore } from '@/lib/sysorg/store';
import { L, TOPICS, topicHref } from '@/lib/sysorg/topics';
import { useHydrated } from '@/components/sysorg/Shell';
import { ImportControl, exportProjectJson } from '@/components/sysorg/ImportControl';
import { ConfirmDialog, Notice, buttonClass, primaryButtonClass } from '@/components/sysorg/ui';

const STEPS = ['Kerettől a célig', 'Folyamatok és szabályok', 'Adatok és jogosultságok', 'Felülvizsgálat és export'];

function ProjectCard({ project, active }: { project: SysorgProject; active: boolean }) {
  const { openProject, duplicateProject, deleteProject } = useSysorgStore.getState();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const progress = overallProgress(project);
  const ready = useMemo(() => readiness(project), [project]);
  const next = TOPICS.find((t) => t.id !== 'felulvizsgalat' && !project.topicDone[t.id]);
  const href = next ? topicHref(next.id) : '/sysorg/eredmenyek';

  return (
    <li className={`flex flex-col rounded-2xl border bg-white/90 p-5 ${active ? 'border-violet-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-slate-900">{projectTitle(project)}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{L.kind[project.meta.kind]}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ready.isDraft ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
          {ready.isDraft ? 'Tervezet' : 'Jóváhagyva'}
        </span>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-slate-500"><span>{progress.done} / {progress.total} téma lezárva</span>{ready.blockers > 0 && <span className="text-red-700">{ready.blockers} blokkoló hiány</span>}</div>
        <div className="h-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Utoljára módosítva: {new Date(project.updatedAt).toLocaleString('hu-HU')}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={href} onClick={() => openProject(project.id)} className={`${primaryButtonClass} flex-1 sm:flex-none`}>
          {next ? 'Folytatás' : 'Eredmények'}<ArrowRight size={16} aria-hidden="true" />
        </Link>
        <button type="button" className={buttonClass} onClick={() => exportProjectJson(project)} aria-label={`${projectTitle(project)}: exportálás JSON-ba`} title="Exportálás JSON-ba"><Download size={16} aria-hidden="true" /></button>
        <button
          type="button" className={buttonClass} title="Duplikálás" aria-label={`${projectTitle(project)}: duplikálás`}
          onClick={() => { const result = duplicateProject(project.id); if (!result.ok) setError(result.error); }}
        ><Copy size={16} aria-hidden="true" /></button>
        <button type="button" className={`${buttonClass} hover:border-red-200 hover:bg-red-50 hover:text-red-700`} title="Törlés" aria-label={`${projectTitle(project)}: törlés`} onClick={() => dialog.current?.showModal()}><Trash2 size={16} aria-hidden="true" /></button>
      </div>
      {error && <div className="mt-3"><Notice tone="danger" onClose={() => setError('')}>{error}</Notice></div>}
      <ConfirmDialog
        ref={dialog}
        title="Törlöd az elemzést?"
        text={`„${projectTitle(project)}” a „Nemrég törölt” részbe kerül, ahonnan visszaállíthatod. Legfeljebb ${MAX_TRASH} törölt elemzést őrzünk meg, a régebbiek véglegesen elvesznek. Érdemes előbb exportálni.`}
        confirmLabel="Törlés"
        onConfirm={() => deleteProject(project.id)}
        extra={<button type="button" className={buttonClass} onClick={() => exportProjectJson(project)}><Download size={16} aria-hidden="true" />Exportálás törlés előtt</button>}
      />
    </li>
  );
}

export default function SysorgStart() {
  const router = useRouter();
  const hydrated = useHydrated();
  const projects = useSysorgStore((s) => s.projects);
  const trash = useSysorgStore((s) => s.trash);
  const activeId = useSysorgStore((s) => s.activeId);
  const [error, setError] = useState('');
  const sorted = useMemo(() => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [projects]);

  function begin() {
    const result = useSysorgStore.getState().createProject();
    if (!result.ok) { setError(result.error); return; }
    router.push(topicHref('keret'));
  }

  return (
    <main className="studio-surface min-h-screen px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/studio" className="studio-focus flex items-center gap-2 rounded-xl" aria-label="Alexandra – vissza a területválasztóhoz">
            <Image src="/logo-mark-tight.png" alt="" width={40} height={36} />
            <span className="text-lg font-semibold tracking-[0.12em] text-purple-800">Alexandra</span>
          </Link>
          <Link href="/studio" className="studio-focus inline-flex items-center gap-2 rounded-lg text-xs font-medium text-slate-500 hover:text-violet-700"><ArrowLeft size={14} aria-hidden="true" />Területválasztó</Link>
        </header>

        <section className="studio-enter pb-8 pt-12 sm:pt-16" aria-labelledby="sysorg-title">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-violet-700">Rendszerszervezés</p>
          <h1 id="sysorg-title" className="max-w-3xl text-[clamp(1.5rem,7.4vw,3rem)] font-semibold leading-tight tracking-tight text-slate-900 [overflow-wrap:anywhere]">
            Az üzleti igénytől a<br /><span className="studio-gradient-text">követelményrendszerig</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Vezetett műhely a problémák, szereplők, folyamatok, szabályok és adatok feltárásához. A végén folyamatábrák, követelményspecifikáció, elfogadási feltételek és nyitott kérdések készülnek – csak abból, amit te rögzítettél.
          </p>
          {hydrated && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
              <button type="button" onClick={begin} className={primaryButtonClass}><Plus size={16} aria-hidden="true" />Új elemzés</button>
              <ImportControl />
            </div>
          )}
          {error && <div className="mt-4 max-w-xl"><Notice tone="danger" onClose={() => setError('')}>{error}</Notice></div>}
        </section>

        {!hydrated && <p role="status" className="text-sm text-slate-500">Mentett elemzések betöltése…</p>}

        {hydrated && sorted.length > 0 && (
          <section aria-labelledby="projects-title">
            <h2 id="projects-title" className="mb-3 text-base font-semibold text-slate-900">Elemzéseid <span className="font-normal text-slate-400">({sorted.length})</span></h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {sorted.map((project) => <ProjectCard key={project.id} project={project} active={project.id === activeId} />)}
            </ul>
          </section>
        )}

        {hydrated && sorted.length === 0 && (
          <section aria-label="Első elemzés" className="rounded-2xl border border-slate-200 bg-white/90 p-6">
            <p className="mb-4 text-sm text-slate-600">Még nincs mentett elemzésed. Így épül fel egy elemzés:</p>
            <ol className="grid gap-3 sm:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><span className="mb-2 block text-xs font-medium text-violet-700">{i + 1}. szakasz</span>{step}</li>
              ))}
            </ol>
          </section>
        )}

        {hydrated && trash.length > 0 && (
          <details className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-5">
            <summary className="studio-focus cursor-pointer rounded text-sm font-medium text-slate-700">Nemrég törölt ({trash.length})</summary>
            <ul className="mt-4 divide-y divide-slate-100">
              {trash.map((project) => (
                <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="min-w-0 text-sm text-slate-700"><span className="break-words font-medium">{projectTitle(project)}</span><span className="block text-xs text-slate-500">Utoljára módosítva: {new Date(project.updatedAt).toLocaleString('hu-HU')}</span></span>
                  <button
                    type="button" className={buttonClass}
                    onClick={() => { const result = useSysorgStore.getState().restoreProject(project.id); if (!result.ok) setError(result.error); }}
                  ><RotateCcw size={16} aria-hidden="true" />Visszaállítás</button>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          Az elemzések kizárólag a böngésződben tárolódnak, nem kerülnek szerverre. Másik géphez vagy biztonsági másolathoz használd a JSON-exportot.
        </p>
      </div>
    </main>
  );
}
