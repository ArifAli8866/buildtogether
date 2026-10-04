import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/queries/profile';
import { performGlobalSearch } from '@/lib/queries/search';
import { SearchView } from '@/components/domain/search/search-view';
import type { SearchEntityType, GlobalSearchResponse } from '@/types/database';

export const metadata: Metadata = {
  title: 'Global Search & Discovery — Build Together',
  description:
    'Search across projects, developers, community posts, and workspace tasks with privacy enforcement.',
};

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, type } = await searchParams;
  const { user } = await getCurrentUser();

  const validTypes: SearchEntityType[] = ['all', 'projects', 'developers', 'posts', 'tasks'];
  const activeType: SearchEntityType = validTypes.includes(type as SearchEntityType)
    ? (type as SearchEntityType)
    : 'all';

  let initialData: GlobalSearchResponse = {
    query: q || '',
    totalCount: 0,
    projects: [],
    developers: [],
    posts: [],
    tasks: [],
  };

  if (q && q.trim()) {
    initialData = await performGlobalSearch({
      query: q.trim(),
      type: activeType,
      currentUserId: user?.id ?? null,
      limit: 20,
    });
  }

  return (
    <SearchView
      initialQuery={q || ''}
      initialType={activeType}
      initialData={initialData}
    />
  );
}
