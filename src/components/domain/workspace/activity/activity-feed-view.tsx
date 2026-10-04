'use client';

import * as React from 'react';
import Link from 'next/link';
import type { DetailedActivityLog } from '@/lib/queries/workspace';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  Activity,
  CheckSquare,
  Target,
  Milestone,
  Map,
  UserCheck,
  Clock,
} from 'lucide-react';

interface ActivityFeedViewProps {
  activity: DetailedActivityLog[];
}

export function ActivityFeedView({ activity }: ActivityFeedViewProps) {
  const getActionConfig = (action: string) => {
    switch (action) {
      case 'task_created':
        return {
          icon: CheckSquare,
          variant: 'accent' as const,
          label: 'Task Created',
        };
      case 'task_status_changed':
        return {
          icon: Clock,
          variant: 'info' as const,
          label: 'Status Changed',
        };
      case 'task_priority_changed':
        return {
          icon: Activity,
          variant: 'warning' as const,
          label: 'Priority Updated',
        };
      case 'task_assigned':
        return {
          icon: UserCheck,
          variant: 'accent' as const,
          label: 'Task Assigned',
        };
      case 'task_updated':
        return {
          icon: CheckSquare,
          variant: 'neutral' as const,
          label: 'Task Updated',
        };
      case 'task_deleted':
        return {
          icon: CheckSquare,
          variant: 'danger' as const,
          label: 'Task Deleted',
        };
      case 'goal_created':
        return {
          icon: Target,
          variant: 'success' as const,
          label: 'Goal Defined',
        };
      case 'goal_updated':
        return {
          icon: Target,
          variant: 'info' as const,
          label: 'Goal Updated',
        };
      case 'goal_deleted':
        return {
          icon: Target,
          variant: 'danger' as const,
          label: 'Goal Deleted',
        };
      case 'milestone_created':
        return {
          icon: Milestone,
          variant: 'info' as const,
          label: 'Milestone Created',
        };
      case 'milestone_updated':
        return {
          icon: Milestone,
          variant: 'neutral' as const,
          label: 'Milestone Updated',
        };
      case 'milestone_deleted':
        return {
          icon: Milestone,
          variant: 'danger' as const,
          label: 'Milestone Deleted',
        };
      case 'roadmap_item_created':
        return {
          icon: Map,
          variant: 'accent' as const,
          label: 'Roadmap Added',
        };
      case 'roadmap_item_updated':
        return {
          icon: Map,
          variant: 'neutral' as const,
          label: 'Roadmap Updated',
        };
      case 'roadmap_item_deleted':
        return {
          icon: Map,
          variant: 'danger' as const,
          label: 'Roadmap Deleted',
        };
      default:
        return {
          icon: Activity,
          variant: 'neutral' as const,
          label: action.replace('_', ' '),
        };
    }
  };

  const formatEventDescription = (log: DetailedActivityLog) => {
    const meta = (log.metadata || {}) as Record<string, unknown>;
    switch (log.action) {
      case 'task_status_changed':
        return (
          <span>
            Moved &ldquo;<strong className="text-content-primary">{String(meta.taskTitle || 'task')}</strong>&rdquo; from{' '}
            <span className="capitalize text-content-secondary font-medium">{String(meta.oldStatus || '')}</span> to{' '}
            <span className="capitalize text-accent-primary font-bold">{String(meta.newStatus || '')}</span>
          </span>
        );
      case 'task_priority_changed':
        return (
          <span>
            Updated priority for &ldquo;<strong className="text-content-primary">{String(meta.taskTitle || 'task')}</strong>&rdquo; to{' '}
            <span className="capitalize text-content-primary font-bold">{String(meta.newPriority || '')}</span>
          </span>
        );
      case 'task_created':
        return (
          <span>
            Created task &ldquo;<strong className="text-content-primary">{String(meta.title || '')}</strong>&rdquo; ({String(meta.status || 'todo')})
          </span>
        );
      case 'goal_created':
        return (
          <span>
            Defined project goal &ldquo;<strong className="text-content-primary">{String(meta.title || '')}</strong>&rdquo;
          </span>
        );
      case 'milestone_created':
        return (
          <span>
            Created milestone &ldquo;<strong className="text-content-primary">{String(meta.title || '')}</strong>&rdquo;
          </span>
        );
      case 'roadmap_item_created':
        return (
          <span>
            Scheduled roadmap item &ldquo;<strong className="text-content-primary">{String(meta.title || '')}</strong>&rdquo;
          </span>
        );
      default:
        return (
          <span>
            {log.action.replace('_', ' ')}: {meta.title ? String(meta.title) : log.entity_type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-app-surface-1 p-4 rounded-xl border border-border-subtle">
        <h2 className="text-base font-bold text-content-primary">Workspace Audit Activity</h2>
        <p className="text-xs text-content-secondary">
          Immutable log of all task progress, roadmap updates, milestones, and member actions.
        </p>
      </div>

      {/* Activity Log Stream */}
      {activity.length > 0 ? (
        <Card className="divide-y divide-border-subtle/50 p-0 border-border-subtle overflow-hidden">
          {activity.map((item) => {
            const config = getActionConfig(item.action);
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="flex items-start gap-3.5 p-4 hover:bg-app-surface-2/40 transition-colors text-xs"
              >
                {/* Actor Avatar */}
                {item.actor ? (
                  <Link href={`/developers/${item.actor.username}`} className="shrink-0 mt-0.5">
                    <Avatar
                      src={item.actor.avatar_url}
                      alt={item.actor.full_name}
                      fallbackText={item.actor.full_name}
                      size="sm"
                    />
                  </Link>
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-surface-2 text-content-muted mt-0.5">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                )}

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.actor ? (
                      <Link
                        href={`/developers/${item.actor.username}`}
                        className="font-bold text-content-primary hover:text-accent-primary"
                      >
                        {item.actor.full_name}
                      </Link>
                    ) : (
                      <span className="font-bold text-content-primary">System</span>
                    )}

                    <Badge variant={config.variant} size="sm" className="gap-1 text-[10px]">
                      <Icon className="h-2.5 w-2.5" />
                      {config.label}
                    </Badge>

                    <span className="text-[11px] text-content-muted ml-auto whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-content-secondary leading-relaxed">
                    {formatEventDescription(item)}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <div className="rounded-xl border border-dashed border-border-subtle p-12 text-center space-y-3 bg-app-surface-1">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-app-surface-2 text-content-secondary">
            <Activity className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-content-primary">No workspace activity yet</h4>
            <p className="text-xs text-content-muted max-w-sm mx-auto">
              Actions taken by team members (tasks created, status changes, milestones achieved) will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
