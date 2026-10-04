import { createClient } from '@/lib/supabase/server';
import type {
  ContributionRequest,
  ProjectMember,
  Profile,
  ProjectRole,
  Skill,
  Technology,
} from '@/types/database';

export interface DetailedContributionRequest {
  request: ContributionRequest;
  applicant: Profile;
  applicantSkills: Skill[];
  applicantTechnologies: Technology[];
  projectRole: ProjectRole | null;
}

export interface UserContributionApplication {
  request: ContributionRequest;
  project: {
    id: string;
    slug: string;
    title: string;
    category: string;
    stage: string;
    logo_url: string | null;
  };
  projectRole: ProjectRole | null;
}

export interface DetailedProjectMember {
  member: ProjectMember;
  profile: Profile;
  projectRole: ProjectRole | null;
}

/**
 * Checks whether the specified user is an owner or maintainer of the project.
 */
export async function isUserProjectAdmin(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(data && (data.role === 'owner' || data.role === 'maintainer'));
}

/**
 * Retrieves the specific project membership for a user, or null if not a member.
 */
export async function getUserProjectMembership(
  projectId: string,
  userId: string
): Promise<ProjectMember | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  return (data as ProjectMember) || null;
}

/**
 * Checks if a user has an active or recent application for a project.
 */
export async function getUserApplicationForProject(
  projectId: string,
  userId: string
): Promise<ContributionRequest | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('contribution_requests')
    .select('*')
    .eq('project_id', projectId)
    .eq('applicant_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ContributionRequest) || null;
}

/**
 * Retrieves all members of a project with full profile metadata.
 */
export async function getProjectMembers(
  projectId: string
): Promise<DetailedProjectMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_members')
    .select(
      `
      *,
      profile:profiles!project_members_user_id_fkey(*),
      project_role:project_roles!project_members_project_role_id_fkey(*)
    `
    )
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true });

  if (error || !data) {
    console.error('Error fetching project members:', error);
    return [];
  }

  // Sort by role precedence: owner -> maintainer -> contributor -> viewer
  const roleWeights: Record<string, number> = {
    owner: 1,
    maintainer: 2,
    contributor: 3,
    viewer: 4,
  };

  const members: DetailedProjectMember[] = (data as Array<Record<string, unknown>>)
    .filter((row) => Boolean(row.profile))
    .map((row) => ({
      member: {
        id: row.id as string,
        project_id: row.project_id as string,
        user_id: row.user_id as string,
        project_role_id: (row.project_role_id as string) || null,
        role: row.role as ProjectMember['role'],
        joined_at: row.joined_at as string,
        created_at: row.created_at as string,
      },
      profile: row.profile as Profile,
      projectRole: (row.project_role as ProjectRole) || null,
    }));

  members.sort((a, b) => {
    const weightA = roleWeights[a.member.role] || 99;
    const weightB = roleWeights[b.member.role] || 99;
    return weightA - weightB;
  });

  return members;
}

/**
 * Retrieves incoming contribution requests for project administrators to review.
 */
export async function getProjectContributionRequests(
  projectId: string,
  currentUserId: string
): Promise<DetailedContributionRequest[]> {
  const isAdmin = await isUserProjectAdmin(projectId, currentUserId);
  if (!isAdmin) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('contribution_requests')
    .select(
      `
      *,
      applicant:profiles!contribution_requests_applicant_id_fkey(*),
      project_role:project_roles!contribution_requests_project_role_id_fkey(*)
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching contribution requests:', error);
    return [];
  }

  // For each applicant, fetch their verified skills and technologies
  const requests: DetailedContributionRequest[] = [];

  for (const row of data as Array<Record<string, unknown>>) {
    const applicant = row.applicant as Profile;
    if (!applicant) continue;

    const { data: ps } = await supabase
      .from('profile_skills')
      .select('skills(*)')
      .eq('profile_id', applicant.id);

    const { data: pt } = await supabase
      .from('profile_technologies')
      .select('technologies(*)')
      .eq('profile_id', applicant.id);

    const applicantSkills = (ps || [])
      .map((item: Record<string, unknown>) => item.skills as Skill)
      .filter(Boolean);

    const applicantTechnologies = (pt || [])
      .map((item: Record<string, unknown>) => item.technologies as Technology)
      .filter(Boolean);

    requests.push({
      request: {
        id: row.id as string,
        project_id: row.project_id as string,
        project_role_id: (row.project_role_id as string) || null,
        applicant_id: row.applicant_id as string,
        pitch: row.pitch as string,
        portfolio_links: (row.portfolio_links as string[]) || [],
        weekly_hours: Number(row.weekly_hours),
        status: row.status as ContributionRequest['status'],
        reviewer_id: (row.reviewer_id as string) || null,
        reviewed_at: (row.reviewed_at as string) || null,
        review_notes: (row.review_notes as string) || null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      },
      applicant,
      applicantSkills,
      applicantTechnologies,
      projectRole: (row.project_role as ProjectRole) || null,
    });
  }

  return requests;
}

/**
 * Retrieves all contribution requests submitted by the current user.
 */
export async function getUserContributionRequests(
  userId: string
): Promise<UserContributionApplication[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('contribution_requests')
    .select(
      `
      *,
      project:projects!contribution_requests_project_id_fkey(
        id,
        slug,
        title,
        category,
        stage,
        logo_url
      ),
      project_role:project_roles!contribution_requests_project_role_id_fkey(*)
    `
    )
    .eq('applicant_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching user contribution applications:', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>)
    .filter((row) => Boolean(row.project))
    .map((row) => ({
      request: {
        id: row.id as string,
        project_id: row.project_id as string,
        project_role_id: (row.project_role_id as string) || null,
        applicant_id: row.applicant_id as string,
        pitch: row.pitch as string,
        portfolio_links: (row.portfolio_links as string[]) || [],
        weekly_hours: Number(row.weekly_hours),
        status: row.status as ContributionRequest['status'],
        reviewer_id: (row.reviewer_id as string) || null,
        reviewed_at: (row.reviewed_at as string) || null,
        review_notes: (row.review_notes as string) || null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      },
      project: row.project as UserContributionApplication['project'],
      projectRole: (row.project_role as ProjectRole) || null,
    }));
}
