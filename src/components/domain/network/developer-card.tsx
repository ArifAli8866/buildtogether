'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UserPlus,
  Check,
  Clock,
  MapPin,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { DeveloperWithRelevance } from '@/types/database';
import { sendConnectionRequestAction } from '@/lib/actions/community';

interface DeveloperCardProps {
  developer: DeveloperWithRelevance;
  currentUserId?: string | null;
}

export function DeveloperCard({
  developer,
  currentUserId,
}: DeveloperCardProps) {
  const router = useRouter();
  const [connectionState, setConnectionState] = React.useState(
    developer.connectionState
  );
  const [isConnecting, setIsConnecting] = React.useState(false);

  const {
    profile,
    skills,
    technologies,
    sharedSkills,
    sharedTech,
    isAvailabilityCompatible,
  } = developer;

  const handleConnect = async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    if (isConnecting) return;

    setIsConnecting(true);
    try {
      const res = await sendConnectionRequestAction({
        recipientId: profile.id,
      });
      if (res.success) {
        setConnectionState({
          state: 'pending',
          isRequester: true,
          connectionId: res.data?.id,
        });
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const hasOverlap = sharedSkills.length > 0 || sharedTech.length > 0;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border-subtle bg-app-surface-1 p-5 transition-colors hover:border-border-muted">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={`/developers/${profile.username}`}>
              <Avatar
                src={profile.avatar_url}
                fallbackText={profile.full_name}
                size="md"
              />
            </Link>
            <div>
              <Link
                href={`/developers/${profile.username}`}
                className="font-bold text-content-primary hover:text-accent-primary text-sm flex items-center gap-1.5"
              >
                <span>{profile.full_name}</span>
                <ExternalLink className="h-3 w-3 text-content-muted" />
              </Link>
              <p className="text-xs text-content-muted">@{profile.username}</p>
            </div>
          </div>

          {/* Overlap Pill if authenticated */}
          {currentUserId && hasOverlap && (
            <Badge variant="accent" size="sm" className="gap-1">
              <Sparkles className="h-3 w-3" />
              <span>
                {sharedSkills.length + sharedTech.length} Shared
              </span>
            </Badge>
          )}
        </div>

        {/* Headline */}
        {profile.headline && (
          <p className="mt-3 text-xs text-content-secondary line-clamp-2">
            {profile.headline}
          </p>
        )}

        {/* Availability & Location */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-content-muted">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.availability_hours_per_week > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {profile.availability_hours_per_week} hrs/wk{' '}
                {isAvailabilityCompatible && currentUserId ? '(Aligned)' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {skills.slice(0, 4).map((s) => {
              const isShared = sharedSkills.includes(s.name);
              return (
                <span
                  key={s.id}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    isShared
                      ? 'bg-accent-primary/20 text-accent-primary font-semibold'
                      : 'bg-app-surface-2 text-content-secondary'
                  }`}
                >
                  {s.name}
                </span>
              );
            })}
            {skills.length > 4 && (
              <span className="text-[10px] text-content-muted self-center">
                +{skills.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Technologies */}
        {technologies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {technologies.slice(0, 3).map((t) => {
              const isShared = sharedTech.includes(t.name);
              return (
                <span
                  key={t.id}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                    isShared
                      ? 'bg-accent-primary/20 text-accent-primary font-semibold'
                      : 'bg-app-surface-2 text-content-muted'
                  }`}
                >
                  {t.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 border-t border-border-subtle pt-3 flex items-center justify-between">
        <Link href={`/developers/${profile.username}`}>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-content-secondary">
            Profile
          </Button>
        </Link>

        {connectionState.state === 'connected' ? (
          <Badge variant="success" size="sm" className="gap-1 h-8 px-2.5">
            <Check className="h-3.5 w-3.5" />
            <span>Connected</span>
          </Badge>
        ) : connectionState.state === 'pending' ? (
          <Button
            variant="secondary"
            size="sm"
            disabled
            className="h-8 text-xs opacity-75"
          >
            {connectionState.isRequester ? 'Request Sent' : 'Request Received'}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleConnect}
            disabled={isConnecting}
            className="h-8 text-xs gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Connect</span>
          </Button>
        )}
      </div>
    </div>
  );
}
