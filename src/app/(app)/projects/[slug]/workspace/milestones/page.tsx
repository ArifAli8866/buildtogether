import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import {
  getWorkspaceContext,
  getProjectMilestones,
  getProjectGoals,
} from '@/lib/queries/workspace';
import { MilestonesView } from '@/components/domain/workspace/milestones/milestones-view';

interface MilestonesPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: MilestonesPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Milestones | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Milestones | Build Together' };

  return {
    title: `${context.project.title} — Milestones | Build Together`,
    description: `Milestones, deliverables and task completion progress for ${context.project.title}`,
  };
}

export default async function WorkspaceMilestonesPage(props: MilestonesPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/milestones`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const [milestones, goals] = await Promise.all([
    getProjectMilestones(context.project.id),
    getProjectGoals(context.project.id),
  ]);

  return (
    <MilestonesView
      milestones={milestones}
      projectId={context.project.id}
      userRole={context.role}
      goals={goals.map((g) => ({ id: g.id, title: g.title }))}
    />
  );
}
