import * as React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getUserGitHubAccount } from '@/lib/queries/github';
import { ConnectionsManager } from '@/components/domain/profile/connections-manager';

export const metadata: Metadata = {
  title: 'Connected Accounts — Settings | Build Together',
  description: 'Manage your connected third-party developer integrations.',
};

export default async function SettingsConnectionsPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect('/login?returnTo=/settings/connections');
  }

  const userGithubAccount = await getUserGitHubAccount(user.id);

  return <ConnectionsManager userGithubAccount={userGithubAccount} />;
}
