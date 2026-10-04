import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import {
  getWorkspaceContext,
  getProjectTasks,
  getAssignableProjectMembers,
  getProjectMilestones,
  getProjectGoals,
} from '@/lib/queries/workspace';
import { KanbanBoard } from '@/components/domain/workspace/board/kanban-board';

interface BoardPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: BoardPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Board | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Board | Build Together' };

  return {
    title: `${context.project.title} — Kanban Board | Build Together`,
    description: `Drag and drop Kanban board with columns for backlog, todo, in progress, review, and done for ${context.project.title}`,
  };
}

export default async function WorkspaceBoardPage(props: BoardPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/board`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const [tasks, assignableMembers, milestones, goals] = await Promise.all([
    getProjectTasks(context.project.id),
    getAssignableProjectMembers(context.project.id),
    getProjectMilestones(context.project.id),
    getProjectGoals(context.project.id),
  ]);

  return (
    <div className="space-y-6">
      <KanbanBoard
        tasks={tasks}
        projectId={context.project.id}
        userRole={context.role}
        currentUserId={user.id}
        assignableMembers={assignableMembers}
        milestones={milestones.map((m) => ({ id: m.id, title: m.title }))}
        goals={goals.map((g) => ({ id: g.id, title: g.title }))}
      />
    </div>
  );
}
