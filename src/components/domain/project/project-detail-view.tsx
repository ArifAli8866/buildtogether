'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project, ProjectRole, Profile, Technology, ContributionRequest } from '@/types/database';
import type { MatchBreakdown } from '@/lib/matching/engine';
import type { DetailedProjectMember } from '@/lib/queries/contributions';
import { MatchExplanationDialog } from '@/components/domain/project/match-explanation-dialog';
import { ApplyDialog } from '@/components/domain/contribution/apply-dialog';
import { ApplicationStatusCard } from '@/components/domain/contribution/application-status-card';
import { updateProjectAction, addProjectRoleAction, deleteProjectAction } from '@/lib/actions/project';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  Users,
  Clock,
  Globe,
  Settings,
  Plus,
  Trash2,
  AlertCircle,
  Code2,
  Target,
  FileText,
  Lightbulb,
  CheckCircle2,
  Calendar,
  UserPlus,
  Inbox,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';

interface ProjectDetailViewProps {
  project: Project;
  owner: Profile;
  roles: ProjectRole[];
  technologies: Technology[];
  goals: Array<{ id: string; title: string; status?: string }>;
  matchBreakdown?: MatchBreakdown;
  members?: DetailedProjectMember[];
  userApplication?: ContributionRequest | null;
  isOwner: boolean;
  isAdmin?: boolean;
  isMember?: boolean;
  pendingRequestsCount?: number;
  currentUserId?: string | null;
  userAvailabilityHours?: number;
}

