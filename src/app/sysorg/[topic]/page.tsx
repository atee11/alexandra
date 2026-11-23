import { TopicPage } from '@/components/sysorg/TopicPage';
import { TOPIC_IDS, type TopicId } from '@/lib/sysorg/schema';

// Csak az ismert témák léteznek; minden más valódi 404-et kap.
export const dynamicParams = false;

export function generateStaticParams() {
  return TOPIC_IDS.map((topic) => ({ topic }));
}

export default async function SysorgTopicRoute({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  return <TopicPage topic={topic as TopicId} />;
}
