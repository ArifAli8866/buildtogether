import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/profile';
import { getPostById, getPostComments } from '@/lib/queries/community';
import { getUserProjects } from '@/lib/queries/projects';
import { PostDetailView } from '@/components/domain/feed/post-detail-view';

interface PostPageProps {
  params: Promise<{
    postId: string;
  }>;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPostById(postId);

  if (!post) {
    return {
      title: 'Post Not Found — Build Together',
    };
  }

  return {
    title: `${post.title} — Build Together Community`,
    description: post.content.slice(0, 150),
  };
}

export default async function PostDetailPage({ params }: PostPageProps) {
  const { postId } = await params;
  const { user } = await getCurrentUser();

  const [post, comments] = await Promise.all([
    getPostById(postId, user?.id),
    getPostComments(postId),
  ]);

  if (!post) {
    notFound();
  }

  const userProjects =
    user && user.id === post.author_id
      ? await getUserProjects(user.id)
      : [];

  return (
    <PostDetailView
      post={post}
      comments={comments}
      currentUserId={user?.id || null}
      userProjects={userProjects.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
      }))}
    />
  );
}
