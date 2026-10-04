import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProjectBySlug } from '@/lib/queries/projects';
import { getCurrentUser } from '@/lib/queries/profile';
import {
  getProjectMembers,
  getUserApplicationForProject,
  isUserProjectAdmin,
  getProjectContributionRequests,
} from '@/lib/queries/contributions';
import { ProjectDetailView } from '@/components/domain/project/project-detail-view';

interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata(props: ProjectPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getProjectBySlug(slug);

  if (!data) {
    return {
      title: 'Project Not Found | Build Together',
    };
  }

  return {
    title: `${data.project.title} | Build Together`,
    description: data.project.tagline,
    openGraph: {
      title: `${data.project.title} | Build Together`,
      description: data.project.tagline,
    },
  };
}

export default async function ProjectPage(props: ProjectPageProps) {
  const { slug } = await props.params;
  const { user, profile } = await getCurrentUser();

  const data = await getProjectBySlug(slug, user?.id);

  if (!data) {
    notFound();
  }

  const projectId = data.project.id;
  const isOwner = Boolean(user && user.id === data.project.owner_id);

  const [members, userApplication, isAdmin] = await Promise.all([
    getProjectMembers(projectId),
    user ? getUserApplicationForProject(projectId, user.id) : Promise.resolve(null),
    user ? isUserProjectAdmin(projectId, user.id) : Promise.resolve(false),
  ]);

  const isMember = Boolean(user && members.some((m) => m.profile.id === user.id));

  let pendingRequestsCount = 0;
  if (user && isAdmin) {
    const allRequests = await getProjectContributionRequests(projectId, user.id);
    pendingRequestsCount = allRequests.filter((r) => r.request.status === 'pending').length;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ProjectDetailView
        project={data.project}
        owner={data.owner}
        roles={data.roles}
        technologies={data.technologies}
        goals={data.goals}
        matchBreakdown={data.matchBreakdown}
        members={members}
        userApplication={userApplication}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isMember={isMember}
        pendingRequestsCount={pendingRequestsCount}
        currentUserId={user?.id}
        userAvailabilityHours={profile?.availability_hours_per_week}
      />
    </main>
  );
}
