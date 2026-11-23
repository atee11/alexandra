import { z } from 'zod';

export const SYSORG_FORMAT = 'alexandra.sysorg' as const;
export const SYSORG_VERSION = 1;

/** Döntési ág célja: a folyamat vége. Üres cél = a sorrendben következő lépés. */
export const END_TARGET = '__end';

export const TOPIC_IDS = [
  'keret', 'uzleti-cel', 'hatokor', 'erintettek', 'as-is', 'to-be', 'funkciok',
  'szabalyok', 'adatok', 'jogosultsagok', 'integracio', 'minoseg', 'felulvizsgalat',
] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

const str = (max = 5000) => z.string().max(max).default('');
const refId = z.string().max(64);
const itemId = z.string().min(1).max(64);
const refs = z.array(refId).max(300).default([]);
const list = <T extends z.ZodTypeAny>(schema: T, max = 300) => z.array(schema).max(max).default([]);

export const measureSchema = z.object({
  id: itemId, code: str(24), label: str(300), baseline: str(300), target: str(300), owner: str(200), method: str(400),
});

export const scopeItemSchema = z.object({
  id: itemId, code: str(24), text: str(600),
  status: z.enum(['in', 'out', 'later']).default('in'), rationale: str(600),
});

export const constraintSchema = z.object({
  id: itemId, code: str(24),
  kind: z.enum(['organisational', 'legal', 'technical', 'deadline', 'budget', 'other']).default('other'),
  text: str(800),
});

export const stakeholderSchema = z.object({
  id: itemId, code: str(24), name: str(200),
  kind: z.enum(['internal', 'external', 'system']).default('internal'),
  goal: str(800), tasks: str(1500), decisions: str(1000), owns: str(800),
  isApprover: z.boolean().default(false), deputy: str(200), conflicts: str(1000),
});

const branchSchema = z.object({ id: itemId, label: str(200), targetId: str(64) });

export const stepSchema = z.object({
  id: itemId,
  kind: z.enum(['task', 'decision']).default('task'),
  actorId: str(64), text: str(600), system: str(200),
  endsProcess: z.boolean().default(false),
  branches: list(branchSchema, 12),
});

const stateSchema = z.object({ id: itemId, name: str(120), isFinal: z.boolean().default(false) });
const transitionSchema = z.object({
  id: itemId, fromId: str(64), toId: str(64), condition: str(400), actorId: str(64),
});

export const processSchema = z.object({
  id: itemId, code: str(24), name: str(200), trigger: str(600), input: str(800), output: str(800),
  frequency: str(300), volume: str(300), painPoints: str(1500), exceptions: str(1500),
  caseTypes: str(1000), parallelWork: str(800),
  steps: list(stepSchema, 200),
  relatedAsIsId: str(64),
  keep: str(1000), change: str(1000), remove: str(1000),
  automation: str(1000), humanChecks: str(1000),
  rejectionHandling: str(1000), timeoutHandling: str(1000), notifications: str(1000),
  states: list(stateSchema, 40), transitions: list(transitionSchema, 120),
});

const acceptanceSchema = z.object({ id: itemId, code: str(24), text: str(800) });

export const functionSchema = z.object({
  id: itemId, code: str(24), name: str(300), actorId: str(64), goal: str(800),
  measureIds: refs, processIds: refs, ruleIds: refs, dataIds: refs,
  precondition: str(800), trigger: str(800), mainFlow: str(2000), alternatives: str(2000), successEnd: str(800),
  priority: z.enum(['must', 'should', 'could', 'wont']).default('should'),
  rationale: str(800),
  acceptance: list(acceptanceSchema, 50),
});

export const ruleSchema = z.object({
  id: itemId, code: str(24), name: str(300), condition: str(1500), outcome: str(1500),
  conflicts: str(1000), exceptions: str(1000), exceptionApprover: str(200),
  source: str(500), owner: str(200), validFrom: str(20), validTo: str(20),
});

