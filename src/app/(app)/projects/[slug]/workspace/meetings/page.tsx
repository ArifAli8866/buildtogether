import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext, getAssignableProjectMembers } from '@/lib/queries/workspace';
import { getProjectMeetings } from '@/lib/queries/collaboration';
import { MeetingsView } from '@/components/domain/workspace/meetings/meetings-view';

interface MeetingsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: MeetingsPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Meetings | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Meetings | Build Together' };

  return {
    title: `${context.project.title} — Meetings | Build Together`,
    description: `Synchronous meetings and notes for ${context.project.title}`,
  };
}

export default async function WorkspaceMeetingsPage(props: MeetingsPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/meetings`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const [meetings, members] = await Promise.all([
    getProjectMeetings(context.project.id),
    getAssignableProjectMembers(context.project.id),
  ]);

  return (
    <MeetingsView
      project={context.project}
      meetings={meetings}
      role={context.role}
      currentUserId={user.id}
      members={members}
    />
  );
}
