'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  MoreVertical,
  Edit2,
  Trash2,
  FolderGit2,
  Check,
} from 'lucide-react';
import type { CommunityPostWithAuthor, CommunityPostType } from '@/types/database';
import { togglePostLikeAction, togglePostSaveAction, deletePostAction } from '@/lib/actions/community';

interface PostCardProps {
  post: CommunityPostWithAuthor;
  currentUserId?: string | null;
  onEdit?: (post: CommunityPostWithAuthor) => void;
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

export function PostCard({ post, currentUserId, onEdit }: PostCardProps) {
  const router = useRouter();
  const [hasLiked, setHasLiked] = React.useState(post.has_liked ?? false);
  const [likesCount, setLikesCount] = React.useState(post.likes_count ?? 0);
  const [hasSaved, setHasSaved] = React.useState(post.has_saved ?? false);
  const [isLiking, setIsLiking] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

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

    // Optimistic toggle
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    setIsLiking(true);

    try {
      const res = await togglePostLikeAction({ postId: post.id });
      if (!res.success) {
        // Revert on failure
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
    const url = `${window.location.origin}/feed/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
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
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Render content with highlighted @mentions
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
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <article className="rounded-xl border border-border-subtle bg-app-surface-1 p-5 transition-colors hover:border-border-muted">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/developers/${post.author.username}`} className="shrink-0">
            <Avatar
              src={post.author.avatar_url}
              fallbackText={post.author.full_name}
              size="md"
            />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/developers/${post.author.username}`}
                className="font-semibold text-content-primary hover:text-accent-primary truncate text-sm"
              >
                {post.author.full_name}
              </Link>
              <span className="text-xs text-content-muted">
                @{post.author.username}
              </span>
              <span className="text-xs text-content-muted">·</span>
              <time
                dateTime={post.created_at}
                className="text-xs text-content-muted whitespace-nowrap"
              >
                {new Date(post.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </div>
            {post.author.headline && (
              <p className="text-xs text-content-muted truncate max-w-sm sm:max-w-md">
                {post.author.headline}
              </p>
            )}
          </div>
        </div>

        {/* Right Header: Post Type Badge & Dropdown */}
        <div className="flex items-center gap-2">
          <Badge variant={postTypeInfo.variant} size="sm">
            {postTypeInfo.label}
          </Badge>

          {isAuthor && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-md p-1 text-content-muted hover:bg-app-surface-2 hover:text-content-primary focus:outline-none"
                aria-label="Post actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-1 w-32 rounded-lg border border-border-subtle bg-app-surface-1 py-1 shadow-lg z-20"
                  role="menu"
                >
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(post);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
                      role="menuitem"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-status-danger hover:bg-status-danger/10"
                    role="menuitem"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Associated Project Banner */}
      {post.project && (
        <div className="mt-3">
          <Link
            href={`/projects/${post.project.slug}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-app-surface-2 px-2.5 py-1 text-xs text-content-secondary hover:text-accent-primary hover:border-border-muted transition-colors"
          >
            <FolderGit2 className="h-3.5 w-3.5 text-accent-primary" />
            <span>Project:</span>
            <span className="font-semibold text-content-primary">
              {post.project.title}
            </span>
          </Link>
        </div>
      )}

      {/* Post Title */}
      <h2 className="mt-3 text-base font-semibold text-content-primary hover:text-accent-primary transition-colors">
        <Link href={`/feed/${post.id}`}>{post.title}</Link>
      </h2>

      {/* Post Content Snippet */}
      <div className="mt-2 text-sm text-content-secondary leading-relaxed whitespace-pre-line line-clamp-4">
        {renderContent(post.content)}
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-app-surface-2 px-2 py-0.5 text-xs text-content-muted font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-xs text-content-muted">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1.5 transition-colors hover:text-accent-primary focus:outline-none ${
              hasLiked ? 'text-status-danger font-semibold' : ''
            }`}
            aria-label="Like post"
          >
            <Heart
              className={`h-4 w-4 ${hasLiked ? 'fill-current text-status-danger' : ''}`}
            />
            <span>{likesCount}</span>
          </button>

          {/* Comment Count */}
          <Link
            href={`/feed/${post.id}`}
            className="flex items-center gap-1.5 transition-colors hover:text-accent-primary"
            aria-label="View comments"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{post.comments_count ?? 0}</span>
          </Link>

          {/* Save Bookmark */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 transition-colors hover:text-accent-primary focus:outline-none ${
              hasSaved ? 'text-accent-primary font-semibold' : ''
            }`}
            aria-label="Save post"
          >
            <Bookmark
              className={`h-4 w-4 ${hasSaved ? 'fill-current text-accent-primary' : ''}`}
            />
            <span>{hasSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 transition-colors hover:text-content-primary focus:outline-none"
          aria-label="Share post"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-status-success" />
              <span className="text-status-success">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}
