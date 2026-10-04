'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Goal, Milestone, ProjectMemberRole } from '@/types/database';
import type { DetailedRoadmapItem } from '@/lib/queries/workspace';
import {
  createRoadmapItemAction,
  updateRoadmapItemAction,
  deleteRoadmapItemAction,
  reorderRoadmapAction,
} from '@/lib/actions/workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Map,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Target,
  Milestone as MilestoneIcon,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
} from 'lucide-react';

type RoadmapStatus = 'planned' | 'in_progress' | 'completed' | 'blocked';

interface RoadmapViewProps {
  items: DetailedRoadmapItem[];
  projectId: string;
  userRole: ProjectMemberRole;
  currentUserId?: string;
  goals: Array<Pick<Goal, 'id' | 'title'>>;
  milestones: Array<Pick<Milestone, 'id' | 'title'>>;
}

export function RoadmapView({
  items,
  projectId,
  userRole,
  currentUserId,
  goals,
  milestones,
}: RoadmapViewProps) {
  const router = useRouter();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<DetailedRoadmapItem | null>(null);

  // Create Form State
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<'planned' | 'in_progress' | 'completed' | 'blocked'>('planned');
  const [targetDate, setTargetDate] = React.useState('');
  const [targetQuarter, setTargetQuarter] = React.useState('');
  const [goalId, setGoalId] = React.useState('');
  const [milestoneId, setMilestoneId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Edit Form State
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editStatus, setEditStatus] = React.useState<'planned' | 'in_progress' | 'completed' | 'blocked'>('planned');
  const [editTargetDate, setEditTargetDate] = React.useState('');
  const [editTargetQuarter, setEditTargetQuarter] = React.useState('');
  const [editGoalId, setEditGoalId] = React.useState('');
  const [editMilestoneId, setEditMilestoneId] = React.useState('');

  const openEdit = (item: DetailedRoadmapItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditStatus(item.status);
    setEditTargetDate(item.target_date || '');
    setEditTargetQuarter(item.target_quarter || '');
    setEditGoalId(item.goal_id || '');
    setEditMilestoneId(item.milestone_id || '');
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await createRoadmapItemAction({
      projectId,
      title,
      description,
      status,
      targetDate: targetDate || null,
      targetQuarter: targetQuarter || null,
      goalId: goalId || null,
      milestoneId: milestoneId || null,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error?.message || 'Failed to create roadmap item.');
      return;
    }

    setTitle('');
    setDescription('');
    setTargetDate('');
    setTargetQuarter('');
    setGoalId('');
    setMilestoneId('');
    setIsCreateOpen(false);
    router.refresh();
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setError(null);
    setIsSubmitting(true);

    const res = await updateRoadmapItemAction({
      itemId: editingItem.id,
      projectId,
      title: editTitle,
      description: editDescription,
      status: editStatus,
      targetDate: editTargetDate || null,
      targetQuarter: editTargetQuarter || null,
      goalId: editGoalId || null,
      milestoneId: editMilestoneId || null,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error?.message || 'Failed to update roadmap item.');
      return;
    }

    setEditingItem(null);
    router.refresh();
  };

  const handleDeleteItem = async (id: string, itemTitle: string) => {
    if (!window.confirm(`Delete roadmap item "${itemTitle}"?`)) return;

    const res = await deleteRoadmapItemAction(id, projectId);
    if (!res.success) {
      alert(res.error?.message || 'Failed to delete roadmap item.');
      return;
    }
    router.refresh();
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const itemIds = newItems.map((i) => i.id);
    await reorderRoadmapAction({ projectId, itemIds });
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
      case 'blocked':
        return (
          <Badge variant="danger" size="sm">
            Blocked
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
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
          <h2 className="text-base font-bold text-content-primary">Project Roadmap</h2>
          <p className="text-xs text-content-secondary">
            Chronological sequencing of milestones, key deliverables, and calendar targets.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="gap-1.5 text-xs self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Roadmap Item</span>
        </Button>
      </div>

      {/* Chronological Sequence */}
      {items.length > 0 ? (
        <div className="relative border-l-2 border-border-subtle ml-4 sm:ml-6 pl-4 sm:pl-6 space-y-6">
          {items.map((item, index) => {
            const canDelete =
              userRole === 'owner' ||
              userRole === 'maintainer' ||
              item.created_by === currentUserId;

            return (
              <div key={item.id} className="relative group">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[25px] sm:-left-[33px] top-4 h-4 w-4 rounded-full border-2 bg-app-surface-1 ${
                    item.status === 'completed'
                      ? 'border-status-success bg-status-success/20'
                      : item.status === 'in_progress'
                      ? 'border-accent-primary bg-accent-primary/20'
                      : 'border-border-subtle'
                  }`}
                />

                <Card className="border-border-subtle bg-app-surface-1 p-5 space-y-3 hover:border-border-focus transition-colors shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-content-muted">
                          #{index + 1}
                        </span>
                        <h3 className="text-sm font-bold text-content-primary">
                          {item.title}
                        </h3>
                        {getStatusBadge(item.status)}
                      </div>

                      {item.description && (
                        <p className="text-xs text-content-secondary leading-relaxed whitespace-pre-line">
                          {item.description}
                        </p>
                      )}

                      {/* Relationships */}
                      <div className="flex items-center gap-3 pt-1 flex-wrap text-xs">
                        {item.goal && (
                          <span className="flex items-center gap-1 text-[11px] text-accent-primary font-medium bg-accent-primary/10 px-2 py-0.5 rounded">
                            <Target className="h-3 w-3" />
                            {item.goal.title}
                          </span>
                        )}
                        {item.milestone && (
                          <span className="flex items-center gap-1 text-[11px] text-status-info font-medium bg-status-info/10 px-2 py-0.5 rounded">
                            <MilestoneIcon className="h-3 w-3" />
                            {item.milestone.title}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timeframe & Reorder Controls */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-start">
                      <div className="text-right text-xs">
                        {item.target_quarter && (
                          <p className="font-bold text-content-primary">
                            {item.target_quarter}
                          </p>
                        )}
                        {item.target_date && (
                          <p className="text-[11px] text-content-muted">
                            {new Date(item.target_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Order Controls */}
                      <div className="flex flex-col items-center bg-app-surface-2 rounded border border-border-subtle">
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-app-surface-3 disabled:opacity-30 text-content-secondary"
                          title="Move up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(index, 'down')}
                          disabled={index === items.length - 1}
                          className="p-1 hover:bg-app-surface-3 disabled:opacity-30 text-content-secondary"
                          title="Move down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                        className="h-8 px-2 text-xs"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          className="h-8 px-2 text-xs text-status-danger hover:bg-status-danger/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-subtle p-12 text-center space-y-3 bg-app-surface-1">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
            <Map className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-content-primary">No roadmap items scheduled</h4>
            <p className="text-xs text-content-muted max-w-sm mx-auto">
              Map out target releases, architectural sprints, and deliverable sequencing.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Roadmap Item
          </Button>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-base font-bold text-content-primary">Add Roadmap Item</h2>
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

            <form onSubmit={handleCreateItem} className="space-y-4 text-left">
              <Input
                label="Deliverable Title"
                required
                placeholder="e.g. Architecture RFC & Zero-Copy Benchmarks"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Textarea
                label="Description"
                rows={3}
                placeholder="Scope and deliverables for this roadmap phase..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Target Timeframe (e.g. Q2 2026)"
                  placeholder="e.g. Q1 2026, Sprint 4"
                  value={targetQuarter}
                  onChange={(e) => setTargetQuarter(e.target.value)}
                />
                <Input
                  label="Target Date (Optional)"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-content-secondary">Status</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary capitalize"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RoadmapStatus)}
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-content-secondary">Linked Goal</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
                  >
                    <option value="">None</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-content-secondary">Linked Milestone</label>
                <select
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                >
                  <option value="">None</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Add Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-base font-bold text-content-primary">Edit Roadmap Item</h2>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
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

            <form onSubmit={handleUpdateItem} className="space-y-4 text-left">
              <Input
                label="Deliverable Title"
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
                  label="Target Timeframe"
                  value={editTargetQuarter}
                  onChange={(e) => setEditTargetQuarter(e.target.value)}
                />
                <Input
                  label="Target Date"
                  type="date"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-content-secondary">Status</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary capitalize"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as RoadmapStatus)}
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

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
                <label className="block text-xs font-medium text-content-secondary">Linked Milestone</label>
                <select
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                  value={editMilestoneId}
                  onChange={(e) => setEditMilestoneId(e.target.value)}
                >
                  <option value="">None</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem(null)}>
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
