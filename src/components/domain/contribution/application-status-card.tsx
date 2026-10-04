'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ContributionRequest } from '@/types/database';
import { withdrawContributionRequestAction } from '@/lib/actions/contribution';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ApplicationStatusCardProps {
  request: ContributionRequest;
  projectSlug: string;
}

export function ApplicationStatusCard({
  request,
  projectSlug,
}: ApplicationStatusCardProps) {
  const router = useRouter();
  const [isWithdrawing, setIsWithdrawing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw your contribution application?')) {
      return;
    }

    setIsWithdrawing(true);
    setError(null);
    const res = await withdrawContributionRequestAction(request.id);
    setIsWithdrawing(false);

    if (!res.success) {
      setError(res.error?.message || 'Failed to withdraw application.');
      return;
    }

    router.refresh();
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case 'pending':
        return (
          <Badge variant="warning" size="md" className="gap-1.5 font-semibold">
            <Clock className="h-3.5 w-3.5" /> Pending Review
          </Badge>
        );
      case 'under_review':
        return (
          <Badge variant="info" size="md" className="gap-1.5 font-semibold">
            <Clock className="h-3.5 w-3.5" /> Under Review
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="success" size="md" className="gap-1.5 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" /> Accepted & Joined
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="md" className="gap-1.5 font-semibold">
            <XCircle className="h-3.5 w-3.5" /> Declined
          </Badge>
        );
      case 'withdrawn':
        return (
          <Badge variant="neutral" size="md" className="gap-1.5">
            Withdrawn
          </Badge>
        );
      default:
        return <Badge variant="neutral">{request.status}</Badge>;
    }
  };

  const canWithdraw = request.status === 'pending' || request.status === 'under_review';

  return (
    <div className="rounded-xl border border-border-subtle bg-app-surface-2/60 p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
            Your Application:
          </span>
          {getStatusBadge()}
        </div>

        {canWithdraw && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            className="text-xs text-status-danger hover:bg-status-danger/10 border-status-danger/30 self-start sm:self-auto"
          >
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw Application'}
          </Button>
        )}

        {request.status === 'accepted' && (
          <Link href={`/projects/${projectSlug}/team`}>
            <Button variant="primary" size="sm" className="text-xs gap-1.5 self-start sm:self-auto">
              <span>View Team Roster</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-status-danger/10 p-2 text-xs text-status-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Details */}
      <div className="text-xs text-content-secondary space-y-1 pt-1 border-t border-border-subtle/50">
        <p className="line-clamp-2 italic">&ldquo;{request.pitch}&rdquo;</p>
        <div className="flex items-center gap-3 text-[11px] text-content-muted pt-1">
          <span>Committed: <strong>{request.weekly_hours} hrs/week</strong></span>
          <span>&bull;</span>
          <span>Submitted {new Date(request.created_at).toLocaleDateString()}</span>
          {request.review_notes && (
            <>
              <span>&bull;</span>
              <span className="text-content-primary">Note: {request.review_notes}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
