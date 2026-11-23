# ArchiFlow – Layer 1 fejlesztési roadmap

> Ez a dokumentum a fejlesztés során élő referencia. Scope-onként frissítendő.

---

## Alexandra tervezőtér

- A `/` márkanyitó a logóra vagy a belépési feliratra kattintva a `/studio` területválasztóra vezet.
- A rendszerarchitektúra a meglévő `/wizard/calibration` folyamatot használja; a rendszerszervezés a `/sysorg` útvonalon érhető el.
- A tervezőtér a böngészőben mentett, akár részben kitöltött projektet is felismeri, és az első befejezetlen lépésnél kínál folytatást.
- Egyszerre egy architektúraprojekt tárolható. Meglévő projekt törlése új indításakor külön megerősítést igényel.
- A varázsló márkajelzése a tervezőtérre vezet; a közvetlen projektlinkek továbbra is használhatók.

## Rendszerszervezési modul (`/sysorg`)

Az architektúra-tervezőtől független modul: saját adatmodell, saját mentés (`alexandra-sysorg-v1`), saját kód.

| Hely | Tartalom |
|---|---|
| `src/lib/sysorg/schema.ts` | Zod-séma és típusok (verziózott projektmodell, stabil azonosítók, `KPI-001`-szerű kódok) |
| `src/lib/sysorg/analysis.ts` | Hiányok, ellentmondások, nyomonkövethetőség, készültségi állapot |
| `src/lib/sysorg/diagram.ts` | Folyamatgráf, sávos SVG, Mermaid folyamat- és állapotdiagram |
| `src/lib/sysorg/exports.ts` | Markdown specifikáció, követelmény- és nyitottkérdés-CSV |
| `src/lib/sysorg/io.ts` | JSON export, validált import, hivatkozás-tisztítás |
| `src/lib/sysorg/projects.ts` | Elemzéslista tiszta logikája: új/üres újrahasznosítása, duplikálás, törlés kukába, visszaállítás, 1→2. verziós migráció, tárolt adat ellenőrzése |
| `src/lib/sysorg/store.ts` | Zustand tároló: aktív elemzés, mentési hibajelzés, sérült adat félretétele |
| `src/components/sysorg/`, `src/app/sysorg/` | Űrlapok (0–12. téma), eredményoldal, kezdőoldal |

- **Témák:** 0 keret, 1 üzleti cél, 2 hatókör, 3 érintettek, 4 AS-IS, 5 TO-BE, 6 funkciók, 7 szabályok, 8 adatok, 9 jogosultságok, 10 integráció/migráció, 11 minőség/bevezetés, 12 felülvizsgálat.
- **Nincs kitalált tartalom:** minden mezőnél jelölhető „nem ismert” / „nem alkalmazható”; ezek nyitott pontként jelennek meg az exportokban. A kimenet addig *TERVEZET*, amíg minden téma jóváhagyva nincs, és van blokkoló hiány.
- **Kimenetek:** `.md` követelményspecifikáció, `.csv` követelmények + elfogadási feltételek, `.csv` nyitott kérdések/döntések, `.svg` és `.mmd` folyamatábra, külön `-allapotok.mmd` állapotdiagram, verziózott `.json` (visszatölthető).
- **Korlátok:** a folyamatábra egyszerű sávos vázlat, nem szabványos BPMN; az állapotdiagram csak Mermaid; a szabályok szöveges feltétel–eredmény párok, nincs külön döntési tábla; a tárolás böngészőlokális (legfeljebb 50 elemzés, 5 törölt elem őrződik meg), közös munkához szerver és fiókok kellenének.
- **Elemzéslista:** a `/sysorg` kezdőoldal kártyákon mutatja az elemzéseket (állapot, haladás, blokkoló hiányok). Megnyitás, duplikálás (jóváhagyások nélkül), exportálás és törlés megerősítéssel; a törölt elem a „Nemrég törölt” részből visszaállítható. A JSON-import mindig új elemzésként kerül a listába, meglévőt nem ír felül.
- **Tesztek:** `npm run test:sysorg` (séma, import/export, CSV-injekció, SVG/Mermaid escape, elemzés, specifikáció).

## Tech stack (döntött)

```
Framework:    Next.js 14+ (App Router, TypeScript)
CSS:          Tailwind CSS + saját SCSS réteg
UI:           shadcn/ui komponensek
Vizuális:     React Flow (entitás builder + workflow diagram)
State:        Zustand (session state, épülő JSON)
Validáció:    Zod (AI output schema enforcement)
AI:           Vercel AI SDK + Google Gemini free tier
Deploy:       Vercel (free tier)
```

