import type { TopicId } from './schema';

export interface TopicDef {
  id: TopicId;
  number: number;
  label: string;
  question: string;
  hint: string;
}

export const TOPICS: TopicDef[] = [
  { id: 'keret', number: 0, label: 'A vizsgálat kerete', question: 'Milyen helyzetet elemzünk?', hint: 'Kezdeményezés, megrendelő, rendelkezésre álló források.' },
  { id: 'uzleti-cel', number: 1, label: 'Üzleti probléma és cél', question: 'Mi a gond, és mitől lesz jobb?', hint: 'Konkrét eset, következmény, mérhető siker.' },
  { id: 'hatokor', number: 2, label: 'Hatókör és rendszerhatár', question: 'Mi tartozik bele, és mi marad ki?', hint: 'Bent, kint, később; korlátok és függőségek.' },
  { id: 'erintettek', number: 3, label: 'Érintettek és felelősségek', question: 'Kik használják, működtetik, hagyják jóvá?', hint: 'Szereplők céljai, döntései, felelősségei.' },
  { id: 'as-is', number: 4, label: 'Jelenlegi működés (AS-IS)', question: 'Hogyan működik ma a folyamat?', hint: 'Lépések, döntések, várakozások, kerülőutak.' },
  { id: 'to-be', number: 5, label: 'Elvárt működés (TO-BE)', question: 'Hogyan működjön a jövőben?', hint: 'Változások, állapotok, elutasítás, határidők.' },
  { id: 'funkciok', number: 6, label: 'Funkciók és használati esetek', question: 'Ki mit akar elérni a rendszerben?', hint: 'Normál és alternatív lefutás, elfogadási feltételek.' },
  { id: 'szabalyok', number: 7, label: 'Üzleti szabályok és döntések', question: 'Milyen feltételek döntenek?', hint: 'Feltétel, eredmény, kivétel, forrás, felelős.' },
  { id: 'adatok', number: 8, label: 'Adatok és életciklusuk', question: 'Milyen üzleti objektumok vannak?', hint: 'Jelentés, adatok, kapcsolatok, megőrzés.' },
  { id: 'jogosultsagok', number: 9, label: 'Jogosultságok és ellenőrizhetőség', question: 'Ki mit tehet, mi legyen naplózva?', hint: 'Jogosultsági mátrix, helyettesítés, naplózás.' },
  { id: 'integracio', number: 10, label: 'Külső kapcsolatok és migráció', question: 'Milyen rendszerekkel kapcsolódik?', hint: 'Adatátadás, hibakezelés, adatáthozatal.' },
  { id: 'minoseg', number: 11, label: 'Minőségi követelmények és bevezetés', question: 'Milyen feltételekkel fogadható el?', hint: 'Terhelés, rendelkezésre állás, bevezetés, átvétel.' },
  { id: 'felulvizsgalat', number: 12, label: 'Szakmai felülvizsgálat', question: 'Mi hiányzik még, mi ellentmondásos?', hint: 'Ellenőrzések, nyitott pontok, jóváhagyás.' },
];

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<TopicId, TopicDef>;

export function topicHref(id: TopicId): string {
  return `/sysorg/${id}`;
}

export const L = {
  kind: { new_system: 'Új rendszer tervezése', modification: 'Meglévő rendszer módosítása', process_improvement: 'Üzleti folyamat javítása' },
  scopeStatus: { in: 'Benne van', out: 'Nincs benne', later: 'Később' },
  constraintKind: { organisational: 'Szervezeti', legal: 'Jogi', technical: 'Technikai', deadline: 'Határidő', budget: 'Költségvetés', other: 'Egyéb' },
  stakeholderKind: { internal: 'Belső szereplő', external: 'Külső szereplő', system: 'Rendszer' },
  priority: { must: 'Kötelező (Must)', should: 'Fontos (Should)', could: 'Kívánatos (Could)', wont: 'Most nem (Won’t)' },
  sensitivity: { none: 'Nem személyes', personal: 'Személyes adat', special: 'Különleges adat' },
  operation: { create: 'Létrehozás', read: 'Olvasás', update: 'Módosítás', delete: 'Törlés', approve: 'Jóváhagyás' },
  permissionScope: { own: 'Csak saját', group: 'Csoport szintű', all: 'Minden adat', state: 'Állapottól függő' },
  direction: { in: 'Bejövő', out: 'Kimenő', both: 'Kétirányú' },
  integrationStatus: { known: 'Ismert', tbd: 'Egyeztetendő' },
  nfrCategory: {
    performance: 'Teljesítmény', availability: 'Rendelkezésre állás', capacity: 'Kapacitás / terhelés', security: 'Biztonság',
    accessibility: 'Akadálymentesség', language: 'Nyelv', device: 'Eszköztámogatás', reporting: 'Riport', other: 'Egyéb',
  },
  questionStatus: { open: 'Nyitott', answered: 'Megválaszolt' },
  assumptionStatus: { unconfirmed: 'Nincs megerősítve', confirmed: 'Megerősítve', rejected: 'Elvetve' },
  migrationNeeded: { yes: 'Igen', no: 'Nem', unknown: 'Nem ismert' },
  stepKind: { task: 'Tevékenység', decision: 'Döntés' },
} as const;

export const TENTATIVE_NOTE = 'TERVEZET – az eredmény jóváhagyásig nem tekinthető elfogadott követelményrendszernek.';
