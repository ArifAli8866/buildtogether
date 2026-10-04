import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfileByUsername, getCurrentUser } from '@/lib/queries/profile';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin,
  Clock,
  Briefcase,
  Github,
  Globe,
  Twitter,
  Linkedin,
  Calendar,
  Edit,
  FolderGit2,
  Award,
} from 'lucide-react';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function DeveloperProfilePage({ params }: Props) {
  const { username } = await params;
  const data = await getProfileByUsername(username);

  if (!data) {
    notFound();
  }

  const { profile, experiences, skills, technologies } = data;
  const { user: currentUser } = await getCurrentUser();
  const isOwner = currentUser?.id === profile.id;

  const joinedDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Profile Header Card */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-app-surface-1 shadow-sm">
        {/* Cover Banner */}
        <div className="h-36 sm:h-44 w-full bg-gradient-to-r from-app-surface-3 via-app-surface-2 to-app-surface-3" />

        {/* Profile Info Row */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Avatar */}
            <div className="relative">
              <Avatar
                src={profile.avatar_url}
                alt={profile.full_name}
                fallbackText={profile.full_name}
                size="xl"
                className="ring-4 ring-app-surface-1"
              />
            </div>

            {/* Owner Edit Action */}
            {isOwner && (
              <div className="flex items-center gap-2">
                <Link href="/settings/profile">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Edit className="h-3.5 w-3.5" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Core Identity */}
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-content-primary">
                {profile.full_name}
              </h1>
              <span className="text-sm font-medium text-content-muted">@{profile.username}</span>
            </div>

            {profile.headline && (
              <p className="text-base text-content-secondary leading-snug">{profile.headline}</p>
            )}
          </div>

          {/* Metadata Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-content-secondary">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-content-muted" />
                {profile.location}
              </span>
            )}
            {profile.timezone && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-content-muted" />
                {profile.timezone}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-content-muted" />
              {profile.availability_hours_per_week} hrs/week
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-content-muted" />
              Joined {joinedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left Column (2 cols): Bio, Experience, Projects, Contributions */}
        <div className="space-y-6 md:col-span-2">
          {/* About / Bio */}
          {profile.bio && (
            <Card>
              <CardHeader className="mb-2">
                <CardTitle className="text-base font-semibold">About</CardTitle>
              </CardHeader>
              <p className="text-sm text-content-secondary leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            </Card>
          )}

          {/* Work Experience */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between mb-4">
              <CardTitle className="text-base font-semibold">Experience</CardTitle>
              {isOwner && (
                <Link href="/settings/profile#experience">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    + Add Experience
                  </Button>
                </Link>
              )}
            </CardHeader>

            {experiences.length > 0 ? (
              <div className="space-y-4">
                {experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="border-l-2 border-border-subtle pl-4 py-1 space-y-1 relative"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-content-primary">{exp.title}</h4>
                      <span className="text-xs text-content-muted">
                        {exp.start_date} &ndash; {exp.is_current ? 'Present' : exp.end_date || ''}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-accent-primary">
                      {exp.company_or_project}
                    </p>
                    {exp.description && (
                      <p className="text-xs text-content-secondary leading-relaxed pt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-content-muted">
                No professional experience listed yet.
              </div>
            )}
          </Card>

          {/* Projects Section (Phase 1 Clean Empty State) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between mb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderGit2 className="h-4 w-4 text-accent-primary" />
                <span>Projects</span>
              </CardTitle>
            </CardHeader>
            <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center">
              <p className="text-sm font-medium text-content-primary">No published projects yet</p>
              <p className="text-xs text-content-muted mt-1 max-w-sm mx-auto">
                Projects created or co-founded by this developer will appear here when published.
              </p>
            </div>
          </Card>

          {/* Verified Contributions (Phase 1 Clean Empty State) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between mb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-status-success" />
                <span>Verified Contributions</span>
              </CardTitle>
            </CardHeader>
            <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center">
              <p className="text-sm font-medium text-content-primary">
                No verified contributions yet
              </p>
              <p className="text-xs text-content-muted mt-1 max-w-sm mx-auto">
                Completed tasks and approved code reviews across Build Together projects will be
                verified and highlighted here.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column (1 col): Skills, Technologies, Links */}
        <div className="space-y-6">
          {/* Skills Card */}
          <Card>
            <CardHeader className="mb-3">
              <CardTitle className="text-base font-semibold">Skills & Roles</CardTitle>
            </CardHeader>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <Badge key={skill.id} variant="neutral" size="sm">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-content-muted">No skills listed yet.</p>
            )}
          </Card>

          {/* Technologies Card */}
          <Card>
            <CardHeader className="mb-3">
              <CardTitle className="text-base font-semibold">Technologies & Tools</CardTitle>
            </CardHeader>
            {technologies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {technologies.map((tech) => (
                  <Badge key={tech.id} variant="accent" size="sm">
                    {tech.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-content-muted">No technologies listed yet.</p>
            )}
          </Card>

          {/* Links & Socials Card */}
          <Card>
            <CardHeader className="mb-3">
              <CardTitle className="text-base font-semibold">Links</CardTitle>
            </CardHeader>
            <div className="space-y-2.5 text-xs">
              {profile.github_username && (
                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-content-secondary transition-colors hover:text-content-primary"
                >
                  <Github className="h-4 w-4 shrink-0" />
                  <span className="truncate">github.com/{profile.github_username}</span>
                </a>
              )}

              {profile.portfolio_url && (
                <a
                  href={profile.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-content-secondary transition-colors hover:text-content-primary"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="truncate">{profile.portfolio_url}</span>
                </a>
              )}

              {Boolean(profile.social_links?.linkedin) && (
                <a
                  href={profile.social_links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-content-secondary transition-colors hover:text-content-primary"
                >
                  <Linkedin className="h-4 w-4 shrink-0" />
                  <span className="truncate">LinkedIn</span>
                </a>
              )}

              {Boolean(profile.social_links?.twitter) && (
                <a
                  href={profile.social_links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-content-secondary transition-colors hover:text-content-primary"
                >
                  <Twitter className="h-4 w-4 shrink-0" />
                  <span className="truncate">X / Twitter</span>
                </a>
              )}

              {!profile.github_username &&
                !profile.portfolio_url &&
                !profile.social_links?.linkedin &&
                !profile.social_links?.twitter && (
                  <p className="text-content-muted">No external links provided.</p>
                )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
