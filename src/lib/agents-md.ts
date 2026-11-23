import type { ProjectData, Entity, Role, Permission, Operation, ViewListing } from './types';
import { SITE_TYPE_TEMPLATES } from './site-type-templates';

// ─── Drupal machine-name slugify (Hungarian-safe) ──────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove diacritics (á→a, é→e, ő→o etc.)
    .replace(/[^a-z0-9\s]/g, '')      // remove non-alphanumeric
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 26);
}

// ─── Drupal built-in base fields (nem kell custom field létrehozni) ──────────

const BASE_FIELD_SLUGS = new Set([
  'cim', 'title', 'name', 'nev', 'kerdes', 'question',
]);

function isBaseField(label: string): boolean {
  return BASE_FIELD_SLUGS.has(slugify(label));
}

// ─── Drupal field type mapping ─────────────────────────────────────────────

const DRUPAL_FIELD_TYPE: Record<string, string> = {
  text:      'string',
  textarea:  'text_with_summary (CKEditor 5)',
  integer:   'integer',
  boolean:   'boolean',
  date:      'datetime',
  reference: 'entity_reference',
  file:      'file',
  image:     'entity_reference → media:image',
  email:     'email',
  telephone: 'telephone',
  list:      'list_string',
};

const OPERATION_LABELS: Record<Operation, string> = {
  create:  'create', read: 'view', update: 'edit',
  delete:  'delete', publish: 'publish', archive: 'archive',
};

// ─── Module derivation ──────────────────────────────────────────────────────

function deriveModules(p: ProjectData): { core: string[]; contrib: string[] } {
  const core   = new Set(['node', 'taxonomy', 'field', 'text', 'options', 'user']);
  const contrib = new Set<string>();

  // ── Site-type template modules (base) ──────────────────────────────────
  const projectTypes = p.contextAnswers?.projectTypes ?? [];
  for (const type of projectTypes) {
    const tpl = SITE_TYPE_TEMPLATES[type];
    if (!tpl) continue;
    tpl.modules.core.forEach((m) => core.add(m));
    tpl.modules.contrib.forEach((m) => contrib.add(m));
  }

  // ── Entity-based additions ──────────────────────────────────────────────
  const needsMedia = p.entities.some((e) =>
    e.type === 'media' || e.fields.some((f) => f.type === 'image' || f.type === 'file'),
  );
  if (needsMedia) { core.add('media'); core.add('media_library'); }

  if (p.workflows.length > 0) { core.add('content_moderation'); core.add('workflows'); }

  // ── Multilingual ────────────────────────────────────────────────────────
  if (p.calibration?.multilingual) {
    core.add('language'); core.add('content_translation');
    core.add('locale'); core.add('interface_translation');
  }

  // ── Flexible layouts ────────────────────────────────────────────────────
  if (p.calibration?.flexibleLayouts) {
    if (p.calibration.layoutEngine === 'layout_builder') {
      core.add('layout_builder'); core.add('layout_discovery');
    } else {
      contrib.add('paragraphs'); contrib.add('entity_reference_revisions');
    }
  }

  // ── Explicit external selections ────────────────────────────────────────
  if (p.externalSelections?.includes('schedule')) contrib.add('scheduler');
  if (p.externalSelections?.includes('email') || p.notifications.length > 0) {
    contrib.add('symfony_mailer');
  }

  // SSO
  if (p.auth?.sso === 'saml') contrib.add('samlauth');
  if (p.auth?.sso === 'oauth') contrib.add('openid_connect');
  if (p.auth?.sso === 'ldap') contrib.add('ldap');

  // Search
  if (p.viewListings?.some((l) => l.exposedFilters)) {
    contrib.add('search_api'); contrib.add('search_api_db');
  }

  // Always: views is essential in Drupal
  core.add('views'); core.add('views_ui'); core.add('block');

  // ── Calibration-based module pruning ────────────────────────────────────
  if (!p.calibration?.flexibleLayouts) {
    // User said NO flexible layouts — remove layout/paragraphs modules
    core.delete('layout_builder'); core.delete('layout_discovery');
    contrib.delete('paragraphs'); contrib.delete('entity_reference_revisions');
  }

  // Remove facets unless faceted lists are actually defined
  const hasFacetedSearch = p.viewListings?.some((l) => l.filters.length > 0 && l.exposedFilters) ?? false;
  if (!hasFacetedSearch) {
    contrib.delete('facets'); contrib.delete('facets_pretty_paths');
  }

  // Remove webform unless a contact/form entity is explicitly defined
  const hasContactForm = p.entities.some((e) =>
    ['contact_message', 'contact', 'form'].includes(e.machineName),
  );
  if (!hasContactForm) {
    contrib.delete('webform'); contrib.delete('webform_ui');
  }

  // Remove search_api / search_api_db unless views with exposed filters are defined
  if (!p.viewListings?.some((l) => l.exposedFilters)) {
    contrib.delete('search_api'); contrib.delete('search_api_db');
  }

  // Remove scheduler unless user explicitly selected scheduled publishing
  if (!p.externalSelections?.includes('schedule')) {
    contrib.delete('scheduler');
  }

  // Remove simple_sitemap for internal-only sites (no public crawling)
  if (p.calibration?.visibility === 'internal') {
    contrib.delete('simple_sitemap');
  }

  // Always contrib
  contrib.add('pathauto'); contrib.add('token'); contrib.add('metatag'); contrib.add('admin_toolbar');

  // GDPR / audit
  if (p.externalSelections?.includes('audit') || p.compliance?.auditLog) {
    contrib.add('revision_log_default');
  }

  return { core: [...core].sort(), contrib: [...contrib].sort() };
}

