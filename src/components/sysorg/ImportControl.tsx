'use client';
import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { downloadText, fileSlug, MAX_IMPORT_BYTES, parseImport, serializeProject } from '@/lib/sysorg/io';
import { useSysorgStore } from '@/lib/sysorg/store';
import type { SysorgProject } from '@/lib/sysorg/schema';
import { Notice, buttonClass } from './ui';

export function exportProjectJson(project: SysorgProject) {
  downloadText(`alexandra-${fileSlug(project.meta.title)}.json`, serializeProject(project), 'application/json');
}

type Message = { tone: 'danger' | 'success' | 'warning'; text: string; openId?: string };

/** JSON visszatöltése. Az importált elemzés új elemzésként kerül a listába, meglévőt soha nem ír felül. */
export function ImportControl({ className }: { className?: string }) {
  const router = useRouter();
  const importProject = useSysorgStore((s) => s.importProject);
  const openProject = useSysorgStore((s) => s.openProject);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage({ tone: 'danger', text: 'A fájl túl nagy (legfeljebb 5 MB engedélyezett).' });
      return;
    }
    const parsed = parseImport(await file.text());
    if (!parsed.ok) {
      setMessage({ tone: 'danger', text: parsed.error });
      return;
    }
    const added = importProject(parsed.project);
    if (!added.ok) {
      setMessage({ tone: 'danger', text: added.error });
      return;
    }
    setMessage({
      tone: parsed.removedReferences > 0 ? 'warning' : 'success',
      text: parsed.removedReferences > 0
        ? `Az importálás sikerült, új elemzésként. ${parsed.removedReferences} hibás vagy már nem létező hivatkozást töröltünk.`
        : 'Az importálás sikerült, új elemzésként került a listába.',
      openId: added.id,
    });
  }

  return (
    <div className={className}>
      <input ref={input} type="file" accept="application/json,.json" className="sr-only" onChange={onFile} aria-label="Rendszerszervezési JSON kiválasztása" tabIndex={-1} />
      <button type="button" className={buttonClass} onClick={() => input.current?.click()}><Upload size={16} aria-hidden="true" />Importálás JSON-ból</button>
      {message && (
        <div className="mt-3">
          <Notice tone={message.tone} onClose={() => setMessage(null)}>
            {message.text}
            {message.openId && (
              <button
                type="button"
                className="studio-focus ml-2 rounded font-medium underline"
                onClick={() => { openProject(message.openId as string); router.push('/sysorg/keret'); }}
              >Megnyitás</button>
            )}
          </Notice>
        </div>
      )}
    </div>
  );
}
