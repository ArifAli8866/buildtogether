'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Project, ProjectMemberRole } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Target,
  Milestone,
  Map,
  CheckSquare,
  Kanban,
  Activity,
  Users,
  ExternalLink,
  ChevronLeft,
  X,
  MessageSquare,
  Calendar,
  FileText,
  Palette,
  Folder,
  GitPullRequest,
  GitFork,
  Megaphone,
} from 'lucide-react';

interface WorkspaceSidebarProps {
  project: Project;
  role: ProjectMemberRole;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function WorkspaceSidebar({
  project,
  role,
  isOpenMobile = false,
  onCloseMobile,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const basePath = `/projects/${project.slug}/workspace`;

  const navItems = [
    {
      label: 'Overview',
      href: basePath,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Goals',
      href: `${basePath}/goals`,
      icon: Target,
    },
    {
      label: 'Roadmap',
      href: `${basePath}/roadmap`,
      icon: Map,
    },
    {
      label: 'Milestones',
      href: `${basePath}/milestones`,
      icon: Milestone,
    },
    {
      label: 'Tasks',
      href: `${basePath}/tasks`,
      icon: CheckSquare,
    },
    {
      label: 'Board',
      href: `${basePath}/board`,
      icon: Kanban,
    },
    {
      label: 'Discussions',
      href: `${basePath}/discussions`,
      icon: MessageSquare,
    },
    {
      label: 'Meetings',
      href: `${basePath}/meetings`,
      icon: Calendar,
    },
    {
      label: 'Notes',
      href: `${basePath}/notes`,
      icon: FileText,
    },
    {
      label: 'Canvas',
      href: `${basePath}/canvas`,
      icon: Palette,
    },
    {
      label: 'Files',
      href: `${basePath}/files`,
      icon: Folder,
    },
    {
      label: 'Code & Reviews',
      href: `${basePath}/code`,
      icon: GitPullRequest,
    },
    {
      label: 'GitHub',
      href: `${basePath}/github`,
      icon: GitFork,
    },
    {
      label: 'Activity',
      href: `${basePath}/activity`,
      icon: Activity,
    },
    {
      label: 'Team & Roster',
      href: `/projects/${project.slug}/team`,
      icon: Users,
    },
  ];

  const futureItems = [
    { label: 'Community Feed (Phase 8)', icon: Megaphone },
  ];

  const getRoleBadgeVariant = (r: ProjectMemberRole) => {
    switch (r) {
      case 'owner':
        return 'accent';
      case 'maintainer':
        return 'info';
      case 'contributor':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-app-surface-1 border-r border-border-subtle p-4 w-64">
      {/* Top Section: Project Branding */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${project.slug}`}
            className="flex items-center gap-2.5 min-w-0 group"
            title="View public showcase"
          >
            <Avatar
              src={project.logo_url}
              alt={project.title}
              fallbackText={project.title}
              size="sm"
            />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-content-primary truncate group-hover:text-accent-primary">
                {project.title}
              </h2>
              <span className="text-[10px] text-content-muted capitalize flex items-center gap-1">
                <span>{project.stage.replace('_', ' ')}</span>
                <span>&bull;</span>
                <span className="text-accent-primary flex items-center">
                  Public <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                </span>
              </span>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden rounded-lg p-1 text-content-secondary hover:bg-app-surface-2"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Member Context Badge */}
        <div className="flex items-center justify-between rounded-lg bg-app-surface-2/60 px-3 py-2 border border-border-subtle/50 text-xs">
          <span className="text-content-muted text-[11px]">Your Role:</span>
          <Badge variant={getRoleBadgeVariant(role)} size="sm" className="capitalize text-[10px] font-semibold">
            {role}
          </Badge>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
            Workspace
          </p>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-primary/10 text-accent-primary font-semibold border-l-2 border-accent-primary'
                    : 'text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent-primary' : 'text-content-muted'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Upcoming Modules Preview */}
        <div className="space-y-1 pt-2 border-t border-border-subtle/40">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-content-muted/70">
            Upcoming Modules
          </p>
          {futureItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs text-content-muted/60 cursor-not-allowed select-none"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate text-[11px]">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Back link */}
      <div className="pt-4 border-t border-border-subtle/50">
        <Link href={`/projects/${project.slug}`}>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-content-muted hover:text-content-primary">
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Showcase & Public Page</span>
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 h-[calc(100vh-4rem)] sticky top-16">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