// ─── Entity section ─────────────────────────────────────────────────────────

function renderEntityFields(entity: Entity, allEntities: Entity[]): string {
  if (!entity.fields.length) return '  *Nincsenek mezők definiálva.*\n';

  const header = '  | Mező label | Machine name | Drupal field type | Required | Notes |\n'
               + '  |-----------|-------------|-----------------|---------|-------|\n';

  const rows = entity.fields.map((f) => {
    // ── Drupal built-in base field (title, name) ─────────────────────────
    if (isBaseField(f.label) && f.type === 'text') {
      return `  | ${f.label} | \`title\` | string *(built-in base field — do NOT create as custom field)* | ✓ | Drupal core |`;
    }

    let drupalType = DRUPAL_FIELD_TYPE[f.type] ?? f.type;
    let note = '';

    if (f.type === 'reference') {
      const target = allEntities.find((e) => e.id === f.referenceTarget);
      if (target) {
        if (target.type === 'user_profile') {
          // Users don't have bundles — just reference the user entity
          drupalType = 'entity_reference → user';
        } else {
          const refType = f.referenceEntityType ??
            (target.type === 'taxonomy' ? 'taxonomy_term' :
             target.type === 'media'    ? 'media' : 'node');
          drupalType = `entity_reference → ${refType}:${target.machineName}`;
        }
      } else if (f.referenceEntityType) {
        drupalType = `entity_reference → ${f.referenceEntityType}`;
      } else {
        drupalType = `entity_reference`;
        note = '⚠️ target not specified — define handler_settings.target_type manually';
      }
    }

    if (f.cardinality === 'multiple') note = note ? `${note}; cardinality: unlimited` : 'cardinality: unlimited';

    const fieldMachineName = `field_${slugify(f.label)}`;
    return `  | ${f.label} | \`${fieldMachineName}\` | ${drupalType} | ${f.required ? '✓' : ''} | ${note} |`;
  }).join('\n');

  return header + rows + '\n';
}

