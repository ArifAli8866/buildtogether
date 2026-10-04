import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext } from '@/lib/queries/workspace';
import { getProjectCanvasItems } from '@/lib/queries/collaboration';
import { ProjectCanvasView } from '@/components/domain/workspace/canvas/project-canvas-view';

interface CanvasPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: CanvasPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Canvas | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Canvas | Build Together' };

  return {
    title: `${context.project.title} — Canvas | Build Together`,
    description: `Visual ideation board and sticky notes for ${context.project.title}`,
  };
}

export default async function WorkspaceCanvasPage(props: CanvasPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/canvas`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const canvasItems = await getProjectCanvasItems(context.project.id);

  return (
    <ProjectCanvasView
      project={context.project}
      initialItems={canvasItems}
      role={context.role}
      currentUserId={user.id}
      currentUserProfile={context.userProfile}
    />
  );
}
