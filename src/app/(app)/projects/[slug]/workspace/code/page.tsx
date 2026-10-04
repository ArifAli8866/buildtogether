import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext } from '@/lib/queries/workspace';
import {
  getProjectCodeSnippets,
  getProjectCodeReviews,
} from '@/lib/queries/files-and-code';
import { CodeWorkspaceView } from '@/components/domain/workspace/code/code-workspace-view';

interface CodePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: CodePageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Code Workspace | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Code Workspace | Build Together' };

  return {
    title: `${context.project.title} — Code & Reviews | Build Together`,
    description: `Lightweight code browsing, snippet drafting, and reviews for ${context.project.title}`,
  };
}

export default async function WorkspaceCodePage(props: CodePageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/code`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const [snippets, reviews] = await Promise.all([
    getProjectCodeSnippets(context.project.id),
    getProjectCodeReviews(context.project.id),
  ]);

  return (
    <CodeWorkspaceView
      project={context.project}
      snippets={snippets}
      reviews={reviews}
      role={context.role}
      currentUserId={user.id}
    />
  );
}
