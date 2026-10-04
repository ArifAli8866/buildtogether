'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createDiscussionAction } from '@/lib/actions/collaboration';
import { X, AlertCircle, Pin } from 'lucide-react';

interface CreateDiscussionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  canPin?: boolean;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'architecture', label: 'Architecture & Design' },
  { value: 'ideas', label: 'Ideas & Brainstorming' },
  { value: 'questions', label: 'Questions & Help' },
  { value: 'announcements', label: 'Announcements' },
];

export function CreateDiscussionDialog({
  isOpen,
  onClose,
  projectId,
  canPin = false,
}: CreateDiscussionDialogProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState('general');
  const [content, setContent] = React.useState('');
  const [pinned, setPinned] = React.useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createDiscussionAction({
      projectId,
      title: title.trim(),
      category: category as 'general' | 'architecture' | 'ideas' | 'questions' | 'announcements',
      content: content.trim(),
      pinned: canPin ? pinned : false,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setTitle('');
    setContent('');
    setCategory('general');
    setPinned(false);
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-xl rounded-xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h3 id="dialog-title" className="text-lg font-bold text-content-primary">
              Start a New Discussion
            </h3>
            <p className="text-xs text-content-muted mt-0.5">
              Discuss architecture, share ideas, or ask the team a question.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="discussion-title" className="text-xs font-semibold text-content-secondary">
              Discussion Title <span className="text-accent-primary">*</span>
            </label>
            <Input
              id="discussion-title"
              placeholder="e.g. Supabase Realtime architecture plan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="discussion-category" className="text-xs font-semibold text-content-secondary">
              Category
            </label>
            <select
              id="discussion-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-xs text-content-primary focus:border-accent-primary focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="discussion-content" className="text-xs font-semibold text-content-secondary">
              Discussion Content <span className="text-accent-primary">*</span>
            </label>
            <Textarea
              id="discussion-content"
              placeholder="Provide background, proposed solutions, or topics for the team..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
              className="resize-y"
            />
          </div>

          {canPin && (
            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none text-xs text-content-secondary">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
              />
              <Pin className="h-3.5 w-3.5 text-accent-primary" />
              <span>Pin this discussion to the top of the board</span>
            </label>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Start Discussion
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
