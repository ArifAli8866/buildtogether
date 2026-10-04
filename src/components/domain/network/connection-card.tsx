'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  MapPin,
  Check,
  X,
  UserX,
  ExternalLink,
} from 'lucide-react';
import type { UserConnectionWithProfiles } from '@/types/database';
import {
  respondConnectionRequestAction,
  removeConnectionAction,
} from '@/lib/actions/community';

interface ConnectionCardProps {
  connection: UserConnectionWithProfiles;
  currentUserId: string;
  type: 'connected' | 'incoming' | 'sent';
}

export function ConnectionCard({
  connection,
  currentUserId,
  type,
}: ConnectionCardProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Determine which profile is the peer
  const peer =
    connection.requester_id === currentUserId
      ? connection.recipient
      : connection.requester;

  const handleRespond = async (action: 'accept' | 'decline') => {
    setIsProcessing(true);
    try {
      const res = await respondConnectionRequestAction({
        connectionId: connection.id,
        action,
      });
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    const confirmMsg =
      type === 'sent'
        ? 'Cancel this connection request?'
        : 'Remove this developer from your connections?';
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const res = await removeConnectionAction({ connectionId: connection.id });
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border-subtle bg-app-surface-1 p-5 transition-colors hover:border-border-muted">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={`/developers/${peer.username}`}>
              <Avatar
                src={peer.avatar_url}
                fallbackText={peer.full_name}
                size="md"
              />
            </Link>
            <div>
              <Link
                href={`/developers/${peer.username}`}
                className="font-bold text-content-primary hover:text-accent-primary text-sm flex items-center gap-1.5"
              >
                <span>{peer.full_name}</span>
                <ExternalLink className="h-3 w-3 text-content-muted" />
              </Link>
              <p className="text-xs text-content-muted">@{peer.username}</p>
            </div>
          </div>

          {type === 'connected' && (
            <Badge variant="success" size="sm">
              Connected
            </Badge>
          )}
          {type === 'incoming' && (
            <Badge variant="warning" size="sm">
              Incoming
            </Badge>
          )}
          {type === 'sent' && (
            <Badge variant="neutral" size="sm">
              Pending
            </Badge>
          )}
        </div>

        {peer.headline && (
          <p className="mt-3 text-xs text-content-secondary line-clamp-2">
            {peer.headline}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-content-muted">
          {peer.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{peer.location}</span>
            </div>
          )}
          {peer.availability_hours_per_week > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{peer.availability_hours_per_week} hrs/wk</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-5 border-t border-border-subtle pt-3">
        {type === 'incoming' && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleRespond('accept')}
              disabled={isProcessing}
              className="flex-1 gap-1 text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Accept</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRespond('decline')}
              disabled={isProcessing}
              className="flex-1 gap-1 text-xs text-status-danger hover:bg-status-danger/10"
            >
              <X className="h-3.5 w-3.5" />
              <span>Decline</span>
            </Button>
          </div>
        )}

        {type === 'sent' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isProcessing}
            className="w-full text-xs text-content-muted hover:text-status-danger"
          >
            <span>Cancel Request</span>
          </Button>
        )}

        {type === 'connected' && (
          <div className="flex items-center justify-between">
            <Link href={`/developers/${peer.username}`}>
              <Button variant="secondary" size="sm" className="h-7 text-xs">
                View Profile
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isProcessing}
              className="h-7 text-xs text-content-muted hover:text-status-danger"
              title="Remove connection"
            >
              <UserX className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
