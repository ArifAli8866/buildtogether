import { createClient } from '@/lib/supabase/server';
import type {
  SearchEntityType,
  GlobalSearchResponse,
  ProjectSearchItem,
  DeveloperSearchItem,
  PostSearchItem,
  TaskSearchItem,
  Skill,
  Technology,
} from '@/types/database';

export interface PerformGlobalSearchParams {
  query: string;
  type?: SearchEntityType;
  currentUserId?: string | null;
  limit?: number;
}

/**
 * Executes a PostgreSQL-native global search across projects, developers,
 * community posts, and workspace tasks with strict authorization and visibility enforcement.
 */
export async function performGlobalSearch({
  query,
  type = 'all',
  currentUserId,
  limit = 20,
}: PerformGlobalSearchParams): Promise<GlobalSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: '',
      totalCount: 0,
      projects: [],
      developers: [],
      posts: [],
      tasks: [],
    };
  }

  const supabase = await createClient();
  const searchPattern = `%${trimmed}%`;

  // 1. Determine user project memberships for authorization boundaries
  let userMemberProjectIds: string[] = [];
  if (currentUserId) {
    const [membershipRes, ownedRes] = await Promise.all([
      supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', currentUserId),
      supabase
        .from('projects')
        .select('id')
        .eq('owner_id', currentUserId),
    ]);

    const memberIds = (membershipRes.data || []).map((m: { project_id: string }) => m.project_id);
    const ownerIds = (ownedRes.data || []).map((p: { id: string }) => p.id);
    userMemberProjectIds = Array.from(new Set([...memberIds, ...ownerIds]));
  }

  // Define tasks to run in parallel based on selected search type
  const shouldSearchProjects = type === 'all' || type === 'projects';
  const shouldSearchDevelopers = type === 'all' || type === 'developers';
  const shouldSearchPosts = type === 'all' || type === 'posts';
  const shouldSearchTasks = type === 'all' || type === 'tasks';

  // ==========================================
  // PROJECTS SEARCH
  // ==========================================
  const searchProjects = async (): Promise<ProjectSearchItem[]> => {
    if (!shouldSearchProjects) return [];

    let pQuery = supabase
      .from('projects')
      .select(`
        id,
        slug,
        title,
        tagline,
        description,
        category,
        stage,
        visibility,
        logo_url,
        owner:profiles!projects_owner_id_fkey(
          username,
          full_name
        )
      `)
      .or(
        `title.ilike.${searchPattern},tagline.ilike.${searchPattern},description.ilike.${searchPattern},category.ilike.${searchPattern}`
      )
      .limit(limit);

    // Visibility boundary: public projects OR user's own/member projects
    if (currentUserId && userMemberProjectIds.length > 0) {
      pQuery = pQuery.or(
        `visibility.eq.public,owner_id.eq.${currentUserId},id.in.(${userMemberProjectIds.join(',')})`
      );
    } else if (currentUserId) {
      pQuery = pQuery.or(`visibility.eq.public,owner_id.eq.${currentUserId}`);
    } else {
      pQuery = pQuery.eq('visibility', 'public');
    }

    const { data, error } = await pQuery;
    if (error || !data) {
      console.error('Error searching projects:', error);
      return [];
    }

    return data as unknown as ProjectSearchItem[];
  };

  // ==========================================
  // DEVELOPERS SEARCH
  // ==========================================
  const searchDevelopers = async (): Promise<DeveloperSearchItem[]> => {
    if (!shouldSearchDevelopers) return [];

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        headline,
        bio,
        location,
        timezone,
        availability_hours_per_week
      `)
      .or(
        `full_name.ilike.${searchPattern},username.ilike.${searchPattern},headline.ilike.${searchPattern},bio.ilike.${searchPattern}`
      )
      .limit(limit);

    if (error || !profiles || profiles.length === 0) {
      return [];
    }

    const profileIds = profiles.map((p: { id: string }) => p.id);

    // Fetch skills and tech in bulk
    const [skillsRes, techsRes] = await Promise.all([
      supabase
        .from('profile_skills')
        .select('profile_id, skills(name)')
        .in('profile_id', profileIds),
      supabase
        .from('profile_technologies')
        .select('profile_id, technologies(name)')
        .in('profile_id', profileIds),
    ]);

    const skillsMap = new Map<string, string[]>();
    for (const row of (skillsRes.data || []) as Record<string, unknown>[]) {
      const pId = row.profile_id as string;
      const skillName = (row.skills as Skill)?.name;
      if (!skillsMap.has(pId)) skillsMap.set(pId, []);
      if (skillName) skillsMap.get(pId)!.push(skillName);
    }

    const techsMap = new Map<string, string[]>();
    for (const row of (techsRes.data || []) as Record<string, unknown>[]) {
      const pId = row.profile_id as string;
      const techName = (row.technologies as Technology)?.name;
      if (!techsMap.has(pId)) techsMap.set(pId, []);
      if (techName) techsMap.get(pId)!.push(techName);
    }

    return profiles.map((p: Record<string, unknown>) => ({
      id: p.id as string,
      username: p.username as string,
      full_name: p.full_name as string,
      avatar_url: p.avatar_url as string | null,
      headline: p.headline as string | null,
      bio: p.bio as string | null,
      location: p.location as string | null,
      timezone: (p.timezone as string) || 'UTC',
      availability_hours_per_week: (p.availability_hours_per_week as number) || 10,
      skills: skillsMap.get(p.id as string) || [],
      technologies: techsMap.get(p.id as string) || [],
    }));
  };

  // ==========================================
  // COMMUNITY POSTS SEARCH
  // ==========================================
  const searchPosts = async (): Promise<PostSearchItem[]> => {
    if (!shouldSearchPosts) return [];

    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        post_type,
        tags,
        likes_count,
        comments_count,
        created_at,
        project_id,
        author:profiles!community_posts_author_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        project:projects!community_posts_project_id_fkey(
          id,
          slug,
          title,
          visibility
        )
      `)
      .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !posts) {
      console.error('Error searching posts:', error);
      return [];
    }

    type RawPostSearchRow = {
      id: string;
      title: string;
      content: string;
      post_type: PostSearchItem['post_type'];
      tags: string[] | null;
      likes_count: number | null;
      comments_count: number | null;
      created_at: string;
      project_id: string | null;
      author: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
      };
      project: {
        id: string;
        slug: string;
        title: string;
        visibility: 'public' | 'private';
      } | null;
    };

    // Filter out posts linked to private projects where current user is not a member
    const rawPosts = posts as unknown as RawPostSearchRow[];
    const safePosts = rawPosts.filter((post) => {
      if (!post.project_id || !post.project) return true;
      if (post.project.visibility === 'public') return true;
      return currentUserId && userMemberProjectIds.includes(post.project.id);
    });

    return safePosts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      post_type: post.post_type,
      tags: post.tags || [],
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      created_at: post.created_at,
      author: post.author,
      project: post.project
        ? { slug: post.project.slug, title: post.project.title }
        : null,
    }));
  };

  // ==========================================
  // WORKSPACE TASKS SEARCH
  // ==========================================
  const searchTasks = async (): Promise<TaskSearchItem[]> => {
    // Tasks strictly require an authenticated member of at least one project
    if (!shouldSearchTasks || !currentUserId || userMemberProjectIds.length === 0) {
      return [];
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        created_at,
        project:projects!tasks_project_id_fkey(
          id,
          slug,
          title
        )
      `)
      .in('project_id', userMemberProjectIds)
      .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !tasks) {
      console.error('Error searching workspace tasks:', error);
      return [];
    }

    return tasks as unknown as TaskSearchItem[];
  };

  // Run searches in parallel
  const [projects, developers, posts, tasks] = await Promise.all([
    searchProjects(),
    searchDevelopers(),
    searchPosts(),
    searchTasks(),
  ]);

  const totalCount =
    projects.length + developers.length + posts.length + tasks.length;

  return {
    query: trimmed,
    totalCount,
    projects,
    developers,
    posts,
    tasks,
  };
}
