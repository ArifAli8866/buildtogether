'use client';

import * as React from 'react';
import type { ProjectRole } from '@/types/database';
import { submitContributionRequestAction } from '@/lib/actions/contribution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  X,
  Send,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ApplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  roles: ProjectRole[];
  userAvailabilityHours?: number;
  initialRoleId?: string;
}

export function ApplyDialog({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  roles,
  userAvailabilityHours = 10,
  initialRoleId,
}: ApplyDialogProps) {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>(initialRoleId || '');
  const [pitch, setPitch] = React.useState('');
  const [weeklyHours, setWeeklyHours] = React.useState<number>(userAvailabilityHours || 10);
  const [portfolioLinks, setPortfolioLinks] = React.useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const openRoles = roles.filter((r) => r.status === 'open');

  React.useEffect(() => {
    if (initialRoleId !== undefined) {
      setSelectedRoleId(initialRoleId);
    }
  }, [initialRoleId]);

  // Close on ESC
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

  const handleLinkChange = (index: number, val: string) => {
    const updated = [...portfolioLinks];
    updated[index] = val;
    setPortfolioLinks(updated);
  };

  const addLink = () => {
    if (portfolioLinks.length < 5) {
      setPortfolioLinks([...portfolioLinks, '']);
    }
  };

  const removeLink = (index: number) => {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (pitch.trim().length < 30) {
      setFieldErrors({ pitch: ['Pitch must be at least 30 characters long.'] });
      return;
    }

    const cleanLinks = portfolioLinks.map((l) => l.trim()).filter((l) => l.length > 0);

    setIsSubmitting(true);
    const res = await submitContributionRequestAction({
      projectId,
      projectRoleId: selectedRoleId ? selectedRoleId : null,
      pitch,
      portfolioLinks: cleanLinks,
      weeklyHours,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error?.message || 'Failed to submit application.');
      if (res.error?.details) {
        setFieldErrors(res.error.details as Record<string, string[]>);
      }
      return;
    }

    setSuccessMessage('Your application has been submitted to the project lead!');
    setTimeout(() => {
      onClose();
      router.refresh();
    }, 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-subtle pb-4">
          <div className="space-y-1 pr-6">
            <h2 id="apply-modal-title" className="text-xl font-bold text-content-primary">
              Apply to Contribute
            </h2>
            <p className="text-xs text-content-secondary line-clamp-1">
              Joining project <strong className="text-content-primary">{projectTitle}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-content-muted transition-colors hover:bg-app-surface-2 hover:text-content-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 p-3 text-xs text-status-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage ? (
          <div className="rounded-xl bg-status-success/10 border border-status-success/20 p-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-status-success mx-auto" />
            <h3 className="text-base font-bold text-content-primary">Application Sent!</h3>
            <p className="text-xs text-content-secondary">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Role Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-content-secondary">
                Select Contributor Role <span className="text-status-danger">*</span>
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1.5 text-xs text-content-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
              >
                <option value="">General Contributor (Cross-functional)</option>
                {openRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.capacity_count - r.filled_count} open • {r.commitment_hours_per_week || 10}h/wk)
                  </option>
                ))}
              </select>
              {fieldErrors.projectRoleId && (
                <p className="text-xs text-status-danger">{fieldErrors.projectRoleId[0]}</p>
              )}
            </div>

            {/* Pitch / Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-content-secondary">
                  Your Pitch & Experience <span className="text-status-danger">*</span>
                </label>
                <span
                  className={`text-[11px] ${
                    pitch.length >= 30 ? 'text-status-success' : 'text-content-muted'
                  }`}
                >
                  {pitch.length} / 30 min chars
                </span>
              </div>
              <Textarea
                rows={4}
                required
                placeholder="Describe why you want to contribute, relevant technical projects you've built, and what you aim to implement..."
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                error={fieldErrors.pitch?.[0]}
                helperText="Explain your skills and expectations clearly (min 30 chars)."
              />
            </div>

            {/* Weekly Commitment Hours */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-content-secondary">
                Weekly Availability Commitment <span className="text-status-danger">*</span>
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={80}
                  required
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(parseInt(e.target.value, 10) || 1)}
                  error={fieldErrors.weeklyHours?.[0]}
                  className="w-32"
                />
                <span className="text-xs text-content-secondary">hours / week</span>
              </div>
              <p className="text-[11px] text-content-muted">
                Be realistic about your schedule. Quality and consistency matter most.
              </p>
            </div>

            {/* Portfolio / Proof of Work Links */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-content-secondary">
                  Portfolio / GitHub / Demo Links (Optional, max 5)
                </label>
                {portfolioLinks.length < 5 && (
                  <button
                    type="button"
                    onClick={addLink}
                    className="text-xs text-accent-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Link
                  </button>
                )}
              </div>

              {portfolioLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="https://github.com/... or https://..."
                    value={link}
                    onChange={(e) => handleLinkChange(idx, e.target.value)}
                  />
                  {portfolioLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLink(idx)}
                      className="p-2 text-content-muted hover:text-status-danger"
                      aria-label="Remove link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {fieldErrors.portfolioLinks && (
                <p className="text-xs text-status-danger">{fieldErrors.portfolioLinks[0]}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Send Application'}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
