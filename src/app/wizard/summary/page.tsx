'use client';
import { useProjectStore } from '@/lib/store';
import { Download, FileCode2, CheckCircle2, CheckCircle, Circle, ArrowLeft, FileText, AlertTriangle, XCircle, Info } from 'lucide-react';
import { generateAgentsMd } from '@/lib/agents-md';
import { generateDeveloperBrief } from '@/lib/developer-brief';
import { validateProjectReadiness } from '@/lib/validation';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function SummaryPage() {
  const { project, resetProject } = useProjectStore();
  const router = useRouter();

  function startNewProject() {
    resetProject();
    router.push('/wizard/calibration');
  }
  const slug = (project.meta.label || 'projekt').toLowerCase().replace(/\s+/g, '-');

  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAgentsMd() {
    download(generateAgentsMd(project), `AGENTS.md`, 'text/markdown');
  }

  function downloadDeveloperBrief() {
    download(generateDeveloperBrief(project), `DEVELOPER-BRIEF.md`, 'text/markdown');
  }

  function downloadJson() {
    download(JSON.stringify(project, null, 2), `alexandra-${slug}.json`, 'application/json');
  }

  const agentsMd    = generateAgentsMd(project);
  const briefMd     = generateDeveloperBrief(project);
  const validation  = validateProjectReadiness(project);
  const { canExport, errors, warnings, infos } = validation;

  // What's included in the output files
  const sections = [
    { label: 'Projekt kontextus',          done: !!project.meta.label },
    { label: `${project.roles.length} szerepkör + text format`, done: project.roles.length > 0 },
    { label: `${project.entities.filter(e=>e.type==='content').length} content type, ${project.entities.filter(e=>e.type==='taxonomy').length} taxonomy`, done: project.entities.length > 0 },
    { label: 'Image styles (auto-generált)', done: project.entities.some(e=>e.fields.some(f=>f.type==='image')) },
    { label: `${project.viewListings?.length ?? 0} Views / listázó oldal`, done: (project.viewListings?.length ?? 0) > 0 },
    { label: `Workflow: ${project.workflows[0]?.states.length ?? 0} állapot`, done: project.workflows.length > 0 },
    { label: `${project.permissions.length} jogosultság (mátrix)`, done: project.permissions.length > 0 },
    { label: 'DDEV + MySQL setup (AGENTS.md)', done: true },
    { label: 'Fejlesztői brief + nyitott kérdések (DEVELOPER-BRIEF.md)', done: true },
  ];

  return (
    <div className="space-y-6 pb-6">

      {/* Header */}
      <div className="flex items-start gap-3">
        <CheckCircle2 size={28} className="text-green-500 mt-0.5 shrink-0" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {project.meta.label ? `${project.meta.label} — kész!` : 'Architektúra kész!'}
          </h2>
          <p className="text-gray-500 mt-1 text-sm leading-relaxed">
            Az <strong>AGENTS.md</strong> másolható bármilyen IDE-be vagy AI agentbe.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Szerepkör',  value: project.roles.length,       color: 'text-blue-600 bg-blue-50' },
          { label: 'Entitás',    value: project.entities.length,     color: 'text-purple-600 bg-purple-50' },
          { label: 'Workflow',   value: project.workflows[0]?.states.length ?? 0, color: 'text-amber-600 bg-amber-50' },
          { label: 'Jogosultság',value: project.permissions.length,  color: 'text-green-600 bg-green-50' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-xl p-3 text-center', s.color)}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs mt-0.5 opacity-75 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* What's in the AGENTS.md */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">Generált fájlok tartalma ({agentsMd.length + briefMd.length} karakter összesen)</span>
        </div>
        <div className="p-3 space-y-1.5">
          {sections.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              {s.done
                ? <CheckCircle size={15} className="text-green-500 shrink-0" />
                : <Circle size={15} className="text-gray-300 shrink-0" />}
              <span className={cn('text-xs', s.done ? 'text-gray-700' : 'text-gray-400')}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Validation status banner */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1.5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={16} className="text-red-600 shrink-0" />
            <span className="text-sm font-semibold text-red-700">Letöltés nem lehetséges — kritikus hiányosságok:</span>
          </div>
          {errors.map((e, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-xs text-red-700">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{e.message}</span>
              </div>
              {e.step && (
                <button
                  onClick={() => router.push(`/wizard/${e.step}`)}
                  className="text-xs text-red-600 font-semibold whitespace-nowrap underline hover:text-red-800 shrink-0"
                >
                  {e.stepLabel} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {errors.length === 0 && warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1.5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span className="text-sm font-semibold text-amber-700">Letölthető, de {warnings.length} figyelmeztetés van:</span>
          </div>
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-xs text-amber-700">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{w.message}</span>
              </div>
              {w.step && (
                <button
                  onClick={() => router.push(`/wizard/${w.step}`)}
                  className="text-xs text-amber-700 font-semibold whitespace-nowrap underline hover:text-amber-900 shrink-0"
                >
                  {w.stepLabel} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {errors.length === 0 && warnings.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <span className="text-sm font-medium text-green-700">Minden lényeges adat megvan — a kimenet fejlesztésre kész.</span>
        </div>
      )}

      {/* Open questions (info) */}
      {infos.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-1.5">
          <div className="flex items-center gap-2 mb-2">
            <Info size={15} className="text-gray-500 shrink-0" />
            <span className="text-xs font-semibold text-gray-600">Nyitott kérdések a fejlesztőnek:</span>
          </div>
          {infos.map((inf, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{inf.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Primary CTAs */}
      <div className="space-y-2">
        <button
          onClick={downloadAgentsMd}
          disabled={!canExport}
          className={cn(
            'w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-semibold transition-all shadow-sm text-base',
            canExport
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          )}
        >
          <FileCode2 size={20} />
          AGENTS.md letöltése — AI agent számára
        </button>
        <button
          onClick={downloadDeveloperBrief}
          disabled={!canExport}
          className={cn(
            'w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-medium transition-all text-sm',
            canExport
              ? 'bg-gray-800 text-white hover:bg-gray-900'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          )}
        >
          <FileText size={17} />
          DEVELOPER-BRIEF.md letöltése — fejlesztő számára
        </button>
      </div>
      <p className="text-xs text-center text-gray-400 -mt-1">
        AGENTS.md → Cursor / Copilot / Claude kontextusba · DEVELOPER-BRIEF.md → emberi olvasásra
      </p>

      {/* Back + JSON + New project */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/wizard/external')}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition-all"
        >
          <ArrowLeft size={15} /> Vissza
        </button>
        <button
          onClick={downloadJson}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition-all"
        >
          <Download size={15} />
          JSON letöltése
        </button>
      </div>

      <button
        onClick={startNewProject}
        className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all"
      >
        + Új projekt indítása
      </button>
    </div>
  );
}
