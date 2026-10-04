'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, AlertCircle, Sparkles } from 'lucide-react';
import type { CommunityPostType, Project } from '@/types/database';
import { createPostAction } from '@/lib/actions/community';

interface CreatePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userProjects?: Pick<Project, 'id' | 'title' | 'slug'>[];
}

const POST_TYPES: { value: CommunityPostType; label: string; description: string }[] = [
  {
    value: 'technical_discussion',
    label: 'Technical Discussion',
    description: 'Architecture trade-offs, engineering RFCs, and technical deep-dives.',
  },
  {
    value: 'project_announcement',
    label: 'Project Announcement',
    description: 'Launch a new project proposal or major milestone.',
  },
  {
    value: 'recruitment',
    label: 'Recruitment',
    description: 'Search for specific contributor roles, skills, or collaborators.',
  },
  {
    value: 'project_update',
    label: 'Project Update',
    description: 'Weekly sprint demos, changelogs, and shipping progress.',
  },
  {
    value: 'question',
    label: 'Question',
    description: 'Ask for technical guidance, stack choices, or architecture feedback.',
  },
  {
    value: 'achievement',
    label: 'Achievement',
    description: 'Celebrate merged reviews, shipped projects, or production milestones.',
  },
  {
    value: 'learning',
    label: 'Learning',
    description: 'Tutorials, technical post-mortems, and engineering insights.',
  },
];

export function CreatePostDialog({
  isOpen,
  onClose,
  userProjects = [],
}: CreatePostDialogProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [postType, setPostType] = React.useState<CommunityPostType>('technical_discussion');
  const [projectId, setProjectId] = React.useState<string>('');
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        setTags([...tags, trimmed]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }

    if (content.trim().length < 5) {
      setError('Content must be at least 5 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createPostAction({
        title: title.trim(),
        content: content.trim(),
        post_type: postType,
        project_id: projectId || undefined,
        tags,
      });

      if (!res.success) {
        setError(res.error?.message || 'Failed to create post.');
        setIsSubmitting(false);
        return;
      }

      // Reset and close
      setTitle('');
      setContent('');
      setProjectId('');
      setTags([]);
      setTagInput('');
      onClose();
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl rounded-xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-primary" />
            <h2 id="create-post-title" className="text-lg font-bold text-content-primary">
              Create Community Post
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-content-muted hover:bg-app-surface-2 hover:text-content-primary transition-colors focus:outline-none"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 p-3 text-xs text-status-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Post Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary mb-1">
              Post Type
            </label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as CommunityPostType)}
              className="w-full rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-sm text-content-primary focus:border-border-focus focus:outline-none"
            >
              {POST_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-content-muted">
              {POST_TYPES.find((pt) => pt.value === postType)?.description}
            </p>
          </div>

          {/* Associate Project (Optional) */}
          {userProjects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-content-secondary mb-1">
                Associate with Project (Optional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-sm text-content-primary focus:border-border-focus focus:outline-none"
              >
                <option value="">No Project Association</option>
                {userProjects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Post Title */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary mb-1">
              Title
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Architectural trade-offs between CQRS and Event Sourcing"
              required
              maxLength={200}
            />
          </div>

          {/* Post Content */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-content-secondary">
                Content
              </label>
              <span className="text-[11px] text-content-muted">
                Tip: Mention collaborators using @username
              </span>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share technical context, code snippets, benchmarks, or discussion points..."
              rows={6}
              required
              maxLength={10000}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary mb-1">
              Tags (Up to 10)
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="e.g. rust, distributed, webassembly"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 10}
              >
                Add Tag
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded bg-app-surface-2 px-2 py-0.5 text-xs text-content-secondary font-mono"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-content-muted hover:text-content-primary"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Publishing...' : 'Publish Post'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
