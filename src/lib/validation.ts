import type { ProjectData } from './types';

export interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  step?: string;
  stepLabel?: string;
}

export interface ValidationResult {
  canExport: boolean;
  errors:    ValidationIssue[];
  warnings:  ValidationIssue[];
  infos:     ValidationIssue[];
}

export function validateProjectReadiness(p: ProjectData): ValidationResult {
  const errors:   ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const infos:    ValidationIssue[] = [];

  // ── BLOKKOLÓ HIBÁK ────────────────────────────────────────────────────────

  if (p.entities.length === 0) {
    errors.push({ level: 'error', message: 'Nincs entitás definiálva — legalább 1 content type szükséges.', step: 'entities', stepLabel: '3. Entitások' });
  }

  if (p.roles.length === 0) {
    errors.push({ level: 'error', message: 'Nincs szerepkör definiálva — legalább 1 szerepkör szükséges.', step: 'roles', stepLabel: '2. Szereplők' });
  }

  if (p.entities.length > 0 && p.roles.length > 0 && p.permissions.length === 0) {
    errors.push({ level: 'error', message: 'Nincs jogosultság megadva — a jogosultsági mátrix üres.', step: 'permissions', stepLabel: '6. Jogosultságok' });
  }

  if (p.workflows.length > 0) {
    const hasPublishedState = p.workflows.some((wf) =>
      wf.states.some((s) => s.isPublished),
    );
    if (!hasPublishedState) {
      errors.push({ level: 'error', message: 'A workflow-ban nincs "publikált" állapot — tartalom soha nem lenne látható.', step: 'workflow', stepLabel: '5. Workflow' });
    }

    const hasTransitions = p.workflows.every((wf) => wf.transitions.length > 0);
    if (!hasTransitions) {
      errors.push({ level: 'error', message: 'A workflow-ban nincsenek átmenetek definiálva — a tartalom elakad az első állapotban.', step: 'workflow', stepLabel: '5. Workflow' });
    }
  }

  // Duplikált machine name-ek
  const machineNames = p.entities.map((e) => e.machineName).filter(Boolean);
  const duplicates = machineNames.filter((n, i) => machineNames.indexOf(n) !== i);
  if (duplicates.length > 0) {
    errors.push({ level: 'error', message: `Duplikált entitás machine name: ${[...new Set(duplicates)].join(', ')} — ezek felülírnák egymást Drupalban.`, step: 'entities', stepLabel: '3. Entitások' });
  }

  // ── FIGYELMEZTETÉSEK ──────────────────────────────────────────────────────

  const contentEntities = p.entities.filter((e) => e.type === 'content');

  for (const entity of contentEntities) {
    if (entity.fields.length === 0) {
      warnings.push({ level: 'warning', message: `"${entity.label}" content type-nak nincsenek mezői.`, step: 'entities', stepLabel: '3. Entitások' });
    }
    if (!entity.urlPattern) {
      warnings.push({ level: 'warning', message: `"${entity.label}" entitásnak nincs URL minta megadva (Pathauto config hiányos lesz).`, step: 'entities', stepLabel: '3. Entitások' });
    }
  }

  if (contentEntities.length > 0 && (p.viewListings?.length ?? 0) === 0) {
    warnings.push({ level: 'warning', message: 'Nincs listázó oldal (Views) definiálva — a tartalom nem lesz böngészhető.', step: 'listings', stepLabel: '4. Listázó oldalak' });
  }

  if (p.calibration?.hasMigration && p.integrations.length === 0) {
    warnings.push({ level: 'warning', message: 'Migráció be van jelölve, de nincs forrásrendszer megadva.', step: 'migration', stepLabel: '12. Migráció' });
  }

  for (const role of p.roles) {
    const hasPerms = p.permissions.some((pm) => pm.roleId === role.id);
    if (!hasPerms) {
      warnings.push({ level: 'warning', message: `"${role.label}" szerepkörnek nincs egyetlen jogosultsága sem.`, step: 'permissions', stepLabel: '6. Jogosultságok' });
    }
  }

  if (p.workflows.length > 0) {
    for (const wf of p.workflows) {
      for (const transition of wf.transitions) {
        if (transition.allowedRoles.length === 0) {
          warnings.push({ level: 'warning', message: `"${transition.label}" workflow átmenethez nincs hozzárendelve szerepkör.`, step: 'workflow', stepLabel: '5. Workflow' });
        }
      }
    }
  }

  // ── INFÓK / NYITOTT KÉRDÉSEK ──────────────────────────────────────────────

  infos.push({ level: 'info', message: 'Hosting döntés szükséges (Acquia / Pantheon / Platform.sh / saját VPS).' });
  infos.push({ level: 'info', message: 'Admin téma: Gin ajánlott — a fejlesztőnek kell telepíteni.' });

  const hasImages = p.entities.some((e) => e.fields.some((f) => f.type === 'image'));
  if (hasImages) {
    infos.push({ level: 'info', message: 'Képméretek (image styles) a frontend tervek alapján pontosítandók.' });
  }

  if (!p.auth || p.auth.sso === 'none') {
    if (p.calibration?.visibility === 'internal') {
      infos.push({ level: 'info', message: 'Belső rendszer: érdemes megvizsgálni Active Directory / Azure AD integrációt.' });
    }
  }

  return {
    canExport: errors.length === 0,
    errors,
    warnings,
    infos,
  };
}
