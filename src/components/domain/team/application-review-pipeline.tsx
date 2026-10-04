'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DetailedContributionRequest } from '@/lib/queries/contributions';
import { reviewContributionRequestAction } from '@/lib/actions/contribution';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertCircle,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ApplicationReviewPipelineProps {
  projectId: string;
  projectSlug: string;
  requests: DetailedContributionRequest[];
}

export function ApplicationReviewPipeline({
  requests,
}: ApplicationReviewPipelineProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<
    'all' | 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn'
  >('pending');
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = React.useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = React.useState('');
  const [expandedPitchIds, setExpandedPitchIds] = React.useState<Record<string, boolean>>({});

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'all') return true;
    return r.request.status === activeTab;
  });

  const pendingCount = requests.filter((r) => r.request.status === 'pending').length;
  const underReviewCount = requests.filter((r) => r.request.status === 'under_review').length;

  const togglePitchExpand = (id: string) => {
    setExpandedPitchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReviewDecision = async (
    requestId: string,
    decision: 'accepted' | 'rejected' | 'under_review',
    notes?: string
  ) => {
    setActionError(null);
    setActionLoadingId(requestId);

    const res = await reviewContributionRequestAction({
      requestId,
      decision,
      reviewNotes: notes || null,
    });

    setActionLoadingId(null);
    if (!res.success) {
      setActionError(res.error?.message || 'Failed to update review decision.');
      return;
    }

    setRejectingRequestId(null);
    setRejectNotes('');
    router.refresh();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="warning" size="sm" className="gap-1 font-semibold">
            <Clock className="h-3 w-3" /> Pending Review
          </Badge>
        );
      case 'under_review':
        return (
          <Badge variant="info" size="sm" className="gap-1 font-semibold">
            <Clock className="h-3 w-3" /> Under Review
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="success" size="sm" className="gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="sm" className="gap-1 font-semibold">
            <XCircle className="h-3 w-3" /> Declined
          </Badge>
        );
      case 'withdrawn':
        return <Badge variant="neutral" size="sm">Withdrawn</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-content-primary">
            Applicant Review Pipeline ({requests.length})
          </h2>
          <p className="text-xs text-content-secondary">
            Review prospective contributors, evaluate skill alignment, and provision team access.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'pending', label: 'Pending', count: pendingCount },
              { key: 'under_review', label: 'Under Review', count: underReviewCount },
              { key: 'accepted', label: 'Accepted', count: undefined },
              { key: 'rejected', label: 'Declined', count: undefined },
              { key: 'all', label: 'All', count: undefined },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-accent-primary text-content-inverse'
                  : 'bg-app-surface-2 text-content-secondary hover:text-content-primary hover:bg-app-surface-3'
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-status-danger/10 border border-status-danger/30 p-3 text-xs text-status-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Applications List */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRequests.map(
            ({ request, applicant, applicantSkills, applicantTechnologies, projectRole }) => {
              const isActionable =
                request.status === 'pending' || request.status === 'under_review';
              const isExpanded = expandedPitchIds[request.id] || false;

              return (
                <Card
                  key={request.id}
                  className="p-5 sm:p-6 space-y-4 border-border-subtle bg-app-surface-1 hover:border-border-focus transition-all"
                >
                  {/* Top row: Applicant Identity & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Link
                        href={`/developers/${applicant.username}`}
                        className="shrink-0"
                      >
                        <Avatar
                          src={applicant.avatar_url}
                          alt={applicant.full_name}
                          fallbackText={applicant.full_name}
                          size="md"
                        />
                      </Link>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/developers/${applicant.username}`}
                            className="text-base font-bold text-content-primary hover:text-accent-primary hover:underline"
                          >
                            {applicant.full_name}
                          </Link>
                          <span className="text-xs text-content-muted">
                            @{applicant.username}
                          </span>
                        </div>
                        {applicant.headline && (
                          <p className="text-xs text-content-secondary line-clamp-1">
                            {applicant.headline}
                          </p>
                        )}
                        <p className="text-[11px] text-content-muted">
                          Applied {new Date(request.created_at).toLocaleDateString()} • Available{' '}
                          <strong>{request.weekly_hours} hrs/week</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>

                  {/* Target Role & Skills */}
                  <div className="rounded-lg bg-app-surface-2/60 p-3 space-y-2 border border-border-subtle/50 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-content-primary">
                        <Briefcase className="h-3.5 w-3.5 text-accent-primary" />
                        <span>
                          Target Role:{' '}
                          {projectRole ? projectRole.title : 'General Contributor'}
                        </span>
                      </div>
                    </div>

                    {/* Applicant Skills Tags */}
                    {applicantSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-content-muted mr-1">
                          Applicant Competencies:
                        </span>
                        {applicantSkills.map((s) => (
                          <Badge key={s.id} variant="neutral" size="sm">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Applicant Technologies */}
                    {applicantTechnologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-content-muted mr-1">
                          Tech Stack:
                        </span>
                        {applicantTechnologies.map((t) => (
                          <Badge key={t.id} variant="accent" size="sm">
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pitch / Message */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-content-primary">
                      Candidate Pitch:
                    </span>
                    <p
                      className={`text-xs text-content-secondary leading-relaxed bg-app-surface-2 p-3 rounded-lg border border-border-subtle/40 ${
                        !isExpanded ? 'line-clamp-3' : ''
                      }`}
                    >
                      {request.pitch}
                    </p>
                    {request.pitch.length > 200 && (
                      <button
                        type="button"
                        onClick={() => togglePitchExpand(request.id)}
                        className="text-[11px] text-accent-primary hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3" /> Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" /> Read full pitch
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Portfolio Links */}
                  {request.portfolio_links && request.portfolio_links.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-content-primary">
                        Proof of Work / Links:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {request.portfolio_links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-app-surface-2 px-2.5 py-1 text-xs text-accent-primary hover:underline border border-border-subtle"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="max-w-[200px] truncate">{link}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Notes (if already declined) */}
                  {request.review_notes && (
                    <div className="rounded-lg bg-status-danger/10 border border-status-danger/20 p-2.5 text-xs text-status-danger">
                      <strong>Review Note:</strong> {request.review_notes}
                    </div>
                  )}

                  {/* Action Buttons for Pending / Under Review */}
                  {isActionable && (
                    <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleReviewDecision(request.id, 'under_review')
                            }
                            disabled={actionLoadingId === request.id}
                            className="text-xs"
                          >
                            Mark Under Review
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectingRequestId(request.id)}
                          disabled={actionLoadingId === request.id}
                          className="text-xs text-status-danger hover:bg-status-danger/10 border-status-danger/30"
                        >
                          Decline
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            handleReviewDecision(request.id, 'accepted')
                          }
                          disabled={actionLoadingId === request.id}
                          className="text-xs gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {actionLoadingId === request.id
                              ? 'Provisioning...'
                              : 'Accept as Member'}
                          </span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Decline Notes Modal / Form */}
                  {rejectingRequestId === request.id && (
                    <div className="rounded-xl border border-status-danger/30 bg-app-surface-2 p-4 space-y-3 animate-in fade-in">
                      <h4 className="text-xs font-bold text-content-primary">
                        Decline Application
                      </h4>
                      <textarea
                        rows={2}
                        placeholder="Optional feedback for the candidate (e.g. need more experience in Rust)..."
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        className="flex w-full rounded-md border border-border-subtle bg-app-surface-1 p-2 text-xs text-content-primary"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRejectingRequestId(null);
                            setRejectNotes('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleReviewDecision(
                              request.id,
                              'rejected',
                              rejectNotes
                            )
                          }
                          disabled={actionLoadingId === request.id}
                        >
                          Confirm Decline
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            }
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-border-subtle bg-app-surface-1 p-12 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-app-surface-2 text-content-muted">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-content-primary">
            No applications in &ldquo;{activeTab.replace('_', ' ')}&rdquo;
          </h3>
          <p className="text-xs text-content-muted max-w-sm mx-auto">
            {activeTab === 'pending'
              ? 'All incoming applications have been reviewed. New submissions will appear here.'
              : 'No applications match this filter tab.'}
          </p>
        </div>
      )}
    </div>
  );
}
