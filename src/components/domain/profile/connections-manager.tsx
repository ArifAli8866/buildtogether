'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { SanitizedUserGithubAccount } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  initiateGitHubOAuthAction,
  disconnectUserGitHubAccountAction,
} from '@/lib/actions/github';
import { GitFork, ShieldCheck, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface ConnectionsManagerProps {
  userGithubAccount: SanitizedUserGithubAccount | null;
}

export function ConnectionsManager({ userGithubAccount }: ConnectionsManagerProps) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccess(null);

    const res = await initiateGitHubOAuthAction({
      returnPath: '/settings/connections',
    });

    setIsConnecting(false);

    if (res.success) {
      window.location.href = res.data.authUrl;
    } else {
      setError(res.error.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account? You will need to reconnect it to link repositories or export PRs.')) {
      return;
    }

    setIsDisconnecting(true);
    setError(null);
    setSuccess(null);

    const res = await disconnectUserGitHubAccountAction();
    setIsDisconnecting(false);

    if (!res.success) {
      setError(res.error.message);
      return;
    }

    setSuccess('GitHub account disconnected successfully.');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h2 className="text-lg font-semibold text-content-primary">Connected Accounts</h2>
        <p className="text-xs text-content-muted mt-1">
          Manage third-party integrations and service connections linked to your Build Together profile.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* GitHub Account Connection Card */}
      <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-surface-2 text-content-primary shrink-0">
              <GitFork className="h-5 w-5" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-content-primary">GitHub</h3>
                {userGithubAccount ? (
                  <Badge variant="success" size="sm" className="text-[10px] py-0 px-1.5">
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm" className="text-[10px] py-0 px-1.5">
                    Not connected
                  </Badge>
                )}
              </div>

              {userGithubAccount ? (
                <div className="flex items-center gap-2">
                  <Avatar
                    src={userGithubAccount.avatarUrl || undefined}
                    alt={userGithubAccount.githubUsername}
                    size="sm"
                    fallbackText={userGithubAccount.githubUsername}
                    className="h-4 w-4"
                  />
                  <span className="font-mono text-xs text-content-secondary">
                    @{userGithubAccount.githubUsername}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-content-muted">
                  Connect your GitHub account to link external repositories and export code reviews.
                </p>
              )}
            </div>
          </div>

          <div className="self-start sm:self-auto shrink-0">
            {userGithubAccount ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                isLoading={isDisconnecting}
                className="text-xs h-8 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnect}
                isLoading={isConnecting}
                className="gap-2 text-xs h-8"
              >
                <GitFork className="h-3.5 w-3.5" />
                <span>Connect GitHub</span>
              </Button>
            )}
          </div>
        </div>

        {userGithubAccount && (
          <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-[11px] text-content-muted">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Connected on {new Date(userGithubAccount.connectedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>OAuth Token Encrypted with AES-256-GCM</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
