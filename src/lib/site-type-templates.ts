/**
 * Alexandra – Site Type Architecture Templates
 *
 * Minden Drupal 11 oldaltípushoz tartalmazza a tipikus:
 *  - entitásokat (content type-ok, taxonomy-k, media type-ok)
 *  - szerepköröket
 *  - workflow-t
 *  - szükséges modulokat
 *
 * Az instantiateSiteTemplate() függvény UUID-okat rendel hozzá és
 * feloldja a machine-name alapú kereszthivatkozásokat.
 */

import type {
  Entity, EntityField, Role, Workflow, WorkflowState,
  Permission, Operation, EntityType, FieldType, RoleType, Scope,
} from './types';

// ─── Template-specifikus típusok (ID nélkül, machine-name hivatkozásokkal) ──

export interface FieldTpl extends Omit<EntityField, 'id' | 'referenceTarget'> {
  refMachineName?: string; // másik entitás machine neve a sablonban
}

export interface EntityTpl extends Omit<Entity, 'id' | 'position' | 'fields'> {
  fields: FieldTpl[];
  urlPatternDefault?: string;
}

export interface RoleTpl extends Omit<Role, 'id' | 'textFormat'> {
  /** entity machineName → engedélyezett műveletek */
  defaultPermissions: Record<string, Operation[]>;
}

export interface TransitionTpl {
  from: string;
  to: string;
  label: string;
  allowedRoleMachineNames: string[];
}

export interface WorkflowTpl {
  appliesToMachineNames: string[];
  states: WorkflowState[];
  transitions: TransitionTpl[];
}

export interface SiteTemplate {
  label: string;
  description: string;
  entities: EntityTpl[];
  roles: RoleTpl[];
  workflow: WorkflowTpl | null;
  modules: { core: string[]; contrib: string[] };
  calibrationHints: {
    flexibleLayouts: boolean;
    layoutEngine?: 'paragraphs' | 'layout_builder';
    needsSearch: boolean;
    needsScheduler: boolean;
    ssoRecommended: boolean;
  };
}

// ─── Segédfüggvény: mező létrehozása ────────────────────────────────────────

function f(
  label: string,
  type: FieldType,
  required = false,
  opts: Partial<FieldTpl> = {},
): FieldTpl {
  return { label, type, required, cardinality: 'single', ...opts };
}

// ════════════════════════════════════════════════════════════════════════════
//  1. CÉGES / MARKETING OLDAL
// ════════════════════════════════════════════════════════════════════════════

const marketing: SiteTemplate = {
  label: 'Céges / Marketing oldal',
  description: 'Nyilvános bemutatkozó oldal, landing page-ek, blog, kapcsolat',
  modules: {
    core:    ['node', 'block', 'views', 'text', 'field', 'user', 'layout_builder', 'layout_discovery'],
    contrib: ['pathauto', 'token', 'metatag', 'webform', 'webform_ui', 'redirect', 'simple_sitemap'],
  },
  calibrationHints: {
    flexibleLayouts: true,
    layoutEngine: 'layout_builder',
    needsSearch: false,
    needsScheduler: false,
    ssoRecommended: false,
  },
  entities: [
    {
      label: 'Oldal', machineName: 'page', type: 'content',
      description: 'Általános statikus oldal (Rólunk, Szolgáltatások, ÁSZF)',
      urlPatternDefault: '/[node:title]',
      fields: [
        f('Cím',      'text',     true),
        f('Tartalom', 'textarea', true),
        f('Bevezető', 'textarea'),
        f('Borítókép','image'),
      ],
    },
    {
      label: 'Blog bejegyzés', machineName: 'blog_post', type: 'content',
      description: 'Céges blog, hírek, esettanulmányok',
      urlPatternDefault: '/blog/[node:title]',
      fields: [
        f('Cím',        'text',     true),
        f('Szöveg',     'textarea', true),
        f('Borítókép',  'image'),
        f('Kategória',  'reference', false, { refMachineName: 'blog_category' }),
        f('Közzétéve',  'date'),
        f('Szerző',     'reference', false, { referenceEntityType: 'user' }),
      ],
    },
    {
      label: 'Blog kategória', machineName: 'blog_category', type: 'taxonomy',
      description: 'Blog bejegyzések csoportosítása',
      fields: [],
    },
    {
      label: 'Kapcsolatfelvételi üzenet', machineName: 'contact_message', type: 'content',
      description: 'Webform beküldések tárolása (opcionális)',
      fields: [
        f('Név',     'text',     true),
        f('E-mail',  'email',    true),
        f('Üzenet',  'textarea', true),
      ],
    },
  ],
  roles: [
    {
      label: 'Adminisztrátor', machineName: 'administrator', type: 'admin', scope: 'all',
      description: 'Teljes hozzáférés minden funkcióhoz',
      defaultPermissions: {
        page:            ['create','read','update','delete','publish'],
        blog_post:       ['create','read','update','delete','publish'],
        contact_message: ['read','delete'],
      },
    },
    {
      label: 'Tartalomszerkesztő', machineName: 'content_editor', type: 'editor', scope: 'all',
      description: 'Oldalakat és blog bejegyzéseket kezel',
      defaultPermissions: {
        page:      ['create','read','update','publish'],
        blog_post: ['create','read','update','publish'],
      },
    },
  ],
  workflow: null, // egyszerű draft/published, nincs approval
};

