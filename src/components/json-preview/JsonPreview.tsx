'use client';
import { useProjectStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Database, Users, GitBranch, Shield, List, Layers } from 'lucide-react';

export function JsonPreview() {
  const { project, completedSteps, visibleSteps } = useProjectStore();
  const pathname = usePathname();

  const contentTypes = project.entities.filter((e) => e.type === 'content');
  const taxonomies   = project.entities.filter((e) => e.type === 'taxonomy');
  const paragraphs   = project.entities.filter((e) => e.type === 'paragraph');

  const STEPS_DONE = completedSteps.length;
  const STEPS_TOTAL = visibleSteps.length;
  const PCT = STEPS_TOTAL ? Math.round((STEPS_DONE / STEPS_TOTAL) * 100) : 0;

  return (
    <aside className="flex flex-col h-full w-72 shrink-0 bg-white border-l border-gray-100">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Élő összefoglaló
        </h2>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{STEPS_DONE} / {STEPS_TOTAL} lépés kész</span>
            <span>{PCT}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${PCT}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">

        {/* Project meta */}
        {project.meta.label && (
          <div className="p-3 bg-blue-50 rounded-xl">
            <p className="font-semibold text-blue-800">{project.meta.label}</p>
            {project.contextAnswers?.projectTypes?.length ? (
              <p className="text-blue-600 mt-0.5 text-xs">
                {project.contextAnswers.projectTypes.length === 1
                  ? project.contextAnswers.projectTypes[0]
                  : `${project.contextAnswers.projectTypes.length} típus`}
              </p>
            ) : null}
          </div>
        )}

        {/* Calibration summary */}
        {project.calibration && (
          <Section icon={<Layers size={13} />} label="Kalibráció" color="text-gray-500">
            <Tag>{project.calibration.isHeadless ? 'Headless' : 'Hagyományos Drupal'}</Tag>
            <Tag>{project.calibration.visibility === 'both' ? 'Nyilvános + Belső' : project.calibration.visibility === 'public' ? 'Nyilvános' : 'Csak belső'}</Tag>
            {project.calibration.multilingual && <Tag color="blue">Többnyelvű</Tag>}
            {project.calibration.flexibleLayouts && <Tag color="purple">{project.calibration.layoutEngine === 'paragraphs' ? 'Paragraphs' : 'Layout Builder'}</Tag>}
          </Section>
        )}

        {/* Roles */}
        {project.roles.length > 0 && (
          <Section icon={<Users size={13} />} label={`Szerepkörök (${project.roles.length})`} color="text-blue-500">
            {project.roles.map((r) => (
              <div key={r.id} className="flex items-center gap-1.5">
                <span className="font-medium text-gray-700">{r.label}</span>
                <span className={cn('px-1 rounded text-xs',
                  r.type === 'admin' ? 'bg-red-50 text-red-500' :
                  r.type === 'editor' ? 'bg-blue-50 text-blue-500' :
                  'bg-gray-50 text-gray-400',
                )}>{r.scope === 'own' ? 'saját' : 'összes'}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Entities */}
        {project.entities.length > 0 && (
          <Section icon={<Database size={13} />} label={`Entitások (${project.entities.length})`} color="text-purple-500">
            {contentTypes.length > 0 && (
              <div>
                <p className="text-gray-400 mb-0.5">Content types</p>
                {contentTypes.map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{e.label}</span>
                    <span className="text-gray-400">{e.fields.length} mező</span>
                  </div>
                ))}
              </div>
            )}
            {taxonomies.length > 0 && (
              <div className="mt-1">
                <p className="text-gray-400 mb-0.5">Taxonomy</p>
                {taxonomies.map((e) => (
                  <span key={e.id} className="inline-block mr-1 mb-0.5 px-1.5 py-0.5 bg-green-50 text-green-600 rounded">{e.label}</span>
                ))}
              </div>
            )}
            {paragraphs.length > 0 && (
              <div className="mt-1">
                <p className="text-gray-400 mb-0.5">Paragraphs ({paragraphs.length})</p>
              </div>
            )}
          </Section>
        )}

        {/* Workflow */}
        {project.workflows.length > 0 && (
          <Section icon={<GitBranch size={13} />} label="Workflow" color="text-amber-500">
            <div className="flex flex-wrap gap-0.5">
              {project.workflows[0].states.map((s, i) => (
                <span key={s.id}>
                  <span className={cn('px-1.5 py-0.5 rounded text-xs',
                    s.isPublished ? 'bg-green-50 text-green-600 font-medium' : 'bg-gray-50 text-gray-500'
                  )}>
                    {s.label}
                  </span>
                  {i < project.workflows[0].states.length - 1 && (
                    <span className="text-gray-300 mx-0.5">→</span>
                  )}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Permissions */}
        {project.permissions.length > 0 && (
          <Section icon={<Shield size={13} />} label={`Jogosultságok (${project.permissions.length})`} color="text-green-500">
            <p className="text-gray-400">
              {project.roles.length} szerepkör × {project.entities.length} entitás
            </p>
          </Section>
        )}

        {/* Listings */}
        {(project.viewListings?.length ?? 0) > 0 && (
          <Section icon={<List size={13} />} label={`Listázó oldalak (${project.viewListings?.length})`} color="text-indigo-500">
            {project.viewListings?.map((l) => (
              <div key={l.id} className="flex items-center justify-between">
                <span className="font-medium text-gray-700">{l.label}</span>
                <code className="text-gray-400">{l.url}</code>
              </div>
            ))}
          </Section>
        )}

        {/* Empty state */}
        {!project.meta.label && !project.roles.length && !project.entities.length && (
          <div className="text-center py-8 text-gray-300">
            <p className="text-xs">Töltsd ki a wizard lépéseit</p>
            <p className="text-xs">és itt látod az összefoglalót</p>
          </div>
        )}

      </div>
    </aside>
  );
}

function Section({ icon, label, color, children }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className={cn('flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-100', color)}>
        {icon}
        <span className="font-semibold text-xs">{label}</span>
      </div>
      <div className="px-3 py-2 space-y-1 text-xs">{children}</div>
    </div>
  );
}

function Tag({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'blue' | 'purple' }) {
  return (
    <span className={cn('inline-block px-1.5 py-0.5 rounded text-xs mr-1 mb-0.5',
      color === 'blue'   ? 'bg-blue-50 text-blue-600' :
      color === 'purple' ? 'bg-purple-50 text-purple-600' :
      'bg-gray-50 text-gray-500',
    )}>
      {children}
    </span>
  );
}