---

## A wizard szekció-struktúra

### Mindig látható (core flow)

| # | Szekció | Input típus | AI szerepe |
|---|---|---|---|
| 0 | **Kalibráció** | 3 választós kérdés | Meghatározza a látható szekciókat |
| 1 | **Kontextus & cél** | Szabad szöveg | Összefoglalás + visszatükrözés |
| 2 | **Szereplők** | Szabad szöveg | Szerepkör-kinyerés (zárt enum) |
| 3 | **Entitások** | React Flow vizuális builder | Mezőtípus-javaslat (zárt enum) |
| 4 | **Workflow** | React Flow folyamatábra | Állapot-generálás, hibaág-rákérdezés |
| 5 | **Jogosultságok** | Auto-generált tábla (user szerkeszt) | Mátrix auto-kitöltés |
| 6 | **Külső kapcsolatok** | Checkboxes + szabad | Lista-struktúra |

### Feltételesen látható (kalibráció alapján)

| # | Szekció | Feltétel |
|---|---|---|
| 7 | Keresés & listák | Ha tartalom + 20+ user |
| 8 | Értesítések | Ha van workflow |
| 9 | Belépés & SSO | Ha belső rendszer VAGY 200+ user |
| 10 | Integráció | Ha "igen" a kalibráció 3. kérdésére |
| 11 | Megfelelőség (GDPR, audit) | Ha személyes adatot gyűjt |

---

## Zárt enum-ok (AI csak ebből választhat)

```typescript
const FIELD_TYPES = ['text','textarea','integer','boolean','date',
                     'reference','file','image','email','telephone','list'] as const

const OPERATIONS   = ['create','read','update','delete','publish','archive'] as const

const SCOPES       = ['own','all','assigned'] as const

const ROLE_TYPES   = ['admin','editor','viewer','contributor','moderator','external'] as const

const WORKFLOW_STATES = ['draft','review','published','rejected','archived'] as const

const MEDIA_TYPES  = ['image','document','video','audio','remote_video'] as const
```

---

## Scope 1 – Foundation + Wizard shell
**Cél:** Fut az app, navigálható a wizard, az épülő JSON látható.

### Feladatok
- [ ] `npx create-next-app@latest archiflow --typescript --tailwind --app`
- [ ] shadcn/ui init + alap komponensek (Button, Input, Textarea, Card)
- [ ] Zustand store: `useProjectStore` (session state, épülő JSON)
- [ ] Layout: bal sidebar (stepper) + fő tartalom + jobb JSON preview panel
- [ ] Wizard routing: `/wizard/[step]` dinamikus route
- [ ] Stepper komponens: lépések, aktív állapot, completed/locked jelzés
- [ ] Reszponzív: mobilon a JSON preview drawer/modal legyen
- [ ] Empty state: üres JSON preview szekció-tagonként

### Elfogadási kritérium
- A 6 szekció között lehet navigálni
- A JSON preview panel élőben frissül (egyelőre csak placeholder adatokkal)
- Mobilon is használható

---

## Scope 2 – Kalibráció + Szekció 1-2 + Első AI hívás
**Cél:** Az AI ténylegesen kinyeri a szerepköröket szabad szövegből, Zod validálva.

### Feladatok
- [ ] **0. szekció: Kalibráció** – 3 kérdés, eredmény eltárolva store-ban, látható szekciók dinamikusan frissülnek
- [ ] **1. szekció: Kontextus** – textarea → `/api/reflect` endpoint → AI összefoglal → visszatükrözés UI
- [ ] **2. szekció: Szereplők** – textarea → `/api/extract-roles` endpoint
  - Zod schema: `{ roles: Array<{ label: string, type: RoleType, scope: Scope, description: string }> }`
  - Eredmény: szerkeszthető szerepkör-kártyák
- [ ] `.env.local` setup: `GEMINI_API_KEY`
- [ ] Vercel AI SDK + `@ai-sdk/google` integráció
- [ ] Zod validáció + retry logika (ha invalid JSON jön vissza)
- [ ] JSON preview frissül a store alapján

### Elfogadási kritérium
- Szabad szövegből AI kinyeri a szerepköröket
- Csak az enum listából választ típust
- Érvénytelen AI output esetén automatikusan újrapróbál
- A user szerkesztheti/törölheti az AI javaslatait

---

