'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { DetailedProjectNote } from '@/lib/queries/collaboration';
import {
  createProjectNoteAction,
  updateProjectNoteAction,
} from '@/lib/actions/collaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, AlertCircle } from 'lucide-react';

interface NoteEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  noteToEdit?: DetailedProjectNote | null;
}

const CATEGORIES = [
  { value: 'general', label: 'General Documentation' },
  { value: 'decisions', label: 'Architecture Decision Record (ADR)' },
  { value: 'architecture', label: 'Technical Architecture' },
  { value: 'research', label: 'Research & References' },
  { value: 'meeting', label: 'Meeting Synthesis' },
];

export function NoteEditorDialog({
  isOpen,
  onClose,
  projectId,
  noteToEdit,
}: NoteEditorDialogProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState(noteToEdit?.title || '');
  const [category, setCategory] = React.useState(noteToEdit?.category || 'general');
  const [content, setContent] = React.useState(noteToEdit?.content || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTitle(noteToEdit?.title || '');
    setCategory(noteToEdit?.category || 'general');
    setContent(noteToEdit?.content || '');
  }, [noteToEdit]);

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

    const validCategory = category as 'general' | 'decisions' | 'architecture' | 'research' | 'meeting';

    if (noteToEdit) {
      const result = await updateProjectNoteAction({
        noteId: noteToEdit.id,
        projectId,
        title: title.trim(),
        content: content.trim(),
        category: validCategory,
      });

      setIsSubmitting(false);

      if (!result.success) {
        setError(result.error.message);
        return;
      }
    } else {
      const result = await createProjectNoteAction({
        projectId,
        title: title.trim(),
        content: content.trim(),
        category: validCategory,
      });

      setIsSubmitting(false);

      if (!result.success) {
        setError(result.error.message);
        return;
      }
    }

    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-dialog-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h3 id="note-dialog-title" className="text-lg font-bold text-content-primary">
              {noteToEdit ? 'Edit Project Note' : 'Create Project Note'}
            </h3>
            <p className="text-xs text-content-muted mt-0.5">
              Document decisions, specs, team conventions, and technical research.
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
            <label htmlFor="note-title" className="text-xs font-semibold text-content-secondary">
              Note Title <span className="text-accent-primary">*</span>
            </label>
            <Input
              id="note-title"
              placeholder="e.g. ADR-001: Supabase RLS and Session Management"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="note-category" className="text-xs font-semibold text-content-secondary">
              Category
            </label>
            <select
              id="note-category"
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
            <label htmlFor="note-content" className="text-xs font-semibold text-content-secondary">
              Content (Markdown supported) <span className="text-accent-primary">*</span>
            </label>
            <Textarea
              id="note-content"
              placeholder="Write specifications, decisions, research notes..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="resize-y text-xs font-mono"
              required
            />
          </div>

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
              {noteToEdit ? 'Save Changes' : 'Create Note'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
