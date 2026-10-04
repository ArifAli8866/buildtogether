'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { encryptSecret, decryptSecret } from '@/lib/crypto/tokens';
import {
  getOAuthAuthorizationUrl,
  listUserAccessibleRepositories,
  getRepositoryDetails,
  getRepositoryBranches,
  registerRepositoryWebhook,
  unregisterRepositoryWebhook,
  createPullRequestWithChanges,
} from '@/lib/github/api';
import {
  connectRepoSchema,
  disconnectRepoSchema,
  syncRepoSchema,
  createPrFromReviewSchema,
  type ConnectRepoInput,
  type DisconnectRepoInput,
  type SyncRepoInput,
  type CreatePrFromReviewInput,
} from '@/lib/validators/github';
import type { ActionResult } from '@/types/api';
import type {
  ProjectMemberRole,
  GitHubRepoOption,
  ProjectGithubRepo,
} from '@/types/database';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface MemberContext {
  isMember: boolean;
  role: ProjectMemberRole;
  isAdmin: boolean;
  projectSlug: string;
}

async function verifyMemberAccess(
  supabase: SupabaseServerClient,
  projectId: string,
  userId: string
): Promise<MemberContext | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, owner_id')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return null;

  if (project.owner_id === userId) {
    return {
      isMember: true,
      role: 'owner',
      isAdmin: true,
      projectSlug: project.slug,
    };
  }

  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!member) return null;

  const role = member.role as ProjectMemberRole;
  return {
    isMember: true,
    role,
    isAdmin: role === 'owner' || role === 'maintainer',
    projectSlug: project.slug,
  };
}

async function recordActivity(
  supabase: SupabaseServerClient,
  event: {
    projectId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from('activity_logs').insert({
      project_id: event.projectId,
      actor_id: event.actorId,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      metadata: event.metadata || {},
    });
  } catch (err) {
    console.error('Failed to append activity log:', err);
  }
}

/**
 * Initiates the GitHub OAuth flow by generating a secure CSRF state token and cookie.
 */
export async function initiateGitHubOAuthAction(options?: {
  projectId?: string;
  returnPath?: string;
}): Promise<ActionResult<{ authUrl: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in to connect GitHub.' },
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const callbackUrl = `${appUrl}/api/github/callback`;

  // Generate random CSRF state token with embedded metadata
  const stateRandom = crypto.randomUUID();
  const statePayload = {
    nonce: stateRandom,
    userId: user.id,
    projectId: options?.projectId || null,
    returnPath: options?.returnPath || null,
    createdAt: Date.now(),
  };

  const stateString = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  // Store in secure httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set('bt_github_oauth_state', stateRandom, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  try {
    const authUrl = getOAuthAuthorizationUrl(stateString, callbackUrl);
    return {
      success: true,
      data: { authUrl },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Failed to generate OAuth URL',
      },
    };
  }
}

/**
 * Disconnects the user's personal GitHub account connection.
 */
export async function disconnectUserGitHubAccountAction(): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const { error } = await supabase
    .from('user_github_accounts')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  return { success: true, data: undefined, message: 'GitHub account disconnected.' };
}

/**
 * Lists repositories accessible by the connected GitHub user for project admins.
 */
export async function getAvailableRepositoriesAction(
  projectId: string
): Promise<ActionResult<GitHubRepoOption[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, projectId, user.id);
  if (!context || !context.isAdmin) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only project admins can view connectable repositories.' },
    };
  }

  const { data: ghAccount } = await supabase
    .from('user_github_accounts')
    .select('encrypted_access_token')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!ghAccount || !ghAccount.encrypted_access_token) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Please connect your personal GitHub account first.',
      },
    };
  }

  try {
    const token = decryptSecret(ghAccount.encrypted_access_token);
    const repos = await listUserAccessibleRepositories(token);
    return { success: true, data: repos };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch repositories from GitHub.',
      },
    };
  }
}

/**
 * Connects an external GitHub repository to a Build Together project.
 * Strictly verifies admin role and repo permissions on GitHub.
 */
