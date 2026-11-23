# Változásnapló

A formátum a [Keep a Changelog](https://keepachangelog.com/hu/1.1.0/) elveit követi, a verziózás a [SemVer](https://semver.org/lang/hu/) szerint történik (a 0.x verziók alatt a változások még törhetik a kompatibilitást).

## [Nem kiadott]

### Hozzáadva
- Kiadás GitHub Pages-re (`.github/workflows/pages.yml`): statikus export az `/alexandra/` alkönyvtárban, `noindex` jelzéssel.

### Módosítva
- A `/wizard/[step]` útvonal statikusan előre legenerált, ismeretlen lépés 404-et ad.
- Az architektúra-varázsló lépésválasztó komponense a `src/components/wizard/StepRouter.tsx` fájlba került.

## [0.1.0] – 2026-11-23

Első verzió, szakmai kipróbálásra.

### Hozzáadva
- **Rendszerszervezés** (`/sysorg`): 13 témás vezetett kérdéssor (keret, üzleti cél, hatókör, érintettek, AS-IS, TO-BE, funkciók, szabályok, adatok, jogosultságok, integráció és migráció, minőség és bevezetés, felülvizsgálat).
- „Nem ismert” és „Nem alkalmazható” jelölés mezőnként; hiányok, ellentmondások és blokkoló pontok automatikus jelzése; témánkénti lezárás és jóváhagyás nyilvántartása.
- Több elemzés párhuzamos kezelése: létrehozás, megnyitás, duplikálás, exportálás, törlés megerősítéssel, „Nemrég törölt” visszaállítással.
- Kimenetek: Markdown követelményspecifikáció, követelmények és elfogadási feltételek CSV, nyitott kérdések CSV, sávos folyamatábra (SVG), Mermaid folyamat- és állapotdiagram, verziózott JSON export és validált visszatöltés.
- **Rendszerarchitektúra** (`/wizard`): Drupal-központú igényfelmérő varázsló fejlesztői briefhez és `AGENTS.md`-hez; a lépések a Kalibráció után szabadon járhatók be.
- Területválasztó (`/studio`) és logós nyitóoldal.
- Egységtesztek a rendszerszervezési modulhoz (`npm run test:sysorg`).

### Ismert korlátok
- Minden adat csak a böngészőben tárolódik; nincs szerver, fiók vagy közös szerkesztés.
- A folyamatábra egyszerű vázlat, nem szabványos BPMN.
- Az architektúra-varázslóban egy projekt tárolható.
- A rendszerszervezési kérdéssort még nem validálta valós felhasználó.

[Nem kiadott]: https://github.com/atee11/alexandra/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/atee11/alexandra/releases/tag/v0.1.0
