'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserContributionApplication } from '@/lib/queries/contributions';
import { withdrawContributionRequestAction } from '@/lib/actions/contribution';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Compass,
  Calendar,
  Send,
} from 'lucide-react';

interface UserApplicationsListProps {
  applications: UserContributionApplication[];
}

export function UserApplicationsList({ applications }: UserApplicationsListProps) {
  const router = useRouter();
  const [withdrawingId, setWithdrawingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const handleWithdraw = async (requestId: string, projectTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to withdraw your contribution application to "${projectTitle}"?`
      )
    ) {
      return;
    }

    setWithdrawingId(requestId);
    setActionError(null);

    const res = await withdrawContributionRequestAction(requestId);
    setWithdrawingId(null);

    if (!res.success) {
      setActionError(res.error?.message || 'Failed to withdraw application.');
      return;
    }

    router.refresh();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="warning" size="sm" className="gap-1 font-medium">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case 'under_review':
        return (
          <Badge variant="info" size="sm" className="gap-1 font-medium">
            <Clock className="h-3 w-3" />
            Under Review
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="success" size="sm" className="gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="sm" className="gap-1 font-medium">
            <XCircle className="h-3 w-3" />
            Not Selected
          </Badge>
        );
      case 'withdrawn':
        return (
          <Badge variant="neutral" size="sm" className="gap-1 font-medium text-content-muted">
            Withdrawn
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status}
          </Badge>
        );
    }
  };

  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-subtle p-8 text-center space-y-3">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-app-surface-2 text-content-secondary">
          <Send className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-content-primary">
            No active contribution applications
          </h4>
          <p className="text-xs text-content-muted max-w-sm mx-auto">
            Discover projects that match your skills, request to contribute to open roles, and form
            a team.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/explore">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Compass className="h-3.5 w-3.5" /> Explore Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-status-danger/10 p-3 text-xs text-status-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {applications.map(({ request, project, projectRole }) => {
        const canWithdraw =
          request.status === 'pending' || request.status === 'under_review';

        return (
          <div
            key={request.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border-subtle bg-app-surface-2/60 p-4 transition-colors hover:border-border-focus"
          >
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/projects/${project.slug}`}
                  className="font-bold text-sm text-content-primary hover:text-accent-primary truncate"
                >
                  {project.title}
                </Link>
                <Badge variant="neutral" size="sm" className="capitalize text-[10px]">
                  {project.category}
                </Badge>
                {getStatusBadge(request.status)}
              </div>

              <div className="flex items-center gap-4 text-xs text-content-secondary flex-wrap">
                <span className="flex items-center gap-1 font-medium text-content-primary">
                  <Briefcase className="h-3.5 w-3.5 text-accent-primary" />
                  Role: {projectRole?.title || 'General Contributor'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-content-muted" />
                  {request.weekly_hours} hrs/week
                </span>
                <span className="flex items-center gap-1 text-content-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  Applied {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>

              {request.pitch && (
                <p className="text-xs text-content-muted line-clamp-2 italic bg-app-surface-1/60 rounded p-2 border border-border-subtle/50">
                  &ldquo;{request.pitch}&rdquo;
                </p>
              )}

              {request.status === 'rejected' && request.review_notes && (
                <p className="text-xs text-status-danger/90 bg-status-danger/10 rounded p-2 border border-status-danger/20">
                  Feedback from project lead: {request.review_notes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              {request.status === 'accepted' ? (
                <Link href={`/projects/${project.slug}/team`}>
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                    <span>View Team</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              ) : (
                <Link href={`/projects/${project.slug}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Project Details
                  </Button>
                </Link>
              )}

              {canWithdraw && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-status-danger hover:bg-status-danger/10 hover:text-status-danger"
                  onClick={() => handleWithdraw(request.id, project.title)}
                  disabled={withdrawingId === request.id}
                >
                  {withdrawingId === request.id ? 'Withdrawing...' : 'Withdraw'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
