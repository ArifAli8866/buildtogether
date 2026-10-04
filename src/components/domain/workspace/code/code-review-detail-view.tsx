'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project, ProjectMemberRole, SanitizedProjectGithubRepo } from '@/types/database';
import type { DetailedCodeReview } from '@/lib/queries/files-and-code';
import {
  submitReviewDecisionAction,
  updateCodeReviewAction,
  deleteCodeReviewAction,
} from '@/lib/actions/files-and-code';
import { DiffViewer } from './diff-viewer';
import { ExportPrDialog } from '@/components/domain/workspace/github/export-pr-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Send,
  GitMerge,
  GitPullRequest,
  GitFork,
  ExternalLink,
  Trash2,
  Clock,
  FileCode,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

interface CodeReviewDetailViewProps {
  project: Project;
  review: DetailedCodeReview;
  role: ProjectMemberRole;
  currentUserId: string;
  connectedRepo?: SanitizedProjectGithubRepo | null;
}

export function CodeReviewDetailView({
  project,
  review,
  role,
  currentUserId,
  connectedRepo,
}: CodeReviewDetailViewProps) {
  const router = useRouter();
  const isAdmin = role === 'owner' || role === 'maintainer';
  const isAuthor = review.author_id === currentUserId;

  const [isExportPrDialogOpen, setIsExportPrDialogOpen] = React.useState(false);

  const [selectedFileId, setSelectedFileId] = React.useState<string>(
    review.files[0]?.id || ''
  );
  const [decisionModalAction, setDecisionModalAction] = React.useState<
    'approved' | 'changes_requested' | 'merged' | null
  >(null);
  const [decisionNotes, setDecisionNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedFile = React.useMemo(() => {
    return review.files.find((f) => f.id === selectedFileId) || review.files[0];
  }, [review.files, selectedFileId]);

  const handleDecisionSubmit = async () => {
    if (!decisionModalAction) return;

    setIsSubmitting(true);
    setError(null);

    const result = await submitReviewDecisionAction({
      reviewId: review.id,
      projectId: project.id,
      decision: decisionModalAction,
      notes: decisionNotes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setDecisionModalAction(null);
    setDecisionNotes('');
    router.refresh();
  };

  const handleRequestReview = async () => {
    setIsSubmitting(true);
    const result = await updateCodeReviewAction({
      reviewId: review.id,
      projectId: project.id,
      status: 'review',
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this code review?')) return;
    setIsSubmitting(true);
    const result = await deleteCodeReviewAction(review.id, project.id);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    router.push(`/projects/${project.slug}/workspace/code`);
  };

  const getStatusBadgeVariant = (st: string) => {
    switch (st) {
      case 'approved':
        return 'success';
      case 'review':
        return 'info';
      case 'changes_requested':
        return 'danger';
      case 'merged':
        return 'accent';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back button & Action controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href={`/projects/${project.slug}/workspace/code`}
          className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Code Workspace</span>
        </Link>

        {/* Decision & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {isAuthor && review.status === 'draft' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRequestReview}
              isLoading={isSubmitting}
              className="gap-1.5 text-xs h-8"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit for Review</span>
            </Button>
          )}

          {/* Reviewer / Admin Actions */}
          {(!isAuthor || isAdmin) && review.status !== 'merged' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDecisionModalAction('changes_requested')}
                className="gap-1.5 text-xs h-8 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Request Changes</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setDecisionModalAction('approved')}
                className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-500"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Approve Review</span>
              </Button>
            </>
          )}

          {isAdmin && review.status !== 'merged' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDecisionModalAction('merged')}
              className="gap-1.5 text-xs h-8 border-accent-primary/60 text-accent-primary"
            >
              <GitMerge className="h-3.5 w-3.5" />
              <span>Mark as Merged</span>
            </Button>
          )}

          {/* GitHub PR Integration Button */}
          {review.github_pr_url ? (
            <a
              href={review.github_pr_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span>
                GitHub PR #{review.github_pr_number || ''} ({review.github_pr_status || 'open'})
              </span>
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            review.status === 'approved' && (
              connectedRepo ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsExportPrDialogOpen(true)}
                  className="gap-1.5 text-xs h-8 bg-purple-600 hover:bg-purple-500 text-white"
                >
                  <GitPullRequest className="h-3.5 w-3.5" />
                  <span>Export to GitHub PR</span>
                </Button>
              ) : (
                isAdmin && (
                  <Link href={`/projects/${project.slug}/workspace/github`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 border-dashed border-accent-primary/60 text-accent-primary"
                    >
                      <GitFork className="h-3.5 w-3.5" />
                      <span>Connect Repo to Export PR</span>
                    </Button>
                  </Link>
                )
              )
            )
          )}

          {(isAuthor || isAdmin) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-content-muted hover:text-red-400"
              title="Delete review"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Review Header Card */}
      <div className="rounded-xl border border-border-subtle bg-app-surface-1 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge
                variant={getStatusBadgeVariant(review.status)}
                size="sm"
                className="capitalize font-bold text-xs"
              >
                {review.status.replace('_', ' ')}
              </Badge>

              <h1 className="text-xl font-bold tracking-tight text-content-primary">
                {review.title}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-xs text-content-muted flex-wrap">
              <span className="font-mono bg-app-surface-2 px-2 py-0.5 rounded text-content-secondary flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-accent-primary" />
                <span>{review.target_branch}</span>
                <ArrowRight className="h-3.5 w-3.5 text-content-muted" />
                <span>{review.base_branch}</span>
              </span>

              <span>&bull;</span>

              <div className="flex items-center gap-1.5">
                <Avatar
                  src={review.author.avatar_url}
                  alt={review.author.username}
                  fallbackText={review.author.username}
                  size="sm"
                  className="h-4 w-4"
                />
                <span className="font-medium text-content-primary">
                  {review.author.full_name || `@${review.author.username}`}
                </span>
              </div>

              <span>&bull;</span>

              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="pt-3 border-t border-border-subtle text-xs text-content-secondary leading-relaxed whitespace-pre-wrap">
          {review.summary}
        </div>

        {/* Review Decisions & History Timeline */}
        {review.decisions && review.decisions.length > 0 && (
          <div className="pt-4 border-t border-border-subtle space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted block">
              Review Activity History
            </span>
            <div className="space-y-1.5">
              {review.decisions.map((dec) => (
                <div
                  key={dec.id}
                  className="flex items-start gap-2.5 rounded-lg bg-app-surface-2/60 p-2.5 text-xs border border-border-subtle/50"
                >
                  <Avatar
                    src={dec.reviewer.avatar_url}
                    alt={dec.reviewer.username}
                    fallbackText={dec.reviewer.username}
                    size="sm"
                    className="h-4 w-4 mt-0.5"
                  />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-content-primary">
                        {dec.reviewer.username}
                      </span>
                      <Badge
                        variant={getStatusBadgeVariant(dec.decision)}
                        size="sm"
                        className="capitalize text-[9px]"
                      >
                        {dec.decision.replace('_', ' ')}
                      </Badge>
                      <span className="text-[10px] text-content-muted">
                        {new Date(dec.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    {dec.notes && (
                      <p className="text-content-secondary text-[11px]">{dec.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Files Tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-xs font-bold text-content-muted px-2 shrink-0">
            Files ({review.files.length}):
          </span>
          {review.files.map((file) => {
            const isSelected = file.id === selectedFile?.id;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => setSelectedFileId(file.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-mono transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-accent-primary text-white shadow-sm font-bold'
                    : 'bg-app-surface-1 border border-border-subtle text-content-secondary hover:bg-app-surface-2'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>{file.file_path}</span>
                <span
                  className={`text-[9px] uppercase px-1 rounded ${
                    file.change_type === 'added'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : file.change_type === 'deleted'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {file.change_type}
                </span>
              </button>
            );
          })}
        </div>

        {/* Diff Viewer for the active file */}
        {selectedFile && (
          <DiffViewer
            reviewId={review.id}
            projectId={project.id}
            file={selectedFile}
            comments={review.comments}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* Decision Notes Dialog Modal */}
      {decisionModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md rounded-xl border border-border-subtle bg-app-surface-1 p-5 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="text-sm font-bold capitalize text-content-primary">
                {decisionModalAction.replace('_', ' ')} Review
              </h3>
              <button
                type="button"
                onClick={() => setDecisionModalAction(null)}
                className="rounded p-1 text-content-secondary hover:bg-app-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="decision-notes" className="text-xs font-semibold text-content-secondary">
                Review Feedback / Notes (Optional)
              </label>
              <Textarea
                id="decision-notes"
                placeholder={
                  decisionModalAction === 'approved'
                    ? 'Looks great to me, clean architecture!'
                    : decisionModalAction === 'changes_requested'
                    ? 'Please address inline comments on error handling...'
                    : 'Merged into main.'
                }
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                rows={4}
                className="text-xs"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDecisionModalAction(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleDecisionSubmit}
                isLoading={isSubmitting}
                className="capitalize"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Confirm {decisionModalAction.replace('_', ' ')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export PR Dialog Modal */}
      {connectedRepo && (
        <ExportPrDialog
          isOpen={isExportPrDialogOpen}
          onClose={() => setIsExportPrDialogOpen(false)}
          review={review}
          projectId={project.id}
          connectedRepo={connectedRepo}
        />
      )}
    </div>
  );
}
