/**
 * Alexandra – Developer Brief Generator
 * Human-readable project brief for the developer (complement to AGENTS.md)
 */

import type { ProjectData, Entity, Role, WorkflowState } from './types';

// ─── Helper: entity relationship ASCII diagram ───────────────────────────────

function renderEntityDiagram(p: ProjectData): string {
  const contentTypes = p.entities.filter((e) => e.type === 'content');
  const taxonomies   = p.entities.filter((e) => e.type === 'taxonomy');
  const paragraphs   = p.entities.filter((e) => e.type === 'paragraph');
  const profiles     = p.entities.filter((e) => e.type === 'user_profile');

  if (!p.entities.length) return '*Nincsenek entitások definiálva.*\n';

  let out = '```\n';

  // Content types
  if (contentTypes.length) {
    out += contentTypes.map((e) => {
      const refFields = e.fields.filter((f) => f.type === 'reference');
      let box = `┌${'─'.repeat(e.label.length + 4)}┐\n│  ${e.label}  │`;
      if (refFields.length) {
        box += '\n└' + '─'.repeat(e.label.length + 4) + '┘';
        for (const f of refFields) {
          const target = p.entities.find((ent) => ent.id === f.referenceTarget);
          if (target) {
            box += `\n  │ ${f.label}\n  └─────────▶ [${target.label}]`;
          }
        }
      } else {
        box += '\n└' + '─'.repeat(e.label.length + 4) + '┘';
      }
      return box;
    }).join('\n\n');
  }

  if (taxonomies.length) {
    out += '\n\nTaxonómia vocabularies:\n';
    out += taxonomies.map((e) => `  • ${e.label} (taxonomy.vocabulary.${e.machineName})`).join('\n');
  }

  if (paragraphs.length) {
    out += '\n\nParagraph types (Paragraphs modul):\n';
    out += paragraphs.map((e) => `  • ${e.label} (paragraph.type.${e.machineName})`).join('\n');
  }

  if (profiles.length) {
    out += '\n\nFelhasználói profil kiegészítések:\n';
    out += profiles.map((e) => `  • ${e.label}`).join('\n');
  }

  out += '\n```\n';
  return out;
}

// ─── Helper: workflow ASCII flow ─────────────────────────────────────────────

function renderWorkflowDiagram(p: ProjectData): string {
  if (!p.workflows.length) {
    return '*Nincs Content Moderation workflow — tartalom közvetlenül publikálható.*\n';
  }

  const wf = p.workflows[0];
  const published = wf.states.find((s) => s.isPublished);
  const drafts    = wf.states.filter((s) => !s.isPublished);

  let out = '```\n';

  // Simple linear flow
  const stateLabels = wf.states.map((s) => s.label);
  out += stateLabels.join(' → ') + '\n';

  // Highlight published state
  if (published) {
    out += `\n✓ Publikált állapot: "${published.label}"\n`;
  }

  // Show transitions
  if (wf.transitions.length) {
    out += '\nÁtmenetek:\n';
    for (const t of wf.transitions) {
      const from  = wf.states.find((s) => s.id === t.from)?.label ?? t.from;
      const to    = wf.states.find((s) => s.id === t.to)?.label ?? t.to;
      const roles = t.allowedRoles
        .map((rid) => p.roles.find((r) => r.id === rid)?.label ?? rid)
        .join(', ');
      out += `  ${from} → ${to}`;
      if (roles) out += ` (ki: ${roles})`;
      out += '\n';
    }
  } else {
    out += '\n⚠️ Nincsenek átmenetek definiálva — add hozzá a wizardban vagy az admin felületen:\n';
    out += '  /admin/config/workflow/workflows\n';
  }

  // Which entities use this workflow
  const appliedEntities = wf.appliesTo
    .map((id) => p.entities.find((e) => e.id === id)?.label ?? id)
    .join(', ');
  if (appliedEntities) {
    out += `\nAlkalmazva: ${appliedEntities}\n`;
  }

  out += '```\n';
  return out;
}

// ─── Helper: roles plain language ────────────────────────────────────────────

function renderRolesSummary(p: ProjectData): string {
  if (!p.roles.length) return '*Nincsenek szerepkörök definiálva.*\n';

  let out = '';
  for (const role of p.roles) {
    const scopeLabel = role.scope === 'own' ? 'csak saját tartalmait'
                     : role.scope === 'all' ? 'az összes tartalmat'
                     : 'a hozzárendelt tartalmakat';
    const formatLabel = role.textFormat === 'full_html' ? 'teljes HTML szerkesztő (CKEditor 5)'
                      : role.textFormat === 'basic_html' ? 'alap HTML szerkesztő'
                      : 'csak szöveg (nincs formázás)';

    out += `### ${role.label} (\`${role.machineName}\`)\n`;
    if (role.description) out += `> ${role.description}\n`;
    out += `- **Hatókör:** ${scopeLabel} éri el\n`;
    out += `- **Szövegszerkesztő:** ${formatLabel}\n`;

    // What can they do
    const perms = p.permissions.filter((pm) => pm.roleId === role.id);
    if (perms.length) {
      const opSummary = perms.map((pm) => {
        const entity = p.entities.find((e) => e.id === pm.entityId)?.label ?? '?';
        const ops    = pm.operations.join(', ');
        return `${entity}: ${ops}`;
      }).join(' | ');
      out += `- **Jogosultságok:** ${opSummary}\n`;
    }
    out += '\n';
  }
  return out;
}

