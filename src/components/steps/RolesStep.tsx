'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { ROLE_TYPES, SCOPES } from '@/lib/constants';
import type { Role, RoleType, Scope, TextFormat } from '@/lib/types';
import { toMachineName, cn } from '@/lib/utils';
import { getTemplateForProjectTypes } from '@/lib/site-type-templates';
import { Plus, Trash2, User, Sparkles, X } from 'lucide-react';

const ROLE_TYPE_LABELS: Record<RoleType, string> = {
  admin: 'Adminisztrátor – mindent lát és kezelhet',
  editor: 'Szerkesztő – tartalmakat kezel',
  contributor: 'Közreműködő – saját tartalmakat visz fel',
  moderator: 'Moderátor – jóváhagyja a tartalmakat',
  viewer: 'Néző – csak olvashat',
  external: 'Külső felhasználó – korlátozott hozzáférés',
};

const TEXT_FORMAT_LABELS: Record<TextFormat, string> = {
  plain_text:  'Csak szöveg (plain text)',
  basic_html:  'Alap HTML (p, a, em, strong)',
  full_html:   'Teljes HTML + CKEditor 5 (rich text)',
};

const ROLE_TYPE_SHORT: Record<RoleType, string> = {
  admin:       'Adminisztrátor',
  editor:      'Szerkesztő',
  contributor: 'Közreműködő',
  moderator:   'Jóváhagyó',
  viewer:      'Néző',
  external:    'Külső',
};
function defaultTextFormat(type: RoleType): TextFormat {
  if (type === 'admin') return 'full_html';
  if (type === 'editor' || type === 'moderator') return 'full_html';
  if (type === 'contributor') return 'basic_html';
  return 'plain_text';
}

const SCOPE_LABELS: Record<Scope, string> = {
  own: 'Csak saját tartalmait látja/szerkeszti',
  all: 'Mindenki tartalmát eléri',
  assigned: 'Csak a hozzárendelt tartalmakat',
};