function renderEntities(p: ProjectData): string {
  const contentTypes = p.entities.filter((e) => e.type === 'content');
  const taxonomies   = p.entities.filter((e) => e.type === 'taxonomy');
  const mediaTypes   = p.entities.filter((e) => e.type === 'media');
  const paragraphs   = p.entities.filter((e) => e.type === 'paragraph');
  const userProfiles = p.entities.filter((e) => e.type === 'user_profile');

  let out = '';

  if (contentTypes.length) {
    out += '### Content Types (node bundles)\n\n';
    for (const e of contentTypes) {
      out += `#### \`node.type.${e.machineName}\` – ${e.label}\n`;
      if (e.description) out += `> ${e.description}\n`;
      out += '\n';
      out += renderEntityFields(e, p.entities);
      if (e.urlPattern) {
        const hasInvalidToken = e.urlPattern.includes(':0:entity:');
        out += `\n  **Pathauto pattern:** \`${e.urlPattern}\``;
        if (hasInvalidToken) {
          out += `\n  ⚠️ Token format may be invalid. Use \`[node:field_X:name]\` instead of \`[field_X:0:entity:name]\`.`;
        }
        out += '\n';
      } else {
        out += `\n  **Pathauto pattern:** \`/TODO-set-url-pattern-for-${e.machineName}\`\n`;
      }
      out += '\n  **View modes:**\n';
      out += `  - \`full\`: all fields visible\n`;
      out += `  - \`teaser\`: title${e.fields.find((f) => f.type === 'image') ? ' + image' : ''}${e.fields.find((f) => f.type === 'textarea') ? ' + summary (150 chars)' : ''}\n\n`;
    }
  }

  if (taxonomies.length) {
    out += '### Taxonomy Vocabularies\n\n';
    for (const e of taxonomies) {
      out += `#### \`taxonomy.vocabulary.${e.machineName}\` – ${e.label}\n`;
      if (e.description) out += `> ${e.description}\n`;
      if (e.fields.length) {
        out += '\n' + renderEntityFields(e, p.entities);
      } else {
        out += '\n  *Standard term fields only (name, description, weight)*\n';
      }
      out += '\n';
    }
  }

  if (paragraphs.length) {
    out += '### Paragraph Types (paragraphs module)\n\n';
    for (const e of paragraphs) {
      out += `#### \`paragraph.type.${e.machineName}\` – ${e.label}\n`;
      if (e.description) out += `> ${e.description}\n`;
      out += '\n' + renderEntityFields(e, p.entities) + '\n';
    }
  }

  if (mediaTypes.length || p.externalSelections?.includes('files') ||
      p.entities.some((e) => e.fields.some((f) => f.type === 'image' || f.type === 'file'))) {
    out += '### Media Types\n\n';
    const definedMedia = mediaTypes.map((e) => e.machineName);
    if (!definedMedia.includes('image')) out += '- `media.type.image` – Image (source: image field)\n';
    if (!definedMedia.includes('document') && p.externalSelections?.includes('files')) {
      out += '- `media.type.document` – Document (source: file field)\n';
    }
    for (const e of mediaTypes) {
      out += `- \`media.type.${e.machineName}\` – ${e.label}\n`;
    }
    out += '\n';
  }

  if (userProfiles.length) {
    out += '### User Profile Fields (user entity extensions)\n\n';
    for (const e of userProfiles) {
      out += `#### ${e.label} (\`${e.machineName}\`)\n`;
      if (e.description) out += `> ${e.description}\n`;
      out += '\n';
      out += renderEntityFields(e, p.entities);
      out += '\n';
    }
  }

  return out || '*Nincsenek entitások definiálva.*\n\n';
}

// ─── Roles + Permissions ────────────────────────────────────────────────────