// ─── Helper: open questions ───────────────────────────────────────────────────

function renderOpenQuestions(p: ProjectData): string {
  const questions: string[] = [];

  if (!p.viewListings?.length && p.entities.filter((e) => e.type === 'content').length > 0) {
    questions.push('Milyen URL-en legyenek a listázó oldalak? (Views konfigurációhoz szükséges)');
  }

  if (!p.workflows.length && p.roles.length > 1) {
    questions.push('Szükséges-e jóváhagyási folyamat? Több szerkesztő van, de nincs workflow definiálva.');
  }

  if (p.calibration?.hasMigration && p.integrations.length === 0) {
    questions.push('Melyik rendszerből történik a migráció? Forrásrendszer és mezőmapping szükséges.');
  }

  const hasGdprSelection = p.externalSelections?.includes('gdpr');
  if (hasGdprSelection && !p.compliance?.gdprPersonalData?.length) {
    questions.push('GDPR: mely mezők tartalmaznak személyes adatot? (Törlési kérelem funkcióhoz szükséges)');
  }

  if (p.calibration?.flexibleLayouts && !p.calibration?.layoutEngine) {
    questions.push('Paragraphs vagy Layout Builder? Ez nem lett eldöntve a kalibrációban.');
  }

  const hasImages = p.entities.some((e) => e.fields.some((f) => f.type === 'image'));
  if (hasImages) {
    questions.push('Milyen kép-méretekre van szükség a frontend tervekben? (Image styles konfiguráláshoz)');
  }

  if (!p.auth || p.auth.sso === 'none') {
    if (p.calibration?.visibility === 'internal') {
      questions.push('Belső rendszernél: lesz-e Active Directory / Azure AD belépés?');
    }
  }

  questions.push('Melyik admin témát használjuk? (Claro = core default, Gin = contrib, jobb UX — dönteni kell)');
  questions.push('Mi a hosting célja? (Acquia / Pantheon / Platform.sh / Custom VPS)');

  if (!questions.length) return '*Nincs nyitott kérdés — minden le van fedve.*\n';

  return questions.map((q) => `- [ ] ${q}`).join('\n') + '\n';
}

// ─── Helper: architectural decisions ─────────────────────────────────────────

