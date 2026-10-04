'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type {
  Project,
  ProjectMemberRole,
  GitHubCommitInfo,
  GitHubPullRequestInfo,
  GitHubRepoOption,
  GithubWebhookEvent,
} from '@/types/database';
import type {
  SanitizedUserGithubAccount,
  SanitizedProjectGithubRepo,
} from '@/lib/queries/github';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  initiateGitHubOAuthAction,
  disconnectUserGitHubAccountAction,
  getAvailableRepositoriesAction,
  connectProjectRepositoryAction,
  disconnectProjectRepositoryAction,
  syncProjectRepositoryAction,
} from '@/lib/actions/github';
import {
  GitFork,
  GitPullRequest,
  GitCommit,
  GitBranch,
  RefreshCw,
  ExternalLink,
  Shield,
  ShieldCheck,
  AlertCircle,
  Star,
  Lock,
  Globe,
  Radio,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';

interface GitHubIntegrationViewProps {
  project: Project;
  role: ProjectMemberRole;
  userGithubAccount: SanitizedUserGithubAccount | null;
  connectedRepo: SanitizedProjectGithubRepo | null;
  liveCommits: GitHubCommitInfo[];
  livePullRequests: GitHubPullRequestInfo[];
  webhookEvents: GithubWebhookEvent[];
}

export function GitHubIntegrationView({
  project,
  role,
  userGithubAccount,
  connectedRepo,
  liveCommits,
  livePullRequests,
  webhookEvents,
}: GitHubIntegrationViewProps) {
  const router = useRouter();
  const isAdmin = role === 'owner' || role === 'maintainer';

  const [activeTab, setActiveTab] = React.useState<'commits' | 'pulls' | 'webhooks'>('commits');
  const [isConnectingOAuth, setIsConnectingOAuth] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isDisconnectingRepo, setIsDisconnectingRepo] = React.useState(false);
  const [isDisconnectingAccount, setIsDisconnectingAccount] = React.useState(false);

  // Connect repo flow state
  const [availableRepos, setAvailableRepos] = React.useState<GitHubRepoOption[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = React.useState(false);
  const [selectedRepo, setSelectedRepo] = React.useState<GitHubRepoOption | null>(null);
  const [repoSearch, setRepoSearch] = React.useState('');
  const [isConnectingRepo, setIsConnectingRepo] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Fetch available repos when admin has account connected but project has no repo
  React.useEffect(() => {
    if (isAdmin && userGithubAccount && !connectedRepo) {
      setIsLoadingRepos(true);
      getAvailableRepositoriesAction(project.id)
        .then((res) => {
          setIsLoadingRepos(false);
          if (res.success) {
            setAvailableRepos(res.data);
          } else {
            setActionError(res.error.message);
          }
        })
        .catch(() => {
          setIsLoadingRepos(false);
          setActionError('Failed to fetch repositories.');
        });
    }
  }, [isAdmin, userGithubAccount, connectedRepo, project.id]);

  const handleConnectOAuth = async () => {
    setIsConnectingOAuth(true);
    setActionError(null);
    const res = await initiateGitHubOAuthAction({
      projectId: project.id,
      returnPath: `/projects/${project.slug}/workspace/github`,
    });
    setIsConnectingOAuth(false);

    if (res.success) {
      window.location.href = res.data.authUrl;
    } else {
      setActionError(res.error.message);
    }
  };

  const handleDisconnectAccount = async () => {
    if (!confirm('Are you sure you want to disconnect your personal GitHub account?')) return;
    setIsDisconnectingAccount(true);
    const res = await disconnectUserGitHubAccountAction();
    setIsDisconnectingAccount(false);
    if (res.success) {
      router.refresh();
    } else {
      setActionError(res.error.message);
    }
  };

  const handleConnectRepo = async () => {
    if (!selectedRepo) return;
    setIsConnectingRepo(true);
    setActionError(null);
    setActionSuccess(null);

    const res = await connectProjectRepositoryAction({
      projectId: project.id,
      repoId: selectedRepo.id,
      repoOwner: selectedRepo.owner,
      repoName: selectedRepo.name,
      defaultBranch: selectedRepo.default_branch,
    });

    setIsConnectingRepo(false);

    if (!res.success) {
      setActionError(res.error.message);
      return;
    }

    setActionSuccess(`Successfully connected ${selectedRepo.full_name}`);
    router.refresh();
  };

  const handleDisconnectRepo = async () => {
    if (
      !confirm(
        `Are you sure you want to disconnect ${connectedRepo?.repo_full_name}? Existing workspace files and reviews will not be deleted.`
      )
    )
      return;

    setIsDisconnectingRepo(true);
    setActionError(null);

    const res = await disconnectProjectRepositoryAction({
      projectId: project.id,
    });

    setIsDisconnectingRepo(false);

    if (!res.success) {
      setActionError(res.error.message);
      return;
    }

    router.refresh();
  };

  const handleSyncRepo = async () => {
    setIsSyncing(true);
    setActionError(null);
    setActionSuccess(null);

    const res = await syncProjectRepositoryAction({
      projectId: project.id,
    });

    setIsSyncing(false);

    if (!res.success) {
      setActionError(res.error.message);
      return;
    }

    setActionSuccess('Repository synchronized with GitHub.');
    router.refresh();
  };

  const filteredRepos = availableRepos.filter(
    (r) =>
      r.full_name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-content-primary">GitHub Integration</h1>
            {connectedRepo ? (
              <Badge variant="success" size="sm" className="gap-1 text-[11px]">
                <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-400" />
                <span>Connected</span>
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm" className="text-[11px]">
                Not Connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-content-muted mt-1">
            Connect an external repository to sync commits, track pull requests, and export approved code changes.
          </p>
        </div>

        {/* Global Action Header Button */}
        {connectedRepo && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncRepo}
              isLoading={isSyncing}
              className="gap-1.5 text-xs h-8"
              title="Synchronize repository state"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync GitHub</span>
            </Button>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectRepo}
                isLoading={isDisconnectingRepo}
                className="gap-1.5 text-xs h-8 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
                title="Disconnect repository from this project"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* SECTION 1: Personal GitHub Account Status */}
      <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-surface-2 text-content-primary">
              <GitFork className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-content-primary">Your GitHub Identity</h2>
              {userGithubAccount ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <Avatar
                    src={userGithubAccount.avatarUrl || undefined}
                    alt={userGithubAccount.githubUsername}
                    size="sm"
                    fallbackText={userGithubAccount.githubUsername}
                  />
                  <span className="text-xs text-content-secondary font-mono">
                    @{userGithubAccount.githubUsername}
                  </span>
                  <Badge variant="success" size="sm" className="text-[10px] py-0 px-1.5">
                    Authorized
                  </Badge>
                </div>
              ) : (
                <p className="text-xs text-content-muted mt-0.5">
                  Connect your personal GitHub account to authorize repository operations.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {userGithubAccount ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnectAccount}
                isLoading={isDisconnectingAccount}
                className="text-xs h-8 text-content-muted hover:text-red-400"
              >
                Disconnect Account
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnectOAuth}
                isLoading={isConnectingOAuth}
                className="gap-1.5 text-xs h-8"
              >
                <GitFork className="h-3.5 w-3.5" />
                <span>Connect GitHub Account</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Project Repository Connection State */}
      {connectedRepo ? (
        /* CONNECTED STATE */
        <div className="space-y-6">
          {/* Repository Summary Card */}
          <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <a
                    href={connectedRepo.html_url || `https://github.com/${connectedRepo.repo_full_name}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-base font-bold text-content-primary hover:text-accent-primary flex items-center gap-1.5 group"
                  >
                    <span>{connectedRepo.repo_full_name}</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                  </a>

                  {connectedRepo.is_private ? (
                    <Badge variant="neutral" size="sm" className="gap-1 text-[11px]">
                      <Lock className="h-2.5 w-2.5" />
                      <span>Private</span>
                    </Badge>
                  ) : (
                    <Badge variant="info" size="sm" className="gap-1 text-[11px]">
                      <Globe className="h-2.5 w-2.5" />
                      <span>Public</span>
                    </Badge>
                  )}

                  <Badge variant="accent" size="sm" className="gap-1 text-[11px] font-mono">
                    <GitBranch className="h-2.5 w-2.5" />
                    <span>{connectedRepo.default_branch}</span>
                  </Badge>
                </div>

                {connectedRepo.description && (
                  <p className="text-xs text-content-secondary max-w-2xl">
                    {connectedRepo.description}
                  </p>
                )}
              </div>

              {/* Stats Counters */}
              <div className="flex items-center gap-3 text-xs text-content-secondary shrink-0">
                <div className="flex items-center gap-1 rounded-lg bg-app-surface-2 px-3 py-1.5 border border-border-subtle">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-semibold text-content-primary">
                    {connectedRepo.stars_count}
                  </span>
                  <span className="text-content-muted text-[11px]">stars</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-app-surface-2 px-3 py-1.5 border border-border-subtle">
                  <GitFork className="h-3.5 w-3.5 text-content-muted" />
                  <span className="font-semibold text-content-primary">
                    {connectedRepo.forks_count}
                  </span>
                  <span className="text-content-muted text-[11px]">forks</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-app-surface-2 px-3 py-1.5 border border-border-subtle">
                  <Layers className="h-3.5 w-3.5 text-content-muted" />
                  <span className="font-semibold text-content-primary">
                    {connectedRepo.open_issues_count}
                  </span>
                  <span className="text-content-muted text-[11px]">issues</span>
                </div>
              </div>
            </div>

            {/* Sync Meta Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border-subtle text-[11px] text-content-muted">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Last synced:{' '}
                  {connectedRepo.last_synced_at
                    ? new Date(connectedRepo.last_synced_at).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Encrypted AES-256-GCM token &bull; Realtime Webhook Active</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-border-subtle">
            <button
              type="button"
              onClick={() => setActiveTab('commits')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'commits'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-content-muted hover:text-content-secondary'
              }`}
            >
              <GitCommit className="h-3.5 w-3.5" />
              <span>Recent Commits</span>
              <span className="rounded-full bg-app-surface-2 px-1.5 py-0.5 text-[10px] text-content-muted">
                {liveCommits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pulls')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'pulls'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-content-muted hover:text-content-secondary'
              }`}
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span>Pull Requests</span>
              <span className="rounded-full bg-app-surface-2 px-1.5 py-0.5 text-[10px] text-content-muted">
                {livePullRequests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('webhooks')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'webhooks'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-content-muted hover:text-content-secondary'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Webhook Audit</span>
              <span className="rounded-full bg-app-surface-2 px-1.5 py-0.5 text-[10px] text-content-muted">
                {webhookEvents.length}
              </span>
            </button>
          </div>

          {/* Tab 1: Live Commits */}
          {activeTab === 'commits' && (
            <div className="space-y-3">
              {liveCommits.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-subtle p-8 text-center text-xs text-content-muted">
                  No recent commits found for default branch.
                </div>
              ) : (
                <div className="rounded-xl border border-border-subtle bg-app-surface-1 divide-y divide-border-subtle overflow-hidden">
                  {liveCommits.map((c) => (
                    <div
                      key={c.sha}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-app-surface-2/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <GitCommit className="h-4 w-4 text-content-muted shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-content-primary truncate">
                            {c.message}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-content-muted mt-0.5">
                            <span>{c.author_name}</span>
                            <span>&bull;</span>
                            <span>
                              {c.author_date ? new Date(c.author_date).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <a
                        href={c.html_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-mono text-xs text-accent-primary hover:underline shrink-0 flex items-center gap-1"
                      >
                        <span>{c.sha}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Pull Requests */}
          {activeTab === 'pulls' && (
            <div className="space-y-3">
              {livePullRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-subtle p-8 text-center text-xs text-content-muted">
                  No active pull requests in this repository.
                </div>
              ) : (
                <div className="rounded-xl border border-border-subtle bg-app-surface-1 divide-y divide-border-subtle overflow-hidden">
                  {livePullRequests.map((pr) => (
                    <div
                      key={pr.number}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-app-surface-2/40 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <GitPullRequest
                          className={`h-4 w-4 shrink-0 mt-0.5 ${
                            pr.merged_at
                              ? 'text-purple-400'
                              : pr.state === 'open'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={pr.html_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-xs font-semibold text-content-primary hover:text-accent-primary group flex items-center gap-1"
                            >
                              <span>{pr.title}</span>
                              <span className="text-content-muted font-mono">#{pr.number}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
                            </a>
                            <Badge
                              variant={
                                pr.merged_at
                                  ? 'accent'
                                  : pr.state === 'open'
                                  ? 'success'
                                  : 'danger'
                              }
                              size="sm"
                              className="text-[10px] py-0 px-1.5 capitalize"
                            >
                              {pr.merged_at ? 'Merged' : pr.state}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-content-muted mt-1 font-mono">
                            <span>
                              {pr.head_branch} &rarr; {pr.base_branch}
                            </span>
                            <span>&bull;</span>
                            <span>opened by @{pr.user_login}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Webhook Audit Trail */}
          {activeTab === 'webhooks' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent-primary" />
                    <h3 className="text-xs font-semibold text-content-primary">
                      Webhook Security & Endpoints
                    </h3>
                  </div>
                  <Badge variant="success" size="sm" className="text-[10px]">
                    HMAC Verified
                  </Badge>
                </div>
                <p className="text-xs text-content-muted">
                  GitHub delivers signed HMAC SHA-256 events to <code>/api/github/webhooks</code>. Deliveries are verified with <code>GITHUB_WEBHOOK_SECRET</code> and tracked idempotently to prevent duplicate processing.
                </p>
              </div>

              {webhookEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-subtle p-8 text-center text-xs text-content-muted">
                  No webhook events received yet. Make a push or PR on GitHub to trigger delivery.
                </div>
              ) : (
                <div className="rounded-xl border border-border-subtle bg-app-surface-1 divide-y divide-border-subtle overflow-hidden">
                  {webhookEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Activity className="h-4 w-4 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-content-primary">
                              {evt.event_type}
                            </span>
                            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                              {evt.delivery_id.slice(0, 8)}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-content-muted">
                            {new Date(evt.processed_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={evt.status === 'processed' ? 'success' : 'danger'}
                        size="sm"
                        className="text-[10px] capitalize"
                      >
                        {evt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* DISCONNECTED / CONNECT WIZARD STATE */
        <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-6 space-y-6">
          <div className="text-center max-w-md mx-auto space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
              <GitFork className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-content-primary">
              Connect a GitHub Repository
            </h2>
            <p className="text-xs text-content-muted leading-relaxed">
              Link this project with an external GitHub repository to enable code review syncing, live commit browsing, and Pull Request creation.
            </p>
          </div>

          {!userGithubAccount ? (
            <div className="text-center pt-2">
              <Button
                variant="primary"
                onClick={handleConnectOAuth}
                isLoading={isConnectingOAuth}
                className="gap-2 text-xs"
              >
                <GitFork className="h-4 w-4" />
                <span>Connect with GitHub to Continue</span>
              </Button>
            </div>
          ) : !isAdmin ? (
            <div className="rounded-lg bg-app-surface-2 p-4 text-center text-xs text-content-muted">
              Only project owners and maintainers have permission to connect a repository to this project.
            </div>
          ) : (
            /* Admin Repository Picker */
            <div className="space-y-4 pt-2 border-t border-border-subtle">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-xs font-semibold text-content-primary">
                  Select a repository from @{userGithubAccount.githubUsername}:
                </span>
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search repositories..."
                    className="w-full rounded-lg bg-app-surface-2 pl-8 pr-3 py-1.5 text-xs text-content-primary border border-border-subtle focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              {isLoadingRepos ? (
                <div className="py-8 text-center text-xs text-content-muted flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-accent-primary" />
                  <span>Loading accessible repositories...</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-8 text-center text-xs text-content-muted border border-dashed border-border-subtle rounded-lg">
                  No repositories with push/admin rights found matching your search.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {filteredRepos.map((repo) => {
                    const isSelected = selectedRepo?.id === repo.id;
                    return (
                      <div
                        key={repo.id}
                        onClick={() => setSelectedRepo(repo)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-accent-primary bg-accent-primary/10'
                            : 'border-border-subtle bg-app-surface-2/40 hover:bg-app-surface-2'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-content-primary truncate">
                              {repo.full_name}
                            </span>
                            {repo.is_private ? (
                              <Badge variant="neutral" size="sm" className="text-[10px] py-0 px-1">
                                Private
                              </Badge>
                            ) : (
                              <Badge variant="info" size="sm" className="text-[10px] py-0 px-1">
                                Public
                              </Badge>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-[11px] text-content-muted truncate mt-0.5">
                              {repo.description}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[11px] font-mono text-content-muted">
                            {repo.default_branch}
                          </span>
                          <input
                            type="radio"
                            name="selectedRepo"
                            checked={isSelected}
                            onChange={() => setSelectedRepo(repo)}
                            className="h-4 w-4 text-accent-primary"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedRepo && (
                <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-app-surface-2/40 p-4 rounded-lg">
                  <div className="text-xs">
                    <span className="text-content-muted">Selected: </span>
                    <span className="font-semibold text-content-primary">
                      {selectedRepo.full_name}
                    </span>
                    <span className="text-content-muted ml-2 font-mono">
                      ({selectedRepo.default_branch})
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConnectRepo}
                    isLoading={isConnectingRepo}
                    className="gap-1.5 text-xs h-8"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Connect {selectedRepo.name}</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
