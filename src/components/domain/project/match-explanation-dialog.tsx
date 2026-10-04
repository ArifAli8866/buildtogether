'use client';

import * as React from 'react';
import type { MatchBreakdown } from '@/lib/matching/engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  Globe,
  Code2,
  HelpCircle,
} from 'lucide-react';

interface MatchExplanationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  matchBreakdown: MatchBreakdown;
}

export function MatchExplanationDialog({
  isOpen,
  onClose,
  projectTitle,
  matchBreakdown,
}: MatchExplanationDialogProps) {
  // Close on ESC key
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

  const { totalScore, skills, technologies, availability, timezone } = matchBreakdown;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-status-success';
    if (score >= 40) return 'text-status-warning';
    return 'text-content-muted';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-subtle pb-4">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent-primary" />
              <h2 id="match-modal-title" className="text-xl font-bold text-content-primary">
                Compatibility Breakdown
              </h2>
            </div>
            <p className="text-xs text-content-secondary line-clamp-1">
              Deterministic match for <span className="font-semibold text-content-primary">{projectTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-content-muted transition-colors hover:bg-app-surface-2 hover:text-content-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score Overview */}
        <div className="flex items-center justify-between rounded-xl bg-app-surface-2 p-4 border border-border-subtle">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
              Overall Compatibility
            </span>
            <p className="text-sm text-content-secondary">
              Calculated across 4 deterministic dimensions
            </p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-extrabold ${getScoreColor(totalScore)}`}>
              {totalScore}
            </span>
            <span className="text-sm font-medium text-content-muted">/ 100</span>
          </div>
        </div>

        {/* 4 Factor Breakdown */}
        <div className="space-y-4">
          {/* 1. Skills Overlap */}
          <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-primary" />
                <h3 className="text-sm font-semibold text-content-primary">Role Skills Overlap</h3>
              </div>
              <Badge variant={skills.score >= 25 ? 'success' : 'neutral'} size="sm">
                {skills.score} / {skills.maxScore} pts
              </Badge>
            </div>

            {skills.matchedSkills.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-status-success uppercase tracking-wider">
                  Matching skills:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {skills.matchedSkills.map((s) => (
                    <Badge key={s} variant="success" size="sm">
                      ✓ {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {skills.missingSkills.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-content-muted uppercase tracking-wider">
                  Additional skills project needs:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {skills.missingSkills.map((s) => (
                    <Badge key={s} variant="neutral" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {skills.matchedSkills.length === 0 && skills.missingSkills.length === 0 && (
              <p className="text-xs text-content-muted">No specific role skills required.</p>
            )}
          </div>

          {/* 2. Technologies Match */}
          <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-status-info" />
                <h3 className="text-sm font-semibold text-content-primary">Technology Alignment</h3>
              </div>
              <Badge variant={technologies.score >= 15 ? 'info' : 'neutral'} size="sm">
                {technologies.score} / {technologies.maxScore} pts
              </Badge>
            </div>

            {technologies.matchedTech.length > 0 ? (
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-status-info uppercase tracking-wider">
                  Shared technologies:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {technologies.matchedTech.map((t) => (
                    <Badge key={t} variant="info" size="sm">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-content-muted">
                No matching technologies listed on your profile yet.
              </p>
            )}
          </div>

          {/* 3. Availability */}
          <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-status-warning" />
                <h3 className="text-sm font-semibold text-content-primary">Weekly Availability</h3>
              </div>
              <Badge variant={availability.fits ? 'success' : 'warning'} size="sm">
                {availability.score} / {availability.maxScore} pts
              </Badge>
            </div>
            <p className="text-xs text-content-secondary">
              Your profile: <strong className="text-content-primary">{availability.userHours} hrs/week</strong> • Required commitment:{' '}
              <strong className="text-content-primary">{availability.requiredHours} hrs/week</strong>
            </p>
            <p className="text-xs text-content-muted">
              {availability.fits
                ? 'Your declared commitment satisfies the weekly project requirement.'
                : 'Role commitment exceeds your current availability.'}
            </p>
          </div>

          {/* 4. Timezone */}
          <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-content-secondary" />
                <h3 className="text-sm font-semibold text-content-primary">Timezone Overlap</h3>
              </div>
              <Badge variant={timezone.isCompatible ? 'success' : 'neutral'} size="sm">
                {timezone.score} / {timezone.maxScore} pts
              </Badge>
            </div>
            <p className="text-xs text-content-secondary">
              Your timezone: <strong className="text-content-primary">{timezone.userTimezone}</strong> • Owner timezone:{' '}
              <strong className="text-content-primary">{timezone.ownerTimezone}</strong>
            </p>
          </div>
        </div>

        {/* Explainability Assurance Footer */}
        <div className="flex items-start gap-2.5 rounded-lg bg-app-surface-2 p-3 text-xs text-content-secondary">
          <HelpCircle className="h-4 w-4 text-accent-primary shrink-0 mt-0.5" />
          <p>
            <strong>Deterministic & Explainable:</strong> Match scores are computed directly from verified profile data and project constraints. No randomized or black-box algorithms are used.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