function renderDecisions(p: ProjectData): string {
  const decisions: string[] = [];

  if (p.calibration?.flexibleLayouts) {
    const engine = p.calibration.layoutEngine;
    if (engine === 'paragraphs') {
      decisions.push('**Paragraphs modul** a rugalmas elrendezéshez — azért, mert strukturált tartalom-blokkokra van szükség, amelyek újrafelhasználhatók és szerkesztő-barátak.');
    } else if (engine === 'layout_builder') {
      decisions.push('**Layout Builder** a rugalmas elrendezéshez — azért, mert marketing landing page-ekhez szükséges oldal-szintű szekció-szerkesztés.');
    }
  } else {
    decisions.push('**Fix sablonok** (nincs Paragraphs/LB) — egyszerűbb tartalom-struktúra, fejlesztői sablonok elegendők.');
  }

  if (p.workflows.length > 0) {
    decisions.push(`**Content Moderation workflow** ${p.workflows[0].states.length} állapottal — azért, mert több szerkesztő van és szükséges a jóváhagyási folyamat a publikálás előtt.`);
  } else {
    decisions.push('**Nincs workflow** — a tartalom közvetlenül publikálható, egyszerű szerkesztői struktúra elegendő.');
  }

  if (p.calibration?.multilingual) {
    decisions.push('**Többnyelvű site** — Language + Content Translation modulok szükségesek. Ez befolyásolja az összes content type konfigurációját (translatable mezők).');
  }

  if (!decisions.length) return '*Nincsenek dokumentált döntések.*\n';
  return decisions.map((d) => `- ${d}`).join('\n') + '\n';
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateDeveloperBrief(p: ProjectData): string {
  const now  = new Date().toISOString().split('T')[0];
  const cal  = p.calibration;
  const slug = (p.meta.label || 'projekt').toLowerCase().replace(/\s+/g, '-');

  const projectTypeLabels: Record<string, string> = {
    marketing: 'Marketing / céges oldal',
    news:      'Hírportál',
    intranet:  'Intranet',
    docs:      'Dokumentumkezelő',
    community: 'Közösségi rendszer',
    events:    'Rendezvénykezelő',
    catalog:   'Termékkatalógus',
    custom:    'Egyedi rendszer',
  };

  const projectTypes = (p.contextAnswers?.projectTypes ?? [])
    .map((t) => projectTypeLabels[t] ?? t)
    .join(', ');

  return `# ${p.meta.label || 'Névtelen Projekt'} – Fejlesztői Brief

> Generálva: ${now} | Alexandra CMS Architektúra Tervező
> Ez a dokumentum a **fejlesztő számára** készült összefoglaló.
> Az AI agent számára készült részletes technikai leírás: **AGENTS.md**

---

## 1. Projekt összefoglalás

| | |
|---|---|
| **Projekt neve** | ${p.meta.label || '—'} |
| **Típus** | ${projectTypes || '—'} |
| **Láthatóság** | ${cal?.visibility === 'internal' ? 'Csak belső (intranet)' : cal?.visibility === 'public' ? 'Nyilvános weboldal' : 'Nyilvános + Belső'} |
| **Szerkesztők** | ${cal?.editorCount === 'few' ? '1–5 fő' : cal?.editorCount === 'team' ? '5–20 fő' : '20+ fő'} |
| **Többnyelvű** | ${cal?.multilingual ? 'Igen' : 'Nem'} |
| **Migráció** | ${cal?.hasMigration ? 'Igen — meglévő adatok áthozása szükséges' : 'Nem — zöldmezős projekt'} |

### Üzleti kontextus
${p.context || '*Nem lett megadva üzleti kontextus.*'}

---

## 2. Content model

${renderEntityDiagram(p)}
### Adattípusok áttekintése

| Típus | Név | Mezők | Webcím minta |
|-------|-----|-------|-------------|
${p.entities.map((e) => `| ${e.type} | **${e.label}** (\`${e.machineName}\`) | ${e.fields.length} mező | ${e.urlPattern ?? '—'} |`).join('\n') || '| — | — | — | — |'}

---

## 3. Felhasználók és jogosultságok

${renderRolesSummary(p)}

---

## 4. Tartalom-életciklus (Workflow)

${renderWorkflowDiagram(p)}

---

## 5. Architektúrális döntések

${renderDecisions(p)}

---

## 6. Nyitott kérdések ⚠️

Ezeket a kérdéseket a fejlesztés megkezdése előtt kell tisztázni:

${renderOpenQuestions(p)}

---

## 7. Szükséges modulok (összefoglaló)

A részletes modul-lista az **AGENTS.md** fájlban van.
Kulcs contrib modulok:
${[
  p.workflows.length ? '- `content_moderation` + `workflows` — tartalom-életciklus' : null,
  cal?.flexibleLayouts && cal?.layoutEngine === 'paragraphs' ? '- `paragraphs` + `entity_reference_revisions` — rugalmas elrendezés' : null,
  cal?.flexibleLayouts && cal?.layoutEngine === 'layout_builder' ? '- `layout_builder` (core) — rugalmas elrendezés' : null,
  cal?.multilingual ? '- `language` + `content_translation` — többnyelvűség' : null,
  p.entities.some((e) => e.fields.some((f) => f.type === 'image')) ? '- `media` + `media_library` — képkezelés' : null,
  '- `pathauto` + `token` — automatikus URL generálás',
  '- `metatag` — SEO meta tagek',
  '- `admin_toolbar` — gyorsabb admin navigáció',
  p.auth?.sso === 'saml' ? '- `samlauth` — SAML SSO' : null,
  p.auth?.sso === 'oauth' ? '- `openid_connect` — OAuth/OIDC SSO' : null,
].filter(Boolean).join('\n')}

---

## 8. Ajánlott fejlesztési sorrend

1. **DDEV setup** → projekt inicializálás, Drupal telepítés (AGENTS.md alapján)
2. **Core content types** → ${p.entities.filter((e) => e.type === 'content').map((e) => e.label).join(', ') || 'content type-ok'} létrehozása
3. **Taxonomy vocabularies** → ${p.entities.filter((e) => e.type === 'taxonomy').map((e) => e.label).join(', ') || '—'}
4. **Media types** → Image (kötelező), Document (ha szükséges)
5. **User roles** → ${p.roles.map((r) => r.label).join(', ') || '—'} + permission-ök beállítása
${p.workflows.length ? '6. **Content Moderation** → workflow állapotok + átmenetek\n7. **Pathauto** → URL minták konfigurálása\n8. **Views** → listázó oldalak (AGENTS.md alapján)' : '6. **Pathauto** → URL minták konfigurálása\n7. **Views** → listázó oldalak'}
9. **Frontend téma** → admin: Claro (default) vagy Gin (contrib), frontend: [döntés szükséges]
10. **Tesztelés** → tartalom feltöltés, jogosultság ellenőrzés

---

## 9. Kontakt

> Ez a brief az Alexandra wizarddal lett generálva. Ha bármely döntés felülvizsgálatot igényel,
> nyisd meg a projektet az Alexandra alkalmazásban és módosítsd a kívánt szekciókat.
> Frissített AGENTS.md és DEVELOPER-BRIEF.md generálható újra bármikor.

---
*Alexandra · Architecture Studio | ${now}*
`;
}
