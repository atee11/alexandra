export type WizardStep =
  | 'calibration'
  | 'context'
  | 'roles'
  | 'entities'
  | 'listings'
  | 'workflow'
  | 'permissions'
  | 'external'
  | 'search'
  | 'notifications'
  | 'sso'
  | 'languages'
  | 'layouts'
  | 'migration'
  | 'integrations'
  | 'compliance';

export type FieldType =
  | 'text' | 'textarea' | 'integer' | 'boolean' | 'date'
  | 'reference' | 'file' | 'image' | 'email' | 'telephone' | 'list';

export type Operation = 'create' | 'read' | 'update' | 'delete' | 'publish' | 'archive';
export type Scope = 'own' | 'all' | 'assigned';
export type RoleType = 'admin' | 'editor' | 'viewer' | 'contributor' | 'moderator' | 'external';
export type TextFormat = 'plain_text' | 'basic_html' | 'full_html';
export type MediaType = 'image' | 'document' | 'video' | 'audio' | 'remote_video';
export type EntityType = 'content' | 'taxonomy' | 'media' | 'user_profile' | 'paragraph';
export type Complexity = 'simple' | 'standard' | 'enterprise';

export interface EntityField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  cardinality: 'single' | 'multiple';
  referenceTarget?: string;      // entity id in our model
  referenceEntityType?: 'node' | 'taxonomy_term' | 'media' | 'user'; // Drupal entity type
}

export interface Entity {
  id: string;
  label: string;
  machineName: string;
  type: EntityType;
  description?: string;
  fields: EntityField[];
  urlPattern?: string;           // pathauto pattern, e.g. /articles/[node:title]
  position?: { x: number; y: number };
}

export interface Role {
  id: string;
  label: string;
  machineName: string;
  type: RoleType;
  scope: Scope;
  textFormat: TextFormat;
  description?: string;
}

export interface WorkflowState {
  id: string;
  label: string;
  isPublished: boolean;
}

export interface WorkflowTransition {
  id: string;
  from: string;
  to: string;
  label: string;
  allowedRoles: string[];
}

export interface Workflow {
  id: string;
  label: string;
  appliesTo: string[];
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface Permission {
  roleId: string;
  entityId: string;
  operations: Operation[];
  scope: Scope;
}

export interface ContentList {
  id: string;
  label: string;
  entityId: string;
  filters: string[];
  sortable: boolean;
  searchable: boolean;
}

export interface ViewListing {
  id: string;
  label: string;
  url: string;
  entityId: string;
  filters: string[];
  exposedFilters: boolean;
  sortBy: 'created' | 'title' | 'changed';
  sortDir: 'asc' | 'desc';
  itemsPerPage: number;
  displayType: 'page' | 'block' | 'both';
}

export interface NotificationRule {
  id: string;
  trigger: 'workflow_transition' | 'content_created' | 'content_updated';
  transitionId?: string;
  notifyRoles: string[];
  channel: 'email' | 'in_app';
}

export interface AuthConfig {
  selfRegistration: boolean;
  sso: 'none' | 'saml' | 'oauth' | 'ldap';
  provider?: string;
}

export interface ComplianceConfig {
  gdprPersonalData: string[];
  auditLog: boolean;
  revisionHistory: boolean;
  dataRetentionDays?: number;
}

export interface Integration {
  id: string;
  system: string;
  direction: 'import' | 'export' | 'bidirectional';
  trigger: string;
}

export interface CalibrationAnswers {  isHeadless: boolean;  editorCount: 'few' | 'team' | 'large';
  visibility: 'internal' | 'public' | 'both';
  hasExternalConnections: boolean;
  multilingual: boolean;
  hasMigration: boolean;
  flexibleLayouts: boolean;
  layoutEngine?: 'paragraphs' | 'layout_builder'; // only if flexibleLayouts=true
  themeApproach?: 'custom' | 'contrib' | 'none';   // only if !isHeadless
  themeMachineName?: string;                         // only if themeApproach === 'custom'
}

export interface ContextAnswers {
  projectTypes: string[];
  pains: string[];
  goals: string[];
}

export interface ProjectData {
  meta: {
    label: string;
    language: string;
    complexity: Complexity;
  };
  calibration: CalibrationAnswers | null;
  contextAnswers: ContextAnswers | null;
  context: string;
  entities: Entity[];
  roles: Role[];
  workflows: Workflow[];
  permissions: Permission[];
  viewListings: ViewListing[];
  mediaTypes: MediaType[];
  notifications: NotificationRule[];
  auth: AuthConfig | null;
  compliance: ComplianceConfig | null;
  integrations: Integration[];
  externalSelections: string[];
}
