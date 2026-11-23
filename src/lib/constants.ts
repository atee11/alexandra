import type { WizardStep } from './types';

export const FIELD_TYPES = [
  'text', 'textarea', 'integer', 'boolean', 'date',
  'reference', 'file', 'image', 'email', 'telephone', 'list',
] as const;

export const OPERATIONS = ['create', 'read', 'update', 'delete', 'publish', 'archive'] as const;
export const SCOPES = ['own', 'all', 'assigned'] as const;
export const ROLE_TYPES = ['admin', 'editor', 'viewer', 'contributor', 'moderator', 'external'] as const;
export const WORKFLOW_STATES = ['draft', 'review', 'published', 'rejected', 'archived'] as const;
export const MEDIA_TYPES = ['image', 'document', 'video', 'audio', 'remote_video'] as const;
export const ENTITY_TYPES = ['content', 'taxonomy', 'media', 'user_profile', 'paragraph'] as const;

export const CORE_STEPS: WizardStep[] = [
  'calibration', 'context', 'roles', 'entities', 'listings', 'workflow', 'permissions', 'external',
];

export const STEP_LABELS: Record<WizardStep, string> = {
  calibration:   '0. Kalibráció',
  context:       '1. Kontextus és cél',
  roles:         '2. Felhasználói csoportok',
  entities:      '3. Mit tárol?',
  listings:      '4. Listázó oldalak',
  workflow:      '5. Jóváhagyási folyamat',
  permissions:   '6. Hozzáférések',
  external:      '7. Külső kapcsolatok',
  search:        '7. Keresés és listák',
  notifications: '8. Értesítések',
  sso:           '9. Belépés',
  languages:     '10. Többnyelvűség',
  layouts:       '11. Oldal-elrendezés',
  migration:     '12. Migráció',
  integrations:  '13. Integráció',
  compliance:    '14. Megfelelőség',
};

export const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  calibration:   'A projekt típusának meghatározása',
  context:       'Milyen problémát old meg?',
  roles:         'Kik fogják használni?',
  entities:      'Mit tárol a rendszer?',
  listings:      'Milyen listázó oldalak kellenek?',
  workflow:      'Van-e jóváhagyási folyamat?',
  permissions:   'Ki mit tehet?',
  external:      'Külső rendszerek és korlátok',
  search:        'Listák, szűrők, keresés',
  notifications: 'Értesítések és automatizmusok',
  sso:           'Hogyan lépnek be a felhasználók?',
  languages:     'Többnyelvű tartalom kezelése',
  layouts:       'Rugalmas oldalszerkesztés',
  migration:     'Meglévő adatok áthozásának terve',
  integrations:  'Külső rendszerek kapcsolódása',
  compliance:    'Adatvédelem és naplózás',
};
