'use client';
import { useMemo, useRef } from 'react';
import Link from 'next/link';
import { Download, FileJson, FileSpreadsheet, FileText, GitBranch, RefreshCw } from 'lucide-react';
import { analyze, readiness } from '@/lib/sysorg/analysis';
import { renderMermaidFlow, renderMermaidStates, renderSvg } from '@/lib/sysorg/diagram';
import { buildOpenItemsCsv, buildRequirementsCsv, buildSpecMarkdown, draftSummary } from '@/lib/sysorg/exports';
import { downloadText, fileSlug } from '@/lib/sysorg/io';
import type { Process } from '@/lib/sysorg/schema';
import { useSysorgStore } from '@/lib/sysorg/store';
import { TENTATIVE_NOTE } from '@/lib/sysorg/topics';
import { FlowPreview } from '@/components/sysorg/ProcessTopic';
import { actorNameOf } from '@/components/sysorg/hooks';
import { ImportControl, exportProjectJson } from '@/components/sysorg/ImportControl';
import { Card, ConfirmDialog, Notice, TextField, buttonClass, useProject } from '@/components/sysorg/ui';

function ExportCard({ icon: Icon, title, text, action, onClick }: { icon: typeof Download; title: string; text: string; action: string; onClick: () => void }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <span className="mb-3 w-fit rounded-xl bg-violet-50 p-2.5 text-violet-700"><Icon size={20} aria-hidden="true" /></span>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 flex-1 text-sm leading-6 text-slate-600">{text}</p>
      <button type="button" onClick={onClick} className={`${buttonClass} mt-4`}><Download size={16} aria-hidden="true" />{action}</button>
    </div>
  );
}

export default function EredmenyekPage() {
  const p = useProject();
  const setSummary = useSysorgStore((s) => s.setSummary);
  const confirm = useRef<HTMLDialogElement>(null);
  const issues = useMemo(() => analyze(p), [p]);
  const ready = readiness(p, issues);
  const slug = fileSlug(p.meta.title);
  const actorName = actorNameOf(p);
  const spec = useMemo(() => buildSpecMarkdown(p), [p]);

  const generate = () => setSummary(draftSummary(p));
  const processes: { process: Process; heading: string }[] = [
    ...p.asIs.map((process) => ({ process, heading: 'AS-IS' })),
    ...p.toBe.map((process) => ({ process, heading: 'TO-BE' })),
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-700">Eredmények</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Eredmények és export</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Minden eredmény ugyanabból a rögzített projektből készül, és csak azt tartalmazza, amit megadtál.</p>
      </header>

      {ready.isDraft ? (
        <Notice tone="warning">
          <strong>{TENTATIVE_NOTE}</strong>
          <br />Jóváhagyott témák: {ready.approved}/{ready.approvableTopics} · blokkoló hiány: {ready.blockers} · figyelmeztetés: {ready.warnings}.{' '}
          <Link href="/sysorg/felulvizsgalat" className="font-medium underline">Felülvizsgálat megnyitása</Link>
        </Notice>
      ) : <Notice tone="success">Minden téma jóváhagyva, nincs blokkoló hiány.</Notice>}

      <Card title="Vezetői összefoglaló" hint="Szerkeszthető szöveg. A generálás csak a megadott válaszokból állítja össze a vázlatot – ellenőrizd és javítsd.">
        <TextField label="Összefoglaló" multiline rows={10} value={p.summary} onChange={setSummary} />
        <button type="button" className={buttonClass} onClick={() => (p.summary.trim() ? confirm.current?.showModal() : generate())}>
          <RefreshCw size={16} aria-hidden="true" />Vázlat generálása a válaszokból
        </button>
        <ConfirmDialog ref={confirm} title="Felülírod az összefoglalót?" text="A jelenlegi szöveg helyére új vázlat kerül a rögzített válaszok alapján." confirmLabel="Felülírás" tone="primary" onConfirm={generate} />
      </Card>

      <section aria-labelledby="exports-title">
        <h2 id="exports-title" className="mb-3 text-base font-semibold text-slate-900">Letölthető eredmények</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ExportCard icon={FileText} title="Követelményspecifikáció" text="Teljes dokumentum Markdownban: folyamatok, funkciók, szabályok, adatok, jogosultságok, nyomonkövethetőség, nyitott pontok." action="Markdown (.md)" onClick={() => downloadText(`${slug}-kovetelmenyspecifikacio.md`, spec, 'text/markdown')} />
          <ExportCard icon={FileSpreadsheet} title="Követelmények és elfogadási feltételek" text="Táblázat funkciókról, szabályokról és minőségi követelményekről, hivatkozásokkal. Excelben megnyitható." action="CSV (.csv)" onClick={() => downloadText(`${slug}-kovetelmenyek.csv`, buildRequirementsCsv(p), 'text/csv')} />
          <ExportCard icon={FileSpreadsheet} title="Nyitott kérdések és döntések" text="Kérdések, feltételezések, döntések és az „ismeretlen” jelölésű mezők felelőssel és határidővel." action="CSV (.csv)" onClick={() => downloadText(`${slug}-nyitott-kerdesek.csv`, buildOpenItemsCsv(p), 'text/csv')} />
          <ExportCard icon={FileJson} title="Teljes projekt" text="Verziózott JSON mentés és visszatöltés céljára, valamint gépi feldolgozáshoz." action="JSON (.json)" onClick={() => exportProjectJson(p)} />
        </div>
      </section>

      <Card title="Folyamatábrák" hint="A rögzített lépésekből készülnek. Szerepkörönkénti sávos ábra; ez nem szabványos BPMN, hanem egyszerű folyamatvázlat.">
        {processes.length === 0 && <p className="text-sm text-slate-500">Még nincs folyamat rögzítve.</p>}
        {processes.map(({ process, heading }) => (
          <div key={process.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><GitBranch size={16} className="text-violet-600" aria-hidden="true" />{heading} · {process.code} {process.name || '(névtelen)'}</h3>
              {process.steps.length > 0 && (
                <span className="flex flex-wrap gap-2">
                  <button type="button" className={buttonClass} onClick={() => downloadText(`${slug}-${process.code.toLowerCase()}.svg`, renderSvg(process, actorName, heading), 'image/svg+xml')}>SVG</button>
                  <button type="button" className={buttonClass} onClick={() => downloadText(`${slug}-${process.code.toLowerCase()}.mmd`, renderMermaidFlow(process, actorName), 'text/plain')}>Mermaid</button>
                  {renderMermaidStates(process) && <button type="button" className={buttonClass} onClick={() => downloadText(`${slug}-${process.code.toLowerCase()}-allapotok.mmd`, renderMermaidStates(process) ?? '', 'text/plain')}>Állapotok (Mermaid)</button>}
                </span>
              )}
            </div>
            {process.steps.length > 0 ? <FlowPreview process={process} project={p} heading={heading} /> : <p className="text-xs text-slate-500">Nincs lépés rögzítve.</p>}
          </div>
        ))}
      </Card>

      <details className="rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="studio-focus cursor-pointer rounded text-sm font-medium text-slate-800">A követelményspecifikáció előnézete</summary>
        <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">{spec}</pre>
      </details>

      <Card title="Visszatöltés">
        <p className="text-sm text-slate-600">Korábban exportált JSON betöltése új elemzésként. A jelenlegi elemzést nem írja felül.</p>
        <ImportControl />
      </Card>
    </div>
  );
}
