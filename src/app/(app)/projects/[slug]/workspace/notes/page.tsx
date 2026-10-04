import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext } from '@/lib/queries/workspace';
import { getProjectNotes } from '@/lib/queries/collaboration';
import { NotesView } from '@/components/domain/workspace/notes/notes-view';

interface NotesPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: NotesPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Notes | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Notes | Build Together' };

  return {
    title: `${context.project.title} — Notes & Specs | Build Together`,
    description: `Technical documentation, architecture decision records and project notes for ${context.project.title}`,
  };
}

export default async function WorkspaceNotesPage(props: NotesPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/notes`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const notes = await getProjectNotes(context.project.id);

  return (
    <NotesView
      project={context.project}
      notes={notes}
      role={context.role}
      currentUserId={user.id}
    />
  );
}
