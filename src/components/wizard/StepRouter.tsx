'use client';
import { useParams } from 'next/navigation';
import type { WizardStep } from '@/lib/types';
import { CalibrationStep }  from '@/components/steps/CalibrationStep';
import { ContextStep }      from '@/components/steps/ContextStep';
import { RolesStep }        from '@/components/steps/RolesStep';
import { EntitiesStep }     from '@/components/steps/EntitiesStep';
import { ListingsStep }     from '@/components/steps/ListingsStep';
import { WorkflowStep }     from '@/components/steps/WorkflowStep';
import { PermissionsStep }  from '@/components/steps/PermissionsStep';
import { ExternalStep }     from '@/components/steps/ExternalStep';
import { LanguagesStep }    from '@/components/steps/LanguagesStep';
import { SSOStep }          from '@/components/steps/SSOStep';
import { ComplianceStep }   from '@/components/steps/ComplianceStep';
import { MigrationStep }    from '@/components/steps/MigrationStep';
import { SearchStep }       from '@/components/steps/SearchStep';
import { NotificationsStep }from '@/components/steps/NotificationsStep';
import { IntegrationsStep } from '@/components/steps/IntegrationsStep';
import { LayoutsStep }      from '@/components/steps/LayoutsStep';
import { PlaceholderStep }  from '@/components/steps/PlaceholderStep';

const STEP_COMPONENTS: Partial<Record<WizardStep, React.ComponentType>> = {
  calibration:   CalibrationStep,
  context:       ContextStep,
  roles:         RolesStep,
  entities:      EntitiesStep,
  listings:      ListingsStep,
  workflow:      WorkflowStep,
  permissions:   PermissionsStep,
  external:      ExternalStep,
  languages:     LanguagesStep,
  sso:           SSOStep,
  compliance:    ComplianceStep,
  migration:     MigrationStep,
  search:        SearchStep,
  notifications: NotificationsStep,
  integrations:  IntegrationsStep,
  layouts:       LayoutsStep,
};

export function StepRouter() {
  const params = useParams();
  const step = params.step as WizardStep;

  const StepComponent = STEP_COMPONENTS[step] ?? PlaceholderStep;

  return <StepComponent />;
}
