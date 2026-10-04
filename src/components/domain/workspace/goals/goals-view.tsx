'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Goal, ProjectMemberRole } from '@/types/database';
import { createGoalAction, updateGoalAction, deleteGoalAction } from '@/lib/actions/workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  AlertCircle,
  X,
} from 'lucide-react';

type GoalStatus = 'in_progress' | 'achieved' | 'paused' | 'archived';

interface GoalsViewProps {
  goals: Goal[];
  projectId: string;
  userRole: ProjectMemberRole;
  currentUserId?: string;
}

export function GoalsView({
  goals,
  projectId,
  userRole,
  currentUserId,
}: GoalsViewProps) {
  const router = useRouter();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);

  // Create Form State
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [targetDate, setTargetDate] = React.useState('');
  const [status, setStatus] = React.useState<GoalStatus>('in_progress');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Edit Form State
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editTargetDate, setEditTargetDate] = React.useState('');
  const [editStatus, setEditStatus] = React.useState<GoalStatus>('in_progress');

  const openEdit = (g: Goal) => {
    setEditingGoal(g);
    setEditTitle(g.title);
    setEditDescription(g.description || '');
    setEditTargetDate(g.target_date || '');
    setEditStatus(g.status as GoalStatus);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await createGoalAction({
      projectId,
      title,
      description,
      targetDate: targetDate || null,
      status,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error?.message || 'Failed to create goal.');
      return;
    }

    setTitle('');
    setDescription('');
    setTargetDate('');
    setIsCreateOpen(false);
    router.refresh();
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    setError(null);
    setIsSubmitting(true);

    const res = await updateGoalAction({
      goalId: editingGoal.id,
      projectId,
      title: editTitle,
      description: editDescription,
      targetDate: editTargetDate || null,
      status: editStatus,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error?.message || 'Failed to update goal.');
      return;
    }

    setEditingGoal(null);
    router.refresh();
  };

  const handleDeleteGoal = async (id: string, goalTitle: string) => {
    if (!window.confirm(`Delete goal "${goalTitle}"? Linked milestones will be unlinked.`)) {
      return;
    }

    const res = await deleteGoalAction(id, projectId);
    if (!res.success) {
      alert(res.error?.message || 'Failed to delete goal.');
      return;
    }
    router.refresh();
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'achieved':
        return (
          <Badge variant="success" size="sm" className="gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Achieved
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="accent" size="sm" className="gap-1 font-medium">
            <Clock className="h-3 w-3" />
            In Progress
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="warning" size="sm">
            Paused
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="neutral" size="sm">
            Archived
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-app-surface-1 p-4 rounded-xl border border-border-subtle">
        <div>
          <h2 className="text-base font-bold text-content-primary">Project Goals</h2>
          <p className="text-xs text-content-secondary">
            Strategic objectives defining the project vision and milestones.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="gap-1.5 text-xs self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Goal</span>
        </Button>
      </div>

      {/* Goals Grid */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const canDelete =
              userRole === 'owner' ||
              userRole === 'maintainer' ||
              goal.created_by === currentUserId;

            return (
              <Card
                key={goal.id}
                className="flex flex-col justify-between border-border-subtle bg-app-surface-1 p-5 space-y-4 hover:border-border-focus transition-colors shadow-xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-accent-primary shrink-0" />
                      <h3 className="text-sm font-bold text-content-primary">{goal.title}</h3>
                    </div>
                    {getStatusBadge(goal.status)}
                  </div>

                  {goal.description && (
                    <p className="text-xs text-content-secondary leading-relaxed whitespace-pre-line">
                      {goal.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border-subtle/50 text-xs text-content-muted">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="h-3 w-3" />
                    {goal.target_date
                      ? `Target: ${new Date(goal.target_date).toLocaleDateString()}`
                      : 'No target date'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(goal)}
                      className="h-7 px-2 text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGoal(goal.id, goal.title)}
                        className="h-7 px-2 text-xs text-status-danger hover:bg-status-danger/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-subtle p-12 text-center space-y-3 bg-app-surface-1">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
            <Target className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-content-primary">No goals defined yet</h4>
            <p className="text-xs text-content-muted max-w-sm mx-auto">
              Define the major technical and product objectives that the team is executing toward.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Set Project Goal
          </Button>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-base font-bold text-content-primary">Define Strategic Goal</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-content-secondary hover:bg-app-surface-2"
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

            <form onSubmit={handleCreateGoal} className="space-y-4 text-left">
              <Input
                label="Goal Title"
                required
                placeholder="e.g. Ship alpha release with Supabase Auth & RLS"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Textarea
                label="Description"
                rows={3}
                placeholder="What does success look like for this goal?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Target Date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-content-secondary">Status</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary capitalize"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GoalStatus)}
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="achieved">Achieved</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-base font-bold text-content-primary">Edit Goal</h2>
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="rounded-lg p-1 text-content-secondary hover:bg-app-surface-2"
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

            <form onSubmit={handleUpdateGoal} className="space-y-4 text-left">
              <Input
                label="Goal Title"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />

              <Textarea
                label="Description"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Target Date"
                  type="date"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                />

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-content-secondary">Status</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary capitalize"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as GoalStatus)}
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="achieved">Achieved</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingGoal(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
