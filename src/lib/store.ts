import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ProjectData, WizardStep, CalibrationAnswers, ContextAnswers,
  Role, Entity, Workflow, Permission, ViewListing,
} from './types';
import { CORE_STEPS } from './constants';

const INITIAL_PROJECT: ProjectData = {
  meta: { label: '', language: 'hu', complexity: 'standard' },
  calibration: null,
  contextAnswers: null,
  context: '',
  entities: [],
  roles: [],
  workflows: [],
  permissions: [],
  viewListings: [],
  mediaTypes: [],
  notifications: [],
  auth: null,
  compliance: null,
  integrations: [],
  externalSelections: [],
};

interface WizardStore {
  project: ProjectData;
  completedSteps: WizardStep[];
  visibleSteps: WizardStep[];

  // Navigation
  markStepComplete: (step: WizardStep) => void;
  setVisibleSteps: (steps: WizardStep[]) => void;
  resetProject: () => void;

  // Data updaters
  setProjectLabel: (label: string) => void;
  setCalibration: (answers: CalibrationAnswers) => void;
  setContextAnswers: (answers: ContextAnswers) => void;
  setContext: (text: string) => void;
  setRoles: (roles: Role[]) => void;
  addRole: (role: Role) => void;
  removeRole: (id: string) => void;
  setEntities: (entities: Entity[]) => void;
  addEntity: (entity: Entity) => void;
  removeEntity: (id: string) => void;
  setWorkflows: (workflows: Workflow[]) => void;
  setPermissions: (permissions: Permission[]) => void;
  setViewListings: (listings: ViewListing[]) => void;
  setExternalSelections: (selections: string[]) => void;
}

export const useProjectStore = create<WizardStore>()(persist((set) => ({
  project: INITIAL_PROJECT,
  completedSteps: [],
  visibleSteps: CORE_STEPS,

  markStepComplete: (step) =>
    set((s) => ({
      completedSteps: s.completedSteps.includes(step)
        ? s.completedSteps
        : [...s.completedSteps, step],
    })),

  setVisibleSteps: (steps) => set({ visibleSteps: steps }),

  resetProject: () => set({
    project: INITIAL_PROJECT,
    completedSteps: [],
    visibleSteps: CORE_STEPS,
  }),

  setProjectLabel: (label) =>
    set((s) => ({ project: { ...s.project, meta: { ...s.project.meta, label } } })),

  setCalibration: (calibration) =>
    set((s) => ({ project: { ...s.project, calibration } })),

  setContextAnswers: (contextAnswers) =>
    set((s) => ({ project: { ...s.project, contextAnswers } })),

  setContext: (context) =>
    set((s) => ({ project: { ...s.project, context } })),

  setRoles: (roles) =>
    set((s) => ({ project: { ...s.project, roles } })),

  addRole: (role) =>
    set((s) => ({ project: { ...s.project, roles: [...s.project.roles, role] } })),

  removeRole: (id) =>
    set((s) => ({ project: { ...s.project, roles: s.project.roles.filter((r) => r.id !== id) } })),

  setEntities: (entities) =>
    set((s) => ({ project: { ...s.project, entities } })),

  addEntity: (entity) =>
    set((s) => ({ project: { ...s.project, entities: [...s.project.entities, entity] } })),

  removeEntity: (id) =>
    set((s) => ({ project: { ...s.project, entities: s.project.entities.filter((e) => e.id !== id) } })),

  setWorkflows: (workflows) =>
    set((s) => ({ project: { ...s.project, workflows } })),

  setPermissions: (permissions) =>
    set((s) => ({ project: { ...s.project, permissions } })),

  setViewListings: (viewListings) =>
    set((s) => ({ project: { ...s.project, viewListings } })),

  setExternalSelections: (externalSelections) =>
    set((s) => ({ project: { ...s.project, externalSelections } })),
}),
  {
    name: 'alexandra-wizard-store',
    storage: createJSONStorage(() => {
      // SSR guard — localStorage is not available on the server
      if (typeof window === 'undefined') return sessionStorage;
      return localStorage;
    }),
    partialize: (state) => ({
      project:        state.project,
      completedSteps: state.completedSteps,
      visibleSteps:   state.visibleSteps,
    }),
  }
));
