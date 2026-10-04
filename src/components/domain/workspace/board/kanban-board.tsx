'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { TaskStatus, TaskPriority, Goal, Milestone, ProjectMemberRole } from '@/types/database';
import type { DetailedTask, AssignableMember } from '@/lib/queries/workspace';
import { updateTaskStatusAction } from '@/lib/actions/workspace';
import { TaskDetailModal } from '@/components/domain/workspace/tasks/task-detail-modal';
import { TaskCreateDialog } from '@/components/domain/workspace/tasks/task-create-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  Plus,
  Clock,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Milestone as MilestoneIcon,
  Filter,
} from 'lucide-react';

interface KanbanBoardProps {
  tasks: DetailedTask[];
  projectId: string;
  userRole: ProjectMemberRole;
  currentUserId?: string;
  assignableMembers: AssignableMember[];
  milestones: Array<Pick<Milestone, 'id' | 'title'>>;
  goals: Array<Pick<Goal, 'id' | 'title'>>;
}

const COLUMNS: Array<{ id: TaskStatus; label: string }> = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export function KanbanBoard({
  tasks: initialTasks,
  projectId,
  userRole,
  currentUserId,
  assignableMembers,
  milestones,
  goals,
}: KanbanBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = React.useState<DetailedTask[]>(initialTasks);
  const [selectedTask, setSelectedTask] = React.useState<DetailedTask | null>(null);
  const [createColumnStatus, setCreateColumnStatus] = React.useState<TaskStatus | null>(null);
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = React.useState<TaskStatus | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Filters
  const [filterAssignee, setFilterAssignee] = React.useState<string>('all');
  const [filterPriority, setFilterPriority] = React.useState<string>('all');
  const [filterMilestone, setFilterMilestone] = React.useState<string>('all');

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const filteredTasks = tasks.filter((t) => {
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned' && t.assignee_id !== null) return false;
      if (filterAssignee !== 'unassigned' && t.assignee_id !== filterAssignee) return false;
    }
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterMilestone !== 'all') {
      if (filterMilestone === 'none' && t.milestone_id !== null) return false;
      if (filterMilestone !== 'none' && t.milestone_id !== filterMilestone) return false;
    }
    return true;
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return <Badge variant="danger" size="sm" className="text-[10px] uppercase font-bold">Urgent</Badge>;
      case 'high':
        return <Badge variant="warning" size="sm" className="text-[10px] uppercase font-bold">High</Badge>;
      case 'medium':
        return <Badge variant="info" size="sm" className="text-[10px] uppercase font-semibold">Medium</Badge>;
      default:
        return <Badge variant="neutral" size="sm" className="text-[10px] uppercase font-normal">Low</Badge>;
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setActionError(null);
    const prevTasks = [...tasks];

    // Optimistic update
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    const res = await updateTaskStatusAction({
      taskId,
      projectId,
      status: newStatus,
    });

    if (!res.success) {
      // Revert optimistic update
      setTasks(prevTasks);
      setActionError(res.error?.message || 'Failed to move task.');
      return;
    }

    router.refresh();
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    await handleStatusChange(taskId, targetStatus);
  };

  const getColumnIndex = (status: TaskStatus) =>
    COLUMNS.findIndex((c) => c.id === status);

  return (
    <div className="space-y-4">
      {/* Board Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-app-surface-1 p-3 rounded-xl border border-border-subtle">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs font-semibold text-content-secondary mr-1">
            <Filter className="h-3.5 w-3.5 text-accent-primary" />
            Filters:
          </span>

          {/* Assignee Filter */}
          <select
            className="h-8 rounded-lg border border-border-subtle bg-app-surface-2 px-2.5 text-xs text-content-primary"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {assignableMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.fullName}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            className="h-8 rounded-lg border border-border-subtle bg-app-surface-2 px-2.5 text-xs text-content-primary"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Milestone Filter */}
          {milestones.length > 0 && (
            <select
              className="h-8 rounded-lg border border-border-subtle bg-app-surface-2 px-2.5 text-xs text-content-primary"
              value={filterMilestone}
              onChange={(e) => setFilterMilestone(e.target.value)}
            >
              <option value="all">All Milestones</option>
              <option value="none">Independent (No Milestone)</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateColumnStatus('todo')}
          className="gap-1.5 text-xs h-8 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Task</span>
        </Button>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-status-danger/10 p-3 text-xs text-status-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Board Columns Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);
          const isOver = dragOverCol === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex flex-col rounded-xl border bg-app-surface-1/60 p-3 min-w-[240px] transition-colors ${
                isOver
                  ? 'border-accent-primary ring-2 ring-accent-primary/20 bg-accent-primary/5'
                  : 'border-border-subtle'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle/70 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider">
                    {column.label}
                  </h3>
                  <Badge variant="neutral" size="sm" className="h-5 px-1.5 text-[10px]">
                    {colTasks.length}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => setCreateColumnStatus(column.id)}
                  className="rounded p-1 text-content-muted hover:text-content-primary hover:bg-app-surface-2"
                  title={`Add task to ${column.label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Task Cards List */}
              <div className="flex-1 space-y-2.5 min-h-[150px]">
                {colTasks.length > 0 ? (
                  colTasks.map((task) => {
                    const colIndex = getColumnIndex(task.status);
                    const canMovePrev = colIndex > 0;
                    const canMoveNext = colIndex < COLUMNS.length - 1;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => setSelectedTask(task)}
                        className="group relative cursor-grab active:cursor-grabbing rounded-lg border border-border-subtle bg-app-surface-1 p-3 shadow-xs space-y-2 transition-all hover:border-border-focus hover:shadow-sm"
                      >
                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-content-primary group-hover:text-accent-primary line-clamp-2 leading-snug">
                            {task.title}
                          </h4>
                          <span className="shrink-0">{getPriorityBadge(task.priority)}</span>
                        </div>

                        {/* Description Preview */}
                        {task.description && (
                          <p className="text-[11px] text-content-muted line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Milestone Tag */}
                        {task.milestone && (
                          <div className="flex items-center gap-1 text-[10px] text-status-info font-medium">
                            <MilestoneIcon className="h-2.5 w-2.5" />
                            <span className="truncate">{task.milestone.title}</span>
                          </div>
                        )}

                        {/* Labels */}
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {task.labels.slice(0, 3).map((l) => (
                              <span
                                key={l}
                                className="rounded bg-app-surface-2 px-1.5 py-0.5 text-[9px] text-content-secondary border border-border-subtle/50"
                              >
                                {l}
                              </span>
                            ))}
                            {task.labels.length > 3 && (
                              <span className="text-[9px] text-content-muted">
                                +{task.labels.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer: Assignee & Meta */}
                        <div className="flex items-center justify-between pt-1 border-t border-border-subtle/40 text-[10px] text-content-muted">
                          <div className="flex items-center gap-2">
                            {task.assignee ? (
                              <div
                                className="flex items-center gap-1 text-content-secondary"
                                title={`Assigned to ${task.assignee.full_name}`}
                              >
                                <Avatar
                                  src={task.assignee.avatar_url}
                                  alt={task.assignee.full_name}
                                  fallbackText={task.assignee.full_name}
                                  size="sm"
                                  className="h-4.5 w-4.5 text-[9px]"
                                />
                                <span className="truncate max-w-[80px]">
                                  {task.assignee.full_name.split(' ')[0]}
                                </span>
                              </div>
                            ) : (
                              <span className="italic">Unassigned</span>
                            )}

                            {task.estimate_hours && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {task.estimate_hours}h
                              </span>
                            )}
                          </div>

                          {/* Keyboard Accessible Column Movement Buttons */}
                          <div
                            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canMovePrev && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(task.id, COLUMNS[colIndex - 1].id)
                                }
                                className="rounded p-0.5 hover:bg-app-surface-2 text-content-muted hover:text-content-primary"
                                title={`Move to ${COLUMNS[colIndex - 1].label}`}
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </button>
                            )}
                            {canMoveNext && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(task.id, COLUMNS[colIndex + 1].id)
                                }
                                className="rounded p-0.5 hover:bg-app-surface-2 text-content-muted hover:text-content-primary"
                                title={`Move to ${COLUMNS[colIndex + 1].label}`}
                              >
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-24 rounded-lg border border-dashed border-border-subtle flex flex-col items-center justify-center p-3 text-center text-xs text-content-muted">
                    <span>No tasks in {column.label.toLowerCase()}</span>
                    <button
                      type="button"
                      onClick={() => setCreateColumnStatus(column.id)}
                      className="text-accent-primary hover:underline text-[11px] pt-1"
                    >
                      + Add task
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          userRole={userRole}
          currentUserId={currentUserId}
          assignableMembers={assignableMembers}
          milestones={milestones}
          goals={goals}
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Create Task Dialog */}
      {createColumnStatus && (
        <TaskCreateDialog
          isOpen={Boolean(createColumnStatus)}
          onClose={() => setCreateColumnStatus(null)}
          projectId={projectId}
          initialStatus={createColumnStatus}
          assignableMembers={assignableMembers}
          milestones={milestones}
          goals={goals}
        />
      )}
    </div>
  );
}
