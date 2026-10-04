'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Goal, ProjectMemberRole } from '@/types/database';
import type { DetailedMilestone } from '@/lib/queries/workspace';
import {
  createMilestoneAction,
  updateMilestoneAction,
  deleteMilestoneAction,
} from '@/lib/actions/workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Milestone as MilestoneIcon,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  AlertCircle,
  X,
  Target,
  CheckSquare,
} from 'lucide-react';

type MilestoneStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

interface MilestonesViewProps {
  milestones: DetailedMilestone[];
  projectId: string;
  userRole: ProjectMemberRole;
  goals: Array<Pick<Goal, 'id' | 'title'>>;
}

export function MilestonesView({
  milestones,
  projectId,
  userRole,
  goals,
}: MilestonesViewProps) {
  const router = useRouter();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingMilestone, setEditingMilestone] = React.useState<DetailedMilestone | null>(null);

  // Create Form State
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [goalId, setGoalId] = React.useState('');
  const [status, setStatus] = React.useState<MilestoneStatus>('planned');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Edit Form State
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editDueDate, setEditDueDate] = React.useState('');
  const [editGoalId, setEditGoalId] = React.useState('');
  const [editStatus, setEditStatus] = React.useState<MilestoneStatus>('planned');

  const openEdit = (m: DetailedMilestone) => {
    setEditingMilestone(m);
    setEditTitle(m.title);
    setEditDescription(m.description || '');
    setEditDueDate(m.due_date || '');
    setEditGoalId(m.goal_id || '');
    setEditStatus(m.status as MilestoneStatus);
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await createMilestoneAction({
      projectId,
      title,
      description,
      dueDate: dueDate || null,
      goalId: goalId || null,
      status,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error?.message || 'Failed to create milestone.');
      return;
    }

    setTitle('');
    setDescription('');
    setDueDate('');
    setGoalId('');
    setIsCreateOpen(false);
    router.refresh();
  };

  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;
    setError(null);
    setIsSubmitting(true);

    const res = await updateMilestoneAction({
      milestoneId: editingMilestone.id,
      projectId,
      title: editTitle,
      description: editDescription,
      dueDate: editDueDate || null,
      goalId: editGoalId || null,
      status: editStatus,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error?.message || 'Failed to update milestone.');
      return;
    }

    setEditingMilestone(null);
    router.refresh();
  };

  const handleDeleteMilestone = async (id: string, mTitle: string) => {
    if (!window.confirm(`Delete milestone "${mTitle}"? Tasks linked to it will become unassigned from milestones.`)) {
      return;
    }

    const res = await deleteMilestoneAction(id, projectId);
    if (!res.success) {
      alert(res.error?.message || 'Failed to delete milestone.');
      return;
    }
    router.refresh();
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'completed':
        return (
          <Badge variant="success" size="sm" className="gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="accent" size="sm" className="gap-1 font-medium">
            <Clock className="h-3 w-3" />
            In Progress
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="neutral" size="sm">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="info" size="sm">
            Planned
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-app-surface-1 p-4 rounded-xl border border-border-subtle">
        <div>
          <h2 className="text-base font-bold text-content-primary">Milestones</h2>
          <p className="text-xs text-content-secondary">
            Key checkpoints grouping deliverables and tracking task completion progress.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="gap-1.5 text-xs self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Milestone</span>
        </Button>
      </div>

      {/* Milestones Grid */}
      {milestones.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {milestones.map((m) => {
            const canDelete = userRole === 'owner' || userRole === 'maintainer';
            const progress =
              m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0;

            return (
              <Card
                key={m.id}
                className="flex flex-col justify-between border-border-subtle bg-app-surface-1 p-5 space-y-4 hover:border-border-focus transition-colors shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MilestoneIcon className="h-4 w-4 text-status-info shrink-0" />
                      <h3 className="text-sm font-bold text-content-primary">{m.title}</h3>
                    </div>
                    {getStatusBadge(m.status)}
                  </div>

                  {m.description && (
                    <p className="text-xs text-content-secondary leading-relaxed whitespace-pre-line">
                      {m.description}
                    </p>
                  )}

                  {m.goal && (
                    <div className="inline-flex items-center gap-1 rounded bg-accent-primary/10 px-2 py-0.5 text-[11px] font-medium text-accent-primary">
                      <Target className="h-3 w-3" />
                      <span>Goal: {m.goal.title}</span>
                    </div>
                  )}

                  {/* Task Progress Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-border-subtle/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-content-secondary font-medium">
                        <CheckSquare className="h-3.5 w-3.5 text-content-muted" />
                        <span>Task Completion</span>
                      </span>
                      <span className="font-semibold text-content-primary">
                        {m.completedTasks} / {m.totalTasks} ({progress}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-app-surface-2">
                      <div
                        className="h-full bg-status-success transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border-subtle/50 text-xs text-content-muted">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="h-3 w-3" />
                    {m.due_date ? `Due ${new Date(m.due_date).toLocaleDateString()}` : 'No due date'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(m)}
                      className="h-7 px-2 text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMilestone(m.id, m.title)}
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
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-status-info/10 text-status-info">
            <MilestoneIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-content-primary">No milestones set</h4>
            <p className="text-xs text-content-muted max-w-sm mx-auto">
              Create milestones to group tasks into meaningful product versions and sprints.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Create Milestone
          </Button>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-base font-bold text-content-primary">Create Milestone</h2>
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

            <form onSubmit={handleCreateMilestone} className="space-y-4 text-left">
              <Input
                label="Milestone Title"
                required
                placeholder="e.g. v0.1 Core Engine & Auth Migration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Textarea
                label="Description"
                rows={3}
                placeholder="Key outcomes for this release or checkpoint..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-content-secondary">Linked Goal</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
                  >
                    <option value="">None (Independent)</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-content-secondary">Status</label>
                <select
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary capitalize"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Milestone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-base font-bold text-content-primary">Edit Milestone</h2>
              <button
                type="button"
                onClick={() => setEditingMilestone(null)}
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

            <form onSubmit={handleUpdateMilestone} className="space-y-4 text-left">
              <Input
                label="Milestone Title"
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
                  label="Due Date"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-content-secondary">Linked Goal</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                    value={editGoalId}
                    onChange={(e) => setEditGoalId(e.target.value)}
                  >
                    <option value="">None</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-content-secondary">Status</label>
                <select
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary capitalize"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MilestoneStatus)}
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingMilestone(null)}>
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