function renderPermissions(p: ProjectData): string {
  if (!p.roles.length) return '*Nincsenek szerepkörök definiálva.*\n\n';

  let out = '### Drupal Roles\n\n';
  for (const role of p.roles) {
    const textFormatLabel = role.textFormat === 'full_html'  ? 'Full HTML (CKEditor 5, all tags)' :
                            role.textFormat === 'basic_html' ? 'Basic HTML (CKEditor 5, limited tags)' :
                            'Plain text (no formatting)';
    out += `- \`${role.machineName}\` – **${role.label}**`;
    if (role.description) out += ` (${role.description})`;
    out += `\n  Scope: ${role.scope === 'own' ? 'own content only' : role.scope === 'all' ? 'all content' : 'assigned content'}\n`;
    out += `  Text format: ${textFormatLabel}\n`;
  }
  out += '\n';

  if (!p.permissions.length) return out;

  // Group permissions by entity
  const byEntity = new Map<string, Permission[]>();
  for (const perm of p.permissions) {
    const arr = byEntity.get(perm.entityId) ?? [];
    arr.push(perm);
    byEntity.set(perm.entityId, arr);
  }

  out += '### Permission Matrix\n\n';

  // If workflow is defined: only admin/moderator roles should have publish
  const hasWorkflow = p.workflows.length > 0;

  // Drupal note: taxonomy terms have no published state — publish/archive excluded
  for (const [entityId, perms] of byEntity) {
    const entity      = p.entities.find((e) => e.id === entityId);
    const entityLabel = entity?.label ?? entityId;
    const isTaxonomy  = entity?.type === 'taxonomy';

    const validOps = isTaxonomy
      ? ['create','read','update','delete']
      : ['create','read','update','delete','publish'];

    out += `#### ${entityLabel}${isTaxonomy ? ' *(taxonomy — no publish state)*' : ''}\n\n`;
    out += `| Role | ${validOps.map((o) => OPERATION_LABELS[o as Operation] ?? o).join(' | ')} |\n`;
    out += `|------|${'-----|'.repeat(validOps.length)}\n`;

    for (const perm of perms) {
      const role = p.roles.find((r) => r.id === perm.roleId);
      const canPublishByType = role ? ['admin','moderator'].includes(role.type) : true;
      // If workflow: contributor/editor should NOT have publish (needs approval)
      const effectiveOps = perm.operations.filter((op) => {
        if (op === 'publish' && hasWorkflow && !canPublishByType) return false;
        return true;
      });
      const ops = validOps.map((op) => effectiveOps.includes(op as Operation) ? '✓' : '');

      let warning = '';
      if (!isTaxonomy && hasWorkflow && perm.operations.includes('publish') && !canPublishByType) {
        warning = ' ⚠️ publish removed (workflow: needs approval from higher role)';
      }

      out += `| ${role?.label ?? perm.roleId} (${perm.scope})${warning} | ${ops.join(' | ')} |\n`;
    }
    out += '\n';
  }

  return out;
}

// ─── Workflow ───────────────────────────────────────────────────────────────

// ─── Workflow state machine name derivation ──────────────────────────────────

const WORKFLOW_STATE_NAMES: Record<string, string> = {
  'vázlat':             'draft',
  'piszkozat':          'draft',
  'draft':              'draft',
  'jóváhagyásra vár':   'needs_review',
  'lektorálás alatt':   'in_review',
  'in review':          'needs_review',
  'review':             'needs_review',
  'publikált':          'published',
  'published':          'published',
  'meghirdetve':        'published',
  'jóváhagyott':        'published',
  'visszaküldve':       'rejected',
  'rejected':           'rejected',
  'visszaküldött':      'rejected',
  'lemondva':           'cancelled',
  'archivált':          'archived',
  'archived':           'archived',
  'elavult':            'outdated',
  'letiltott':          'blocked',
  'lezárult':           'completed',
};

function toWorkflowMachineName(label: string): string {
  return WORKFLOW_STATE_NAMES[label.toLowerCase().trim()] ?? slugify(label) ?? 'state';
}

function renderWorkflow(p: ProjectData): string {
  if (!p.workflows.length) {
    // Check if editorial roles suggest a workflow should exist
    const hasEditorialRoles = p.roles.some((r) =>
      ['moderator','editor','admin'].includes(r.type) && p.roles.length > 1,
    );
    if (hasEditorialRoles) {
      return `> ⚠️ **No workflow was defined**, but you have multiple roles including editorial roles.
> Consider enabling \`content_moderation\` module with states: \`draft → needs_review → published\`.
> Enable per content type: Structure → Content Types → [type] → Edit → Publishing options.

`;
    }
    return '*No content moderation workflow — content publishes directly.*\n\n';
  }

  let out = '';
  for (const wf of p.workflows) {
    const appliedTo = wf.appliesTo
      .map((id) => p.entities.find((e) => e.id === id)?.label ?? id)
      .join(', ');
    out += `**Workflow:** ${wf.label}\n`;
    out += `**Applies to:** ${appliedTo || 'N/A'}\n\n`;

    out += '**States** (use these machine names in config):\n';
    for (const state of wf.states) {
      const machineName = toWorkflowMachineName(state.label);
      out += `- \`${machineName}\` – ${state.label}${state.isPublished ? ' *(published)*' : ''}\n`;
    }
    out += '\n**Transitions:**\n';
    out += '| From (machine name) | To (machine name) | Allowed roles |\n|---------------------|-------------------|---------------|\n';
    for (const t of wf.transitions) {
      const fromState = wf.states.find((s) => s.id === t.from);
      const toState   = wf.states.find((s) => s.id === t.to);
      const fromMN    = toWorkflowMachineName(fromState?.label ?? t.from);
      const toMN      = toWorkflowMachineName(toState?.label ?? t.to);
      const roles = t.allowedRoles
        .map((rid) => p.roles.find((r) => r.id === rid)?.label ?? rid)
        .join(', ');
      out += `| \`${fromMN}\` (${fromState?.label ?? '?'}) | \`${toMN}\` (${toState?.label ?? '?'}) | ${roles || '⚠️ no roles assigned'} |\n`;
    }
    if (!wf.transitions.length) {
      out += '| ⚠️ No transitions defined — add via admin: /admin/config/workflow/workflows |\n';
    }
    out += '\n';
  }
  return out;
}

