'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  TaskStatus,
  TaskPriority,
  Goal,
  Milestone,
  ProjectMemberRole,
} from '@/types/database';
import type { DetailedTask, AssignableMember } from '@/lib/queries/workspace';
import { updateTaskAction, deleteTaskAction } from '@/lib/actions/workspace';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  User,
  Target,
  Milestone as MilestoneIcon,
  Save,
} from 'lucide-react';

interface TaskPageViewProps {
  task: DetailedTask;
  projectId: string;
  projectSlug: string;
  userRole: ProjectMemberRole;
  currentUserId?: string;
  assignableMembers: AssignableMember[];
  milestones: Array<Pick<Milestone, 'id' | 'title'>>;
  goals: Array<Pick<Goal, 'id' | 'title'>>;
}

export function TaskPageView({
  task,
  projectId,
  projectSlug,
  userRole,
  currentUserId,
  assignableMembers,
  milestones,
  goals,
}: TaskPageViewProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description);
  const [status, setStatus] = React.useState<TaskStatus>(task.status);
  const [priority, setPriority] = React.useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = React.useState<string>(task.assignee_id || '');
  const [milestoneId, setMilestoneId] = React.useState<string>(task.milestone_id || '');
  const [goalId, setGoalId] = React.useState<string>(task.goal_id || '');
  const [estimateHours, setEstimateHours] = React.useState<string>(
    task.estimate_hours ? String(task.estimate_hours) : ''
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const canDelete =
    userRole === 'owner' ||
    userRole === 'maintainer' ||
    (currentUserId && task.creator_id === currentUserId);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await updateTaskAction({
        taskId: task.id,
        projectId,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigneeId: assigneeId || null,
        milestoneId: milestoneId || null,
        goalId: goalId || null,
        estimateHours: estimateHours ? Number(estimateHours) : null,
      });

      if (!res.success) {
        setError(res.error?.message || 'Failed to update task');
      } else {
        setSuccess('Task updated successfully');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await deleteTaskAction(task.id, projectId);

      if (!res.success) {
        setError(res.error?.message || 'Failed to delete task');
        setIsDeleting(false);
      } else {
        router.push(`/projects/${projectSlug}/workspace/tasks`);
      }
    } catch {
      setError('An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-4">
        <Link href={`/projects/${projectSlug}/workspace/tasks`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectSlug}/workspace/board`}>
            <Button variant="outline" size="sm">
              Open in Board
            </Button>
          </Link>

          {canDelete && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-status-danger bg-status-danger-subtle rounded-xl border border-status-danger/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-status-success bg-status-success-subtle rounded-xl border border-status-success/20">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Task Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-4 border-border-subtle bg-app-surface-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                Task Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="text-lg font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                Description & Deliverables
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context, acceptance criteria, or technical notes..."
                rows={8}
                className="font-mono text-sm leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Col: Attributes & Metadata */}
        <div className="space-y-6">
          <Card className="p-5 space-y-5 border-border-subtle bg-app-surface-1">
            <h3 className="text-sm font-semibold text-content-primary">
              Task Attributes
            </h3>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-secondary">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-xl border border-border-subtle bg-app-surface-2 px-3 py-2 text-sm text-content-primary focus:border-border-focus focus:outline-none"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-secondary">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-border-subtle bg-app-surface-2 px-3 py-2 text-sm text-content-primary focus:border-border-focus focus:outline-none"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-secondary flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-app-surface-2 px-3 py-2 text-sm text-content-primary focus:border-border-focus focus:outline-none"
              >
                <option value="">Unassigned</option>
                {assignableMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName} (@{m.username}) — {m.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Milestone Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-secondary flex items-center gap-1.5">
                <MilestoneIcon className="h-3.5 w-3.5" />
                Linked Milestone
              </label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-app-surface-2 px-3 py-2 text-sm text-content-primary focus:border-border-focus focus:outline-none"
              >
                <option value="">No milestone linked</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Goal Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-secondary flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Linked Strategic Goal
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-app-surface-2 px-3 py-2 text-sm text-content-primary focus:border-border-focus focus:outline-none"
              >
                <option value="">No strategic goal linked</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Estimate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-secondary flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Estimate (Hours)
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
                placeholder="e.g. 4"
                className="text-sm"
              />
            </div>
          </Card>

          {/* Meta card */}
          <Card className="p-4 space-y-3 text-xs text-content-secondary border-border-subtle bg-app-surface-1">
            <div className="flex items-center justify-between">
              <span>Created by</span>
              <div className="flex items-center gap-1.5 text-content-primary font-medium">
                <Avatar
                  src={task.creator.avatar_url || undefined}
                  fallbackText={task.creator.full_name || task.creator.username}
                  className="h-4 w-4"
                />
                <span>@{task.creator.username}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Created</span>
              <span>{new Date(task.created_at).toLocaleDateString()}</span>
            </div>

            {task.due_date && (
              <div className="flex items-center justify-between">
                <span>Due Date</span>
                <span>{new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}
