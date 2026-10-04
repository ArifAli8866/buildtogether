import 'server-only';
import type {
  GitHubRepoOption,
  GitHubBranchInfo,
  GitHubCommitInfo,
  GitHubPullRequestInfo,
} from '@/types/database';

const GITHUB_API_BASE = 'https://api.github.com';

function getGitHubHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Build-Together-Collaboration-Platform',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Builds the GitHub OAuth authorization URL with CSRF state token.
 */
export function getOAuthAuthorizationUrl(state: string, redirectUri: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user,repo',
    state,
    allow_signup: 'true',
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchanges an OAuth code for an access token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; scope: string; tokenType: string }> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials are not configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Build-Together-Collaboration-Platform',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error || 'Failed to exchange OAuth code');
  }

  return {
    accessToken: data.access_token,
    scope: data.scope || 'read:user,repo',
    tokenType: data.token_type || 'bearer',
  };
}

/**
 * Fetches the authenticated GitHub user profile.
 */
export async function getAuthenticatedGitHubUser(token: string): Promise<{
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  email: string | null;
}> {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: getGitHubHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch GitHub user profile: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Lists repositories accessible by the user where they have push or admin rights.
 */
export async function listUserAccessibleRepositories(token: string): Promise<GitHubRepoOption[]> {
  const res = await fetch(
    `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member`,
    {
      headers: getGitHubHeaders(token),
      next: { revalidate: 30 },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch repositories: ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  // Filter to repositories where user can push or admin
  return data
    .filter((repo) => repo.permissions?.push || repo.permissions?.admin)
    .map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner?.login || '',
      is_private: repo.private ?? false,
      html_url: repo.html_url,
      description: repo.description || null,
      default_branch: repo.default_branch || 'main',
      permissions: {
        admin: !!repo.permissions?.admin,
        push: !!repo.permissions?.push,
        pull: !!repo.permissions?.pull,
      },
    }));
}

/**
 * Fetches single repository metadata from GitHub and checks permissions.
 */
export async function getRepositoryDetails(
  token: string,
  owner: string,
  repo: string
): Promise<{
  id: number;
  name: string;
  full_name: string;
  owner: string;
  is_private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  open_issues_count: number;
  stars_count: number;
  forks_count: number;
  permissions?: { admin: boolean; push: boolean; pull: boolean };
}> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: getGitHubHeaders(token),
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Repository ${owner}/${repo} not found or inaccessible`);
    }
    throw new Error(`Failed to fetch repository details: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    full_name: data.full_name,
    owner: data.owner?.login || owner,
    is_private: data.private ?? false,
    html_url: data.html_url,
    description: data.description || null,
    default_branch: data.default_branch || 'main',
    open_issues_count: data.open_issues_count || 0,
    stars_count: data.stargazers_count || 0,
    forks_count: data.forks_count || 0,
    permissions: data.permissions,
  };
}

/**
 * Fetches branches for a repository.
 */
export async function getRepositoryBranches(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubBranchInfo[]> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=30`, {
    headers: getGitHubHeaders(token),
  });

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((b) => ({
    name: b.name,
    commit_sha: b.commit?.sha || '',
    protected: !!b.protected,
  }));
}

/**
 * Fetches recent commits for a repository.
 */
export async function getRepositoryRecentCommits(
  token: string,
  owner: string,
  repo: string,
  branch?: string,
  perPage = 10
): Promise<GitHubCommitInfo[]> {
  const url = new URL(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits`);
  url.searchParams.set('per_page', perPage.toString());
  if (branch) url.searchParams.set('sha', branch);

  const res = await fetch(url.toString(), {
    headers: getGitHubHeaders(token),
  });

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((c) => ({
    sha: c.sha?.slice(0, 7) || '',
    message: c.commit?.message?.split('\n')[0] || 'Commit',
    author_name: c.commit?.author?.name || c.author?.login || 'Unknown',
    author_date: c.commit?.author?.date || '',
    html_url: c.html_url || '',
  }));
}

/**
 * Fetches pull requests for a repository.
 */
