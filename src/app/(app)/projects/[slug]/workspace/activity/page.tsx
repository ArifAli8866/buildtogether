import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext, getWorkspaceActivity } from '@/lib/queries/workspace';
import { ActivityFeedView } from '@/components/domain/workspace/activity/activity-feed-view';

interface ActivityPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: ActivityPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'Activity | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'Activity | Build Together' };

  return {
    title: `${context.project.title} — Workspace Activity | Build Together`,
    description: `Audit trail and activity log for ${context.project.title}`,
  };
}

export default async function WorkspaceActivityPage(props: ActivityPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/activity`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const activity = await getWorkspaceActivity(context.project.id, 50);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-content-primary">
          Workspace Activity Audit
        </h1>
        <p className="text-sm text-content-secondary">
          Immutable chronological log of goals, milestones, roadmap deliverables, and task operations.
        </p>
      </div>

      <ActivityFeedView activity={activity} />
    </div>
  );
}