// ─── Views / Listing pages ──────────────────────────────────────────────────

function renderViews(p: ProjectData): string {
  const hasImage = p.entities.some((e) =>
    e.fields.some((f) => f.type === 'image'),
  );

  let out = '';

  // Auto-generated standard image styles if site has images
  if (hasImage) {
    out += '### Image Styles (admin: /admin/config/media/image-styles)\n\n';
    out += '| Machine name | Label | Dimensions | Effect |\n';
    out += '|-------------|-------|-----------|--------|\n';
    out += '| `thumbnail` | Thumbnail | 100×100 | Scale and crop |\n';
    out += '| `medium` | Medium | 400×300 | Scale and crop |\n';
    out += '| `large` | Large | 1200×628 | Scale |\n';
    out += '| `og_image` | OG Image | 1200×630 | Scale and crop |\n';
    out += '| `responsive_full` | Responsive Full | max 1920px | Scale |\n';
    out += '\n⚠️ Use **Responsive Image** formatter (not plain Image) for all image fields in view modes.\n\n';
  }

  // Text format configuration
  if (p.roles.length) {
    out += '### Text Formats (admin: /admin/config/content/formats)\n\n';
    out += '| Format | Machine name | Allowed roles | Notes |\n';
    out += '|--------|-------------|-------------|-------|\n';
    out += '| Teljes HTML | `full_html` | ';
    const fullHtmlRoles = p.roles.filter((r) => r.textFormat === 'full_html' || (!r.textFormat && ['admin','editor','moderator'].includes(r.type)));
    out += fullHtmlRoles.map((r) => r.label).join(', ') || 'administrator';
    out += ' | CKEditor 5, all HTML |\n';
    out += '| Alap HTML | `basic_html` | ';
    const basicHtmlRoles = p.roles.filter((r) => r.textFormat === 'basic_html');
    out += basicHtmlRoles.map((r) => r.label).join(', ') || 'contributor';
    out += ' | CKEditor 5, limited tags: p, a, em, strong, ul, li |\n';
    out += '| Csak szöveg | `plain_text` | ';
    const plainRoles = p.roles.filter((r) => r.textFormat === 'plain_text');
    out += plainRoles.map((r) => r.label).join(', ') || 'anonymous, authenticated';
    out += ' | No HTML |\n';
    out += '\n';
  }

  // Views / listing pages
  if (!p.viewListings?.length) {
    out += '### Views / Listing Pages\n\n';
    out += '> ⚠️ No listing pages defined. Create at least one View per public content type.\n';
    out += '> Admin: Structure → Views → Add view\n\n';
    // Auto-suggest based on content types
    const contentTypes = p.entities.filter((e) => e.type === 'content');
    if (contentTypes.length) {
      out += 'Suggested Views to create:\n';
      for (const ct of contentTypes) {
        out += `- \`/${ct.machineName}\` — ${ct.label} listing (filter: status=published, sort: created DESC, 12/page)\n`;
      }
      out += '\n';
    }
    return out;
  }

  out += '### Views / Listing Pages\n\n';
  for (const view of p.viewListings) {
    const entity = p.entities.find((e) => e.id === view.entityId);
    const machineName = `${slugify(view.label)}_view`;
    out += `#### \`${machineName}\` – ${view.label}\n`;
    out += `- **URL:** \`${view.url}\`\n`;
    out += `- **Content type:** ${entity?.label ?? 'N/A'} (\`${entity?.machineName ?? '?'}\`)\n`;
    out += `- **Display type:** ${view.displayType}\n`;
    out += `- **Sort:** ${view.sortBy} ${view.sortDir}\n`;
    out += `- **Items per page:** ${view.itemsPerPage}\n`;
    if (view.filters.length) {
      const filterLabels = view.filters.map((fid) => {
        const f = entity?.fields.find((ef) => ef.id === fid);
        return f ? `\`field_${slugify(f.label)}\`` : fid;
      });
      out += `- **Contextual filters:** ${filterLabels.join(', ')}\n`;
    }
    out += `- **Exposed filters:** ${view.exposedFilters ? 'Yes (user can filter)' : 'No'}\n`;
    out += '\n';
  }

  return out;
}

