'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project, ProjectMemberRole, Profile } from '@/types/database';
import type { DetailedDiscussion, DetailedDiscussionComment } from '@/lib/queries/collaboration';
import {
  updateDiscussionAction,
  deleteDiscussionAction,
  toggleDiscussionPinnedAction,
} from '@/lib/actions/collaboration';
import { DiscussionCommentThread } from './discussion-comment-thread';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Pin,
  Edit2,
  Trash2,
  Clock,
  Check,
  X,
  AlertCircle,
  Layers,
  Sparkles,
  HelpCircle,
  Megaphone,
  MessageSquare,
} from 'lucide-react';

interface DiscussionDetailViewProps {
  project: Project;
  discussion: DetailedDiscussion;
  initialComments: DetailedDiscussionComment[];
  role: ProjectMemberRole;
  currentUserId: string;
  currentUserProfile?: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
}

export function DiscussionDetailView({
  project,
  discussion,
  initialComments,
  role,
  currentUserId,
  currentUserProfile,
}: DiscussionDetailViewProps) {
  const router = useRouter();
  const isAdmin = role === 'owner' || role === 'maintainer';
  const isAuthor = discussion.author_id === currentUserId;
  const canModify = isAuthor || isAdmin;

  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState(discussion.title);
  const [content, setContent] = React.useState(discussion.content);
  const [category, setCategory] = React.useState(discussion.category);
  const [isPinned, setIsPinned] = React.useState(discussion.pinned);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'architecture':
        return <Layers className="h-3 w-3" />;
      case 'ideas':
        return <Sparkles className="h-3 w-3" />;
      case 'questions':
        return <HelpCircle className="h-3 w-3" />;
      case 'announcements':
        return <Megaphone className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTogglePin = async () => {
    if (!isAdmin) return;
    const result = await toggleDiscussionPinnedAction(discussion.id, project.id);
    if (result.success && result.data !== undefined) {
      setIsPinned(result.data);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await updateDiscussionAction({
      discussionId: discussion.id,
      projectId: project.id,
      title: title.trim(),
      content: content.trim(),
      category: category as 'general' | 'architecture' | 'ideas' | 'questions' | 'announcements',
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setIsEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this discussion?')) return;

    setIsSubmitting(true);
    const result = await deleteDiscussionAction(discussion.id, project.id);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    router.push(`/projects/${project.slug}/workspace/discussions`);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${project.slug}/workspace/discussions`}
          className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Discussions</span>
        </Link>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePin}
              className={`h-8 gap-1.5 text-xs ${
                isPinned ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : ''
              }`}
            >
              <Pin className="h-3.5 w-3.5" />
              <span>{isPinned ? 'Unpin' : 'Pin Thread'}</span>
            </Button>
          )}

          {canModify && !isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 gap-1.5 text-xs"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="h-8 gap-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Discussion Thread Content */}
      <article className="rounded-xl border border-border-subtle bg-app-surface-1 p-6 space-y-6">
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-title" className="text-xs font-semibold text-content-secondary">
                Title
              </label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-category" className="text-xs font-semibold text-content-secondary">
                Category
              </label>
              <select
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-xs text-content-primary"
              >
                <option value="general">General</option>
                <option value="architecture">Architecture & Design</option>
                <option value="ideas">Ideas & Brainstorming</option>
                <option value="questions">Questions & Help</option>
                <option value="announcements">Announcements</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-content" className="text-xs font-semibold text-content-secondary">
                Content
              </label>
              <Textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <>
            {/* Header info */}
            <div className="space-y-3 border-b border-border-subtle pb-5">
              <div className="flex items-center gap-2 flex-wrap">
                {isPinned && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                    <Pin className="h-3 w-3 rotate-45" />
                    Pinned Thread
                  </span>
                )}
                <Badge variant="neutral" size="sm" className="capitalize text-xs gap-1">
                  {getCategoryIcon(discussion.category)}
                  <span>{discussion.category}</span>
                </Badge>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-content-primary">
                {discussion.title}
              </h1>

              <div className="flex items-center gap-3 pt-2">
                <Avatar
                  src={discussion.author.avatar_url}
                  alt={discussion.author.full_name || discussion.author.username}
                  fallbackText={discussion.author.username}
                  size="sm"
                />
                <div className="text-xs">
                  <div className="font-semibold text-content-primary">
                    {discussion.author.full_name || `@${discussion.author.username}`}
                  </div>
                  <div className="flex items-center gap-1.5 text-content-muted text-[11px]">
                    <span>@{discussion.author.username}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(discussion.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Post Body */}
            <div className="text-sm text-content-secondary whitespace-pre-wrap leading-relaxed">
              {discussion.content}
            </div>
          </>
        )}
      </article>

      {/* Discussion Comments Thread */}
      <DiscussionCommentThread
        discussionId={discussion.id}
        projectId={project.id}
        initialComments={initialComments}
        currentUserId={currentUserId}
        currentUserProfile={currentUserProfile}
        isAdmin={isAdmin}
      />
    </div>
  );
}