const attributeSchema = z.object({
  id: itemId, name: str(200), required: z.boolean().default(false), unique: z.boolean().default(false),
  validation: str(500), personal: z.boolean().default(false),
});
const relationSchema = z.object({ id: itemId, targetId: str(64), label: str(300) });

export const dataObjectSchema = z.object({
  id: itemId, code: str(24), name: str(200), definition: str(1000),
  attributes: list(attributeSchema, 100), relations: list(relationSchema, 50),
  source: str(500), creators: str(500), retention: str(500), lifecycle: str(1000),
  sensitivity: z.enum(['none', 'personal', 'special']).default('none'),
});

export const OPERATIONS = ['create', 'read', 'update', 'delete', 'approve'] as const;
export const permissionSchema = z.object({
  id: itemId, actorId: str(64), dataId: str(64),
  operations: z.array(z.enum(OPERATIONS)).max(5).default([]),
  scope: z.enum(['own', 'group', 'all', 'state']).default('own'),
  note: str(500),
});

export const integrationSchema = z.object({
  id: itemId, code: str(24), system: str(200),
  direction: z.enum(['in', 'out', 'both']).default('both'),
  dataIds: refs, trigger: str(500), frequency: str(300), owner: str(200),
  errorHandling: str(1000), reconciliation: str(1000),
  status: z.enum(['known', 'tbd']).default('tbd'),
});

export const nfrSchema = z.object({
  id: itemId, code: str(24),
  category: z.enum(['performance', 'availability', 'capacity', 'security', 'accessibility', 'language', 'device', 'reporting', 'other']).default('performance'),
  text: str(1000), measure: str(500),
});

export const questionSchema = z.object({
  id: itemId, code: str(24), topic: z.enum(TOPIC_IDS).default('keret'), text: str(1000),
  owner: str(200), due: str(20), answer: str(1500),
  status: z.enum(['open', 'answered']).default('open'), blocking: z.boolean().default(false),
});

export const assumptionSchema = z.object({
  id: itemId, code: str(24), text: str(1000), owner: str(200),
  status: z.enum(['unconfirmed', 'confirmed', 'rejected']).default('unconfirmed'),
});

export const decisionSchema = z.object({
  id: itemId, code: str(24), text: str(1000), decidedBy: str(200), date: str(20), rationale: str(1000),
});

const unknownSchema = z.object({
  state: z.enum(['unknown', 'na']), reason: str(500), label: str(400), topic: z.enum(TOPIC_IDS).default('keret'),
});

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const safeKey = z.string().min(1).max(160).refine((key) => !FORBIDDEN_KEYS.has(key), 'Érvénytelen kulcs');

const metaSchema = z.object({
  title: str(200),
  kind: z.enum(['new_system', 'modification', 'process_improvement']).default('new_system'),
  area: str(300), sponsor: str(200), decisionMaker: str(200), subjectExpert: str(200),
  existingSystems: str(1500), sources: str(1500),
});

const problemSchema = z.object({
  current: str(2000), affected: str(1500), example: str(2000), consequence: str(1500), desiredOutcome: str(1500),
});

const scopeExtraSchema = z.object({ dependencies: str(1500) });

const permissionsExtraSchema = z.object({
  stateDependent: str(1500), selfApprovalForbidden: z.boolean().default(true),
  delegation: str(1500), auditEvents: str(1500), auditAccess: str(500),
});

const migrationSchema = z.object({
  needed: z.enum(['yes', 'no', 'unknown']).default('unknown'),
  source: str(800), scope: str(1000), verification: str(1000),
});

const qualityExtraSchema = z.object({
  users: str(300), load: str(500), availability: str(500), acceptableDowntime: str(300), acceptableDataLoss: str(300),
  training: str(800), pilot: str(800), phasing: str(800), operator: str(300), support: str(300),
  acceptanceBy: str(300), acceptanceEvidence: str(800),
});

const approvalSchema = z.object({ by: str(200), date: str(20) });

