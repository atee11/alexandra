# Alexandra

Vezetett tervezőműhely két területre:

- **Rendszerszervezés** (`/sysorg`) – az üzleti igénytől a követelményrendszerig: 13 témás kérdéssor, folyamatábrák, követelményspecifikáció, CSV és JSON export.
- **Rendszerarchitektúra** (`/wizard`) – az üzleti igényfelmérés architektúrává fordítása (fejlesztői brief, `AGENTS.md`).

Belépés: a nyitóoldalon a logóra kattintva a területválasztóhoz jutsz.

## Futtatás

Szükséges: [Node.js](https://nodejs.org) 20 vagy újabb.

```bash
npm install
npm run dev        # fejlesztői szerver: http://localhost:3000
```

Éles build kipróbálása: `npm run build`, majd `npm start`.

## Ellenőrzés

```bash
npm run test:sysorg   # a rendszerszervezési modul egységtesztjei
npm run build         # típusellenőrzés és éles build
```

## Adatok és mentés

Minden adat **csak a böngésződben** (localStorage) tárolódik, nem kerül szerverre. Másik böngészőbe vagy gépre a JSON-exporttal és -importtal vihető át. Teszteléshez érdemes külön böngészőprofilt vagy privát ablakot használni, mert a mentés böngészőnként külön van.

A rendszerszervezési JSON-export verziózott (`format`, `version`). Ha a modell változik, a verziószám nő, és a régi exportok betöltése migrációval marad működőképes.

## Tesztelési útmutató (szakmai kipróbáláshoz)

Cél: kiderüljön, hogy a kérdéssor és az eredmények egy **valós rendszerszervezési feladatnál** használhatók-e.

1. Válassz egy valós vagy valósághű esetet, és vidd végig a **Rendszerszervezés** területen (`Új elemzés`).
2. Figyeld meg, hol akadsz el: melyik kérdés érthetetlen, hiányzik, felesleges vagy rossz sorrendben van.
3. Használd a „Nem ismert” / „Nem alkalmazható” jelölést ott, ahol nem tudsz válaszolni, és nézd meg, hogyan jelenik meg a **Szakmai felülvizsgálat** és az exportok között.
4. Az **Eredmények** oldalon töltsd le a specifikációt, a CSV-ket és a folyamatábrákat. Átadnád ezeket a megrendelőnek vagy a fejlesztőknek? Mi hiányzik belőlük?
5. Próbáld ki a több elemzés kezelését: duplikálás, törlés és visszaállítás, exportálás és visszatöltés.
6. Jegyezd fel: mit használtál volna máshogy, mit hagytál ki, mit nem értettél.

Hibát vagy javaslatot GitHub Issue-ként jelezz (ha nem megy, e-mailben a leírás és a böngésző neve elég).

## Dokumentáció

- [`architekt-projekt-koncepcio.md`](architekt-projekt-koncepcio.md) – a projekt koncepciója
- [`layer1-roadmap.md`](layer1-roadmap.md) – fejlesztési terv és a rendszerszervezési modul felépítése
