import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext } from '@/lib/queries/workspace';
import { getProjectDiscussions } from '@/lib/queries/collaboration';
import { DiscussionsView } from '@/components/domain/workspace/discussions/discussions-view';

interface DiscussionsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: DiscussionsPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Discussions | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Discussions | Build Together' };

  return {
    title: `${context.project.title} — Discussions | Build Together`,
    description: `Collaborative discussion threads for ${context.project.title}`,
  };
}

export default async function WorkspaceDiscussionsPage(props: DiscussionsPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/discussions`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const discussions = await getProjectDiscussions(context.project.id);

  return (
    <DiscussionsView
      project={context.project}
      discussions={discussions}
      role={context.role}
      currentUserId={user.id}
    />
  );
}
