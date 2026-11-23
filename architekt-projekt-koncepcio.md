# Projekt koncepció: "Alexandra" (korábbi munkacím: ArchiFlow)

> Ezt a dokumentumot bármelyik AI-nak (Claude, ChatGPT stb.) beadhatod, és folytathatod vele a beszélgetést onnan, ahol abbahagytuk.

## Jelenlegi állapot (2026. november)

Az eredeti ötlet (üzleti igényfelmérésből architektúra) két területre bővült. A közös elv ugyanaz: **vezetett, strukturált kérdezés, amelynek a végén ellenőrizhető, átadható eredmény születik.** A termék értéke a módszertan és az eredmény minősége, nem az űrlapkeret.

| Terület | Állapot | Mit ad |
|---|---|---|
| **Rendszerszervezés** (`/sysorg`) | Kidolgozott, kipróbálásra kész első verzió | 13 témás kérdéssor, folyamatábrák (SVG, Mermaid), követelményspecifikáció (Markdown), követelmény- és nyitottkérdés-CSV, verziózott JSON. Több elemzés kezelhető párhuzamosan. |
| **Rendszerarchitektúra** (`/wizard`) | Működő varázsló, Drupal-központú | Fejlesztői brief, `AGENTS.md`, JSON. A Drupal Recipe generátor (3. réteg) még nincs meg. |

Belépés: logó → területválasztó (`/studio`) → a kiválasztott terület.

### Elvek, amelyek a fejlesztést vezetik

- **Nincs kitalált üzleti tény.** Ami nincs megadva, az hiányként jelenik meg. Minden mező jelölhető „nem ismert” vagy „nem alkalmazható” állapotúnak, ezek nyitott pontként kerülnek az exportba.
- **Tervezet, amíg nincs jóváhagyva.** Minden kimenet TERVEZET jelölésű, amíg minden téma jóváhagyva nincs, és van blokkoló hiány. A jóváhagyás egyelőre nyilvántartás (szabad szöveges név), nem hitelesítés.
- **Közös keret, külön szakmai tartalom.** A két terület keretelemei hasonlók, de a kérdések, a fogalmak és az adatmodell elkülönülnek.
- **Az AI javasolhat, de nem igazolhat vissza üzleti tényt.** A mostani verzió nem használ AI-t; a későbbi AI-támogatás is jóváhagyással dolgozzon.
- **A kimenet több nézet egy strukturált projektből**, nem egyetlen fájl. A belső, verziózott JSON a forrás, az exportok ebből készülnek.

### Ismert korlátok

- Az adatok csak a böngészőben tárolódnak (localStorage), nincs szerver, fiók vagy közös munka.
- A folyamatábra egyszerű sávos vázlat, nem szabványos BPMN. Az állapotdiagram csak Mermaid.
- Az üzleti szabályok szöveges feltétel–eredmény párok, nincs külön döntési tábla.
- Az architektúra-varázslóban még egy projekt tárolható; a rendszerszervezésben már lista van.
- A rendszerszervezési kérdéssort valós esetekkel még nem validálta szakmai felhasználó.

### Következő lépések

1. A rendszerszervezési kérdéssor kipróbálása a kollégával egy valós eseten; a kérdések, a sorrend és a kimenetek finomítása ennek alapján.
2. Üzleti logikai audit: mely funkciók relevánsak, kell-e „nem releváns” jelölés egész témákra, a „téma lezárása” és a „jóváhagyás” megkülönböztetése.
3. Elemzéslista az architektúra-tervezőbe is, hogy a két terület konzekvens legyen.
4. Fájlformátumok kiegészítése a felhasználói igények szerint (pl. DOCX/PDF, BPMN), csak ha a kipróbálás igazolja a szükségességét.
5. Ha a közös munka igény lesz: szerver, fiókok, valódi jóváhagyás-azonosítás.

---

# Az eredeti koncepció (Drupal-fókusz, 2026. július)

Az alábbi rész az induló ötletet őrzi. A „három réteg” és a Drupal Recipe generátor továbbra is az architektúra-terület iránya.

## A probléma / piaci rés

A Drupal (és tágabban CMS) fejlesztési projekteknél két réteg van jól lefedve:
- **Tartalom-előállítás AI-jal** (Drupal AI modul, page generation, szövegírás-segítés)
- **Technikai migráció végrehajtása** (Migrate API, Acquia Migrate Accelerate, Drupal Rector)

**Ami hiányzik:** az üzleti igényfelmérés strukturált, holisztikus lefordítása architektúrává (content type-ok, szerepkörök, workflow-k, jogosultsági mátrix), MIELŐTT bárki kódot írna. Sem a megrendelők, sem gyakran a fejlesztők nem tudnak egyben, holisztikusan gondolkodni egy komplex rendszer minden összefüggéséről (entitások × szerepkörök × állapotok × jogosultságok).

**A termék valódi magja NEM az AI-generálás, hanem a jó kérdezési módszertan** — a sorrend, a mélység, a rákérdezések, amik kihozzák az emberből azt, amit egyedül nem tudna megfogalmazni.

## Versenytárs-helyzet (2026 közepén)

- **Acquia Source** – AI Site Builder Agent, Drupalra épül, de non-technikai marketingeseknek szól, zárt SaaS, nem generál letölthető/verziózható configot fejlesztőknek.
- **Wix ADI** – kérdésekre válaszolva generál weboldalt, de sima marketing site-okra, nem strukturált, jogosultság-vezérelt enterprise architektúrára.
- **Sanity / Payload / Contentful** – AI a meglévő content model KÖRÉ épül, nem a modellt magát generálja üzleti leírásból.
- **Kockázat:** Acquia (a legnagyobb Drupal-hosting cég) gyorsan mozoghat ebbe az irányba is — ezért niche-re és fejlesztői/ügynökségi célközönségre érdemes fókuszálni, nem általános site buildernek.

