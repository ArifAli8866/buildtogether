import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import {
  getWorkspaceContext,
  getTaskById,
  getAssignableProjectMembers,
  getProjectMilestones,
  getProjectGoals,
} from '@/lib/queries/workspace';
import { TaskPageView } from '@/components/domain/workspace/tasks/task-page-view';

interface TaskDetailPageProps {
  params: Promise<{
    slug: string;
    taskId: string;
  }>;
}

export async function generateMetadata(props: TaskDetailPageProps): Promise<Metadata> {
  const { slug, taskId } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Task | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Task | Build Together' };

  const task = await getTaskById(taskId, context.project.id);
  if (!task) return { title: 'Task Not Found | Build Together' };

  return {
    title: `${task.title} — ${context.project.title} | Build Together`,
    description: task.description || `Task details for ${task.title}`,
  };
}

export default async function TaskDetailPage(props: TaskDetailPageProps) {
  const { slug, taskId } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/tasks/${taskId}`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const [task, assignableMembers, milestones, goals] = await Promise.all([
    getTaskById(taskId, context.project.id),
    getAssignableProjectMembers(context.project.id),
    getProjectMilestones(context.project.id),
    getProjectGoals(context.project.id),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <TaskPageView
      task={task}
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