export async function getRepositoryPullRequests(
  token: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubPullRequestInfo[]> {
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=${state}&per_page=15`,
    {
      headers: getGitHubHeaders(token),
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    html_url: pr.html_url,
    user_login: pr.user?.login || 'Unknown',
    user_avatar_url: pr.user?.avatar_url || null,
    created_at: pr.created_at,
    merged_at: pr.merged_at || null,
    head_branch: pr.head?.ref || '',
    base_branch: pr.base?.ref || '',
  }));
}

/**
 * Registers a repository webhook for push and pull_request events.
 */
export async function registerRepositoryWebhook(
  token: string,
  owner: string,
  repo: string,
  webhookUrl: string,
  webhookSecret: string
): Promise<{ hookId: number } | null> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        ...getGitHubHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request', 'pull_request_review'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: webhookSecret,
          insecure_ssl: '0',
        },
      }),
    });

    if (!res.ok) {
      console.warn(`Could not create GitHub webhook on ${owner}/${repo}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return { hookId: data.id };
  } catch (err) {
    console.warn('Failed to register GitHub webhook:', err);
    return null;
  }
}

/**
 * Removes a repository webhook when disconnecting.
 */
export async function unregisterRepositoryWebhook(
  token: string,
  owner: string,
  repo: string,
  hookId: number
): Promise<boolean> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/hooks/${hookId}`, {
      method: 'DELETE',
      headers: getGitHubHeaders(token),
    });
    return res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Creates a new branch from a base branch, commits files, and creates a GitHub Pull Request.
 * Explicitly permissioned and called only upon manual user confirmation.
 */
export async function createPullRequestWithChanges(
  token: string,
  owner: string,
  repo: string,
  options: {
    baseBranch: string;
    newBranchName: string;
    commitMessage: string;
    prTitle: string;
    prBody: string;
    files: Array<{ filePath: string; content: string }>;
  }
): Promise<{ prUrl: string; prNumber: number; prStatus: string; headBranch: string }> {
  const headers = getGitHubHeaders(token);

  // 1. Get reference of base branch to obtain current commit SHA
  const refRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${options.baseBranch}`,
    { headers }
  );

  if (!refRes.ok) {
    throw new Error(`Base branch '${options.baseBranch}' not found on GitHub.`);
  }

  const refData = await refRes.json();
  const baseSha = refData.object?.sha;
  if (!baseSha) {
    throw new Error(`Failed to determine base commit for branch '${options.baseBranch}'.`);
  }

  // 2. Get base commit to read its base tree SHA
  const commitRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${baseSha}`,
    { headers }
  );
  if (!commitRes.ok) {
    throw new Error(`Failed to fetch base commit ${baseSha}.`);
  }
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree?.sha;

  // 3. Create Git blobs for each changed file
  const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  for (const f of options.files) {
    const blobRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: f.content,
        encoding: 'utf-8',
      }),
    });

    if (!blobRes.ok) {
      throw new Error(`Failed to create blob for ${f.filePath}.`);
    }

    const blobData = await blobRes.json();
    treeItems.push({
      path: f.filePath,
      mode: '100644', // standard file
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // 4. Create new Git tree based on the base tree
  const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems,
    }),
  });

  if (!treeRes.ok) {
    throw new Error('Failed to create Git tree on GitHub.');
  }

  const treeData = await treeRes.json();
  const newTreeSha = treeData.sha;

  // 5. Create new commit pointing to parent baseSha and newTreeSha
  const newCommitRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: options.commitMessage,
      tree: newTreeSha,
      parents: [baseSha],
    }),
  });

  if (!newCommitRes.ok) {
    throw new Error('Failed to create Git commit on GitHub.');
  }

  const newCommitData = await newCommitRes.json();
  const newCommitSha = newCommitData.sha;

  // 6. Create new branch ref pointing to newCommitSha
  const createRefRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: `refs/heads/${options.newBranchName}`,
      sha: newCommitSha,
    }),
  });

  if (!createRefRes.ok) {
    // If branch already exists, update it
    if (createRefRes.status === 422) {
      await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${options.newBranchName}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: newCommitSha, force: false }),
        }
      );
    } else {
      throw new Error(`Failed to create branch '${options.newBranchName}' on GitHub.`);
    }
  }

  // 7. Create Pull Request
  const prRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: options.prTitle,
      body: options.prBody,
      head: options.newBranchName,
      base: options.baseBranch,
    }),
  });

  if (!prRes.ok) {
    const errorData = await prRes.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to create Pull Request: ${prRes.statusText}`
    );
  }

  const prData = await prRes.json();
  return {
    prUrl: prData.html_url,
    prNumber: prData.number,
    prStatus: prData.state || 'open',
    headBranch: options.newBranchName,
  };
}
