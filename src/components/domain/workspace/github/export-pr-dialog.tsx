'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createGitHubPullRequestFromReviewAction } from '@/lib/actions/github';
import type { CodeReview, SanitizedProjectGithubRepo } from '@/types/database';
import {
  GitPullRequest,
  GitBranch,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';

interface ExportPrDialogProps {
  isOpen: boolean;
  onClose: () => void;
  review: CodeReview;
  projectId: string;
  connectedRepo: SanitizedProjectGithubRepo | null;
}

export function ExportPrDialog({
  isOpen,
  onClose,
  review,
  projectId,
  connectedRepo,
}: ExportPrDialogProps) {
  const router = useRouter();
  const [branchName, setBranchName] = React.useState(
    `bt/${review.target_branch.replace(/[^a-zA-Z0-9_\-]/g, '-')}-${review.id.slice(0, 6)}`
  );
  const [prTitle, setPrTitle] = React.useState(review.title);
  const [prBody, setPrBody] = React.useState(review.summary);
  const [hasConfirmed, setHasConfirmed] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createdPrUrl, setCreatedPrUrl] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasConfirmed) {
      setError('Please check the confirmation box to authorize this GitHub operation.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await createGitHubPullRequestFromReviewAction({
      reviewId: review.id,
      projectId,
      branchName: branchName.trim(),
      prTitle: prTitle.trim(),
      prBody: prBody.trim(),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setCreatedPrUrl(result.data.prUrl);
    router.refresh();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-pr-dialog-title"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-border-subtle bg-app-surface-1 shadow-2xl p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <div>
              <h2 id="export-pr-dialog-title" className="text-base font-semibold text-content-primary">
                Export to GitHub Pull Request
              </h2>
              <p className="text-xs text-content-muted">
                Create a branch and open a Pull Request for approved review #{review.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-content-secondary hover:bg-app-surface-2 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {createdPrUrl ? (
          /* Success Screen */
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-content-primary">
                Pull Request Created on GitHub!
              </h3>
              <p className="text-xs text-content-muted">
                Your approved changes have been pushed to branch <code>{branchName}</code>.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <a
                href={createdPrUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
              >
                <span>View on GitHub</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Target Repo Info */}
            <div className="rounded-lg bg-app-surface-2/60 p-3 border border-border-subtle flex items-center justify-between text-xs">
              <span className="text-content-muted">Target Repository:</span>
              <span className="font-mono font-medium text-content-primary">
                {connectedRepo?.repo_full_name || `${connectedRepo?.repo_owner}/${connectedRepo?.repo_name}`}
              </span>
            </div>

            {/* Branch to create */}
            <div className="space-y-1.5">
              <label htmlFor="pr-branch-input" className="text-xs font-medium text-content-secondary flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-content-muted" />
                <span>New Branch Name</span>
              </label>
              <Input
                id="pr-branch-input"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="feature/my-branch"
                required
                className="text-xs font-mono"
              />
              <span className="text-[11px] text-content-muted">
                This branch will be branched off <code>{review.base_branch || connectedRepo?.default_branch || 'main'}</code>.
              </span>
            </div>

            {/* PR Title */}
            <div className="space-y-1.5">
              <label htmlFor="pr-title-input" className="text-xs font-medium text-content-secondary">
                Pull Request Title
              </label>
              <Input
                id="pr-title-input"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="Pull Request Title"
                required
                className="text-xs"
              />
            </div>

            {/* PR Body */}
            <div className="space-y-1.5">
              <label htmlFor="pr-body-input" className="text-xs font-medium text-content-secondary">
                Pull Request Description
              </label>
              <Textarea
                id="pr-body-input"
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                rows={3}
                required
                className="text-xs"
              />
            </div>

            {/* Explicit User Confirmation */}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasConfirmed}
                  onChange={(e) => setHasConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-[11px] text-amber-200/90 leading-relaxed">
                  I explicitly authorize Build Together to push the approved review changes and create a Pull Request on GitHub. (No automatic pushes occur without this confirmation).
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                disabled={!hasConfirmed}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs"
              >
                <GitPullRequest className="h-3.5 w-3.5" />
                <span>Create GitHub Pull Request</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