## A három réteg

1. **Igényfelmérő UI/UX** – modern, tölcsér-elvű kérdőív-folyamat, ami vizuálisan és lépcsőzetesen vezeti végig a usert (megrendelőt vagy fejlesztőt) az üzleti logika feltárásán.
2. **Fordítás architektúrává** – a strukturált válaszokból (JSON) determinisztikus, szabályalapú generátor épít Drupal-specifikus konfigurációt (nem szabad AI-kódgenerálás, hanem korlátozott sémára fordítás).
3. **Telepíthető kimenet** – Drupal 11 "Recipe" formátumban exportált, `drush recipe` paranccsal telepíthető alap-szett, amiből a fejlesztő elindulhat.

## A kérdezési folyamat váza (tölcsér-elv)

Alapelv: egyszerre egy kérdés, minden válasz után AI-os visszatükrözés ("jól értem, hogy...?"), mielőtt tovább mennétek.

1. **Kontextus és cél** – Milyen problémát old meg? Mi történik ma, ha nincs meg? Kinek fontos?
2. **Szereplők** – Kik használják, hétköznapi nyelven leírva (nem szerepkör-névvel). Ki lát mindent / csak részt? Ki hagy jóvá valamit?
   - *Buktató:* emberek összemossák a szerepkört a konkrét személlyel — ezt ki kell bányászni.
3. **Entitások ("dolgok")** – Mi az a néhány fő dolog, amit a rendszer nyilvántart? Milyen adatokat kell tudni róluk? Kapcsolódnak egymáshoz?
   - *UX-tipp:* vizuális, kártyás/kapcsolat-építő felület, nem szöveges lista — az emberek térben gondolkodnak kapcsolatokról.
4. **Állapotok / workflow** – Milyen állapotokon megy át egy entitás? Van jóváhagyási pont? Mi van, ha elutasítják?
   - *Buktató:* az emberek csak a "boldog utat" mondják el — direkt rá kell kérdezni a hibaágakra.
5. **Jogosultságok** – Szereplő × entitás × művelet mátrix. NEM nyílt kérdésként teendő fel — az AI generáljon előzetes mátrixot a 2-4. szekció válaszaiból, a user csak jóváhagyja/korrigálja.
6. **Külső kapcsolódások és korlátok** – Más rendszerek, jogi/szervezeti kötelezettségek (audit trail, adatmegőrzés).

## Amit a termék szellemi tulajdonaként érdemes építeni

1. A tölcsér-logika sorrendje és mélysége (requirement-engineering minta, iterálva finomítva)
2. Automatikus jogosultsági mátrix-generálás jóváhagyással (kognitív teher levétele)
3. Vizuális entitás-kapcsolat builder (UX-differenciátor sima kérdőívekkel szemben)

## Technikai buktatók, amikre figyelni kell

- AI megbízhatóság: zárt sémára kell korlátozni a kimenetet (enum mezőtípusok), a tényleges Drupal config generálása legyen szabályalapú, ne AI-generált kód
- Drupal verzió-karbantartás: a generátort folyamatosan karban kell tartani (pl. Migrate Drupal modul már deprecated 11.4-ben)
- Komplexitás-korlát: egyszerű mintákra (tagsági rendszer, dokumentumkezelő, jóváhagyási workflow) fókuszálni elsőre, nem mindent lefedni
- Üzleti modell: Drupal-fejlesztők árérzékenyek, sokan szeretik az ingyenes core-eszközöket

## Javasolt fejlesztési lépések

1. Kézi validáció 2-3 valós projekten (pl. saját munkahelyi projekt) — papíron/Figma-szinten, AI és fejlesztés nélkül
2. JSON-séma definiálása (mit tartalmazhat az "üzleti logika" strukturált kimenet)
3. Kérdőív UI + LLM-integráció (strukturált JSON generálása, séma szerinti validáció)
4. Determinisztikus Recipe-generátor (JSON → tényleges Drupal `recipe.yml` + configok)
5. Tesztelés valós Drupal 11 site-on
6. Scope szűkítése 3-4 gyakori mintára elsőre

## Jövőbeli bővítési irány

A kérdőív + üzleti logika réteg keretrendszer-független módon építhető (a JSON-kimenet nem Drupal-specifikus, csak entitások/szerepkörök/workflow-k absztrakt leírása). A végén csak a generátor-modult kell cserélni célrendszerenként (Drupal Recipe, WordPress, Directus séma stb.) — ez csökkenti az Acquia-féle versenytársi kockázatot is, mert nem tiszta Drupal-niche termék, hanem általánosabb "üzleti logika → CMS-architektúra" eszköz.

A rendszerszervezési terület ezt az irányt már megmutatja: a kérdezési módszertan nem csak CMS-hez, hanem általános követelményfeltáráshoz is használható, a kimenet pedig nem kód, hanem átadható dokumentáció és folyamatábra.

## Régi „következő lépés” (2026. július, a fentiek felülírták)

Az 5. napirendi pont (kérdezési folyamat) 3. vagy 5. szekciójának mélyebb kidolgozása — mockup/vázlat szinten:
- 3. szekció: entitás-kapcsolat vizuális builder
- 5. szekció: jogosultsági mátrix auto-generálás jóváhagyással

---
*Az eredeti dokumentum generálva: 2026.07.09, Claude-dal folytatott beszélgetés alapján. A „Jelenlegi állapot” rész frissítve: 2026.11.23.*
