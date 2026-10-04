'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Project, ProjectMemberRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  Plus,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface WorkspaceHeaderProps {
  project: Project;
  role: ProjectMemberRole;
  onOpenMobileNav: () => void;
  onOpenCreateTask?: () => void;
}

export function WorkspaceHeader({
  project,
  role,
  onOpenMobileNav,
  onOpenCreateTask,
}: WorkspaceHeaderProps) {
  const pathname = usePathname();

  const getSectionTitle = () => {
    if (pathname.endsWith('/goals')) return 'Goals';
    if (pathname.endsWith('/roadmap')) return 'Roadmap';
    if (pathname.endsWith('/milestones')) return 'Milestones';
    if (pathname.endsWith('/tasks')) return 'Tasks';
    if (pathname.endsWith('/board')) return 'Task Board';
    if (pathname.includes('/discussions')) return 'Discussions';
    if (pathname.endsWith('/meetings')) return 'Meetings';
    if (pathname.endsWith('/notes')) return 'Project Notes';
    if (pathname.endsWith('/canvas')) return 'Project Canvas';
    if (pathname.endsWith('/files')) return 'Project Files';
    if (pathname.includes('/code') || pathname.includes('/reviews')) return 'Code & Reviews';
    if (pathname.endsWith('/activity')) return 'Activity Audit';
    return 'Workspace Overview';
  };

  return (
    <header className="sticky top-16 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-app-surface-1/90 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden rounded-lg p-1.5 text-content-secondary hover:bg-app-surface-2 focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-content-muted min-w-0 truncate">
          <Link
            href={`/projects/${project.slug}`}
            className="hover:text-content-primary truncate font-medium max-w-[120px] sm:max-w-[180px]"
          >
            {project.title}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="font-semibold text-content-primary shrink-0">
            {getSectionTitle()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onOpenCreateTask && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateTask}
            className="gap-1.5 text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">Task</span>
          </Button>
        )}

        <Badge variant="neutral" size="sm" className="hidden sm:inline-flex capitalize text-[10px]">
          {role}
        </Badge>

        <Link
          href={`/projects/${project.slug}`}
          className="hidden md:inline-flex items-center gap-1 text-xs text-content-muted hover:text-content-primary px-2 py-1 rounded hover:bg-app-surface-2 transition-colors"
        >
          <span>Public View</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </header>
  );
}
