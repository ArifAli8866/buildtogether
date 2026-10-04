import { createClient } from '@/lib/supabase/server';
import type { Project, ProjectRole, Profile, Skill, Technology } from '@/types/database';
import { calculateMatchExplanation, type MatchBreakdown } from '@/lib/matching/engine';

export interface ProjectCardData {
  project: Project;
  owner: Profile;
  roles: ProjectRole[];
  technologies: Technology[];
  matchBreakdown?: MatchBreakdown;
}

export interface ProjectFilters {
  search?: string;
  category?: string;
  stage?: string;
  technology?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Retrieves discoverable projects with search, filtering, pagination, and deterministic match scores.
 */
export async function getDiscoverableProjects(
  filters: ProjectFilters = {},
  currentUserId?: string | null
): Promise<{ projects: ProjectCardData[]; totalCount: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize || 12));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Fetch candidate's profile and skills/tech if logged in for matching
  let userProfile: Profile | null = null;
  let userSkills: Skill[] = [];
  let userTechnologies: Technology[] = [];

  if (currentUserId) {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUserId)
      .maybeSingle();

    if (p) {
      userProfile = p as Profile;

      const { data: ps } = await supabase
        .from('profile_skills')
        .select('skill_id, skills(id, name, category)')
        .eq('profile_id', currentUserId);

      const { data: pt } = await supabase
        .from('profile_technologies')
        .select('technology_id, technologies(id, name, icon)')
        .eq('profile_id', currentUserId);

      userSkills = (ps || [])
        .map((row: Record<string, unknown>) => row.skills as Skill)
        .filter(Boolean);

      userTechnologies = (pt || [])
        .map((row: Record<string, unknown>) => row.technologies as Technology)
        .filter(Boolean);
    }
  }

  // Base query: public visibility
  let query = supabase
    .from('projects')
    .select(
      `
      *,
      owner:profiles!projects_owner_id_fkey(*),
      roles:project_roles(*),
      project_technologies(technologies(*))
    `,
      { count: 'exact' }
    )
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });

  // 1. Text search
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(
      `title.ilike.%${term}%,tagline.ilike.%${term}%,problem_statement.ilike.%${term}%`
    );
  }

  // 2. Category filter
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  // 3. Stage filter
  if (filters.stage && filters.stage !== 'all') {
    query = query.eq('stage', filters.stage);
  }

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error || !data) {
    console.error('Error fetching discoverable projects:', error);
    return { projects: [], totalCount: 0 };
  }

  // Map into typed ProjectCardData and compute deterministic match scores
  const projects: ProjectCardData[] = (data || []).map((item: Record<string, unknown>) => {
    const project = {
      id: item.id,
      slug: item.slug,
      title: item.title,
      tagline: item.tagline,
      description: item.description,
      problem_statement: item.problem_statement,
      proposed_solution: item.proposed_solution,
      category: item.category,
      stage: item.stage,
      visibility: item.visibility,
      owner_id: item.owner_id,
      logo_url: item.logo_url,
      banner_url: item.banner_url,
      collaboration_type: item.collaboration_type || 'remote',
      created_at: item.created_at,
      updated_at: item.updated_at,
    } as Project;

    const owner = item.owner as Profile;
    const roles = (item.roles || []) as ProjectRole[];
    const technologies: Technology[] = ((item.project_technologies as Array<Record<string, unknown>>) || [])
      .map((pt) => pt.technologies as Technology)
      .filter(Boolean);

    const projectTechNames = technologies.map((t: Technology) => t.name);

    let matchBreakdown: MatchBreakdown | undefined;
    if (userProfile) {
      matchBreakdown = calculateMatchExplanation({
        projectRoles: roles,
        projectTechNames,
        ownerProfile: owner,
        userProfile,
        userSkills,
        userTechnologies,
      });
    }

    return {
      project,
      owner,
      roles,
      technologies,
      matchBreakdown,
    };
  });

  // If user is authenticated, we sort by match score descending to present the most compatible projects first
  if (userProfile) {
    projects.sort((a, b) => {
      const scoreA = a.matchBreakdown?.totalScore || 0;
      const scoreB = b.matchBreakdown?.totalScore || 0;
      return scoreB - scoreA;
    });
  }

  return {
    projects,
    totalCount: count || 0,
  };
}

/**
 * Retrieves full details for a single project by its unique slug.
 */