export async function connectProjectRepositoryAction(
  rawInput: ConnectRepoInput
): Promise<ActionResult<ProjectGithubRepo>> {
  const validated = connectRepoSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context || !context.isAdmin) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only project admins can connect a repository.' },
    };
  }

  // 1. Fetch user's GitHub token
  const { data: ghAccount } = await supabase
    .from('user_github_accounts')
    .select('encrypted_access_token')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!ghAccount || !ghAccount.encrypted_access_token) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Connect your personal GitHub account first.' },
    };
  }

  const token = decryptSecret(ghAccount.encrypted_access_token);

  // 2. Verify repository on GitHub and ensure push/admin permissions
  let repoDetails;
  try {
    repoDetails = await getRepositoryDetails(token, validated.repoOwner, validated.repoName);
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: err instanceof Error ? err.message : 'Repository not found on GitHub.',
      },
    };
  }

  if (repoDetails.permissions && !repoDetails.permissions.push && !repoDetails.permissions.admin) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have write or admin permissions on this GitHub repository.',
      },
    };
  }

  // 3. Register webhook if configured
  let webhookId: number | null = null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (appUrl && webhookSecret) {
    const webhookUrl = `${appUrl}/api/github/webhooks`;
    const hookRes = await registerRepositoryWebhook(
      token,
      validated.repoOwner,
      validated.repoName,
      webhookUrl,
      webhookSecret
    );
    if (hookRes) webhookId = hookRes.hookId;
  }

  // 4. Fetch branches for cache
  const branches = await getRepositoryBranches(token, validated.repoOwner, validated.repoName);
  const branchNames = branches.map((b) => b.name);

  // 5. Encrypt token for project storage
  const encryptedProjectToken = encryptSecret(token);

  // 6. Upsert into project_github_repos
  const { data: record, error: dbError } = await supabase
    .from('project_github_repos')
    .upsert(
      {
        project_id: validated.projectId,
        connected_by: user.id,
        repo_id: repoDetails.id,
        repo_owner: repoDetails.owner,
        repo_name: repoDetails.name,
        repo_full_name: repoDetails.full_name,
        is_private: repoDetails.is_private,
        html_url: repoDetails.html_url,
        description: repoDetails.description,
        default_branch: validated.defaultBranch || repoDetails.default_branch,
        encrypted_access_token: encryptedProjectToken,
        webhook_id: webhookId,
        sync_status: 'connected',
        branches_cached: branchNames,
        open_issues_count: repoDetails.open_issues_count,
        stars_count: repoDetails.stars_count,
        forks_count: repoDetails.forks_count,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    )
    .select('*')
    .single();

  if (dbError || !record) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: dbError?.message || 'Failed to save repository.' },
    };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'github_repo_connected',
    entityType: 'github_repo',
    entityId: record.id,
    metadata: {
      repoFullName: repoDetails.full_name,
      repoId: repoDetails.id,
      webhookConfigured: !!webhookId,
    },
  });

  revalidatePath(`/projects/${context.projectSlug}/workspace`);
  revalidatePath(`/projects/${context.projectSlug}/workspace/github`);
  revalidatePath(`/projects/${context.projectSlug}/workspace/code`);

  return {
    success: true,
    data: record as ProjectGithubRepo,
    message: `Connected ${repoDetails.full_name} successfully.`,
  };
}

/**
 * Disconnects the GitHub repository from the project.
 */
export async function disconnectProjectRepositoryAction(
  rawInput: DisconnectRepoInput
): Promise<ActionResult<void>> {
  const validated = disconnectRepoSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context || !context.isAdmin) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only project admins can disconnect the repository.' },
    };
  }

  const { data: existing } = await supabase
    .from('project_github_repos')
    .select('id, repo_owner, repo_name, repo_full_name, webhook_id, encrypted_access_token')
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'No repository is connected.' } };
  }

  // Attempt to delete webhook on GitHub if token and webhook_id exist
  if (existing.webhook_id && existing.encrypted_access_token) {
    try {
      const token = decryptSecret(existing.encrypted_access_token);
      await unregisterRepositoryWebhook(
        token,
        existing.repo_owner,
        existing.repo_name,
        existing.webhook_id
      );
    } catch (err) {
      console.warn('Could not unregister webhook during disconnect:', err);
    }
  }

  const { error: deleteError } = await supabase
    .from('project_github_repos')
    .delete()
    .eq('project_id', validated.projectId);

  if (deleteError) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: deleteError.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'github_repo_disconnected',
    entityType: 'github_repo',
    entityId: existing.id,
    metadata: { repoFullName: existing.repo_full_name },
  });

  revalidatePath(`/projects/${context.projectSlug}/workspace`);
  revalidatePath(`/projects/${context.projectSlug}/workspace/github`);
  revalidatePath(`/projects/${context.projectSlug}/workspace/code`);

  return { success: true, data: undefined, message: 'Repository disconnected.' };
}

/**
 * Triggers manual synchronization of branches, PRs, and repository metadata.
 */
