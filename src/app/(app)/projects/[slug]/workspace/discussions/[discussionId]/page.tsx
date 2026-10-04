import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext } from '@/lib/queries/workspace';
import { getDiscussionById, getDiscussionComments } from '@/lib/queries/collaboration';
import { DiscussionDetailView } from '@/components/domain/workspace/discussions/discussion-detail-view';

interface DiscussionDetailPageProps {
  params: Promise<{
    slug: string;
    discussionId: string;
  }>;
}

export async function generateMetadata(props: DiscussionDetailPageProps): Promise<Metadata> {
  const { slug, discussionId } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Discussion | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Discussion | Build Together' };

  const discussion = await getDiscussionById(discussionId, context.project.id);
  if (!discussion) return { title: 'Discussion | Build Together' };

  return {
    title: `${discussion.title} — ${context.project.title} | Build Together`,
    description: discussion.content.slice(0, 160),
  };
}

export default async function DiscussionDetailPage(props: DiscussionDetailPageProps) {
  const { slug, discussionId } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/discussions/${discussionId}`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const discussion = await getDiscussionById(discussionId, context.project.id);

  if (!discussion) {
    notFound();
  }

  const comments = await getDiscussionComments(discussion.id);

  return (
    <DiscussionDetailView
      project={context.project}
      discussion={discussion}
      initialComments={comments}
      role={context.role}
      currentUserId={user.id}
      currentUserProfile={context.userProfile}
    />
  );
}
