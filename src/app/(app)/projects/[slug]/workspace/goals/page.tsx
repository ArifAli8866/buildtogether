import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext, getProjectGoals } from '@/lib/queries/workspace';
import { GoalsView } from '@/components/domain/workspace/goals/goals-view';

interface GoalsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: GoalsPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Goals | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Goals | Build Together' };

  return {
    title: `${context.project.title} — Goals | Build Together`,
    description: `Strategic goals and milestone alignment for ${context.project.title}`,
  };
}

export default async function WorkspaceGoalsPage(props: GoalsPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/goals`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const goals = await getProjectGoals(context.project.id);

  return (
    <GoalsView
      goals={goals}
      projectId={context.project.id}
      userRole={context.role}
      currentUserId={user.id}
    />
  );
}
