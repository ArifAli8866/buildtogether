import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/queries/profile';
import { getCommunityPosts } from '@/lib/queries/community';
import { getUserProjects } from '@/lib/queries/projects';
import { FeedView } from '@/components/domain/feed/feed-view';
import type { CommunityPostType } from '@/types/database';

export const metadata: Metadata = {
  title: 'Community Feed — Build Together',
  description:
    'Explore developer announcements, technical discussions, project recruitment, and engineering learnings.',
};

interface FeedPageProps {
  searchParams: Promise<{
    type?: string;
    tag?: string;
  }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const { type, tag } = await searchParams;
  const { user } = await getCurrentUser();

  const activeType = type as CommunityPostType | undefined;

  const [{ posts }, userProjects] = await Promise.all([
    getCommunityPosts({
      type: activeType,
      tag,
      currentUserId: user?.id,
      limit: 40,
    }),
    user ? getUserProjects(user.id) : Promise.resolve([]),
  ]);

  return (
    <FeedView
      initialPosts={posts}
      currentUserId={user?.id || null}
      userProjects={userProjects.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
      }))}
    />
  );
}
