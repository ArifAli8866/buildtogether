'use client';

import * as React from 'react';
import type { Project, ProjectMemberRole } from '@/types/database';
import { WorkspaceSidebar } from './workspace-sidebar';
import { WorkspaceHeader } from './workspace-header';

interface WorkspaceShellProps {
  project: Project;
  role: ProjectMemberRole;
  children: React.ReactNode;
}

export function WorkspaceShell({
  project,
  role,
  children,
}: WorkspaceShellProps) {
  const [isOpenMobile, setIsOpenMobile] = React.useState(false);

  return (
    <div className="min-h-screen bg-app-bg text-content-primary">
      <div className="flex">
        {/* Sidebar */}
        <WorkspaceSidebar
          project={project}
          role={role}
          isOpenMobile={isOpenMobile}
          onCloseMobile={() => setIsOpenMobile(false)}
        />

        {/* Content Container */}
        <div className="flex flex-1 flex-col min-w-0">
          <WorkspaceHeader
            project={project}
            role={role}
            onOpenMobileNav={() => setIsOpenMobile(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