export function RolesStep() {
  const router = useRouter();
  const { project, setRoles, markStepComplete } = useProjectStore();
  const [roles, setLocal] = useState<Role[]>(project.roles);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<RoleType>('editor');
  const [newScope, setNewScope] = useState<Scope>('own');
  const [newFormat, setNewFormat] = useState<TextFormat>('basic_html');
  const [newDesc, setNewDesc] = useState('');
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  // Role suggestions from site-type-templates
  const projectTypes = project.contextAnswers?.projectTypes ?? [];
  const templateRoles = useMemo(
    () => projectTypes.length > 0 ? getTemplateForProjectTypes(projectTypes).roles : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectTypes.join(',')],
  );
  const showSuggestions = !suggestionsDismissed && templateRoles.length > 0;
  const addedMachineNames = new Set(roles.map((r) => r.machineName));

  function addRole() {
    if (!newLabel.trim()) return;
    setLocal([...roles, {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      machineName: toMachineName(newLabel),
      type: newType,
      scope: newScope,
      textFormat: newFormat,
      description: newDesc.trim() || undefined,
    }]);
    setNewLabel('');
    setNewType('editor');
    setNewScope('own');
    setNewFormat('basic_html');
    setNewDesc('');
    setAdding(false);
  }

  function handleContinue() {
    if (!roles.length) return;
    setRoles(roles);
    markStepComplete('roles');
    router.push('/wizard/entities');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kik használják a rendszert?</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Sorolja fel a főbb felhasználói csoportokat — beosztás vagy feladat szerint.
          Pl. titkárság, osztályvezető, külső partner.
        </p>
      </div>

      {/* Javaslatok a projektípus alapján */}
      {showSuggestions && (
        <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  Javasolt szerepkörök a projektípus alapján
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Tipikus felhasználói csoportok ehhez a rendszertípushoz — egyetlen kattintással hozzáadhatók.
                </p>
              </div>
            </div>
            <button onClick={() => setSuggestionsDismissed(true)}
              className="text-blue-300 hover:text-blue-500 transition-colors shrink-0 mt-0.5">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-1.5">
            {templateRoles.map((r) => {
              const alreadyAdded = addedMachineNames.has(r.machineName);
              return (
              <div key={r.id}
                className={cn(
                  'flex items-center justify-between border rounded-lg px-3 py-2',
                  alreadyAdded ? 'bg-gray-50 border-gray-200 opacity-50' : 'bg-white border-blue-200',
                )}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{r.label}</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                    {ROLE_TYPE_SHORT[r.type]}
                  </span>
                  <span className="text-xs bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-full">
                    {r.scope === 'own' ? 'saját' : r.scope === 'all' ? 'összes' : 'hozzárendelt'}
                  </span>
                  {r.description && (
                    <span className="text-xs text-gray-400">{r.description}</span>
                  )}
                </div>
                {alreadyAdded ? (
                  <span className="text-xs text-green-600 font-medium whitespace-nowrap ml-2">✓ Hozzáadva</span>
                ) : (
                  <button
                    onClick={() => setLocal((prev) => [...prev, r])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors whitespace-nowrap ml-2"
                  >
                    + Hozzáadás
                  </button>
                )}
              </div>
              );
            })}
          </div>
          <button
            onClick={() => { setLocal(templateRoles); setSuggestionsDismissed(true); }}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Összes hozzáadása ({templateRoles.length} szerepkör)
          </button>
        </div>
      )}

      {/* Existing roles */}
      <div className="space-y-2">
        {roles.map((role) => (
          <div key={role.id} className="flex items-start gap-3 p-3.5 bg-white border border-gray-200 rounded-xl">
            <div className="mt-0.5 p-1.5 bg-blue-50 rounded-lg shrink-0">
              <User size={14} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-gray-900">{role.label}</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                  {ROLE_TYPE_SHORT[role.type]}
                </span>
                <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                  {role.scope === 'own' ? 'saját' : role.scope === 'all' ? 'összes' : 'hozzárendelt'}
                </span>
                <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                  {TEXT_FORMAT_LABELS[role.textFormat ?? 'basic_html']}
                </span>
              </div>
              {role.description && (
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{role.description}</p>
              )}
            </div>
            <button
              onClick={() => setLocal(roles.filter((r) => r.id !== role.id))}
              className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Add role form */}
      {adding ? (
        <div className="p-4 border-2 border-blue-200 bg-blue-50/30 rounded-xl space-y-3">
          <input
            autoFocus
            type="text"
            placeholder="Szerepkör neve (pl. Főszerkesztő)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRole()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <input
            type="text"
            placeholder="Leírás (opcionális) – pl. ő hagyja jóvá a cikkeket"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Típus</label>
              <select
                value={newType}
                onChange={(e) => { const t = e.target.value as RoleType; setNewType(t); setNewFormat(defaultTextFormat(t)); }}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ROLE_TYPES.map((t) => (
                  <option key={t} value={t}>{ROLE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Hozzáférés hatóköre</label>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value as Scope)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {SCOPES.map((s) => (
                  <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Szövegszerkesztő szintje</label>
              <select
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value as TextFormat)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {(Object.keys(TEXT_FORMAT_LABELS) as TextFormat[]).map((f) => (
                  <option key={f} value={f}>{TEXT_FORMAT_LABELS[f]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addRole}
              disabled={!newLabel.trim()}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                newLabel.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed',
              )}
            >
              Hozzáadás
            </button>
            <button
              onClick={() => { setAdding(false); setNewLabel(''); }}
              className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Mégsem
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
        >
          <Plus size={16} /> Szerepkör hozzáadása
        </button>
      )}

      <button
        onClick={handleContinue}
        disabled={!roles.length}
        className={cn(
          'w-full py-3 rounded-xl font-medium text-sm transition-all',
          roles.length
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed',
        )}
      >
        Tovább — mit tárol a rendszer? ({roles.length} csoport) →
      </button>
    </div>
  );
}
