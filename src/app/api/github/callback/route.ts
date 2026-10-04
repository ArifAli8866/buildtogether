import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, getAuthenticatedGitHubUser } from '@/lib/github/api';
import { encryptSecret } from '@/lib/crypto/tokens';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get('bt_github_oauth_state')?.value;

  // Clear CSRF cookie
  cookieStore.delete('bt_github_oauth_state');

  if (error) {
    console.warn('GitHub OAuth returned error:', error, errorDescription);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code || !state || !storedNonce) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent('Invalid OAuth callback parameters or missing state session.')}`
    );
  }

  // 1. Decode and verify CSRF state payload
  let statePayload: {
    nonce: string;
    userId: string;
    projectId?: string | null;
    returnPath?: string | null;
    createdAt: number;
  };

  try {
    const jsonStr = Buffer.from(state, 'base64url').toString('utf-8');
    statePayload = JSON.parse(jsonStr);
  } catch {
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent('Malformed OAuth state parameter.')}`
    );
  }

  // Verify nonce matches cookie
  if (statePayload.nonce !== storedNonce) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent('OAuth state mismatch (potential CSRF).')}`
    );
  }

  // Verify timestamp is within 10 minutes
  if (Date.now() - statePayload.createdAt > 10 * 60 * 1000) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent('OAuth state token expired.')}`
    );
  }

  // 2. Verify authenticated Build Together session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== statePayload.userId) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent('Session mismatch. Please sign in again.')}`
    );
  }

  // 3. Exchange code for access token
  const callbackUrl = `${appUrl}/api/github/callback`;
  let tokenData: { accessToken: string; scope: string };
  try {
    tokenData = await exchangeCodeForToken(code, callbackUrl);
  } catch (err) {
    console.error('Failed to exchange GitHub OAuth code:', err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent('Failed to exchange authorization code with GitHub.')}`
    );
  }

  // 4. Fetch authenticated GitHub user identity
  let ghUser: { id: number; login: string; avatar_url: string };
  try {
    ghUser = await getAuthenticatedGitHubUser(tokenData.accessToken);
  } catch (err) {
    console.error('Failed to fetch GitHub user identity:', err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent('Failed to fetch GitHub profile.')}`
    );
  }

  // 5. Encrypt token server-side with AES-256-GCM
  const encryptedToken = encryptSecret(tokenData.accessToken);

  // 6. Upsert user_github_accounts
  const { error: upsertError } = await supabase
    .from('user_github_accounts')
    .upsert(
      {
        user_id: user.id,
        github_user_id: ghUser.id,
        github_username: ghUser.login,
        avatar_url: ghUser.avatar_url,
        encrypted_access_token: encryptedToken,
        scope: tokenData.scope,
      },
      { onConflict: 'user_id' }
    );

  if (upsertError) {
    console.error('Failed to save GitHub account:', upsertError);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent('Failed to save GitHub credentials.')}`
    );
  }

  // 7. Determine redirect destination
  if (statePayload.projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('slug')
      .eq('id', statePayload.projectId)
      .maybeSingle();

    if (project?.slug) {
      return NextResponse.redirect(
        `${appUrl}/projects/${project.slug}/workspace/github?connected=1`
      );
    }
  }

  const destination = statePayload.returnPath || '/settings/profile?github_connected=1';
  return NextResponse.redirect(`${appUrl}${destination}`);
}