## Scope 3 – Entitás builder (vizuális)
**Cél:** A user vizuálisan tud entitásokat és kapcsolatokat felvinni.

### Feladatok
- [ ] React Flow canvas integráció
- [ ] `EntityNode` custom node: kártya megjelenés, mező-lista, `[+ Mező hozzáadása]` gomb
- [ ] Mező hozzáadása modal: label, típus (enum dropdown), kötelező, kardinális
- [ ] Kapcsolat húzása két entitás között → automatikusan `reference` mező jön létre a forrás entitáson
- [ ] `[+ Új entitás]` gomb → névbeírás → AI javasol mezőket az entitás neve alapján
- [ ] Entitás típus (content/taxonomy/media/user_profile) kiválasztható
- [ ] Mobilon: lista nézet (nem React Flow), csak olvasható összefoglaló
- [ ] Store: `entities` tömb frissül React Flow state-ből

### Elfogadási kritérium
- Legalább 3 entitás felvihető, közöttük kapcsolat húzható
- Mezőtípusok csak az enum listából választhatók
- Mobilon is olvasható (ha nem szerkeszthető is)

---

## Scope 4 – Workflow + Jogosultsági mátrix
**Cél:** Workflow diagram + auto-generált permission mátrix.

### Feladatok
- [ ] **4. szekció: Workflow**
  - React Flow canvas (állapot-csomópontok + átmenet-nyilak)
  - AI generálja az első vázlatot a 1-2. szekció alapján
  - `[+ Állapot]`, `[+ Átmenet]` gombok
  - Átmenetnél: melyik role-ok engedhetik (multi-select)
  - Kötelező rákérdezés: "Mi van, ha visszautasítják?" (hibaág)
- [ ] **5. szekció: Jogosultságok**
  - AI auto-generálja a mátrixot a 2+3+4. szekció alapján
  - Táblázat: szerepkör × entitás × műveletek (checkbox-ok)
  - Scope (own/all/assigned) per sor
  - Mobilon: összefoglaló lista nézet
- [ ] Store: `workflows` és `permissions` tömbök frissülnek

### Elfogadási kritérium
- Workflow állapotai szerkeszthetők
- Jogosultsági mátrix az AI által pre-kitöltve jelenik meg
- A user módosíthat minden cellán

---

## Scope 5 – Feltételes szekciók + Polish + JSON export
**Cél:** Teljes flow, letölthető JSON kimenet.

### Feladatok
- [ ] **6. szekció: Külső kapcsolatok** – checkboxes (e-mail, fájlok, API, GDPR)
- [ ] **7-11. feltételes szekciók** – a kalibráció alapján jelennek meg
  - 7: Keresés – lista-builder (entitás + szűrők + rendezés)
  - 8: Értesítések – "ha X esemény → értesít Y role-t" rule-ok
  - 9: SSO – provider választó (Azure AD, Google, LDAP, saját)
  - 10: Integráció – rendszer + irány + trigger
  - 11: GDPR – személyes adat mezők jelölése, audit log, adatmegőrzés
- [ ] **Befejező képernyő:**
  - Összefoglaló (entitások, szerepkörök, workflow áttekintve)
  - `[Letöltés JSON]` gomb → `archiflow-export.json`
  - `[Projekt mentése]` (Supabase, ha van account) – opcionális
- [ ] Validáció: minden kötelező szekció kitöltött-e?
- [ ] Reszponzív polish: minden szekció mobilon is rendben
- [ ] Loading state-ek AI hívásoknál (skeleton UI)

### Elfogadási kritérium
- A teljes flow végigvihető elejétől végéig
- A letöltött JSON valid és a Zod master-sémának megfelelő
- Mobilon az összes core szekció kitölthető

---

## Az épülő JSON végső struktúrája

```json
{
  "meta": { "label": "", "language": "hu", "complexity": "standard" },
  "entities": [],
  "roles": [],
  "workflows": [],
  "permissions": [],
  "media_types": [],
  "lists": [],
  "notifications": [],
  "auth": {},
  "compliance": {},
  "integrations": []
}
```

---

## Fejlesztési alapelvek

1. **AI soha nem generál szabadon** — csak zárt enum-ból választ
2. **Zod validáció minden AI API hívás után** — invalid output = retry
3. **A store igazság-forrás** — a vizuális UI (React Flow) a store-t frissíti, nem fordítva
4. **Mobile = read-only a komplex vizuális részeknél** (React Flow canvas)
5. **Szekció csak akkor nyílik, ha az előző Zod-valid adatot tartalmaz**
