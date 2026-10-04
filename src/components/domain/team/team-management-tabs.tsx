'use client';

import * as React from 'react';
import type { DetailedProjectMember, DetailedContributionRequest } from '@/lib/queries/contributions';
import { TeamRosterView } from '@/components/domain/team/team-roster-view';
import { ApplicationReviewPipeline } from '@/components/domain/team/application-review-pipeline';
import { Users, Inbox } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface TeamManagementTabsProps {
  projectId: string;
  projectSlug: string;
  members: DetailedProjectMember[];
  requests: DetailedContributionRequest[];
  currentUserId?: string | null;
  isOwner: boolean;
  isAdmin: boolean;
}

export function TeamManagementTabs({
  projectId,
  projectSlug,
  members,
  requests,
  currentUserId,
  isOwner,
  isAdmin,
}: TeamManagementTabsProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'applications' && isAdmin ? 'applications' : 'roster';
  const [activeTab, setActiveTab] = React.useState<'roster' | 'applications'>(initialTab);

  const pendingCount = requests.filter((r) => r.request.status === 'pending').length;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'roster'
                ? 'bg-app-surface-2 text-content-primary shadow-sm'
                : 'text-content-secondary hover:text-content-primary hover:bg-app-surface-2/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Team Roster ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'applications'
                ? 'bg-app-surface-2 text-content-primary shadow-sm'
                : 'text-content-secondary hover:text-content-primary hover:bg-app-surface-2/50'
            }`}
          >
            <Inbox className="h-4 w-4" />
            <span>Applicant Pipeline</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-accent-primary text-content-inverse px-2 py-0.5 text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {activeTab === 'roster' ? (
        <TeamRosterView
          projectId={projectId}
          projectSlug={projectSlug}
          members={members}
          currentUserId={currentUserId}
          isOwner={isOwner}
          isAdmin={isAdmin}
        />
      ) : (
        <ApplicationReviewPipeline
          projectId={projectId}
          projectSlug={projectSlug}
          requests={requests}
        />
      )}
    </div>
  );
}
