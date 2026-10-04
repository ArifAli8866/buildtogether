'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Reply,
  Trash2,
  AlertCircle,
  CornerDownRight,
  Send,
} from 'lucide-react';
import type { PostCommentWithAuthor } from '@/types/database';
import {
  createPostCommentAction,
  deletePostCommentAction,
} from '@/lib/actions/community';

interface CommentThreadProps {
  postId: string;
  postAuthorId: string;
  comments: PostCommentWithAuthor[];
  currentUserId?: string | null;
}

export function CommentThread({
  postId,
  postAuthorId,
  comments,
  currentUserId,
}: CommentThreadProps) {
  const router = useRouter();
  const [newComment, setNewComment] = React.useState('');
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyContent, setReplyContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCreateComment = async (parentId?: string | null) => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }

    const content = parentId ? replyContent.trim() : newComment.trim();
    if (!content) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await createPostCommentAction({
        postId,
        content,
        parentId: parentId || undefined,
      });

      if (!res.success) {
        setError(res.error?.message || 'Failed to submit comment.');
        setIsSubmitting(false);
        return;
      }

      if (parentId) {
        setReplyingToId(null);
        setReplyContent('');
      } else {
        setNewComment('');
      }
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await deletePostCommentAction({ commentId });
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
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

  const renderCommentItem = (
    comment: PostCommentWithAuthor,
    isReply = false
  ) => {
    const isCommentAuthor = currentUserId && comment.author_id === currentUserId;
    const isOp = comment.author_id === postAuthorId;
    const isReplying = replyingToId === comment.id;

    return (
      <div
        key={comment.id}
        className={`group relative ${isReply ? 'mt-3 pl-6 border-l-2 border-border-subtle' : 'pt-4 border-t border-border-subtle'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link href={`/developers/${comment.author.username}`}>
              <Avatar
                src={comment.author.avatar_url}
                fallbackText={comment.author.full_name}
                size="sm"
              />
            </Link>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/developers/${comment.author.username}`}
                className="font-semibold text-content-primary hover:text-accent-primary text-xs"
              >
                {comment.author.full_name}
              </Link>
              <span className="text-[11px] text-content-muted">
                @{comment.author.username}
              </span>
              {isOp && (
                <span className="rounded bg-accent-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-accent-primary">
                  Author
                </span>
              )}
              <span className="text-[11px] text-content-muted">·</span>
              <time
                dateTime={comment.created_at}
                className="text-[11px] text-content-muted"
              >
                {new Date(comment.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </div>
          </div>

          {/* Comment Options */}
          {isCommentAuthor && (
            <button
              type="button"
              onClick={() => handleDeleteComment(comment.id)}
              className="text-content-muted hover:text-status-danger p-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Delete comment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Comment Text */}
        <div className="mt-1.5 text-xs text-content-secondary leading-relaxed pl-8">
          {renderContent(comment.content)}
        </div>

        {/* Action: Reply */}
        <div className="mt-1.5 pl-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!currentUserId) {
                router.push('/login');
                return;
              }
              if (isReplying) {
                setReplyingToId(null);
                setReplyContent('');
              } else {
                setReplyingToId(comment.id);
                setReplyContent(`@${comment.author.username} `);
              }
            }}
            className="flex items-center gap-1 text-[11px] text-content-muted hover:text-accent-primary transition-colors"
          >
            <Reply className="h-3 w-3" />
            <span>{isReplying ? 'Cancel' : 'Reply'}</span>
          </button>
        </div>

        {/* Inline Reply Form */}
        {isReplying && (
          <div className="mt-2 pl-8 space-y-2">
            <div className="flex items-start gap-2">
              <CornerDownRight className="h-4 w-4 text-content-muted mt-2 shrink-0" />
              <div className="flex-1 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to @${comment.author.username}...`}
                  rows={2}
                  className="text-xs"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingToId(null);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleCreateComment(comment.id)}
                    disabled={isSubmitting || !replyContent.trim()}
                    className="gap-1.5"
                  >
                    <Send className="h-3 w-3" />
                    <span>Send Reply</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-1">
            {comment.replies.map((reply) => renderCommentItem(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-content-primary">
          Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
        </h3>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 p-3 text-xs text-status-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top-Level Comment Input */}
      {currentUserId ? (
        <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-4 space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your perspective or ask a question (use @username to mention)..."
            rows={3}
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-content-muted">
              Supports markdown & @mentions
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleCreateComment(null)}
              disabled={isSubmitting || !newComment.trim()}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Comment</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-subtle bg-app-surface-1/40 p-4 text-center">
          <p className="text-xs text-content-muted">
            <Link href="/login" className="text-accent-primary font-semibold hover:underline">
              Sign in
            </Link>{' '}
            to participate in this discussion.
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-xs text-content-muted py-4 text-center">
            No comments yet. Start the conversation!
          </p>
        ) : (
          comments.map((c) => renderCommentItem(c, false))
        )}
      </div>
    </div>
  );
}