// ════════════════════════════════════════════════════════════════════════════
//  2. HÍRPORTÁL / MÉDIAOLDAL
// ════════════════════════════════════════════════════════════════════════════

const news: SiteTemplate = {
  label: 'Hírportál / Médiaoldal',
  description: 'Cikkek, szerkesztőségi workflow, szerzők, kategóriák',
  modules: {
    core:    ['node', 'taxonomy', 'media', 'media_library', 'content_moderation', 'workflows',
              'text', 'field', 'views', 'user'],
    contrib: ['pathauto', 'token', 'metatag', 'scheduler', 'paragraphs',
              'entity_reference_revisions', 'search_api', 'search_api_db',
              'facets', 'admin_toolbar'],
  },
  calibrationHints: {
    flexibleLayouts: true,
    layoutEngine: 'paragraphs',
    needsSearch: true,
    needsScheduler: true,
    ssoRecommended: false,
  },
  entities: [
    {
      label: 'Cikk', machineName: 'article', type: 'content',
      description: 'Hírportál alapentitása',
      urlPatternDefault: '/[node:field_kategoria:name]/[node:title]',
      fields: [
        f('Cím',            'text',      true),
        f('Összefoglaló',   'textarea',  true),
        f('Szöveg',         'textarea',  true),
        f('Borítókép',      'image'),
        f('Kategória',      'reference', true,  { refMachineName: 'category' }),
        f('Szerző profil',  'reference', false, { refMachineName: 'author' }),
        f('Közzétéve',      'date'),
        f('Megjelenés időpontja', 'date'),
        f('Kiemelt',        'boolean'),
      ],
    },
    {
      label: 'Kategória', machineName: 'category', type: 'taxonomy',
      description: 'Cikkek fő tematikus besorolása (pl. Politika, Sport, Kultúra)',
      fields: [
        f('Leírás',      'textarea'),
        f('Borítókép',   'image'),
      ],
    },
    {
      label: 'Cimke', machineName: 'tag', type: 'taxonomy',
      description: 'Szabad kulcsszavak',
      fields: [],
    },
    {
      label: 'Szerző profil', machineName: 'author', type: 'user_profile',
      description: 'Cikket írók bővített adatlapja',
      fields: [
        f('Bemutatkozás', 'textarea'),
        f('Profilkép',    'image'),
        f('Twitter/X',    'text'),
        f('LinkedIn',     'text'),
      ],
    },
  ],
  roles: [
    {
      label: 'Főszerkesztő', machineName: 'editor_in_chief', type: 'admin', scope: 'all',
      description: 'Teljes szerkesztőségi jogkör, publikálás jóváhagyása',
      defaultPermissions: { article: ['create','read','update','delete','publish','archive'] },
    },
    {
      label: 'Szerkesztő', machineName: 'editor', type: 'editor', scope: 'all',
      description: 'Cikkeket kezel és jóváhagyásra küld',
      defaultPermissions: { article: ['create','read','update'] },
    },
    {
      label: 'Közreműködő', machineName: 'contributor', type: 'contributor', scope: 'own',
      description: 'Csak saját cikkeit írja és szerkeszti',
      defaultPermissions: { article: ['create','read','update'] },
    },
  ],
  workflow: {
    appliesToMachineNames: ['article'],
    states: [
      { id: 'draft',     label: 'Vázlat',              isPublished: false },
      { id: 'in_review', label: 'Jóváhagyásra vár',    isPublished: false },
      { id: 'published', label: 'Publikált',            isPublished: true  },
      { id: 'archived',  label: 'Archivált',            isPublished: false },
    ],
    transitions: [
      { from: 'draft',     to: 'in_review', label: 'Beküldés jóváhagyásra', allowedRoleMachineNames: ['contributor','editor','editor_in_chief'] },
      { from: 'in_review', to: 'published', label: 'Publikálás',            allowedRoleMachineNames: ['editor_in_chief'] },
      { from: 'in_review', to: 'draft',     label: 'Visszaküldés',          allowedRoleMachineNames: ['editor','editor_in_chief'] },
      { from: 'published', to: 'archived',  label: 'Archiválás',            allowedRoleMachineNames: ['editor_in_chief'] },
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  3. BELSŐ INTRANET
// ════════════════════════════════════════════════════════════════════════════

const intranet: SiteTemplate = {
  label: 'Belső intranet / Vállalati rendszer',
  description: 'Dokumentumok, bejelentések, munkatársi adatok, belső folyamatok',
  modules: {
    core:    ['node', 'taxonomy', 'content_moderation', 'workflows', 'text', 'field',
              'views', 'user', 'workspaces'],
    contrib: ['samlauth', 'content_access', 'pathauto', 'token', 'admin_toolbar',
              'revision_log_default', 'group'],
  },
  calibrationHints: {
    flexibleLayouts: false,
    needsSearch: true,
    needsScheduler: false,
    ssoRecommended: true,
  },
  entities: [
    {
      label: 'Dokumentum', machineName: 'document', type: 'content',
      description: 'Szabályzatok, útmutatók, sablonok',
      urlPatternDefault: '/dokumentumok/[node:field_osztaly:name]/[node:title]',
      fields: [
        f('Cím',            'text',      true),
        f('Tartalom',       'textarea'),
        f('Fájl',           'file'),
        f('Verziószám',     'text'),
        f('Osztály',        'reference', false, { refMachineName: 'department' }),
        f('Érvényes eddig', 'date'),
        f('Bizalmas',       'boolean'),
      ],
    },
    {
      label: 'Bejelentés', machineName: 'announcement', type: 'content',
      description: 'Belső hírek, értesítések',
      urlPatternDefault: '/bejelentesek/[node:title]',
      fields: [
        f('Cím',        'text',      true),
        f('Szöveg',     'textarea',  true),
        f('Fontossági szint', 'list'),
        f('Közzétéve',  'date'),
        f('Lejárat',    'date'),
      ],
    },
    {
      label: 'GYIK bejegyzés', machineName: 'faq', type: 'content',
      description: 'Visszatérő kérdések és válaszok',
      urlPatternDefault: '/gyik/[node:title]',
      fields: [
        f('Kérdés',  'text',     true),
        f('Válasz',  'textarea', true),
        f('Kategória','reference', false, { refMachineName: 'faq_category' }),
      ],
    },
    {
      label: 'Osztály / Szervezeti egység', machineName: 'department', type: 'taxonomy',
      description: 'Szervezeti struktúra',
      fields: [
        f('Vezető',  'reference', false, { referenceEntityType: 'user' }),
      ],
    },
    {
      label: 'GYIK kategória', machineName: 'faq_category', type: 'taxonomy',
      description: 'GYIK témakörök',
      fields: [],
    },
    {
      label: 'Munkatárs profil', machineName: 'staff_profile', type: 'user_profile',
      description: 'Bővített munkatársi adatlap',
      fields: [
        f('Pozíció',          'text'),
        f('Osztály',          'reference', false, { refMachineName: 'department' }),
        f('Telefonszám',      'telephone'),
        f('Profilkép',        'image'),
        f('Belépés dátuma',   'date'),
      ],
    },
  ],
  roles: [
    {
      label: 'Adminisztrátor', machineName: 'administrator', type: 'admin', scope: 'all',
      description: 'Teljes rendszergazda jogkör',
      defaultPermissions: {
        document:     ['create','read','update','delete','publish'],
        announcement: ['create','read','update','delete','publish'],
        faq:          ['create','read','update','delete','publish'],
      },
    },
    {
      label: 'Osztályvezető', machineName: 'dept_manager', type: 'moderator', scope: 'assigned',
      description: 'Saját osztályának dokumentumait kezeli és hagyja jóvá',
      defaultPermissions: {
        document:     ['create','read','update','publish'],
        announcement: ['create','read','update'],
      },
    },
    {
      label: 'Munkatárs', machineName: 'staff', type: 'viewer', scope: 'all',
      description: 'Olvasási jog mindenhez, dokumentumfeltöltés saját osztálynak',
      defaultPermissions: {
        document:     ['read','create'],
        announcement: ['read'],
        faq:          ['read'],
      },
    },
    {
      label: 'HR adminisztrátor', machineName: 'hr_admin', type: 'editor', scope: 'all',
      description: 'Munkatársi adatokat kezeli',
      defaultPermissions: {
        document:     ['create','read','update','publish'],
        announcement: ['create','read','update','publish'],
      },
    },
  ],
  workflow: {
    appliesToMachineNames: ['document'],
    states: [
      { id: 'draft',    label: 'Vázlat',             isPublished: false },
      { id: 'approval', label: 'Jóváhagyásra vár',   isPublished: false },
      { id: 'published',label: 'Jóváhagyott',         isPublished: true  },
      { id: 'outdated', label: 'Elavult',             isPublished: false },
    ],
    transitions: [
      { from: 'draft',    to: 'approval',  label: 'Jóváhagyásra küld', allowedRoleMachineNames: ['staff','hr_admin','dept_manager'] },
      { from: 'approval', to: 'published', label: 'Jóváhagyás',        allowedRoleMachineNames: ['dept_manager','administrator'] },
      { from: 'approval', to: 'draft',     label: 'Visszaküldés',      allowedRoleMachineNames: ['dept_manager','administrator'] },
      { from: 'published',to: 'outdated',  label: 'Elavulttá nyilvánítás', allowedRoleMachineNames: ['dept_manager','administrator'] },
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  4. DOKUMENTUMKEZELŐ / TUDÁSBÁZIS
// ════════════════════════════════════════════════════════════════════════════

const docs: SiteTemplate = {
  label: 'Dokumentumkezelő / Tudásbázis',
  description: 'Technikai dokumentáció, tudásbázis, verziózott tartalom',
  modules: {
    core:    ['node', 'taxonomy', 'text', 'field', 'views', 'user', 'book'],
    contrib: ['pathauto', 'token', 'metatag', 'search_api', 'search_api_db',
              'revision_log_default', 'admin_toolbar'],
  },
  calibrationHints: {
    flexibleLayouts: false,
    needsSearch: true,
    needsScheduler: false,
    ssoRecommended: false,
  },
  entities: [
    {
      label: 'Dokumentáció oldal', machineName: 'doc_page', type: 'content',
      description: 'Tudásbázis bejegyzés, útmutató',
      urlPatternDefault: '/docs/[node:field_fejezet:name]/[node:title]',
      fields: [
        f('Cím',           'text',     true),
        f('Tartalom',      'textarea', true),
        f('Fejezet',       'reference', false, { refMachineName: 'chapter' }),
        f('Verzió',        'reference', false, { refMachineName: 'version_label' }),
        f('Utolsó frissítés', 'date'),
        f('Szükséges előismeret', 'text'),
      ],
    },
    {
      label: 'Fejezet', machineName: 'chapter', type: 'taxonomy',
      description: 'Dokumentáció struktúrája (pl. Telepítés, Konfiguráció, API)',
      fields: [
        f('Sorrend', 'integer'),
      ],
    },
    {
      label: 'Verziócímke', machineName: 'version_label', type: 'taxonomy',
      description: 'Szoftver/termék verziók (pl. v1.0, v2.0)',
      fields: [
        f('Megjelenés dátuma', 'date'),
        f('Aktuális verzió',   'boolean'),
      ],
    },
  ],
  roles: [
    {
      label: 'Adminisztrátor', machineName: 'administrator', type: 'admin', scope: 'all',
      description: 'Teljes hozzáférés',
      defaultPermissions: { doc_page: ['create','read','update','delete','publish'] },
    },
    {
      label: 'Technikai író', machineName: 'tech_writer', type: 'editor', scope: 'own',
      description: 'Dokumentációs oldalakat ír és szerkeszt',
      defaultPermissions: { doc_page: ['create','read','update'] },
    },
    {
      label: 'Lektor', machineName: 'reviewer', type: 'moderator', scope: 'all',
      description: 'Átnézi és jóváhagyja a tartalmakat',
      defaultPermissions: { doc_page: ['read','update','publish'] },
    },
  ],
  workflow: {
    appliesToMachineNames: ['doc_page'],
    states: [
      { id: 'draft',     label: 'Vázlat',          isPublished: false },
      { id: 'in_review', label: 'Lektorálás alatt', isPublished: false },
      { id: 'published', label: 'Publikált',         isPublished: true  },
      { id: 'outdated',  label: 'Elavult',           isPublished: false },
    ],
    transitions: [
      { from: 'draft',     to: 'in_review', label: 'Lektorálásra küld', allowedRoleMachineNames: ['tech_writer','administrator'] },
      { from: 'in_review', to: 'published', label: 'Jóváhagyás',        allowedRoleMachineNames: ['reviewer','administrator'] },
      { from: 'in_review', to: 'draft',     label: 'Visszaküldés',      allowedRoleMachineNames: ['reviewer','administrator'] },
      { from: 'published', to: 'outdated',  label: 'Elavulttá nyilvánít', allowedRoleMachineNames: ['tech_writer','reviewer','administrator'] },
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  5. KÖZÖSSÉGI / TAGSÁGI RENDSZER
// ════════════════════════════════════════════════════════════════════════════

const community: SiteTemplate = {
  label: 'Közösségi / Tagsági rendszer',
  description: 'Felhasználói profilok, csoportok, user-generated content',
  modules: {
    core:    ['node', 'taxonomy', 'text', 'field', 'views', 'user', 'comment'],
    contrib: ['group', 'flag', 'private_message', 'pathauto', 'token', 'metatag',
              'search_api', 'search_api_db', 'admin_toolbar'],
  },
  calibrationHints: {
    flexibleLayouts: false,
    needsSearch: true,
    needsScheduler: false,
    ssoRecommended: false,
  },
  entities: [
    {
      label: 'Felhasználói profil', machineName: 'user_profile', type: 'user_profile',
      description: 'Tagok bővített adatlapja',
      fields: [
        f('Bemutatkozás',    'textarea'),
        f('Profilkép',       'image'),
        f('Webhely',         'text'),
        f('Tagság típusa',   'list'),
        f('Tagsági szint',   'text'),
      ],
    },
    {
      label: 'Csoport', machineName: 'group', type: 'content',
      description: 'Tematikus közösségi csoport',
      urlPatternDefault: '/csoportok/[node:title]',
      fields: [
        f('Név',         'text',     true),
        f('Leírás',      'textarea'),
        f('Borítókép',   'image'),
        f('Nyilvános',   'boolean'),
        f('Tagszám max', 'integer'),
      ],
    },
    {
      label: 'Bejegyzés', machineName: 'post', type: 'content',
      description: 'Tag által közzétett tartalom',
      urlPatternDefault: '/bejegyzesek/[node:title]',
      fields: [
        f('Cím',       'text',     true),
        f('Szöveg',    'textarea', true),
        f('Csoport',   'reference', false, { refMachineName: 'group' }),
        f('Csatolmány','file'),
      ],
    },
    {
      label: 'Bejegyzés kategória', machineName: 'post_category', type: 'taxonomy',
      description: 'Bejegyzések témakörönként',
      fields: [],
    },
  ],
  roles: [
    {
      label: 'Adminisztrátor', machineName: 'administrator', type: 'admin', scope: 'all',
      description: 'Teljes közösség-kezelési jogkör',
      defaultPermissions: {
        group: ['create','read','update','delete','publish'],
        post:  ['create','read','update','delete','publish'],
      },
    },
    {
      label: 'Moderátor', machineName: 'moderator', type: 'moderator', scope: 'all',
      description: 'Tartalom moderálása, spam eltávolítás',
      defaultPermissions: {
        group: ['read','update'],
        post:  ['read','update','delete'],
      },
    },
    {
      label: 'Prémium tag', machineName: 'premium_member', type: 'contributor', scope: 'own',
      description: 'Csoportokat hozhat létre, tartalmakat tölthet fel',
      defaultPermissions: {
        group: ['create','read','update'],
        post:  ['create','read','update','delete'],
      },
    },
    {
      label: 'Tag', machineName: 'member', type: 'contributor', scope: 'own',
      description: 'Bejegyzéseket írhat, meglévő csoportokhoz csatlakozhat',
      defaultPermissions: {
        group: ['read'],
        post:  ['create','read','update','delete'],
      },
    },
  ],
  workflow: {
    appliesToMachineNames: ['post'],
    states: [
      { id: 'draft',     label: 'Piszkozat',      isPublished: false },
      { id: 'published', label: 'Publikált',       isPublished: true  },
      { id: 'blocked',   label: 'Letiltott',       isPublished: false },
    ],
    transitions: [
      { from: 'draft',     to: 'published', label: 'Közzétesz',  allowedRoleMachineNames: ['member','premium_member','moderator','administrator'] },
      { from: 'published', to: 'blocked',   label: 'Letilt',     allowedRoleMachineNames: ['moderator','administrator'] },
      { from: 'blocked',   to: 'published', label: 'Visszaállít',allowedRoleMachineNames: ['moderator','administrator'] },
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  6. RENDEZVÉNY- ÉS ESEMÉNYKEZELŐ
// ════════════════════════════════════════════════════════════════════════════

const events: SiteTemplate = {
  label: 'Rendezvény- és eseménykezelő',
  description: 'Konferenciák, workshopok, helyszínek, regisztrációk',
  modules: {
    core:    ['node', 'taxonomy', 'text', 'field', 'views', 'user', 'datetime_range'],
    contrib: ['pathauto', 'token', 'metatag', 'webform', 'webform_ui', 'scheduler',
              'search_api', 'search_api_db', 'admin_toolbar'],
  },
  calibrationHints: {
    flexibleLayouts: false,
    needsSearch: true,
    needsScheduler: true,
    ssoRecommended: false,
  },
  entities: [
    {
      label: 'Esemény', machineName: 'event', type: 'content',
      description: 'Konferencia, workshop, meetup, webinárium',
      urlPatternDefault: '/esemenyek/[node:title]',
      fields: [
        f('Cím',               'text',     true),
        f('Leírás',            'textarea', true),
        f('Borítókép',         'image'),
        f('Kezdési időpont',   'date',     true),
        f('Befejezési időpont','date',     true),
        f('Helyszín',          'reference', false, { refMachineName: 'venue' }),
        f('Kapacitás (fő)',    'integer'),
        f('Online',            'boolean'),
        f('Online link',       'text'),
        f('Típus',             'reference', false, { refMachineName: 'event_type' }),
        f('Regisztrációs határidő', 'date'),
      ],
    },
    {
      label: 'Helyszín', machineName: 'venue', type: 'content',
      description: 'Rendezvény helyszíneinek adatai',
      urlPatternDefault: '/helyszinek/[node:title]',
      fields: [
        f('Név',           'text',    true),
        f('Cím',           'text',    true),
        f('Kapacitás',     'integer'),
        f('Térkép link',   'text'),
        f('Kép',           'image'),
      ],
    },
    {
      label: 'Regisztráció', machineName: 'registration', type: 'content',
      description: 'Eseményre való jelentkezések',
      fields: [
        f('Résztvevő neve', 'text',  true),
        f('E-mail',         'email', true),
        f('Esemény',        'reference', true, { refMachineName: 'event' }),
        f('Megjegyzés',     'textarea'),
        f('Étkezési igény', 'list'),
      ],
    },
    {
      label: 'Esemény típus', machineName: 'event_type', type: 'taxonomy',
      description: 'Konferencia, workshop, meetup, webinárium stb.',
      fields: [],
    },
  ],
  roles: [
    {
      label: 'Adminisztrátor', machineName: 'administrator', type: 'admin', scope: 'all',
      description: 'Teljes hozzáférés',
      defaultPermissions: {
        event:        ['create','read','update','delete','publish'],
        venue:        ['create','read','update','delete','publish'],
        registration: ['read','update','delete'],
      },
    },
    {
      label: 'Rendezvényszervező', machineName: 'organizer', type: 'editor', scope: 'own',
      description: 'Saját eseményeit kezeli, regisztrációkat látja',
      defaultPermissions: {
        event:        ['create','read','update','publish'],
        venue:        ['read'],
        registration: ['read'],
      },
    },
    {
      label: 'Látogató', machineName: 'visitor', type: 'viewer', scope: 'all',
      description: 'Eseményeket néz, regisztrálhat',
      defaultPermissions: {
        event:        ['read'],
        registration: ['create'],
      },
    },
  ],
  workflow: {
    appliesToMachineNames: ['event'],
    states: [
      { id: 'draft',      label: 'Vázlat',           isPublished: false },
      { id: 'published',  label: 'Meghirdetve',       isPublished: true  },
      { id: 'cancelled',  label: 'Lemondva',          isPublished: false },
      { id: 'completed',  label: 'Lezárult',          isPublished: false },
    ],
    transitions: [
      { from: 'draft',     to: 'published', label: 'Meghirdet',  allowedRoleMachineNames: ['organizer','administrator'] },
      { from: 'published', to: 'cancelled', label: 'Lemondja',   allowedRoleMachineNames: ['organizer','administrator'] },
      { from: 'published', to: 'completed', label: 'Lezárja',    allowedRoleMachineNames: ['organizer','administrator'] },
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  7. TERMÉKKATALÓGUS
// ════════════════════════════════════════════════════════════════════════════

const catalog: SiteTemplate = {
  label: 'Termék- / Szolgáltatáskatalógus',
  description: 'Termékek, kategóriák, márkák, szűrhető lista',
  modules: {
    core:    ['node', 'taxonomy', 'media', 'media_library', 'text', 'field', 'views', 'user'],
    contrib: ['pathauto', 'token', 'metatag', 'search_api', 'search_api_db',
              'facets', 'facets_pretty_paths', 'admin_toolbar'],
  },
  calibrationHints: {
    flexibleLayouts: true,
    layoutEngine: 'layout_builder',
    needsSearch: true,
    needsScheduler: false,
    ssoRecommended: false,
  },
  entities: [
    {
      label: 'Termék', machineName: 'product', type: 'content',
      description: 'Katalógus alaptétele',
      urlPatternDefault: '/termekek/[node:field_kategoria:name]/[node:title]',
      fields: [
        f('Név',            'text',      true),
        f('Leírás',         'textarea',  true),
        f('Rövid leírás',   'textarea'),
        f('Kép',            'image',     true),
        f('Ár',             'integer'),
        f('Cikkszám',       'text'),
        f('Kategória',      'reference', true,  { refMachineName: 'product_category' }),
        f('Márka',          'reference', false, { refMachineName: 'brand' }),
        f('Elérhető',       'boolean'),
        f('Kiemelt',        'boolean'),
      ],
    },
    {
      label: 'Termékkategória', machineName: 'product_category', type: 'taxonomy',
      description: 'Hierarchikus termékbesorolás',
      fields: [
        f('Leírás', 'textarea'),
        f('Kép',    'image'),
      ],
    },
    {
      label: 'Márka', machineName: 'brand', type: 'content',
      description: 'Termékek gyártója / márkája',
      urlPatternDefault: '/markak/[node:title]',
      fields: [
        f('Név',     'text',  true),
        f('Leírás',  'textarea'),
        f('Logó',    'image'),
        f('Webhely', 'text'),
      ],
    },
  ],
  roles: [
    {
      label: 'Adminisztrátor', machineName: 'administrator', type: 'admin', scope: 'all',
      description: 'Teljes katalógus-kezelés',
      defaultPermissions: {
        product: ['create','read','update','delete','publish'],
        brand:   ['create','read','update','delete','publish'],
      },
    },
    {
      label: 'Termékmenedzser', machineName: 'product_manager', type: 'editor', scope: 'all',
      description: 'Termékeket és márkákat visz fel és frissít',
      defaultPermissions: {
        product: ['create','read','update','publish'],
        brand:   ['create','read','update'],
      },
    },
  ],
  workflow: null,
};

// ════════════════════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════════════════════

export const SITE_TYPE_TEMPLATES: Record<string, SiteTemplate> = {
  marketing,
  news,
  intranet,
  docs,
  community,
  events,
  catalog,
};

// ─── Instantiation: template → valódi Entity[], Role[], Workflow[], Permission[]

export interface InstantiatedTemplate {
  entities:    Entity[];
  roles:       Role[];
  workflows:   Workflow[];
  permissions: Permission[];
}

export function instantiateSiteTemplate(tpl: SiteTemplate): InstantiatedTemplate {
  // 1. Entitások UUID-okkal
  const entityIdMap = new Map<string, string>(); // machineName → UUID
  const entities: Entity[] = tpl.entities.map((et) => {
    const id = crypto.randomUUID();
    entityIdMap.set(et.machineName, id);
    return {
      id,
      label:       et.label,
      machineName: et.machineName,
      type:        et.type as EntityType,
      description: et.description,
      urlPattern:  et.urlPatternDefault,
      fields: et.fields.map((ft) => ({
        id:                 crypto.randomUUID(),
        label:              ft.label,
        type:               ft.type as FieldType,
        required:           ft.required,
        cardinality:        ft.cardinality,
        referenceTarget:    ft.refMachineName ? entityIdMap.get(ft.refMachineName) ?? '' : undefined,
        referenceEntityType: ft.referenceEntityType,
      })),
    };
  });

  // Második menet: feloldja a refMachineName-eket (ha előre hivatkoz)
  for (const entity of entities) {
    for (const field of entity.fields) {
      if (!field.referenceTarget && field.type === 'reference') {
        const tplField = tpl.entities
          .find((e) => e.machineName === entity.machineName)?.fields
          .find((f) => f.label === field.label);
        if (tplField?.refMachineName) {
          field.referenceTarget = entityIdMap.get(tplField.refMachineName) ?? '';
        }
      }
    }
  }

  // 2. Szerepkörök UUID-okkal
  const roleIdMap = new Map<string, string>(); // machineName → UUID
  const roles: Role[] = tpl.roles.map((rt) => {
    const id = crypto.randomUUID();
    roleIdMap.set(rt.machineName, id);
    return {
      id,
      label:       rt.label,
      machineName: rt.machineName,
      type:        rt.type as RoleType,
      scope:       rt.scope as Scope,
      textFormat:  rt.type === 'admin' || rt.type === 'editor' || rt.type === 'moderator'
                     ? 'full_html'
                     : rt.type === 'contributor' ? 'basic_html' : 'plain_text',
      description: rt.description,
    };
  });

  // 3. Workflow UUID-okkal + szerepkör-feloldással
  const workflows: Workflow[] = [];
  if (tpl.workflow) {
    const wf = tpl.workflow;
    workflows.push({
      id:        crypto.randomUUID(),
      label:     'Fő workflow',
      appliesTo: wf.appliesToMachineNames.map((mn) => entityIdMap.get(mn) ?? '').filter(Boolean),
      states:    wf.states.map((s) => ({ ...s })),
      transitions: wf.transitions.map((t) => ({
        id:           crypto.randomUUID(),
        from:         t.from,
        to:           t.to,
        label:        t.label,
        allowedRoles: t.allowedRoleMachineNames.map((mn) => roleIdMap.get(mn) ?? '').filter(Boolean),
      })),
    });
  }

  // 4. Jogosultságok
  const permissions: Permission[] = [];
  for (const rt of tpl.roles) {
    const roleId = roleIdMap.get(rt.machineName);
    if (!roleId) continue;
    for (const [entityMachineName, ops] of Object.entries(rt.defaultPermissions)) {
      const entityId = entityIdMap.get(entityMachineName);
      if (!entityId) continue;
      permissions.push({
        roleId,
        entityId,
        operations: ops as Operation[],
        scope: rt.scope as Scope,
      });
    }
  }

  return { entities, roles, workflows, permissions };
}

/** A projektípusokhoz illő template-ek megkeresése (multi-select esetén merge) */
export function getTemplateForProjectTypes(projectTypes: string[]): InstantiatedTemplate {
  const seen = { entities: new Set<string>(), roles: new Set<string>() };
  const merged: InstantiatedTemplate = { entities: [], roles: [], workflows: [], permissions: [] };

  for (const type of projectTypes) {
    const tpl = SITE_TYPE_TEMPLATES[type];
    if (!tpl) continue;
    const inst = instantiateSiteTemplate(tpl);
    for (const e of inst.entities) {
      if (!seen.entities.has(e.machineName)) {
        seen.entities.add(e.machineName);
        merged.entities.push(e);
      }
    }
    for (const r of inst.roles) {
      if (!seen.roles.has(r.machineName)) {
        seen.roles.add(r.machineName);
        merged.roles.push(r);
      }
    }
    if (inst.workflows.length && !merged.workflows.length) {
      merged.workflows.push(...inst.workflows);
    }
    merged.permissions.push(...inst.permissions);
  }

  return merged;
}
