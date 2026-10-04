import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import {
  getWorkspaceContext,
  getProjectRoadmap,
  getProjectGoals,
  getProjectMilestones,
} from '@/lib/queries/workspace';
import { RoadmapView } from '@/components/domain/workspace/roadmap/roadmap-view';

interface RoadmapPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: RoadmapPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Roadmap | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Roadmap | Build Together' };

  return {
    title: `${context.project.title} — Roadmap | Build Together`,
    description: `Chronological roadmap and sequencing for ${context.project.title}`,
  };
}

export default async function WorkspaceRoadmapPage(props: RoadmapPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/roadmap`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const [items, goals, milestones] = await Promise.all([
    getProjectRoadmap(context.project.id),
    getProjectGoals(context.project.id),
    getProjectMilestones(context.project.id),
  ]);

  return (
    <RoadmapView
      items={items}
      projectId={context.project.id}
      userRole={context.role}
      currentUserId={user.id}
      goals={goals.map((g) => ({ id: g.id, title: g.title }))}
      milestones={milestones.map((m) => ({ id: m.id, title: m.title }))}
    />
  );
}
