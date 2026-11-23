'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import type { Permission, Operation } from '@/lib/types';
import { OPERATIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

const OP_LABELS: Record<Operation, string> = {
  create:  'Létrehoz',
  read:    'Olvas',
  update:  'Szerkeszt',
  delete:  'Töröl',
  publish: 'Publikál',
  archive: 'Archivál',
};

function generateDefaults(
  roles: ReturnType<typeof useProjectStore.getState>['project']['roles'],
  entities: ReturnType<typeof useProjectStore.getState>['project']['entities'],
): Permission[] {
  const result: Permission[] = [];
  for (const role of roles) {
    for (const entity of entities) {
      let ops: Operation[] = [];
      switch (role.type) {
        case 'admin':       ops = ['create','read','update','delete','publish','archive']; break;
        case 'editor':      ops = ['create','read','update','publish']; break;
        case 'moderator':   ops = ['read','update','publish']; break;
        case 'contributor': ops = ['create','read','update']; break;
        case 'viewer':      ops = ['read']; break;
        case 'external':    ops = ['read']; break;
      }
      result.push({ roleId: role.id, entityId: entity.id, operations: ops, scope: role.scope });
    }
  }
  return result;
}

export function PermissionsStep() {
  const router = useRouter();
  const { project, setPermissions, markStepComplete } = useProjectStore();
  const [perms, setPerms] = useState<Permission[]>(project.permissions);
  const [generated, setGenerated] = useState(project.permissions.length > 0);

  function generate() {
    setPerms(generateDefaults(project.roles, project.entities));
    setGenerated(true);
  }

  function toggleOp(roleId: string, entityId: string, op: Operation) {
    setPerms((prev) => prev.map((p) => {
      if (p.roleId !== roleId || p.entityId !== entityId) return p;
      const has = p.operations.includes(op);
      return { ...p, operations: has ? p.operations.filter((o) => o !== op) : [...p.operations, op] };
    }));
  }

  function handleContinue() {
    setPermissions(perms);
    markStepComplete('permissions');
    router.push('/wizard/external');
  }

  if (!generated) {
    return (
      <div className="space-y-6">
        <div>
        <h2 className="text-2xl font-bold text-gray-900">Ki mit tehet?</h2>
          <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
            Az előző lépések alapján automatikusan kitöltjük — csak ellenőrizd és módosítsd ahol szükséges.
          </p>
        </div>
        {(!project.roles.length || !project.entities.length) ? (
          <div className="p-6 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50 text-center">
            <p className="text-sm text-amber-700 font-medium">
              A generáláshoz legalább 1 felhasználói csoport és 1 adattípus szükséges.
            </p>
            <p className="text-xs text-amber-500 mt-1">
              Menj vissza és töltsd ki az előző lépéseket.
            </p>
          </div>
        ) : (
          <button
            onClick={generate}
            className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Zap size={18} />
            Hozzáférések előtöltése ({project.roles.length} csoport × {project.entities.length} adattípus)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ki mit tehet?</h2>
        <p className="text-gray-500 mt-1.5 text-sm">
          Automatikusan kitöltve — módosítsd ahol szükséges.
        </p>
      </div>

      <div className="space-y-5">
        {project.entities.map((entity) => (
          <div key={entity.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">{entity.label}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-gray-500 font-medium w-40">Felhasználói csoport</th>
                    {OPERATIONS.map((op) => (
                      <th key={op} className="text-center px-2 py-2 text-gray-500 font-medium whitespace-nowrap">
                        {OP_LABELS[op]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {project.roles.map((role) => {
                    const perm = perms.find((p) => p.roleId === role.id && p.entityId === entity.id);
                    return (
                      <tr key={role.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-800">{role.label}</div>
                          <div className="text-gray-400 text-xs">{role.scope === 'own' ? 'saját' : role.scope === 'all' ? 'összes' : 'hozzárendelt'}</div>
                        </td>
                        {OPERATIONS.map((op) => (
                          <td key={op} className="text-center px-2 py-2.5">
                            <input
                              type="checkbox"
                              className="accent-blue-600 w-4 h-4 cursor-pointer"
                              checked={perm?.operations.includes(op) ?? false}
                              onChange={() => toggleOp(role.id, entity.id, op)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleContinue}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
        Mátrix jóváhagyása, tovább →
      </button>
    </div>
  );
}
