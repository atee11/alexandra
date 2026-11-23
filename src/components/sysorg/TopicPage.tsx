'use client';
import type { ComponentType } from 'react';
import type { TopicId } from '@/lib/sysorg/schema';
import { AdatokTopic, FunkciokTopic, SzabalyokTopic } from './RequirementTopics';
import { FelulvizsgalatTopic } from './ReviewTopic';
import { IntegracioTopic, JogosultsagokTopic, MinosegTopic } from './SystemTopics';
import { ProcessTopic } from './ProcessTopic';
import { ErintettekTopic, HatokorTopic, KeretTopic, UzletiCelTopic } from './TopicsFrame';
import { PageHeader, TopicProvider } from './ui';

const AsIs = () => <ProcessTopic variant="asIs" />;
const ToBe = () => <ProcessTopic variant="toBe" />;

const TOPIC_COMPONENTS: Record<TopicId, ComponentType> = {
  keret: KeretTopic,
  'uzleti-cel': UzletiCelTopic,
  hatokor: HatokorTopic,
  erintettek: ErintettekTopic,
  'as-is': AsIs,
  'to-be': ToBe,
  funkciok: FunkciokTopic,
  szabalyok: SzabalyokTopic,
  adatok: AdatokTopic,
  jogosultsagok: JogosultsagokTopic,
  integracio: IntegracioTopic,
  minoseg: MinosegTopic,
  felulvizsgalat: FelulvizsgalatTopic,
};

export function TopicPage({ topic }: { topic: TopicId }) {
  const Content = TOPIC_COMPONENTS[topic];
  return (
    <TopicProvider value={topic}>
      <PageHeader topic={topic} />
      <Content />
    </TopicProvider>
  );
}
