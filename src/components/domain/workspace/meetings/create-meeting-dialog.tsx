'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { AssignableMember } from '@/lib/queries/workspace';
import { createMeetingAction } from '@/lib/actions/collaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { X, AlertCircle } from 'lucide-react';

interface CreateMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  members: AssignableMember[];
  currentUserId: string;
}

export function CreateMeetingDialog({
  isOpen,
  onClose,
  projectId,
  members,
  currentUserId,
}: CreateMeetingDialogProps) {
  const router = useRouter();

  // Helper for default scheduled time (tomorrow at 10:00 AM)
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [scheduledAt, setScheduledAt] = React.useState(getDefaultDateTime());
  const [durationMinutes, setDurationMinutes] = React.useState(30);
  const [meetingUrl, setMeetingUrl] = React.useState('');
  const [selectedParticipants, setSelectedParticipants] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Initialize participants with other members by default
  React.useEffect(() => {
    setSelectedParticipants(members.map((m) => m.userId));
  }, [members]);

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

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      setError('Title and scheduled date/time are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Convert local datetime input string to ISO
    const isoScheduledAt = new Date(scheduledAt).toISOString();

    const result = await createMeetingAction({
      projectId,
      title: title.trim(),
      description: description.trim(),
      scheduledAt: isoScheduledAt,
      durationMinutes,
      meetingUrl: meetingUrl.trim() || null,
      participantIds: Array.from(new Set([currentUserId, ...selectedParticipants])),
      status: 'scheduled',
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setTitle('');
    setDescription('');
    setMeetingUrl('');
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-dialog-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h3 id="meeting-dialog-title" className="text-lg font-bold text-content-primary">
              Schedule Team Meeting
            </h3>
            <p className="text-xs text-content-muted mt-0.5">
              Set up syncs, sprint planning, design reviews, or demos with the team.
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
            <label htmlFor="meeting-title" className="text-xs font-semibold text-content-secondary">
              Meeting Title <span className="text-accent-primary">*</span>
            </label>
            <Input
              id="meeting-title"
              placeholder="e.g. Sprint 2 Planning & Architecture Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="scheduled-at" className="text-xs font-semibold text-content-secondary">
                Date & Time <span className="text-accent-primary">*</span>
              </label>
              <input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-xs text-content-primary focus:border-accent-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="duration-minutes" className="text-xs font-semibold text-content-secondary">
                Duration
              </label>
              <select
                id="duration-minutes"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-xs text-content-primary focus:border-accent-primary focus:outline-none"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="meeting-url" className="text-xs font-semibold text-content-secondary">
              Meeting Link (Optional)
            </label>
            <Input
              id="meeting-url"
              placeholder="https://meet.google.com/xyz or https://zoom.us/j/..."
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="meeting-description" className="text-xs font-semibold text-content-secondary">
              Agenda & Notes
            </label>
            <Textarea
              id="meeting-description"
              placeholder="Outline topics to discuss..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-y text-xs"
            />
          </div>

          {/* Participants Selection */}
          <div className="space-y-2 pt-2 border-t border-border-subtle">
            <span className="text-xs font-semibold text-content-secondary block">
              Invite Team Members
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-border-subtle p-2 bg-app-surface-2/40">
              {members.map((member) => {
                const isSelected = selectedParticipants.includes(member.userId);
                const isMe = member.userId === currentUserId;

                return (
                  <label
                    key={member.userId}
                    className="flex items-center justify-between rounded-lg p-1.5 hover:bg-app-surface-2 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected || isMe}
                        disabled={isMe}
                        onChange={() => toggleParticipant(member.userId)}
                        className="rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
                      />
                      <Avatar
                        src={member.avatarUrl}
                        alt={member.fullName || member.username}
                        fallbackText={member.username}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-content-primary truncate block">
                          {member.fullName || `@${member.username}`} {isMe && '(You)'}
                        </span>
                        <span className="text-[10px] text-content-muted capitalize">
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
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
              Schedule Meeting
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
