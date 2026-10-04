'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { DetailedMeeting } from '@/lib/queries/collaboration';
import { saveMeetingNoteAction } from '@/lib/actions/collaboration';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, AlertCircle, FileText, CheckCircle2, ListTodo } from 'lucide-react';

interface MeetingNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: DetailedMeeting;
  projectId: string;
}

export function MeetingNotesDialog({
  isOpen,
  onClose,
  meeting,
  projectId,
}: MeetingNotesDialogProps) {
  const router = useRouter();

  const [content, setContent] = React.useState(meeting.notes?.content || '');
  const [decisions, setDecisions] = React.useState(meeting.notes?.decisions || '');
  const [actionItems, setActionItems] = React.useState(meeting.notes?.action_items || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setContent(meeting.notes?.content || '');
    setDecisions(meeting.notes?.decisions || '');
    setActionItems(meeting.notes?.action_items || '');
  }, [meeting]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await saveMeetingNoteAction({
      meetingId: meeting.id,
      projectId,
      content,
      decisions,
      actionItems,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
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
        aria-labelledby="meeting-notes-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h3 id="meeting-notes-title" className="text-lg font-bold text-content-primary">
              Meeting Notes: {meeting.title}
            </h3>
            <p className="text-xs text-content-muted mt-0.5">
              Record discussion minutes, key decisions, and agreed action items.
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

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="meeting-notes-content" className="text-xs font-semibold text-content-secondary flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-accent-primary" />
              <span>Discussion Minutes & Notes</span>
            </label>
            <Textarea
              id="meeting-notes-content"
              placeholder="Summary of topics discussed during the meeting..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-y text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="meeting-notes-decisions" className="text-xs font-semibold text-content-secondary flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Decisions Made</span>
            </label>
            <Textarea
              id="meeting-notes-decisions"
              placeholder="e.g. Approved the PostgreSQL schema migration approach..."
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              rows={3}
              className="resize-y text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="meeting-notes-action-items" className="text-xs font-semibold text-content-secondary flex items-center gap-1.5">
              <ListTodo className="h-3.5 w-3.5 text-amber-400" />
              <span>Action Items & Follow-ups</span>
            </label>
            <Textarea
              id="meeting-notes-action-items"
              placeholder="e.g. @developer to implement the Realtime client hook by Friday..."
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              rows={3}
              className="resize-y text-xs"
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
              Save Notes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
