'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Project, ProjectMemberRole } from '@/types/database';
import type { WorkspaceOverviewData } from '@/lib/queries/workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import {
  CheckSquare,
  Target,
  Milestone,
  Users,
  Activity,
  ArrowRight,
  Plus,
  Calendar,
} from 'lucide-react';

interface WorkspaceOverviewViewProps {
  project: Project;
  role: ProjectMemberRole;
  data: WorkspaceOverviewData;
  onOpenCreateTask?: () => void;
}

export function WorkspaceOverviewView({
  project,
  role,
  data,
  onOpenCreateTask,
}: WorkspaceOverviewViewProps) {
  const basePath = `/projects/${project.slug}/workspace`;

  const milestoneProgress =
    data.milestonesCount > 0
      ? Math.round((data.completedMilestonesCount / data.milestonesCount) * 100)
      : 0;

  const taskCompletionProgress =
    data.totalTasks > 0
      ? Math.round((data.tasksByStatus.done / data.totalTasks) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Project Status Hero Banner */}
      <div className="rounded-2xl border border-border-subtle bg-app-surface-1 p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="neutral" size="sm" className="capitalize">
                {project.category}
              </Badge>
              <Badge variant="accent" size="sm" className="capitalize">
                {project.stage.replace('_', ' ')}
              </Badge>
              <Badge variant="neutral" size="sm" className="capitalize">
                {project.collaboration_type}
              </Badge>
              <Badge variant="info" size="sm" className="capitalize">
                Role: {role}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-content-primary">
              {project.title} Workspace
            </h1>
            <p className="text-xs sm:text-sm text-content-secondary max-w-2xl leading-relaxed">
              {project.tagline}
            </p>
          </div>

          {/* Quick Action Bar */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onOpenCreateTask && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenCreateTask}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Task</span>
              </Button>
            )}
            <Link href={`${basePath}/board`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Open Board</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Milestone Progress */}
        <Card className="p-4 space-y-2 border-border-subtle bg-app-surface-1">
          <div className="flex items-center justify-between text-xs text-content-muted">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Milestones</span>
            <Milestone className="h-4 w-4 text-status-info" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black text-content-primary">{milestoneProgress}%</p>
            <p className="text-[11px] text-content-secondary">
              {data.completedMilestonesCount} of {data.milestonesCount} achieved
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-surface-2 mt-2">
            <div
              className="h-full bg-status-info transition-all duration-300"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
        </Card>

        {/* Goals Progress */}
        <Card className="p-4 space-y-2 border-border-subtle bg-app-surface-1">
          <div className="flex items-center justify-between text-xs text-content-muted">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Goals</span>
            <Target className="h-4 w-4 text-accent-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black text-content-primary">
              {data.achievedGoalsCount} / {data.goalsCount}
            </p>
            <p className="text-[11px] text-content-secondary">
              Active strategic objectives
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-surface-2 mt-2">
            <div
              className="h-full bg-accent-primary transition-all duration-300"
              style={{
                width: `${data.goalsCount > 0 ? (data.achievedGoalsCount / data.goalsCount) * 100 : 0}%`,
              }}
            />
          </div>
        </Card>

        {/* Task Completion */}
        <Card className="p-4 space-y-2 border-border-subtle bg-app-surface-1">
          <div className="flex items-center justify-between text-xs text-content-muted">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Tasks Done</span>
            <CheckSquare className="h-4 w-4 text-status-success" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black text-content-primary">
              {data.tasksByStatus.done} / {data.totalTasks}
            </p>
            <p className="text-[11px] text-content-secondary">
              {data.tasksByStatus.in_progress} in progress, {data.tasksByStatus.review} in review
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-surface-2 mt-2">
            <div
              className="h-full bg-status-success transition-all duration-300"
              style={{ width: `${taskCompletionProgress}%` }}
            />
          </div>
        </Card>

        {/* Team Members */}
        <Card className="p-4 space-y-2 border-border-subtle bg-app-surface-1">
          <div className="flex items-center justify-between text-xs text-content-muted">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Team Size</span>
            <Users className="h-4 w-4 text-accent-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black text-content-primary">{data.membersCount}</p>
            <p className="text-[11px] text-content-secondary">
              Active contributors & leads
            </p>
          </div>
          <div className="pt-1">
            <Link
              href={`/projects/${project.slug}/team`}
              className="text-[11px] text-accent-primary hover:underline flex items-center gap-1"
            >
              <span>Manage team</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Main Content: Left 2 Cols (Tasks Breakdown & Milestones) / Right 1 Col (Goals & Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Status Pipeline Breakdown */}
          <Card className="p-5 space-y-4 border-border-subtle bg-app-surface-1">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-accent-primary" />
                <h3 className="text-sm font-bold text-content-primary">Tasks Status Breakdown</h3>
              </div>
              <Link
                href={`${basePath}/tasks`}
                className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-medium"
              >
                <span>View all tasks</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-app-surface-2 border border-border-subtle/50">
                <p className="text-[10px] uppercase font-bold text-content-muted">Backlog</p>
                <p className="text-lg font-bold text-content-primary">{data.tasksByStatus.backlog}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-app-surface-2 border border-border-subtle/50">
                <p className="text-[10px] uppercase font-bold text-status-info">Todo</p>
                <p className="text-lg font-bold text-content-primary">{data.tasksByStatus.todo}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                <p className="text-[10px] uppercase font-bold text-accent-primary">In Progress</p>
                <p className="text-lg font-bold text-accent-primary">{data.tasksByStatus.in_progress}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-status-warning/10 border border-status-warning/20">
                <p className="text-[10px] uppercase font-bold text-status-warning">Review</p>
                <p className="text-lg font-bold text-status-warning">{data.tasksByStatus.review}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-status-success/10 border border-status-success/20">
                <p className="text-[10px] uppercase font-bold text-status-success">Done</p>
                <p className="text-lg font-bold text-status-success">{data.tasksByStatus.done}</p>
              </div>
            </div>
          </Card>

          {/* Upcoming Milestones */}
          <Card className="p-5 space-y-4 border-border-subtle bg-app-surface-1">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Milestone className="h-4 w-4 text-status-info" />
                <h3 className="text-sm font-bold text-content-primary">Milestones & Checkpoints</h3>
              </div>
              <Link
                href={`${basePath}/milestones`}
                className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-medium"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {data.upcomingMilestones.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingMilestones.map((m) => {
                  const mProgress =
                    m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0;

                  return (
                    <div
                      key={m.id}
                      className="rounded-lg border border-border-subtle bg-app-surface-2/40 p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-content-primary">{m.title}</h4>
                          <span className="text-[11px] text-content-muted flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {m.due_date ? `Due ${new Date(m.due_date).toLocaleDateString()}` : 'No date'}
                          </span>
                        </div>
                        <Badge
                          variant={m.status === 'completed' ? 'success' : 'info'}
                          size="sm"
                          className="capitalize"
                        >
                          {m.status}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-content-muted">
                          <span>{m.completedTasks} of {m.totalTasks} tasks finished</span>
                          <span>{mProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-surface-3">
                          <div
                            className="h-full bg-status-success transition-all"
                            style={{ width: `${mProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-content-muted space-y-2">
                <p>No milestones created yet.</p>
                <Link href={`${basePath}/milestones`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Define First Milestone
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col */}
        <div className="space-y-6">
          {/* Strategic Goals Card */}
          <Card className="p-5 space-y-3 border-border-subtle bg-app-surface-1">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-accent-primary" />
                <h3 className="text-sm font-bold text-content-primary">Active Goals</h3>
              </div>
              <Link
                href={`${basePath}/goals`}
                className="text-xs text-accent-primary hover:underline font-medium"
              >
                View all
              </Link>
            </div>

            {data.recentGoals.length > 0 ? (
              <div className="space-y-2.5">
                {data.recentGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-app-surface-2/40 p-2.5 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-content-primary truncate">{g.title}</p>
                      {g.target_date && (
                        <p className="text-[10px] text-content-muted">
                          Target: {new Date(g.target_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={g.status === 'achieved' ? 'success' : 'accent'}
                      size="sm"
                      className="text-[10px] capitalize shrink-0"
                    >
                      {g.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-content-muted italic py-4 text-center">
                No goals defined yet.
              </p>
            )}
          </Card>

          {/* Recent Activity Stream */}
          <Card className="p-5 space-y-3 border-border-subtle bg-app-surface-1">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent-primary" />
                <h3 className="text-sm font-bold text-content-primary">Recent Activity</h3>
              </div>
              <Link
                href={`${basePath}/activity`}
                className="text-xs text-accent-primary hover:underline font-medium"
              >
                Full audit
              </Link>
            </div>

            {data.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {data.recentActivity.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <Avatar
                      src={act.actor?.avatar_url}
                      alt={act.actor?.full_name || 'User'}
                      fallbackText={act.actor?.full_name || 'User'}
                      size="sm"
                      className="h-5 w-5 text-[9px] mt-0.5"
                    />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-content-primary font-medium line-clamp-1">
                        {act.metadata?.title ? String(act.metadata.title) : act.action.replace('_', ' ')}
                      </p>
                      <p className="text-[10px] text-content-muted">
                        {act.actor?.full_name || 'System'} &bull;{' '}
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-content-muted italic py-4 text-center">
                No activity recorded yet.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
