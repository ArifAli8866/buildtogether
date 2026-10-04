'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DetailedProjectMember } from '@/lib/queries/contributions';
import {
  updateProjectMemberRoleAction,
  removeProjectMemberAction,
  leaveProjectAction,
} from '@/lib/actions/contribution';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Shield,
  ShieldCheck,
  User,
  LogOut,
  AlertCircle,
  Briefcase,
  Calendar,
} from 'lucide-react';

interface TeamRosterViewProps {
  projectId: string;
  projectSlug: string;
  members: DetailedProjectMember[];
  currentUserId?: string | null;
  isOwner: boolean;
  isAdmin: boolean;
}

export function TeamRosterView({
  projectId,
  projectSlug,
  members,
  currentUserId,
  isOwner,
  isAdmin,
}: TeamRosterViewProps) {
  const router = useRouter();
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [editingMember, setEditingMember] = React.useState<DetailedProjectMember | null>(null);
  const [newRole, setNewRole] = React.useState<'maintainer' | 'contributor' | 'viewer'>('contributor');

  const getMemberRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <Badge variant="accent" size="sm" className="gap-1 font-bold">
            <ShieldCheck className="h-3 w-3" /> Owner
          </Badge>
        );
      case 'maintainer':
        return (
          <Badge variant="info" size="sm" className="gap-1 font-semibold">
            <Shield className="h-3 w-3" /> Maintainer
          </Badge>
        );
      case 'contributor':
        return (
          <Badge variant="neutral" size="sm" className="gap-1 font-medium">
            <User className="h-3 w-3" /> Contributor
          </Badge>
        );
      case 'viewer':
        return (
          <Badge variant="neutral" size="sm" className="text-content-muted">
            Viewer
          </Badge>
        );
      default:
        return <Badge variant="neutral">{role}</Badge>;
    }
  };

  const handleRoleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setActionError(null);
    setActionLoadingId(editingMember.member.id);

    const res = await updateProjectMemberRoleAction({
      projectId,
      memberId: editingMember.member.id,
      newRole,
    });

    setActionLoadingId(null);
    if (!res.success) {
      setActionError(res.error?.message || 'Failed to update member role.');
      return;
    }

    setEditingMember(null);
    router.refresh();
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this project?`)) {
      return;
    }

    setActionError(null);
    setActionLoadingId(memberId);
    const res = await removeProjectMemberAction({ projectId, memberId });
    setActionLoadingId(null);

    if (!res.success) {
      setActionError(res.error?.message || 'Failed to remove member.');
      return;
    }

    router.refresh();
  };

  const handleLeaveProject = async () => {
    if (!window.confirm('Are you sure you want to leave this project team?')) {
      return;
    }

    setActionError(null);
    const res = await leaveProjectAction(projectId);
    if (!res.success) {
      setActionError(res.error?.message || 'Failed to leave project.');
      return;
    }

    router.push(`/projects/${projectSlug}`);
    router.refresh();
  };

  const isCurrentUserMember = members.some((m) => m.profile.id === currentUserId);
  const isCurrentUserOwner = members.some(
    (m) => m.profile.id === currentUserId && m.member.role === 'owner'
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-content-primary">
            Project Team Roster ({members.length})
          </h2>
          <p className="text-xs text-content-secondary">
            Developers actively collaborating and building this product.
          </p>
        </div>

        {/* Member Voluntary Leave Button */}
        {isCurrentUserMember && !isCurrentUserOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeaveProject}
            className="text-xs text-status-danger border-status-danger/30 hover:bg-status-danger/10 gap-1.5 self-start sm:self-auto"
          >
            <LogOut className="h-3.5 w-3.5" /> Leave Project
          </Button>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-status-danger/10 border border-status-danger/30 p-3 text-xs text-status-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Members Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map(({ member, profile, projectRole }) => {
          const isTargetOwner = member.role === 'owner';
          const canManageThisMember =
            isAdmin && !isTargetOwner && (isOwner || member.role !== 'maintainer');

          return (
            <Card
              key={member.id}
              className="p-5 flex flex-col justify-between space-y-4 hover:border-border-focus transition-colors"
            >
              <div className="space-y-3">
                {/* Top Row: User Avatar & Roles */}
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/developers/${profile.username}`}
                    className="flex items-center gap-3 group/profile"
                  >
                    <Avatar
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      fallbackText={profile.full_name}
                      size="md"
                    />
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-content-primary group-hover/profile:text-accent-primary">
                        {profile.full_name}
                      </h3>
                      <p className="text-xs text-content-muted">@{profile.username}</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {getMemberRoleBadge(member.role)}
                  </div>
                </div>

                {/* Headline / Bio */}
                {profile.headline && (
                  <p className="text-xs text-content-secondary line-clamp-2">
                    {profile.headline}
                  </p>
                )}

                {/* Project Role Assignment */}
                {projectRole && (
                  <div className="flex items-center gap-1.5 text-xs text-content-primary font-medium bg-app-surface-2/60 px-2.5 py-1 rounded-md border border-border-subtle/50">
                    <Briefcase className="h-3.5 w-3.5 text-accent-primary" />
                    <span>Role: {projectRole.title}</span>
                  </div>
                )}
              </div>

              {/* Bottom Row: Joined Date & Admin Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-xs text-content-muted">
                <span className="flex items-center gap-1 text-[11px]">
                  <Calendar className="h-3 w-3" />
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </span>

                {canManageThisMember && (
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMember({ member, profile, projectRole });
                          setNewRole(
                            member.role === 'maintainer' ? 'maintainer' : 'contributor'
                          );
                        }}
                        className="text-xs text-accent-primary hover:underline font-medium"
                      >
                        Edit Role
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id, profile.full_name)}
                      disabled={actionLoadingId === member.id}
                      className="text-xs text-status-danger hover:underline font-medium"
                    >
                      {actionLoadingId === member.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Role Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-content-primary">
              Change Member Role
            </h3>
            <p className="text-xs text-content-secondary">
              Update authorization role for <strong>{editingMember.profile.full_name}</strong>.
            </p>

            <form onSubmit={handleRoleChangeSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-content-secondary">
                  Permission Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as 'maintainer' | 'contributor' | 'viewer')
                  }
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
                >
                  <option value="contributor">Contributor (Standard Workspace Access)</option>
                  <option value="maintainer">Maintainer (Review & Admin Permissions)</option>
                  <option value="viewer">Viewer (Read Only Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMember(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={Boolean(actionLoadingId)}
                >
                  {actionLoadingId ? 'Updating...' : 'Save Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
