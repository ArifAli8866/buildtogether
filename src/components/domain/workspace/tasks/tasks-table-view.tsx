'use client';

import * as React from 'react';
import Link from 'next/link';
import type { TaskStatus, TaskPriority, Goal, Milestone, ProjectMemberRole } from '@/types/database';
import type { DetailedTask, AssignableMember } from '@/lib/queries/workspace';
import { TaskDetailModal } from '@/components/domain/workspace/tasks/task-detail-modal';
import { TaskCreateDialog } from '@/components/domain/workspace/tasks/task-create-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  Plus,
  Kanban,
  Search,
} from 'lucide-react';

interface TasksTableViewProps {
  tasks: DetailedTask[];
  projectId: string;
  projectSlug: string;
  userRole: ProjectMemberRole;
  currentUserId?: string;
  assignableMembers: AssignableMember[];
  milestones: Array<Pick<Milestone, 'id' | 'title'>>;
  goals: Array<Pick<Goal, 'id' | 'title'>>;
}

export function TasksTableView({
  tasks,
  projectId,
  projectSlug,
  userRole,
  currentUserId,
  assignableMembers,
  milestones,
  goals,
}: TasksTableViewProps) {
  const [selectedTask, setSelectedTask] = React.useState<DetailedTask | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [filterPriority, setFilterPriority] = React.useState<string>('all');
  const [filterAssignee, setFilterAssignee] = React.useState<string>('all');

  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchAssignee = t.assignee?.full_name.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned' && t.assignee_id !== null) return false;
      if (filterAssignee !== 'unassigned' && t.assignee_id !== filterAssignee) return false;
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

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case 'backlog':
        return <Badge variant="neutral" size="sm" className="capitalize">Backlog</Badge>;
      case 'todo':
        return <Badge variant="info" size="sm" className="capitalize">Todo</Badge>;
      case 'in_progress':
        return <Badge variant="accent" size="sm" className="capitalize">In Progress</Badge>;
      case 'review':
        return <Badge variant="warning" size="sm" className="capitalize">Review</Badge>;
      case 'done':
        return <Badge variant="success" size="sm" className="capitalize">Done</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-app-surface-1 p-4 rounded-xl border border-border-subtle">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-content-muted" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-lg border border-border-subtle bg-app-surface-2 pl-8 pr-3 text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>

          {/* Status Filter */}
          <select
            className="h-8 rounded-lg border border-border-subtle bg-app-surface-2 px-2.5 text-xs text-content-primary"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="backlog">Backlog</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
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
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/projects/${projectSlug}/workspace/board`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Kanban className="h-3.5 w-3.5" />
              <span>Board View</span>
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="rounded-xl border border-border-subtle bg-app-surface-1 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-app-surface-2/60 border-b border-border-subtle text-content-muted uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Milestone</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Estimate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="hover:bg-app-surface-2/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 max-w-sm">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-content-primary hover:text-accent-primary line-clamp-1">
                          {task.title}
                        </span>
                        {task.labels && task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {task.labels.map((l) => (
                              <span
                                key={l}
                                className="text-[9px] rounded bg-app-surface-2 px-1 text-content-secondary border border-border-subtle/50"
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(task.status)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getPriorityBadge(task.priority)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar
                            src={task.assignee.avatar_url}
                            alt={task.assignee.full_name}
                            fallbackText={task.assignee.full_name}
                            size="sm"
                            className="h-4.5 w-4.5 text-[9px]"
                          />
                          <span className="text-content-primary">{task.assignee.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-content-muted italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {task.milestone ? (
                        <span className="text-status-info font-medium">{task.milestone.title}</span>
                      ) : (
                        <span className="text-content-muted">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-content-secondary">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-medium text-content-primary">
                      {task.estimate_hours ? `${task.estimate_hours}h` : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-content-muted">
                    <div className="space-y-2">
                      <p>No tasks found matching current filters.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreateOpen(true)}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3 w-3" /> Create First Task
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
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

      {isCreateOpen && (
        <TaskCreateDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          projectId={projectId}
          assignableMembers={assignableMembers}
          milestones={milestones}
          goals={goals}
        />
      )}
    </div>
  );
}