export const projectSchema = z.object({
  id: itemId,
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  meta: metaSchema.default({}),
  problem: problemSchema.default({}),
  scope: scopeExtraSchema.default({}),
  permissionsExtra: permissionsExtraSchema.default({}),
  migration: migrationSchema.default({}),
  quality: qualityExtraSchema.default({}),
  summary: str(8000),
  measures: list(measureSchema),
  scopeItems: list(scopeItemSchema),
  constraints: list(constraintSchema),
  stakeholders: list(stakeholderSchema),
  asIs: list(processSchema, 100),
  toBe: list(processSchema, 100),
  functions: list(functionSchema, 500),
  rules: list(ruleSchema, 500),
  dataObjects: list(dataObjectSchema, 300),
  permissions: list(permissionSchema, 2000),
  integrations: list(integrationSchema, 200),
  nfrs: list(nfrSchema, 300),
  questions: list(questionSchema, 500),
  assumptions: list(assumptionSchema, 500),
  decisions: list(decisionSchema, 500),
  unknowns: z.record(safeKey, unknownSchema).default({}),
  topicDone: z.record(z.enum(TOPIC_IDS), z.boolean()).default({}),
  approvals: z.record(z.enum(TOPIC_IDS), approvalSchema).default({}),
  counters: z.record(safeKey, z.number().int().min(0).max(1_000_000)).default({}),
}).superRefine((project, ctx) => {
  const seen = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === 'object') {
      const id = (value as { id?: unknown }).id;
      if (typeof id === 'string') {
        if (seen.has(id)) ctx.addIssue({ code: 'custom', message: `Ismétlődő azonosító: ${id}` });
        seen.add(id);
      }
      Object.values(value).forEach(walk);
    }
  };
  const { unknowns: _unknowns, ...rest } = project;
  void _unknowns;
  walk(rest);
});

export type SysorgProject = z.infer<typeof projectSchema>;
export type Measure = z.infer<typeof measureSchema>;
export type ScopeItem = z.infer<typeof scopeItemSchema>;
export type Stakeholder = z.infer<typeof stakeholderSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Process = z.infer<typeof processSchema>;
export type SysFunction = z.infer<typeof functionSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type DataObject = z.infer<typeof dataObjectSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type Integration = z.infer<typeof integrationSchema>;
export type Operation = (typeof OPERATIONS)[number];
export type UnknownMark = z.infer<typeof unknownSchema>;

export const LIST_SCHEMAS = {
  measures: measureSchema,
  scopeItems: scopeItemSchema,
  constraints: constraintSchema,
  stakeholders: stakeholderSchema,
  asIs: processSchema,
  toBe: processSchema,
  functions: functionSchema,
  rules: ruleSchema,
  dataObjects: dataObjectSchema,
  permissions: permissionSchema,
  integrations: integrationSchema,
  nfrs: nfrSchema,
  questions: questionSchema,
  assumptions: assumptionSchema,
  decisions: decisionSchema,
} as const;

export type ListKey = keyof typeof LIST_SCHEMAS;
export type ListItem<K extends ListKey> = SysorgProject[K][number];
export type SectionKey = 'meta' | 'problem' | 'scope' | 'permissionsExtra' | 'migration' | 'quality';

export const CODE_PREFIX: Partial<Record<ListKey, string>> = {
  measures: 'KPI', scopeItems: 'SCP', constraints: 'CON', stakeholders: 'STK', asIs: 'ASIS', toBe: 'TOBE',
  functions: 'FUN', rules: 'BR', dataObjects: 'DAT', integrations: 'INT', nfrs: 'NFR',
  questions: 'Q', assumptions: 'ASM', decisions: 'DEC',
};

export const SECTION_KEYS: SectionKey[] = ['meta', 'problem', 'scope', 'permissionsExtra', 'migration', 'quality'];

export function newId(): string {
  return crypto.randomUUID();
}

export function createProject(): SysorgProject {
  const now = new Date().toISOString();
  return projectSchema.parse({ id: newId(), createdAt: now, updatedAt: now });
}

export const envelopeSchema = z.object({
  format: z.literal(SYSORG_FORMAT),
  version: z.number().int().min(1),
  exportedAt: z.string().max(40).optional(),
  project: z.unknown(),
});
