import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getProfileByUsername } from '@/lib/queries/profile';
import { getUserProjects } from '@/lib/queries/projects';
import { getUserContributionRequests } from '@/lib/queries/contributions';
import { UserApplicationsList } from '@/components/domain/contribution/user-applications-list';
import { createClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  User,
  Settings,
  Sparkles,
  ArrowRight,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Plus,
  Compass,
  Inbox,
} from 'lucide-react';

export default async function DashboardPage() {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect('/login?redirect=/dashboard');
  }

  const [detailedData, userProjects, userApplications] = await Promise.all([
    getProfileByUsername(profile.username),
    getUserProjects(user.id),
    getUserContributionRequests(user.id),
  ]);

  const projectIds = userProjects.map((p) => p.id);
  const pendingRequestsByProject: Record<string, number> = {};
  if (projectIds.length > 0) {
    const supabase = await createClient();
    const { data: pendingRequests } = await supabase
      .from('contribution_requests')
      .select('project_id')
      .in('project_id', projectIds)
      .in('status', ['pending', 'under_review']);
    if (pendingRequests) {
      for (const req of pendingRequests) {
        pendingRequestsByProject[req.project_id] =
          (pendingRequestsByProject[req.project_id] || 0) + 1;
      }
    }
  }

  const skills = detailedData?.skills || [];
  const technologies = detailedData?.technologies || [];

  const needsOnboarding = !profile.headline || (!profile.bio && skills.length === 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      {/* Onboarding Callout Banner if profile is incomplete */}
      {needsOnboarding && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-accent-primary/30 bg-accent-primary/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-content-inverse">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-content-primary">
                Complete your developer profile
              </h3>
              <p className="text-xs text-content-secondary">
                Select your skills, frameworks, and availability so teams can discover and match
                with you.
              </p>
            </div>
          </div>
          <Link href="/onboarding">
            <Button variant="primary" size="sm" className="gap-1.5 whitespace-nowrap">
              Finish Onboarding <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Developer Overview Header Card */}
      <Card className="border-border-subtle bg-app-surface-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={profile.avatar_url}
              alt={profile.full_name}
              fallbackText={profile.full_name}
              size="lg"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-content-primary">
                  {profile.full_name}
                </h1>
                <span className="text-xs font-medium text-content-muted">@{profile.username}</span>
              </div>
              <p className="text-xs text-content-secondary">
                {profile.headline || 'No headline set yet.'}
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-content-muted">
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {profile.availability_hours_per_week} hrs/week commitment
                </span>
                <span>&bull;</span>
                <span className="inline-flex items-center gap-1 text-status-success">
                  <ShieldCheck className="h-3 w-3" />
                  Verified Identity
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/developers/${profile.username}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Public Portfolio
              </Button>
            </Link>
            <Link href="/settings/profile">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Grid: Skills Summary & Empty State Modules */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Active Skills & Tech */}
        <Card className="md:col-span-1">
          <CardHeader className="mb-3">
            <CardTitle className="text-sm font-semibold">Your Skills & Stack</CardTitle>
            <CardDescription className="text-xs">
              Used to match you with relevant projects.
            </CardDescription>
          </CardHeader>

          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1.5">
                Skills ({skills.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {skills.length > 0 ? (
                  skills.map((s) => (
                    <Badge key={s.id} variant="neutral" size="sm">
                      {s.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-content-muted">None selected</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1.5">
                Technologies ({technologies.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {technologies.length > 0 ? (
                  technologies.map((t) => (
                    <Badge key={t.id} variant="accent" size="sm">
                      {t.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-content-muted">None selected</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Link href="/settings/profile" className="text-xs text-accent-primary hover:underline">
                Update skills in settings &rarr;
              </Link>
            </div>
          </div>
        </Card>

        {/* Workspace & Projects Overview */}
        <Card className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Your Projects ({userProjects.length})</CardTitle>
              <CardDescription className="text-xs">
                Projects you created and manage.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/explore">
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <Compass className="h-3 w-3" /> Explore
                </Button>
              </Link>
              <Link href="/projects/new">
                <Button variant="primary" size="sm" className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> New Project
                </Button>
              </Link>
            </div>
          </div>

          {userProjects.length > 0 ? (
            <div className="space-y-3">
              {userProjects.map((proj) => {
                const pendingCount = pendingRequestsByProject[proj.id] || 0;

                return (
                  <div
                    key={proj.id}
                    className="flex items-center justify-between rounded-lg border border-border-subtle bg-app-surface-2/60 p-3 text-xs transition-colors hover:border-border-focus"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/projects/${proj.slug}`}
                          className="font-bold text-content-primary hover:text-accent-primary"
                        >
                          {proj.title}
                        </Link>
                        <Badge variant="neutral" size="sm">
                          {proj.category}
                        </Badge>
                        <Badge variant="accent" size="sm">
                          {proj.stage}
                        </Badge>
                      </div>
                      <p className="text-content-secondary line-clamp-1">{proj.tagline}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {pendingCount > 0 && (
                        <Link href={`/projects/${proj.slug}/team?tab=applications`}>
                          <Badge
                            variant="accent"
                            size="sm"
                            className="gap-1 border-accent-primary/40 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 cursor-pointer"
                          >
                            <Inbox className="h-3 w-3" />
                            {pendingCount} applicant{pendingCount > 1 ? 's' : ''}
                          </Badge>
                        </Link>
                      )}
                      <Link href={`/projects/${proj.slug}`}>
                        <Button variant="ghost" size="sm" className="text-xs text-accent-primary gap-1">
                          Manage <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-subtle p-8 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-app-surface-2 text-content-secondary">
                <User className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-content-primary">No active projects yet</h4>
                <p className="text-xs text-content-muted max-w-sm mx-auto">
                  Launch a new project proposal to recruit contributors, or explore existing projects
                  seeking your technical expertise.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Link href="/projects/new">
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Start a Project
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Compass className="h-3.5 w-3.5" /> Browse Projects
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Contribution Applications Overview */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Your Contribution Applications ({userApplications.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Projects where you have requested to contribute or joined as a team member.
            </CardDescription>
          </div>
          <Link href="/explore">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Compass className="h-3 w-3" /> Find Open Roles
            </Button>
          </Link>
        </div>

        <UserApplicationsList applications={userApplications} />
      </Card>
    </main>
  );
}
