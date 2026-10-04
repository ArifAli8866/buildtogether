'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CommentThread } from './comment-thread';
import { EditPostDialog } from './edit-post-dialog';
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  Edit2,
  Trash2,
  FolderGit2,
  Check,
} from 'lucide-react';
import type {
  CommunityPostWithAuthor,
  PostCommentWithAuthor,
  CommunityPostType,
  Project,
} from '@/types/database';
import {
  togglePostLikeAction,
  togglePostSaveAction,
  deletePostAction,
} from '@/lib/actions/community';

interface PostDetailViewProps {
  post: CommunityPostWithAuthor;
  comments: PostCommentWithAuthor[];
  currentUserId?: string | null;
  userProjects?: Pick<Project, 'id' | 'title' | 'slug'>[];
}

const POST_TYPE_LABELS: Record<
  CommunityPostType,
  { label: string; variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' }
> = {
  project_announcement: { label: 'Announcement', variant: 'accent' },
  recruitment: { label: 'Recruiting', variant: 'success' },
  technical_discussion: { label: 'Discussion', variant: 'info' },
  project_update: { label: 'Update', variant: 'neutral' },
  question: { label: 'Question', variant: 'warning' },
  achievement: { label: 'Achievement', variant: 'success' },
  learning: { label: 'Learning', variant: 'info' },
};

export function PostDetailView({
  post,
  comments,
  currentUserId,
  userProjects = [],
}: PostDetailViewProps) {
  const router = useRouter();
  const [hasLiked, setHasLiked] = React.useState(post.has_liked ?? false);
  const [likesCount, setLikesCount] = React.useState(post.likes_count ?? 0);
  const [hasSaved, setHasSaved] = React.useState(post.has_saved ?? false);
  const [isLiking, setIsLiking] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  const isAuthor = currentUserId && post.author_id === currentUserId;
  const postTypeInfo = POST_TYPE_LABELS[post.post_type] || {
    label: post.post_type,
    variant: 'default',
  };

  const handleLike = async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    if (isLiking) return;

    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    setIsLiking(true);

    try {
      const res = await togglePostLikeAction({ postId: post.id });
      if (!res.success) {
        setHasLiked(!nextLiked);
        setLikesCount((prev) => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
      }
    } catch {
      setHasLiked(!nextLiked);
      setLikesCount((prev) => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    if (isSaving) return;

    const nextSaved = !hasSaved;
    setHasSaved(nextSaved);
    setIsSaving(true);

    try {
      const res = await togglePostSaveAction({ postId: post.id });
      if (!res.success) {
        setHasSaved(!nextSaved);
      }
    } catch {
      setHasSaved(!nextSaved);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setIsDeleting(true);
    try {
      const res = await deletePostAction({ postId: post.id });
      if (res.success) {
        router.push('/feed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_-]{3,30})/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <Link
            key={idx}
            href={`/developers/${username}`}
            className="text-accent-primary font-medium hover:underline inline-block"
          >
            {part}
          </Link>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-content-secondary hover:text-content-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Feed</span>
        </Link>
      </div>

      {/* Main Post Card */}
      <article className="rounded-xl border border-border-subtle bg-app-surface-1 p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <Link href={`/developers/${post.author.username}`}>
              <Avatar
                src={post.author.avatar_url}
                fallbackText={post.author.full_name}
                size="lg"
              />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/developers/${post.author.username}`}
                  className="font-bold text-content-primary hover:text-accent-primary text-base"
                >
                  {post.author.full_name}
                </Link>
                <span className="text-xs text-content-muted">
                  @{post.author.username}
                </span>
              </div>
              {post.author.headline && (
                <p className="text-xs text-content-secondary mt-0.5">
                  {post.author.headline}
                </p>
              )}
              <time
                dateTime={post.created_at}
                className="text-xs text-content-muted mt-1 block"
              >
                Published on{' '}
                {new Date(post.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={postTypeInfo.variant}>
              {postTypeInfo.label}
            </Badge>

            {isAuthor && (
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="h-8 px-2 gap-1 text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 px-2 gap-1 text-xs text-status-danger hover:bg-status-danger/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Project Link Banner (if associated) */}
        {post.project && (
          <div className="mt-4 rounded-lg border border-border-subtle bg-app-surface-2 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-4 w-4 text-accent-primary" />
                <span className="text-xs text-content-muted">Associated Project:</span>
                <span className="text-xs font-semibold text-content-primary">
                  {post.project.title}
                </span>
              </div>
              <Link href={`/projects/${post.project.slug}`}>
                <Button variant="secondary" size="sm" className="h-7 text-xs">
                  View Project
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="mt-6 text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          {post.title}
        </h1>

        {/* Content Body */}
        <div className="mt-4 text-sm sm:text-base text-content-secondary leading-relaxed whitespace-pre-line">
          {renderContent(post.content)}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-border-subtle">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-app-surface-2 px-2.5 py-1 text-xs font-mono text-content-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4 text-xs text-content-muted">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-1.5 transition-colors hover:text-accent-primary focus:outline-none ${
                hasLiked ? 'text-status-danger font-semibold' : ''
              }`}
            >
              <Heart
                className={`h-4 w-4 ${hasLiked ? 'fill-current text-status-danger' : ''}`}
              />
              <span>{likesCount} Likes</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1.5 transition-colors hover:text-accent-primary focus:outline-none ${
                hasSaved ? 'text-accent-primary font-semibold' : ''
              }`}
            >
              <Bookmark
                className={`h-4 w-4 ${hasSaved ? 'fill-current text-accent-primary' : ''}`}
              />
              <span>{hasSaved ? 'Saved to Bookmarks' : 'Save'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 transition-colors hover:text-content-primary focus:outline-none"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-status-success" />
                <span className="text-status-success">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>

        {/* Comment Thread Section */}
        <CommentThread
          postId={post.id}
          postAuthorId={post.author_id}
          comments={comments}
          currentUserId={currentUserId}
        />
      </article>

      {/* Edit Post Dialog */}
      {isAuthor && editDialogOpen && (
        <EditPostDialog
          isOpen={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          post={post}
          userProjects={userProjects}
        />
      )}
    </div>
  );
}