export async function getProjectBySlug(slug: string, currentUserId?: string | null) {
  const supabase = await createClient();

  const { data: projectData, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      owner:profiles!projects_owner_id_fkey(*),
      roles:project_roles(*),
      goals(*),
      project_technologies(technologies(*))
    `
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error || !projectData) {
    return null;
  }

  const project = {
    id: projectData.id,
    slug: projectData.slug,
    title: projectData.title,
    tagline: projectData.tagline,
    description: projectData.description,
    problem_statement: projectData.problem_statement,
    proposed_solution: projectData.proposed_solution,
    category: projectData.category,
    stage: projectData.stage,
    visibility: projectData.visibility,
    owner_id: projectData.owner_id,
    logo_url: projectData.logo_url,
    banner_url: projectData.banner_url,
    collaboration_type: projectData.collaboration_type || 'remote',
    created_at: projectData.created_at,
    updated_at: projectData.updated_at,
  } as Project;

  const owner = projectData.owner as Profile;
  const roles = (projectData.roles || []) as ProjectRole[];
  const goals = (projectData.goals || []) as Array<{ id: string; title: string }>;
  const technologies: Technology[] = ((projectData.project_technologies as Array<Record<string, unknown>>) || [])
    .map((pt) => pt.technologies as Technology)
    .filter(Boolean);

  let matchBreakdown: MatchBreakdown | undefined;

  if (currentUserId) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUserId)
      .maybeSingle();

    if (userProfile) {
      const { data: ps } = await supabase
        .from('profile_skills')
        .select('skill_id, skills(id, name, category)')
        .eq('profile_id', currentUserId);

      const { data: pt } = await supabase
        .from('profile_technologies')
        .select('technology_id, technologies(id, name, icon)')
        .eq('profile_id', currentUserId);

      const userSkills = (ps || []).map((row: Record<string, unknown>) => row.skills as Skill).filter(Boolean);
      const userTechnologies = (pt || []).map((row: Record<string, unknown>) => row.technologies as Technology).filter(Boolean);

      matchBreakdown = calculateMatchExplanation({
        projectRoles: roles,
        projectTechNames: technologies.map((t: Technology) => t.name),
        ownerProfile: owner,
        userProfile: userProfile as Profile,
        userSkills,
        userTechnologies,
      });
    }
  }

  return {
    project,
    owner,
    roles,
    goals,
    technologies,
    matchBreakdown,
  };
}

/**
 * Retrieves all distinct project categories.
 */
export async function getProjectCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('category').eq('visibility', 'public');

  if (!data) return [];
  const unique = Array.from(new Set(data.map((item) => item.category).filter(Boolean)));
  return unique.sort();
}

export interface DiscoverableRoleData {
  role: ProjectRole;
  project: {
    id: string;
    slug: string;
    title: string;
    category: string;
    stage: string;
    logo_url: string | null;
  };
  owner: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface RoleFilters {
  search?: string;
  skill?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Retrieves cross-project open roles for discovery.
 */
export async function getDiscoverableRoles(
  filters: RoleFilters = {}
): Promise<{ roles: DiscoverableRoleData[]; totalCount: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize || 15));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('project_roles')
    .select(
      `
      *,
      project:projects!project_roles_project_id_fkey(
        id,
        slug,
        title,
        category,
        stage,
        logo_url,
        visibility,
        owner:profiles!projects_owner_id_fkey(
          username,
          full_name,
          avatar_url
        )
      )
    `,
      { count: 'exact' }
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error || !data) {
    console.error('Error fetching discoverable roles:', error);
    return { roles: [], totalCount: 0 };
  }

interface RawRoleQueryRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  required_skills: string[] | null;
  capacity_count: number;
  filled_count: number;
  commitment_hours_per_week: number;
  status: ProjectRole['status'];
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    slug: string;
    title: string;
    category: string;
    stage: string;
    logo_url: string | null;
    visibility: string;
    owner?: {
      username: string;
      full_name: string;
      avatar_url: string | null;
    };
  };
}

  const rawRows = (data || []) as unknown as RawRoleQueryRow[];
  const validRoles: DiscoverableRoleData[] = rawRows
    .filter((item) => item.project && item.project.visibility === 'public')
    .map((item) => ({
      role: {
        id: item.id,
        project_id: item.project_id,
        title: item.title,
        description: item.description,
        required_skills: item.required_skills || [],
        capacity_count: item.capacity_count,
        filled_count: item.filled_count,
        commitment_hours_per_week: item.commitment_hours_per_week,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
      },
      project: {
        id: item.project!.id,
        slug: item.project!.slug,
        title: item.project!.title,
        category: item.project!.category,
        stage: item.project!.stage,
        logo_url: item.project!.logo_url,
      },
      owner: {
        username: item.project?.owner?.username || 'user',
        full_name: item.project?.owner?.full_name || 'Project Owner',
        avatar_url: item.project?.owner?.avatar_url || null,
      },
    }));

  const filtered = filters.skill
    ? validRoles.filter((r) =>
        r.role.required_skills?.some(
          (s) => s.toLowerCase() === filters.skill?.toLowerCase()
        )
      )
    : validRoles;

  return {
    roles: filtered,
    totalCount: count || validRoles.length,
  };
}

/**
 * Retrieves projects owned by a specific user.
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as Project[];
}
