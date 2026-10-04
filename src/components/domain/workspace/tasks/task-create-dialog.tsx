'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { TaskStatus, TaskPriority, Goal, Milestone } from '@/types/database';
import type { AssignableMember } from '@/lib/queries/workspace';
import { createTaskAction } from '@/lib/actions/workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  X,
  Plus,
  AlertCircle,
  User,
  Target,
  Milestone as MilestoneIcon,
  Tag,
} from 'lucide-react';

interface TaskCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  assignableMembers: AssignableMember[];
  milestones: Array<Pick<Milestone, 'id' | 'title'>>;
  goals: Array<Pick<Goal, 'id' | 'title'>>;
  initialStatus?: TaskStatus;
}

export function TaskCreateDialog({
  isOpen,
  onClose,
  projectId,
  assignableMembers,
  milestones,
  goals,
  initialStatus = 'todo',
}: TaskCreateDialogProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = React.useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = React.useState<string>('');
  const [milestoneId, setMilestoneId] = React.useState<string>('');
  const [goalId, setGoalId] = React.useState<string>('');
  const [estimateHours, setEstimateHours] = React.useState<string>('');
  const [dueDate, setDueDate] = React.useState<string>('');
  const [labels, setLabels] = React.useState<string[]>([]);
  const [labelInput, setLabelInput] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddLabel = () => {
    const trimmed = labelInput.trim();
    if (trimmed && !labels.includes(trimmed) && labels.length < 10) {
      setLabels([...labels, trimmed]);
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await createTaskAction({
      projectId,
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId || null,
      milestoneId: milestoneId || null,
      goalId: goalId || null,
      estimateHours: estimateHours ? parseFloat(estimateHours) : null,
      dueDate: dueDate || null,
      labels,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error?.message || 'Failed to create task.');
      return;
    }

    // Reset and close
    setTitle('');
    setDescription('');
    setLabels([]);
    setEstimateHours('');
    setDueDate('');
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent-primary" />
            <h2 className="text-base font-bold text-content-primary">Create Workspace Task</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-content-secondary hover:bg-app-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-status-danger/10 p-3 text-xs text-status-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Task Title"
            required
            placeholder="e.g. Implement auth session middleware for workspace routes"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            label="Description & Acceptance Criteria"
            rows={3}
            placeholder="Outline user story, technical scope, or edge cases..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-content-secondary">Status</label>
              <select
                className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                <option value="backlog">Backlog</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-content-secondary">Priority</label>
              <select
                className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-content-secondary flex items-center gap-1">
                <User className="h-3 w-3 text-accent-primary" />
                <span>Assignee (Project Members Only)</span>
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignableMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName} (@{m.username}) — {m.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-content-secondary flex items-center gap-1">
                <MilestoneIcon className="h-3 w-3 text-status-info" />
                <span>Milestone</span>
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
              >
                <option value="">None (Independent)</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-content-secondary flex items-center gap-1">
                <Target className="h-3 w-3 text-accent-primary" />
                <span>Strategic Goal</span>
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Estimate (Hours)"
              type="number"
              min={0}
              max={500}
              step={0.5}
              placeholder="e.g. 8"
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
            />

            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Labels / Tags */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-medium text-content-secondary flex items-center gap-1">
              <Tag className="h-3 w-3 text-content-muted" />
              <span>Labels</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {labels.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1 rounded bg-app-surface-2 px-2 py-0.5 text-xs text-content-primary border border-border-subtle"
                >
                  {l}
                  <button
                    type="button"
                    onClick={() => handleRemoveLabel(l)}
                    className="text-content-muted hover:text-status-danger"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add tag (e.g. frontend, bug, api)"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
                className="flex h-8 flex-1 rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddLabel}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-subtle">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
