import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { decryptSecret } from '@/lib/crypto/tokens';
import {
  getRepositoryRecentCommits,
  getRepositoryPullRequests,
  getRepositoryBranches,
} from '@/lib/github/api';
import type {
  SanitizedProjectGithubRepo,
  SanitizedUserGithubAccount,
  GitHubCommitInfo,
  GitHubPullRequestInfo,
  GitHubBranchInfo,
  GithubWebhookEvent,
} from '@/types/database';

export type { SanitizedUserGithubAccount, SanitizedProjectGithubRepo };

/**
 * Returns the authenticated user's connected GitHub account metadata.
 * Strips the encrypted access token.
 */
export async function getUserGitHubAccount(
  userId: string
): Promise<SanitizedUserGithubAccount | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_github_accounts')
    .select('id, github_username, avatar_url, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    githubUsername: data.github_username,
    avatarUrl: data.avatar_url,
    connectedAt: data.created_at,
  };
}

/**
 * Returns the connected GitHub repository metadata for a project.
 * Strips the encrypted token before returning.
 */
export async function getProjectGitHubRepo(
  projectId: string
): Promise<SanitizedProjectGithubRepo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_github_repos')
    .select(
      'id, project_id, connected_by, repo_id, repo_owner, repo_name, repo_full_name, is_private, html_url, description, default_branch, webhook_id, sync_status, branches_cached, open_issues_count, stars_count, forks_count, last_synced_at, created_at, updated_at'
    )
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    branches_cached: Array.isArray(data.branches_cached) ? data.branches_cached : [],
    isConnected: true,
  };
}

/**
 * Fetches live repository commits from GitHub for display in the project workspace.
 */
export async function getProjectLiveCommits(
  projectId: string,
  branch?: string,
  limit = 8
): Promise<GitHubCommitInfo[]> {
  const supabase = await createClient();
  const { data: repo } = await supabase
    .from('project_github_repos')
    .select('repo_owner, repo_name, encrypted_access_token')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!repo || !repo.encrypted_access_token) return [];

  try {
    const token = decryptSecret(repo.encrypted_access_token);
    return await getRepositoryRecentCommits(
      token,
      repo.repo_owner,
      repo.repo_name,
      branch,
      limit
    );
  } catch (err) {
    console.error('Failed to fetch live repository commits:', err);
    return [];
  }
}

/**
 * Fetches live pull requests from GitHub for display in the project workspace.
 */
export async function getProjectLivePullRequests(
  projectId: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubPullRequestInfo[]> {
  const supabase = await createClient();
  const { data: repo } = await supabase
    .from('project_github_repos')
    .select('repo_owner, repo_name, encrypted_access_token')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!repo || !repo.encrypted_access_token) return [];

  try {
    const token = decryptSecret(repo.encrypted_access_token);
    return await getRepositoryPullRequests(
      token,
      repo.repo_owner,
      repo.repo_name,
      state
    );
  } catch (err) {
    console.error('Failed to fetch live repository pull requests:', err);
    return [];
  }
}

/**
 * Fetches live repository branches from GitHub.
 */
export async function getProjectLiveBranches(
  projectId: string
): Promise<GitHubBranchInfo[]> {
  const supabase = await createClient();
  const { data: repo } = await supabase
    .from('project_github_repos')
    .select('repo_owner, repo_name, encrypted_access_token')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!repo || !repo.encrypted_access_token) return [];

  try {
    const token = decryptSecret(repo.encrypted_access_token);
    return await getRepositoryBranches(token, repo.repo_owner, repo.repo_name);
  } catch (err) {
    console.error('Failed to fetch live repository branches:', err);
    return [];
  }
}

/**
 * Fetches recent GitHub webhook delivery events for a project (admin audit log).
 */
export async function getProjectWebhookEvents(
  projectId: string,
  limit = 15
): Promise<GithubWebhookEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('github_webhook_events')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as GithubWebhookEvent[];
}