export function ProjectDetailView({
  project,
  owner,
  roles,
  technologies,
  goals,
  matchBreakdown,
  members = [],
  userApplication = null,
  isOwner,
  isAdmin = false,
  isMember = false,
  pendingRequestsCount = 0,
  currentUserId,
  userAvailabilityHours = 10,
}: ProjectDetailViewProps) {
  const router = useRouter();
  const [showMatchModal, setShowMatchModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = React.useState(false);
  const [showApplyModal, setShowApplyModal] = React.useState(false);
  const [selectedApplyRoleId, setSelectedApplyRoleId] = React.useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Edit State
  const [editTitle, setEditTitle] = React.useState(project.title);
  const [editTagline, setEditTagline] = React.useState(project.tagline);
  const [editCategory, setEditCategory] = React.useState(project.category);
  const [editStage, setEditStage] = React.useState(project.stage);
  const [editCollab, setEditCollab] = React.useState(project.collaboration_type);
  const [editProblem, setEditProblem] = React.useState(project.problem_statement);
  const [editSolution, setEditSolution] = React.useState(project.proposed_solution);
  const [editDesc, setEditDesc] = React.useState(project.description);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  // Add Role State
  const [roleTitle, setRoleTitle] = React.useState('');
  const [roleDesc, setRoleDesc] = React.useState('');
  const [roleSkills, setRoleSkills] = React.useState<string[]>([]);
  const [skillInput, setSkillInput] = React.useState('');
  const [roleCapacity, setRoleCapacity] = React.useState(1);
  const [roleHours, setRoleHours] = React.useState(10);
  const [isSavingRole, setIsSavingRole] = React.useState(false);

  const openRoles = roles.filter((r) => r.status === 'open');

  const hasActiveApplication = Boolean(
    userApplication &&
      (userApplication.status === 'pending' || userApplication.status === 'under_review')
  );

  const canApply = Boolean(
    currentUserId &&
      !isOwner &&
      !isMember &&
      !hasActiveApplication &&
      openRoles.length > 0
  );

  const stageLabels: Record<string, { label: string; variant: 'neutral' | 'info' | 'warning' | 'accent' | 'success' }> = {
    idea: { label: 'Idea Stage', variant: 'neutral' },
    planning: { label: 'Planning', variant: 'info' },
    in_development: { label: 'Building', variant: 'accent' },
    testing: { label: 'Testing', variant: 'warning' },
    shipped: { label: 'Shipped', variant: 'success' },
  };

  const currentStage = stageLabels[project.stage] || { label: project.stage, variant: 'neutral' };

  // Handle Edit Project Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSavingEdit(true);

    const res = await updateProjectAction({
      id: project.id,
      title: editTitle,
      tagline: editTagline,
      category: editCategory,
      stage: editStage as Project['stage'],
      visibility: project.visibility,
      collaborationType: (editCollab || 'remote') as 'remote' | 'hybrid' | 'in_person',
      problemStatement: editProblem,
      proposedSolution: editSolution,
      description: editDesc,
      technologyIds: technologies.map((t) => t.id),
    });

    setIsSavingEdit(false);
    if (!res.success) {
      setActionError(res.error?.message || 'Failed to update project.');
      return;
    }

    setShowEditModal(false);
    router.refresh();
  };

  // Handle Add Role Submit
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (roleSkills.length === 0) {
      setActionError('Please specify at least 1 required skill.');
      return;
    }

    setIsSavingRole(true);
    const res = await addProjectRoleAction(project.id, {
      title: roleTitle,
      description: roleDesc,
      requiredSkills: roleSkills,
      capacityCount: roleCapacity,
      commitmentHours: roleHours,
    });

    setIsSavingRole(false);
    if (!res.success) {
      setActionError(res.error?.message || 'Failed to add role.');
      return;
    }

    setShowAddRoleModal(false);
    setRoleTitle('');
    setRoleDesc('');
    setRoleSkills([]);
    router.refresh();
  };

  // Handle Delete Project
  const handleDeleteProject = async () => {
    if (!window.confirm(`Are you sure you want to delete "${project.title}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    const res = await deleteProjectAction(project.id);
    setIsDeleting(false);

    if (!res.success) {
      alert(res.error?.message || 'Failed to delete project.');
      return;
    }

    router.push('/explore');
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border-subtle bg-app-surface-1 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="neutral" size="sm">
                {project.category}
              </Badge>
              <Badge variant={currentStage.variant} size="sm">
                {currentStage.label}
              </Badge>
              <Badge variant="neutral" size="sm" className="capitalize">
                {project.collaboration_type} collaboration
              </Badge>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-content-primary">
              {project.title}
            </h1>
            <p className="text-base text-content-secondary max-w-3xl leading-relaxed">
              {project.tagline}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Project Workspace Link for Members */}
            {(isOwner || isAdmin || isMember) && (
              <Link href={`/projects/${project.slug}/workspace`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-1.5 bg-gradient-to-r from-accent-primary to-accent-highlight hover:opacity-90 shadow-sm"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Workspace</span>
                </Button>
              </Link>
            )}

            {/* Team Roster Link */}
            <Link href={`/projects/${project.slug}/team`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Users className="h-3.5 w-3.5 text-accent-primary" />
                <span>Team ({members.length + 1})</span>
              </Button>
            </Link>

            {/* Admin Review Requests Link */}
            {isAdmin && pendingRequestsCount > 0 && (
              <Link href={`/projects/${project.slug}/team?tab=applications`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 border-accent-primary/40 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20"
                >
                  <Inbox className="h-3.5 w-3.5" />
                  <span>Applications</span>
                  <Badge variant="accent" size="sm" className="ml-0.5 h-4.5 px-1.5 text-[10px]">
                    {pendingRequestsCount}
                  </Badge>
                </Button>
              </Link>
            )}

            {/* Apply Button */}
            {canApply && (
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setSelectedApplyRoleId(undefined);
                  setShowApplyModal(true);
                }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Apply to Contribute</span>
              </Button>
            )}

            {!currentUserId && openRoles.length > 0 && (
              <Link href={`/sign-in?redirect=/projects/${project.slug}`}>
                <Button variant="primary" size="sm" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Sign in to Apply</span>
                </Button>
              </Link>
            )}

            {/* Owner Actions Buttons */}
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowEditModal(true)}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Project Lead Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border-subtle text-xs">
          <Link
            href={`/developers/${owner.username}`}
            className="flex items-center gap-3 group/owner"
          >
            <Avatar
              src={owner.avatar_url}
              alt={owner.full_name}
              fallbackText={owner.full_name}
              size="md"
            />
            <div>
              <p className="text-xs font-semibold text-content-primary group-hover/owner:text-accent-primary">
                {owner.full_name}
              </p>
              <p className="text-[11px] text-content-muted">
                @{owner.username} • Project Lead
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-content-muted">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Created {new Date(project.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              Timezone: {owner.timezone || 'UTC'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Pending Requests Banner */}
      {isAdmin && pendingRequestsCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-accent-primary/40 bg-accent-primary/5 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/15 text-accent-primary">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-content-primary">
                {pendingRequestsCount} Pending Contribution Request{pendingRequestsCount > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-content-secondary">
                Developers have applied to join this project. Review their profiles, availability, and proposals.
              </p>
            </div>
          </div>
          <Link href={`/projects/${project.slug}/team?tab=applications`}>
            <Button variant="primary" size="sm" className="gap-1.5 shrink-0 self-start sm:self-center">
              <span>Review Applications</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* User Application Status Banner (if applicant) */}
      {userApplication && (
        <ApplicationStatusCard request={userApplication} projectSlug={project.slug} />
      )}

      {/* Deterministic Match Banner (if authenticated) */}
      {matchBreakdown && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-accent-primary/30 bg-accent-primary/10 p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-content-inverse shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-content-primary">
                  {matchBreakdown.totalScore}% Compatibility Match
                </h3>
                <span className="text-[11px] font-medium text-accent-primary bg-accent-primary/20 px-2 py-0.5 rounded-full">
                  Deterministic
                </span>
              </div>
              <p className="text-xs text-content-secondary">
                Matched on skills ({matchBreakdown.skills.score}/40), technologies (
                {matchBreakdown.technologies.score}/30), availability (
                {matchBreakdown.availability.score}/20), and timezone (
                {matchBreakdown.timezone.score}/10).
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowMatchModal(true)}
            className="gap-1.5 shrink-0 self-start sm:self-center"
          >
            <span>Explain Match Details</span>
          </Button>
        </div>
      )}

      {/* Main Content Layout: Left 2 Cols (Vision, Narrative, Goals) / Right 1 Col (Stack, Roles) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem & Solution Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="space-y-2 border-border-subtle bg-app-surface-1">
              <div className="flex items-center gap-2 text-status-warning text-xs font-bold uppercase tracking-wider">
                <Lightbulb className="h-4 w-4" />
                <span>The Problem</span>
              </div>
              <p className="text-xs text-content-secondary leading-relaxed">
                {project.problem_statement}
              </p>
            </Card>

            <Card className="space-y-2 border-border-subtle bg-app-surface-1">
              <div className="flex items-center gap-2 text-status-success text-xs font-bold uppercase tracking-wider">
                <Target className="h-4 w-4" />
                <span>Proposed Solution</span>
              </div>
              <p className="text-xs text-content-secondary leading-relaxed">
                {project.proposed_solution}
              </p>
            </Card>
          </div>

          {/* Detailed Description */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              <FileText className="h-4 w-4 text-accent-primary" />
              <h2 className="text-sm font-bold text-content-primary">Project Overview & Architecture</h2>
            </div>
            <div className="text-xs text-content-secondary leading-relaxed whitespace-pre-line">
              {project.description}
            </div>
          </Card>

          {/* Goals / Milestones */}
          {goals.length > 0 && (
            <Card className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
                <Target className="h-4 w-4 text-status-info" />
                <h2 className="text-sm font-bold text-content-primary">Project Goals & Milestones</h2>
              </div>
              <div className="space-y-2.5">
                {goals.map((g, idx) => (
                  <div
                    key={g.id || idx}
                    className="flex items-start gap-3 rounded-lg bg-app-surface-2 p-3 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-accent-primary shrink-0 mt-0.5" />
                    <span className="text-content-primary font-medium">{g.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Roles & Technologies */}
        <div className="space-y-6">
          {/* Team Roster Summary Card */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent-primary" />
                <h3 className="text-sm font-bold text-content-primary">Team ({members.length + 1})</h3>
              </div>
              <Link
                href={`/projects/${project.slug}/team`}
                className="text-xs font-medium text-accent-primary hover:underline flex items-center gap-1"
              >
                <span>View Roster</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {/* Project Lead */}
              <div className="flex items-center justify-between gap-2 rounded-lg bg-app-surface-2/60 p-2.5">
                <Link href={`/developers/${owner.username}`} className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={owner.avatar_url} alt={owner.full_name} fallbackText={owner.full_name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-content-primary truncate">{owner.full_name}</p>
                    <p className="text-[10px] text-content-muted truncate">@{owner.username}</p>
                  </div>
                </Link>
                <Badge variant="accent" size="sm" className="text-[10px] uppercase tracking-wider shrink-0">
                  Owner
                </Badge>
              </div>

              {/* Members */}
              {members.slice(0, 3).map((item) => (
                <div key={item.member.id} className="flex items-center justify-between gap-2 rounded-lg bg-app-surface-2/40 p-2.5">
                  <Link href={`/developers/${item.profile.username}`} className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={item.profile.avatar_url} alt={item.profile.full_name} fallbackText={item.profile.full_name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-content-primary truncate">{item.profile.full_name}</p>
                      <p className="text-[10px] text-content-muted truncate">
                        {item.projectRole?.title || item.member.role}
                      </p>
                    </div>
                  </Link>
                  <Badge variant="neutral" size="sm" className="text-[10px] capitalize shrink-0">
                    {item.member.role}
                  </Badge>
                </div>
              ))}

              {members.length > 3 && (
                <Link
                  href={`/projects/${project.slug}/team`}
                  className="block text-center text-xs text-content-muted hover:text-content-primary pt-1"
                >
                  +{members.length - 3} more member{members.length - 3 > 1 ? 's' : ''}
                </Link>
              )}
            </div>
          </Card>

          {/* Tech Stack */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              <Code2 className="h-4 w-4 text-accent-primary" />
              <h3 className="text-sm font-bold text-content-primary">Tech Stack</h3>
            </div>

            {technologies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {technologies.map((t) => (
                  <Badge key={t.id} variant="neutral" size="sm">
                    {t.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-content-muted">No specific technologies tagged yet.</p>
            )}
          </Card>

          {/* Open Contributor Roles */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent-primary" />
                <h3 className="text-sm font-bold text-content-primary">Open Contributor Roles</h3>
              </div>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRoleModal(true)}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" /> Add Role
                </Button>
              )}
            </div>

            {openRoles.length > 0 ? (
              <div className="space-y-4">
                {openRoles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-xl border border-border-subtle bg-app-surface-2/60 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-content-primary">{role.title}</h4>
                        <span className="text-[11px] text-content-muted">
                          {role.capacity_count - role.filled_count} open position(s)
                        </span>
                      </div>
                      <span className="flex items-center gap-1 rounded bg-app-surface-1 px-2 py-0.5 text-[11px] text-content-secondary font-medium border border-border-subtle">
                        <Clock className="h-3 w-3 text-accent-primary" />
                        {role.commitment_hours_per_week || 10}h/wk
                      </span>
                    </div>

                    <p className="text-xs text-content-secondary leading-relaxed">
                      {role.description}
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-content-muted">
                        Required Competencies:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {role.required_skills?.map((s) => (
                          <Badge key={s} variant="neutral" size="sm">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-border-subtle/50">
                      {userApplication?.project_role_id === role.id ? (
                        <span className="text-xs text-accent-primary font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Applied for this role
                        </span>
                      ) : canApply ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5 ml-auto"
                          onClick={() => {
                            setSelectedApplyRoleId(role.id);
                            setShowApplyModal(true);
                          }}
                        >
                          <UserPlus className="h-3 w-3" />
                          Apply for Role
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-content-muted italic">
                All roles are currently filled or pending publication.
              </p>
            )}

            {canApply && (
              <div className="rounded-lg bg-app-surface-2 p-3 text-[11px] text-content-secondary border border-border-subtle/50 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-accent-primary shrink-0 mt-0.5" />
                <span>
                  Want to contribute? Select a role above or click &ldquo;Apply to Contribute&rdquo; to submit your pitch and availability.
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Match Explanation Modal */}
      {matchBreakdown && (
        <MatchExplanationDialog
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          projectTitle={project.title}
          matchBreakdown={matchBreakdown}
        />
      )}

      {/* Owner: Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-content-primary">Edit Project Settings</h2>

            {actionError && (
              <div className="flex items-center gap-2 rounded-lg bg-status-danger/10 p-3 text-xs text-status-danger">
                <AlertCircle className="h-4 w-4" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-left">
              <Input
                label="Project Title"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Input
                label="Tagline"
                required
                value={editTagline}
                onChange={(e) => setEditTagline(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-content-secondary">Category</label>
                  <input
                    className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-content-secondary">Stage</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                    value={editStage}
                    onChange={(e) => setEditStage(e.target.value as Project['stage'])}
                  >
                    <option value="idea">Idea</option>
                    <option value="planning">Planning</option>
                    <option value="in_development">In Development</option>
                    <option value="testing">Testing</option>
                    <option value="shipped">Shipped</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-content-secondary">Collaboration Style</label>
                <select
                  className="flex h-9 w-full rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                  value={editCollab}
                  onChange={(e) => setEditCollab(e.target.value as 'remote' | 'hybrid' | 'in_person')}
                >
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>

              <Textarea
                label="Problem Statement"
                rows={3}
                value={editProblem}
                onChange={(e) => setEditProblem(e.target.value)}
              />
              <Textarea
                label="Proposed Solution"
                rows={3}
                value={editSolution}
                onChange={(e) => setEditSolution(e.target.value)}
              />
              <Textarea
                label="Description"
                rows={4}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owner: Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-border-subtle bg-app-surface-1 p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-content-primary">Add Contributor Role</h2>

            {actionError && (
              <div className="flex items-center gap-2 rounded-lg bg-status-danger/10 p-3 text-xs text-status-danger">
                <AlertCircle className="h-4 w-4" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-4 text-left">
              <Input
                label="Role Title"
                required
                placeholder="e.g. Lead Frontend Engineer"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />

              <Textarea
                label="Role Description"
                required
                rows={3}
                placeholder="What responsibilities and features will this contributor build?"
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-content-secondary">
                  Required Skills <span className="text-status-danger">*</span>
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {roleSkills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 px-2 py-0.5 text-xs text-accent-primary"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setRoleSkills(roleSkills.filter((sk) => sk !== s))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add skill (e.g. Next.js, TypeScript)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (skillInput.trim() && !roleSkills.includes(skillInput.trim())) {
                          setRoleSkills([...roleSkills, skillInput.trim()]);
                          setSkillInput('');
                        }
                      }
                    }}
                    className="flex h-8 flex-1 rounded-md border border-border-subtle bg-app-surface-2 px-3 py-1 text-xs text-content-primary"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (skillInput.trim() && !roleSkills.includes(skillInput.trim())) {
                        setRoleSkills([...roleSkills, skillInput.trim()]);
                        setSkillInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Capacity"
                  type="number"
                  min={1}
                  max={10}
                  value={roleCapacity}
                  onChange={(e) => setRoleCapacity(parseInt(e.target.value) || 1)}
                />
                <Input
                  label="Weekly Hours (Commitment)"
                  type="number"
                  min={1}
                  max={60}
                  value={roleHours}
                  onChange={(e) => setRoleHours(parseInt(e.target.value) || 10)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRoleModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSavingRole}>
                  {isSavingRole ? 'Adding...' : 'Add Open Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contributor Application Modal */}
      <ApplyDialog
        isOpen={showApplyModal}
        onClose={() => {
          setShowApplyModal(false);
          setSelectedApplyRoleId(undefined);
        }}
        projectId={project.id}
        projectTitle={project.title}
        roles={roles}
        userAvailabilityHours={userAvailabilityHours}
        initialRoleId={selectedApplyRoleId}
      />
    </div>
  );
}
