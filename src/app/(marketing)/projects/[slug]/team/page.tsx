import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getProjectBySlug } from '@/lib/queries/projects';
import { getCurrentUser } from '@/lib/queries/profile';
import {
  getProjectMembers,
  getProjectContributionRequests,
  isUserProjectAdmin,
} from '@/lib/queries/contributions';
import { TeamManagementTabs } from '@/components/domain/team/team-management-tabs';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface TeamPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: TeamPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getProjectBySlug(slug);

  if (!data) {
    return { title: 'Team Not Found | Build Together' };
  }

  return {
    title: `Team & Contributors — ${data.project.title} | Build Together`,
    description: `Meet the team building ${data.project.title}.`,
  };
}

export default async function ProjectTeamPage(props: TeamPageProps) {
  const { slug } = await props.params;
  const { user } = await getCurrentUser();

  const data = await getProjectBySlug(slug, user?.id);
  if (!data) {
    notFound();
  }

  const projectId = data.project.id;
  const isOwner = Boolean(user && user.id === data.project.owner_id);

  const [members, isAdmin] = await Promise.all([
    getProjectMembers(projectId),
    user ? isUserProjectAdmin(projectId, user.id) : Promise.resolve(false),
  ]);

  const requests = isAdmin && user
    ? await getProjectContributionRequests(projectId, user.id)
    : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Navigation breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${data.project.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-content-secondary hover:text-content-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project Showcase
        </Link>
        <Link
          href={`/projects/${data.project.slug}/workspace`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-primary hover:underline"
        >
          Open Workspace →
        </Link>
      </div>

      {/* Project Header Info */}
      <div className="rounded-2xl border border-border-subtle bg-app-surface-1 p-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-primary/10 text-accent-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-accent-primary">
            Project Workspace Team
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-content-primary">
          {data.project.title}
        </h1>
        <p className="text-sm text-content-secondary max-w-2xl line-clamp-2">
          {data.project.tagline}
        </p>
      </div>

      {/* Tabs / Content */}
      <TeamManagementTabs
        projectId={projectId}
        projectSlug={data.project.slug}
        members={members}
        requests={requests}
        currentUserId={user?.id}
        isOwner={isOwner}
        isAdmin={isAdmin}
      />
    </main>
  );
}
