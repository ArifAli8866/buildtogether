import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext, getWorkspaceOverviewData } from '@/lib/queries/workspace';
import { WorkspaceOverviewView } from '@/components/domain/workspace/overview/workspace-overview-view';

interface WorkspacePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: WorkspacePageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Workspace | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Workspace | Build Together' };

  return {
    title: `${context.project.title} — Overview | Build Together`,
    description: `Workspace overview and metrics for ${context.project.title}`,
  };
}

export default async function WorkspaceOverviewPage(props: WorkspacePageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const data = await getWorkspaceOverviewData(context.project.id);

  return (
    <WorkspaceOverviewView
      project={context.project}
      role={context.role}
      data={data}
    />
  );
}
