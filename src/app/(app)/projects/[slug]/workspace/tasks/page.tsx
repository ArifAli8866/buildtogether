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
import { TasksTableView } from '@/components/domain/workspace/tasks/tasks-table-view';

interface TasksPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: TasksPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Tasks | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Tasks | Build Together' };

  return {
    title: `${context.project.title} — Tasks | Build Together`,
    description: `Task management, priority tracking and member assignments for ${context.project.title}`,
  };
}

export default async function WorkspaceTasksPage(props: TasksPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/tasks`);
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
    <TasksTableView
      tasks={tasks}
      projectId={context.project.id}
      projectSlug={context.project.slug}
      userRole={context.role}
      currentUserId={user.id}
      assignableMembers={assignableMembers}
      milestones={milestones.map((m) => ({ id: m.id, title: m.title }))}
      goals={goals.map((g) => ({ id: g.id, title: g.title }))}
    />
  );
}