// ─── Custom Theme ───────────────────────────────────────────────────────────

function renderTheme(p: ProjectData): string {
  const cal = p.calibration;
  if (cal?.isHeadless || !cal?.themeApproach || cal.themeApproach === 'none') return '';

  if (cal.themeApproach === 'contrib') {
    return `## Frontend Téma

> Contrib base theme alapján: **Bootstrap Barrio** vagy **Radix** ajánlott.
> \`ddev composer require drupal/bootstrap_barrio\` — majd a témát aktiváld a sub-theme workflow szerint.

---

`;
  }

  // custom
  const themeName = cal.themeMachineName?.trim() || `${slugify(p.meta.label || 'mysite')}_theme`;
  const projectLabel = p.meta.label || 'My Project';
  const contentTypes = p.entities.filter((e) => e.type === 'content');

  const nodeTemplates = contentTypes.map((ct) =>
    `│   │   ├── node--${ct.machineName}--full.html.twig\n│   │   └── node--${ct.machineName}--teaser.html.twig`,
  ).join('\n');

  return `## Custom Theme

### Téma generálása (Drupal Starterkit)
\`\`\`bash
php web/core/scripts/drupal generate-theme ${themeName} --name "${projectLabel} Theme"
ddev drush en ${themeName}
ddev drush config-set system.theme default ${themeName}
ddev drush cr
\`\`\`

### Mappastruktúra
\`\`\`
web/themes/custom/${themeName}/
├── ${themeName}.info.yml
├── ${themeName}.libraries.yml
├── ${themeName}.theme
├── templates/
│   ├── layout/
│   │   ├── html.html.twig
│   │   └── page.html.twig
│   ├── node/
${nodeTemplates || '│   │   └── node--[type]--full.html.twig'}
│   ├── block/
│   └── misc/
├── components/
│   ├── base/              ← reset, CSS változók, tipográfia
│   ├── layout/            ← grid, header, footer, sidebar
│   └── ui/                ← gombok, kártyák, navigáció, űrlapok
├── css/
│   ├── 00-base/
│   ├── 01-layout/
│   └── 02-components/
├── js/
└── images/
\`\`\`

### ${themeName}.info.yml
\`\`\`yaml
name: '${projectLabel} Theme'
type: theme
base theme: false
description: 'Custom theme for ${projectLabel}'
core_version_requirement: ^10 || ^11
libraries:
  - ${themeName}/global
\`\`\`

### ${themeName}.libraries.yml
\`\`\`yaml
global:
  css:
    theme:
      css/00-base/base.css: {}
      css/01-layout/layout.css: {}
  js:
    js/main.js: {}
  dependencies:
    - core/drupal
    - core/once
\`\`\`

---

`;
}



