import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, getAllSkills, getAllTechnologies } from '@/lib/queries/profile';
import { getUserConnections, getDiscoverableDevelopers } from '@/lib/queries/community';
import { NetworkView } from '@/components/domain/network/network-view';

export const metadata: Metadata = {
  title: 'Developer Network — Build Together',
  description: 'Manage peer developer connections, collaboration requests, and discover potential co-builders.',
};

interface NetworkPageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    skill?: string;
    tech?: string;
  }>;
}

export default async function NetworkPage({ searchParams }: NetworkPageProps) {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/network');
  }

  const { q, skill, tech } = await searchParams;

  const [connections, discoverableDevelopers, allSkills, allTechnologies] =
    await Promise.all([
      getUserConnections(user.id),
      getDiscoverableDevelopers(user.id, {
        search: q,
        skill,
        tech,
        limit: 50,
      }),
      getAllSkills(),
      getAllTechnologies(),
    ]);

  return (
    <NetworkView
      currentUserId={user.id}
      connections={connections}
      discoverableDevelopers={discoverableDevelopers}
      allSkills={allSkills}
      allTechnologies={allTechnologies}
    />
  );
}
