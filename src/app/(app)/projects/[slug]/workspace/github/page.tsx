import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getWorkspaceContext } from '@/lib/queries/workspace';
import {
  getUserGitHubAccount,
  getProjectGitHubRepo,
  getProjectLiveCommits,
  getProjectLivePullRequests,
  getProjectWebhookEvents,
} from '@/lib/queries/github';
import { GitHubIntegrationView } from '@/components/domain/workspace/github/github-integration-view';

interface WorkspaceGitHubPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(
  props: WorkspaceGitHubPageProps
): Promise<Metadata> {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();
  if (!user) return { title: 'GitHub Integration | Build Together' };

  const context = await getWorkspaceContext(slug, user.id);
  if (!context) return { title: 'GitHub Integration | Build Together' };

  return {
    title: `${context.project.title} — GitHub Integration | Build Together`,
    description: `Connect and synchronize external GitHub repository for ${context.project.title}`,
  };
}

export default async function WorkspaceGitHubPage(props: WorkspaceGitHubPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=/projects/${slug}/workspace/github`);
  }

  const context = await getWorkspaceContext(slug, user.id);

  if (!context || !context.isAuthorized) {
    notFound();
  }

  const [userGithubAccount, connectedRepo] = await Promise.all([
    getUserGitHubAccount(user.id),
    getProjectGitHubRepo(context.project.id),
  ]);

  let liveCommits: Awaited<ReturnType<typeof getProjectLiveCommits>> = [];
  let livePullRequests: Awaited<ReturnType<typeof getProjectLivePullRequests>> = [];
  let webhookEvents: Awaited<ReturnType<typeof getProjectWebhookEvents>> = [];

  if (connectedRepo) {
    const [commits, prs, events] = await Promise.all([
      getProjectLiveCommits(context.project.id),
      getProjectLivePullRequests(context.project.id),
      getProjectWebhookEvents(context.project.id),
    ]);
    liveCommits = commits;
    livePullRequests = prs;
    webhookEvents = events;
  }

  return (
    <GitHubIntegrationView
      project={context.project}
      role={context.role}
      userGithubAccount={userGithubAccount}
      connectedRepo={connectedRepo}
      liveCommits={liveCommits}
      livePullRequests={livePullRequests}
      webhookEvents={webhookEvents}
    />
  );
}
