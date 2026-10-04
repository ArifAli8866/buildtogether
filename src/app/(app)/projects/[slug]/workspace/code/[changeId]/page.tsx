import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext } from '@/lib/queries/workspace';
import { getCodeReviewById } from '@/lib/queries/files-and-code';
import { getProjectGitHubRepo } from '@/lib/queries/github';
import { CodeReviewDetailView } from '@/components/domain/workspace/code/code-review-detail-view';

interface CodeChangePageProps {
  params: Promise<{
    slug: string;
    changeId: string;
  }>;
}

export async function generateMetadata(props: CodeChangePageProps): Promise<Metadata> {
  const { slug, changeId } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Code Review | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Code Review | Build Together' };

  const review = await getCodeReviewById(changeId, context.project.id);
  if (!review) return { title: 'Review Not Found | Build Together' };

  return {
    title: `${review.title} — Code Review | Build Together`,
    description: review.summary.slice(0, 160),
  };
}

export default async function WorkspaceCodeChangePage(props: CodeChangePageProps) {
  const { slug, changeId } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/code/${changeId}`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const [review, connectedRepo] = await Promise.all([
    getCodeReviewById(changeId, context.project.id),
    getProjectGitHubRepo(context.project.id),
  ]);

  if (!review) {
    notFound();
  }

  return (
    <CodeReviewDetailView
      project={context.project}
      review={review}
      role={context.role}
      currentUserId={user.id}
      connectedRepo={connectedRepo}
    />
  );
}