export function generateAgentsMd(p: ProjectData): string {
  const { core, contrib } = deriveModules(p);
  const cal = p.calibration;
  const now = new Date().toISOString().split('T')[0];
  const projectSlug = slugify(p.meta.label || 'myproject').replace(/_/g, '-');
  const allModules  = [...new Set([...core, ...contrib])];

  return `# ${p.meta.label || 'Unnamed Project'} – Drupal 11 Architecture Brief

> **Generated by Alexandra** on ${now}
> Paste this file into your IDE / AI agent context at project start.
> All technical decisions are documented here — start implementation directly from this.

---

## AI Agent Instructions

**Read this section first.** This file describes a complete Drupal 11 site architecture.

### ⬜ Before starting — ask the developer these questions:

1. **Local dev environment**: "What are you using? (DDEV / Lando / LAMP+MySQL / Docker Compose / Other)"
2. **Git repo**: "Do you have an existing git repository, or should I initialize one?"
3. **Deployment target**: "Where will this be deployed? (Acquia / Pantheon / Platform.sh / Custom VPS / Other)"
4. **Composer location**: "Is Composer available globally, or should I use DDEV / Docker?"
5. **Existing install**: "Starting fresh, or adding to an existing Drupal site?"

Only proceed after the developer confirms. Use their answers to adapt the setup commands.

### Implementation order (after confirmation):

1. **DDEV project setup** → see Development Environment section
2. **Install modules** → see Required Modules section
3. **Create content types** (node bundles) → see Content Model section
   - ⚠️ Fields marked \`title\` are **built-in base fields** — do NOT create them as custom fields
   - For \`entity_reference\` fields: set the correct \`target_type\` in handler_settings
4. **Create taxonomy vocabularies** with specified fields
5. **Configure media types**: \`image\` (always), \`document\` (if file fields exist)
6. **Create user roles** → see Roles section; assign permissions per Permission Matrix
7. **Set up Content Moderation workflow** → see Workflow section
8. **Configure Pathauto** patterns → patterns listed per content type
9. **Create Views** for listing pages (minimum: one View per public content type)
10. **Configure Metatag** defaults per content type

**Config management approach (recommended):**
\`\`\`bash
# After each change export config:
ddev drush config-export
# Config lives in: web/sites/default/files/config_[hash]/
# Commit to git, deploy via: ddev drush config-import
\`\`\`

---

## Project Overview

| Property | Value |
|----------|-------|
| Project | ${p.meta.label || 'N/A'} |
| Language | ${p.meta.language.toUpperCase()} |
| Visibility | ${cal?.visibility === 'internal' ? 'Internal only' : cal?.visibility === 'public' ? 'Public' : 'Public + Internal'} |
| Editor count | ${cal?.editorCount === 'few' ? '1–5 editors' : cal?.editorCount === 'team' ? '5–20 editors' : '20+ editors'} |
| Multilingual | ${cal?.multilingual ? `Yes (default: ${p.meta.language.toUpperCase()})` : 'No'} |
| Flexible layouts | ${cal?.flexibleLayouts ? `Yes – **${cal.layoutEngine === 'paragraphs' ? 'Paragraphs module' : 'Layout Builder (core)'}**` : 'No (fixed templates)'} |
| Architecture | ${cal?.isHeadless ? '**Headless / API-first** (JSON:API → separate frontend)' : 'Traditional coupled (Drupal renders HTML, Twig templates)'} |
| Migration needed | ${cal?.hasMigration ? 'Yes – see Migration section' : 'No (greenfield)'} |

### Business Context
${p.context || '*No context provided.*'}

---

## Development Environment

### Local Stack
- **Local env:** DDEV (Docker-based)
- **Database:** MySQL 8.0 (DDEV default credentials: db / db / db)
- **PHP:** 8.3
- **Drupal:** 11.x

### DDEV Setup (run once)
\`\`\`bash
# 1. Create and configure DDEV project
mkdir ${projectSlug} && cd ${projectSlug}
ddev config --project-type=drupal11 --docroot=web --project-name=${projectSlug} --php-version=8.3
ddev start

# 2. Create Drupal project via Composer
ddev composer create "drupal/recommended-project:^11" .

# 3. Install Drupal (DDEV MySQL: db/db/db)
ddev drush site-install standard \\
  --locale=${p.meta.language} \\
  --account-name=admin \\
  --account-pass=admin \\
  --site-name="${p.meta.label || 'My Site'}" \\
  --db-url=mysql://db:db@db/${projectSlug}

# 4. Install all contrib modules
ddev composer require ${contrib.map((m) => `drupal/${m}`).join(' \\\n  ')}

# 5. Enable all modules
ddev drush en ${allModules.join(' ')}

# 6. Clear cache, get admin link
ddev drush cr
ddev drush uli
\`\`\`

### Daily workflow
\`\`\`bash
ddev start          # start containers
ddev stop           # stop containers
ddev drush cr       # clear cache
ddev drush cex      # export config changes
ddev drush cim      # import config from files
ddev drush uli      # get one-time admin login link
ddev describe       # show project URLs and info
\`\`\`

---

## Tech Stack Requirements

- **CMS:** Drupal 11.x (latest stable)
- **PHP:** 8.3+ (required for D11)
- **Database:** MySQL 8.0 (DDEV: db/db/db)
- **Admin theme:** Claro (Drupal core default — nincs külön telepítés) · opcionálisan: Gin contrib (\`ddev composer require drupal/gin && ddev drush en gin\`)
- **Text editor:** CKEditor 5 (CKEditor 4 removed in D11)

---

## Required Modules

### Drupal Core
\`\`\`
${core.join('\n')}
\`\`\`

### Contrib (install via Composer)
\`\`\`bash
ddev composer require ${contrib.map((m) => `drupal/${m}`).join(' ')}
\`\`\`

---

## Content Model

${renderEntities(p)}---

## Views, Image Styles, Text Formats

${renderViews(p)}---

## User Roles, Permissions

${renderPermissions(p)}---

## Content Moderation Workflow

${renderWorkflow(p)}---

## Configuration Details

### Multilingual
${cal?.multilingual ? `- Default language: ${p.meta.language.toUpperCase()}
- Enable: language, content_translation, locale, interface_translation
- URL prefix: /hu/, /en/ (configure at \`/admin/config/regional/language/detection\`)
- All content type fields: set translatable → true
- Run: \`ddev drush locale-update\` after install` : '- Single language site – no translation modules needed'}

### Authentication
${p.auth ? `- SSO: ${p.auth.sso !== 'none' ? p.auth.sso.toUpperCase() : 'None'}
- Self-registration: ${p.auth.selfRegistration ? 'Yes' : 'No'}
${p.auth.provider ? `- Provider: ${p.auth.provider}` : ''}` : '- Standard Drupal authentication\n- Self-registration: No (admin creates accounts)\n- ⚠️ DDEV admin link: `ddev drush uli`'}

### External Integrations
${p.integrations.length ? p.integrations.map((i) => `- **${i.system}**: ${i.direction} (trigger: ${i.trigger})`).join('\n') : '- None defined'}

### Compliance, Data Governance
${p.compliance ? `- Audit log: ${p.compliance.auditLog ? 'Yes — enable `revision_log_default` module' : 'No'}
- Revision history: ${p.compliance.revisionHistory ? 'Yes — enable per content type in Manage Form Display' : 'No'}
- Data retention: ${p.compliance.dataRetentionDays ? `${p.compliance.dataRetentionDays} days` : 'Not specified'}` : '- Standard Drupal revision system enabled by default\n- GDPR: implement via field-level configuration and Privacy Policy page (no single module needed)'}

---

## Migration Plan
${cal?.hasMigration ? `**Source system migration required.**

\`\`\`bash
ddev composer require drupal/migrate_plus drupal/migrate_tools
ddev drush en migrate migrate_plus migrate_tools

# Create migration config in web/modules/custom/site_migration/config/install/
# Run migration:
ddev drush migrate-import --all
ddev drush migrate-status
\`\`\`

⚠️ TODO: Define source system field mapping before running migrations.` : '**Greenfield project** – no data migration needed.'}

---

## Notes for AI Agent / Developer

1. Content type machine names: \`${p.entities.filter((e) => e.type === 'content').map((e) => e.machineName).join(', ') || 'TBD'}\`
2. All custom field machine names use: \`field_\` prefix + ASCII slug (no accented characters)
3. \`title\` field is a built-in base field on all nodes — never create \`field_cim\` or \`field_title\`
4. ${cal?.flexibleLayouts ? (cal.layoutEngine === 'paragraphs' ? 'Paragraphs: add `field_components` (entity_reference_revisions → paragraph) to each flexible content type.' : 'Layout Builder: enable per content type under Structure → Content Types → Edit → Layout options.') : 'Fixed templates — no Paragraphs or Layout Builder needed.'}
5. ${cal?.multilingual ? 'Multilingual: enable `translatable: true` on all user-facing fields. Use `drush locale-update` after enabling language module.' : 'Single language — skip all translation configuration.'}
6. Workflow: ${p.workflows.length > 0 ? 'Configure Content Moderation states in `/admin/config/workflow/workflows`. Assign workflow to content types.' : 'No workflow defined — content publishes directly via node edit form.'}
7. Pathauto: create patterns at \`/admin/config/search/path/patterns\` per content type (patterns listed above).
8. Views: minimum one view per content type for listing pages. Use DDEV: \`ddev drush views-list\`

---
${renderTheme(p)}*Generated by **Alexandra** · **Architecture Studio** on ${now}*
`;
}