export async function syncProjectRepositoryAction(
  rawInput: SyncRepoInput
): Promise<ActionResult<{ syncedAt: string }>> {
  const validated = syncRepoSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a project member.' } };
  }

  const { data: repo } = await supabase
    .from('project_github_repos')
    .select('id, repo_owner, repo_name, encrypted_access_token')
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!repo || !repo.encrypted_access_token) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'No connected repository found.' } };
  }

  try {
    const token = decryptSecret(repo.encrypted_access_token);
    const [details, branches] = await Promise.all([
      getRepositoryDetails(token, repo.repo_owner, repo.repo_name),
      getRepositoryBranches(token, repo.repo_owner, repo.repo_name),
    ]);

    const now = new Date().toISOString();
    await supabase
      .from('project_github_repos')
      .update({
        stars_count: details.stars_count,
        forks_count: details.forks_count,
        open_issues_count: details.open_issues_count,
        branches_cached: branches.map((b) => b.name),
        last_synced_at: now,
        sync_status: 'synced',
      })
      .eq('id', repo.id);

    await recordActivity(supabase, {
      projectId: validated.projectId,
      actorId: user.id,
      action: 'github_repo_synced',
      entityType: 'github_repo',
      entityId: repo.id,
      metadata: { branchCount: branches.length },
    });

    revalidatePath(`/projects/${context.projectSlug}/workspace/github`);
    revalidatePath(`/projects/${context.projectSlug}/workspace/code`);

    return { success: true, data: { syncedAt: now }, message: 'Repository synced.' };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Sync failed',
      },
    };
  }
}

/**
 * Pushes approved code review changes to GitHub and creates a Pull Request.
 * Explicitly permissioned and requires user confirmation.
 */
export async function createGitHubPullRequestFromReviewAction(
  rawInput: CreatePrFromReviewInput
): Promise<ActionResult<{ prUrl: string; prNumber: number }>> {
  const validated = createPrFromReviewSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a project member.' } };
  }

  // 1. Fetch code review and verify approval
  const { data: review } = await supabase
    .from('code_reviews')
    .select('id, author_id, title, summary, base_branch, target_branch, status, github_pr_url')
    .eq('id', validated.reviewId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!review) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Code review not found.' } };
  }

  // HARD ARCHITECTURAL ENFORCEMENT: Only approved reviews can create GitHub PRs!
  if (review.status !== 'approved') {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Only approved code reviews can be exported to GitHub Pull Requests.',
      },
    };
  }

  if (review.github_pr_url) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A GitHub Pull Request has already been created for this review.',
      },
    };
  }

  // 2. Fetch connected repository
  const { data: repo } = await supabase
    .from('project_github_repos')
    .select('repo_owner, repo_name, default_branch, encrypted_access_token')
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!repo || !repo.encrypted_access_token) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Please connect a GitHub repository to this project before creating PRs.',
      },
    };
  }

  // 3. Fetch changed files
  const { data: files } = await supabase
    .from('code_review_files')
    .select('file_path, change_type, new_content')
    .eq('code_review_id', validated.reviewId);

  if (!files || files.length === 0) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'No changed files in this code review.' },
    };
  }

  const token = decryptSecret(repo.encrypted_access_token);

  // 4. Create branch, commit files, and create PR on GitHub
  try {
    const prResult = await createPullRequestWithChanges(
      token,
      repo.repo_owner,
      repo.repo_name,
      {
        baseBranch: review.base_branch || repo.default_branch || 'main',
        newBranchName: validated.branchName,
        commitMessage: `Build Together: ${review.title}`,
        prTitle: validated.prTitle,
        prBody: `${validated.prBody}\n\n---\n*Created via [Build Together](${process.env.NEXT_PUBLIC_APP_URL || ''}) Review #${review.id.slice(0, 8)}*`,
        files: files.map((f) => ({
          filePath: f.file_path,
          content: f.new_content,
        })),
      }
    );

    // 5. Update code review with PR URL and metadata
    await supabase
      .from('code_reviews')
      .update({
        github_pr_url: prResult.prUrl,
        github_pr_number: prResult.prNumber,
        github_pr_status: prResult.prStatus,
        github_head_branch: prResult.headBranch,
      })
      .eq('id', validated.reviewId);

    // 6. Record activity
    await recordActivity(supabase, {
      projectId: validated.projectId,
      actorId: user.id,
      action: 'github_pull_request_created',
      entityType: 'code_review',
      entityId: validated.reviewId,
      metadata: {
        prUrl: prResult.prUrl,
        prNumber: prResult.prNumber,
        branch: prResult.headBranch,
      },
    });

    revalidatePath(`/projects/${context.projectSlug}/workspace/code`);
    revalidatePath(`/projects/${context.projectSlug}/workspace/code/${validated.reviewId}`);
    revalidatePath(`/projects/${context.projectSlug}/workspace/github`);

    return {
      success: true,
      data: {
        prUrl: prResult.prUrl,
        prNumber: prResult.prNumber,
      },
      message: `Pull request #${prResult.prNumber} created on GitHub.`,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Failed to create GitHub Pull Request.',
      },
    };
  }
}
