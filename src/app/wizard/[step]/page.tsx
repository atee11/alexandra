import { notFound } from 'next/navigation';
import { StepRouter } from '@/components/wizard/StepRouter';
import { STEP_LABELS } from '@/lib/constants';

// Statikus kiadáshoz minden lépés előre legenerálva; más cím valódi 404-et kap.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(STEP_LABELS).map((step) => ({ step }));
}

export default async function StepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!(step in STEP_LABELS)) notFound();
  return <StepRouter />;
}
