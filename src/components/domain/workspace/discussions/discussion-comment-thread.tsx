'use client';

import * as React from 'react';
import type { DetailedDiscussionComment } from '@/lib/queries/collaboration';
import type { Profile } from '@/types/database';
import { useDiscussionRealtime } from '@/hooks/use-discussion-realtime';
import {
  createDiscussionCommentAction,
  updateDiscussionCommentAction,
  deleteDiscussionCommentAction,
} from '@/lib/actions/collaboration';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import {
  MessageSquare,
  Reply,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Wifi,
} from 'lucide-react';

interface DiscussionCommentThreadProps {
  discussionId: string;
  projectId: string;
  initialComments: DetailedDiscussionComment[];
  currentUserId: string;
  currentUserProfile?: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  isAdmin: boolean;
}

export function DiscussionCommentThread({
  discussionId,
  projectId,
  initialComments,
  currentUserId,
  currentUserProfile,
  isAdmin,
}: DiscussionCommentThreadProps) {
  const {
    comments,
    isConnected,
    insertCommentLocally,
    updateCommentLocally,
    deleteCommentLocally,
  } = useDiscussionRealtime({
    discussionId,
    initialComments,
  });

  const [newCommentContent, setNewCommentContent] = React.useState('');
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyContent, setReplyContent] = React.useState('');
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePostTopComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await createDiscussionCommentAction({
      discussionId,
      projectId,
      content: newCommentContent.trim(),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    if (currentUserProfile) {
      insertCommentLocally({
        ...result.data,
        author: currentUserProfile,
        replies: [],
      });
    }

    setNewCommentContent('');
  };

  const handlePostReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await createDiscussionCommentAction({
      discussionId,
      projectId,
      content: replyContent.trim(),
      parentCommentId,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    if (currentUserProfile) {
      insertCommentLocally({
        ...result.data,
        author: currentUserProfile,
      });
    }

    setReplyingToId(null);
    setReplyContent('');
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await updateDiscussionCommentAction({
      commentId,
      projectId,
      content: editContent.trim(),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    updateCommentLocally(commentId, editContent.trim());
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    deleteCommentLocally(commentId);
    const result = await deleteDiscussionCommentAction(commentId, projectId);

    if (!result.success) {
      setError(result.error.message);
    }
  };

  const renderSingleComment = (
    comment: DetailedDiscussionComment,
    isReply: boolean = false
  ) => {
    const isAuthor = comment.author_id === currentUserId;
    const canModify = isAuthor || isAdmin;
    const isEditing = editingCommentId === comment.id;

    return (
      <div
        key={comment.id}
        className={`group relative flex gap-3 rounded-lg p-3 transition-colors ${
          isReply ? 'bg-app-surface-2/40 ml-4 sm:ml-8 mt-2' : 'bg-app-surface-1 border border-border-subtle/80'
        }`}
      >
        <Avatar
          src={comment.author.avatar_url}
          alt={comment.author.full_name || comment.author.username}
          fallbackText={comment.author.username}
          size="sm"
          className="mt-0.5 shrink-0"
        />

        <div className="flex-1 min-w-0 space-y-1">
          {/* Comment Author Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="font-semibold text-content-primary">
                {comment.author.full_name || `@${comment.author.username}`}
              </span>
              <span className="text-content-muted text-[11px]">
                @{comment.author.username}
              </span>
              <span className="text-content-muted text-[10px]">&bull;</span>
              <span className="text-[11px] text-content-muted">
                {formatDate(comment.created_at)}
              </span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-[10px] italic text-content-muted">
                  (edited)
                </span>
              )}
            </div>

            {/* Actions for author/admin */}
            {!isEditing && (
              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                {!isReply && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingToId(comment.id);
                      setReplyContent('');
                    }}
                    className="rounded p-1 text-content-muted hover:bg-app-surface-2 hover:text-content-primary"
                    title="Reply"
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </button>
                )}

                {canModify && (
                  <>
                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="rounded p-1 text-content-muted hover:bg-app-surface-2 hover:text-content-primary"
                        title="Edit comment"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="rounded p-1 text-content-muted hover:bg-red-500/10 hover:text-red-400"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Comment Content / Editor */}
          {isEditing ? (
            <div className="space-y-2 pt-1">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="text-xs bg-app-surface-2 resize-y"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCommentId(null)}
                  disabled={isSubmitting}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveEdit(comment.id)}
                  isLoading={isSubmitting}
                  className="h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-content-secondary whitespace-pre-wrap leading-relaxed">
              {comment.content}
            </p>
          )}

          {/* Inline Reply Form */}
          {replyingToId === comment.id && (
            <div className="mt-3 rounded-lg border border-border-subtle bg-app-surface-2/60 p-3 space-y-2">
              <span className="text-[11px] font-medium text-content-secondary flex items-center gap-1">
                <Reply className="h-3 w-3" />
                Replying to {comment.author.full_name || `@${comment.author.username}`}
              </span>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                rows={2}
                className="text-xs bg-app-surface-1"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingToId(null);
                    setReplyContent('');
                  }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handlePostReply(comment.id)}
                  isLoading={isSubmitting}
                  className="h-7 text-xs"
                >
                  Post Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with count and Realtime status */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent-primary" />
          <h3 className="text-sm font-bold text-content-primary">
            Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
          </h3>
        </div>

        {isConnected && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <Wifi className="h-3 w-3 animate-pulse" />
            <span>Realtime active</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top-Level New Comment Box */}
      <form onSubmit={handlePostTopComment} className="space-y-3">
        <Textarea
          placeholder="Share your thoughts, ask a question, or provide feedback..."
          value={newCommentContent}
          onChange={(e) => setNewCommentContent(e.target.value)}
          rows={3}
          className="text-xs bg-app-surface-1 resize-y"
          maxLength={5000}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-content-muted">
            Supports markdown formatting
          </span>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={!newCommentContent.trim()}
            className="text-xs gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Comment</span>
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center text-xs text-content-muted">
            No comments yet. Start the conversation!
          </div>
        ) : (
          comments.map((rootComment) => (
            <div key={rootComment.id} className="space-y-2">
              {renderSingleComment(rootComment, false)}

              {/* Render Nested Replies */}
              {rootComment.replies && rootComment.replies.length > 0 && (
                <div className="space-y-2">
                  {rootComment.replies.map((reply) =>
                    renderSingleComment(reply, true)
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
