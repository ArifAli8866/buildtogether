import { createClient } from '@/lib/supabase/server';
import type {
  CommunityPostType,
  CommunityPostWithAuthor,
  PostCommentWithAuthor,
  UserConnectionWithProfiles,
  ConnectionStateResult,
  DeveloperWithRelevance,
  Skill,
  Technology,
  Profile,
} from '@/types/database';

/**
 * Fetches community feed posts with pagination and optional filters.
 */
export async function getCommunityPosts(options?: {
  type?: CommunityPostType | 'all';
  projectId?: string;
  tag?: string;
  currentUserId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ posts: CommunityPostWithAuthor[]; totalCount: number }> {
  const supabase = await createClient();
  const limit = options?.limit ?? 30;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from('community_posts')
    .select(
      `
      *,
      author:profiles!community_posts_author_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        headline
      ),
      project:projects!community_posts_project_id_fkey(
        id,
        slug,
        title,
        logo_url
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.type && options.type !== 'all') {
    query = query.eq('post_type', options.type);
  }

  if (options?.projectId) {
    query = query.eq('project_id', options.projectId);
  }

  if (options?.tag) {
    query = query.contains('tags', [options.tag]);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching community posts:', error);
    return { posts: [], totalCount: 0 };
  }

  const rawPosts = (data || []) as unknown as CommunityPostWithAuthor[];
  if (rawPosts.length === 0) {
    return { posts: [], totalCount: count || 0 };
  }

  // If user is authenticated, query user likes and saves in bulk
  if (options?.currentUserId) {
    const postIds = rawPosts.map((p) => p.id);

    const [likesRes, savesRes] = await Promise.all([
      supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', options.currentUserId)
        .in('post_id', postIds),
      supabase
        .from('post_saves')
        .select('post_id')
        .eq('user_id', options.currentUserId)
        .in('post_id', postIds),
    ]);

    const likedSet = new Set((likesRes.data || []).map((l) => l.post_id));
    const savedSet = new Set((savesRes.data || []).map((s) => s.post_id));

    const enriched = rawPosts.map((post) => ({
      ...post,
      has_liked: likedSet.has(post.id),
      has_saved: savedSet.has(post.id),
    }));

    return { posts: enriched, totalCount: count || 0 };
  }

  return { posts: rawPosts, totalCount: count || 0 };
}

/**
 * Fetches a single post by ID with enriched author, project, likes, and saves.
 */
export async function getPostById(
  postId: string,
  currentUserId?: string | null
): Promise<CommunityPostWithAuthor | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      author:profiles!community_posts_author_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        headline
      ),
      project:projects!community_posts_project_id_fkey(
        id,
        slug,
        title,
        logo_url
      )
    `)
    .eq('id', postId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const post = data as unknown as CommunityPostWithAuthor;

  if (currentUserId) {
    const [likeRes, saveRes] = await Promise.all([
      supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
        .maybeSingle(),
      supabase
        .from('post_saves')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
        .maybeSingle(),
    ]);

    post.has_liked = Boolean(likeRes.data);
    post.has_saved = Boolean(saveRes.data);
  }

  return post;
}

/**
 * Fetches comments for a post and constructs a nested reply tree.
 */
export async function getPostComments(
  postId: string
): Promise<PostCommentWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      *,
      author:profiles!post_comments_author_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  const allComments = data as unknown as PostCommentWithAuthor[];
  const rootComments: PostCommentWithAuthor[] = [];
  const commentMap = new Map<string, PostCommentWithAuthor>();

  // Initialize replies array for every comment
  for (const c of allComments) {
    c.replies = [];
    commentMap.set(c.id, c);
  }

  // Nest replies into their parent
  for (const c of allComments) {
    if (c.parent_id && commentMap.has(c.parent_id)) {
      commentMap.get(c.parent_id)!.replies!.push(c);
    } else {
      rootComments.push(c);
    }
  }

  return rootComments;
}

/**
 * Fetches user connections divided into connected, incoming requests, and sent requests.
 */
export async function getUserConnections(userId: string): Promise<{
  connected: UserConnectionWithProfiles[];
  incoming: UserConnectionWithProfiles[];
  sent: UserConnectionWithProfiles[];
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_connections')
    .select(`
      *,
      requester:profiles!user_connections_requester_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        headline,
        location,
        timezone,
        availability_hours_per_week
      ),
      recipient:profiles!user_connections_recipient_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        headline,
        location,
        timezone,
        availability_hours_per_week
      )
    `)
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching user connections:', error);
    return { connected: [], incoming: [], sent: [] };
  }

  const connections = data as unknown as UserConnectionWithProfiles[];

  const connected = connections.filter((c) => c.status === 'accepted');
  const incoming = connections.filter(
    (c) => c.status === 'pending' && c.recipient_id === userId
  );
  const sent = connections.filter(
    (c) => c.status === 'pending' && c.requester_id === userId
  );

  return { connected, incoming, sent };
}

/**
 * Computes connection state between current user and target user.
 */
export async function getConnectionState(
  currentUserId: string,
  targetUserId: string
): Promise<ConnectionStateResult> {
  if (currentUserId === targetUserId) {
    return { state: 'none' };
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('user_connections')
    .select('id, requester_id, recipient_id, status')
    .or(
      `and(requester_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (!data) {
    return { state: 'none' };
  }

  if (data.status === 'accepted') {
    return { state: 'connected', connectionId: data.id };
  }

  if (data.status === 'pending') {
    return {
      state: 'pending',
      connectionId: data.id,
      isRequester: data.requester_id === currentUserId,
    };
  }

  return { state: 'none' };
}

/**
 * Discovers developers and calculates deterministic relevance (shared skills/tech)
 * against the viewing user without fake reputation scores.
 */
export async function getDiscoverableDevelopers(
  currentUserId: string | null,
  filters?: {
    skill?: string;
    tech?: string;
    search?: string;
    limit?: number;
  }
): Promise<DeveloperWithRelevance[]> {
  const supabase = await createClient();
  const limit = filters?.limit ?? 40;

  // 1. Fetch current user context if logged in
  let currentUserSkills: string[] = [];
  let currentUserTech: string[] = [];
  let currentUserAvailability = 10;

  if (currentUserId) {
    const [uProfile, uSkills, uTechs] = await Promise.all([
      supabase.from('profiles').select('availability_hours_per_week').eq('id', currentUserId).maybeSingle(),
      supabase.from('profile_skills').select('skills(name)').eq('profile_id', currentUserId),
      supabase.from('profile_technologies').select('technologies(name)').eq('profile_id', currentUserId),
    ]);

    if (uProfile.data) {
      currentUserAvailability = uProfile.data.availability_hours_per_week || 10;
    }
    currentUserSkills = (uSkills.data || [])
      .map((ps: Record<string, unknown>) => (ps.skills as { name: string })?.name?.toLowerCase())
      .filter(Boolean);
    currentUserTech = (uTechs.data || [])
      .map((pt: Record<string, unknown>) => (pt.technologies as { name: string })?.name?.toLowerCase())
      .filter(Boolean);
  }

  // 2. Fetch profiles
  let profileQuery = supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (currentUserId) {
    profileQuery = profileQuery.neq('id', currentUserId);
  }

  if (filters?.search) {
    const s = filters.search.trim();
    profileQuery = profileQuery.or(`full_name.ilike.%${s}%,username.ilike.%${s}%,headline.ilike.%${s}%`);
  }

  const { data: rawProfiles, error } = await profileQuery;
  if (error || !rawProfiles || rawProfiles.length === 0) {
    return [];
  }

  const profileIds = rawProfiles.map((p) => p.id);

  // 3. Fetch skills, technologies, and connection states in parallel
  const [skillsRes, techsRes, connectionsRes] = await Promise.all([
    supabase
      .from('profile_skills')
      .select('profile_id, skills(id, name, category)')
      .in('profile_id', profileIds),
    supabase
      .from('profile_technologies')
      .select('profile_id, technologies(id, name, icon)')
      .in('profile_id', profileIds),
    currentUserId
      ? supabase
          .from('user_connections')
          .select('id, requester_id, recipient_id, status')
          .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      : Promise.resolve({ data: [] }),
  ]);

  // Map skills by profile
  const profileSkillsMap = new Map<string, Skill[]>();
  for (const row of (skillsRes.data || []) as Record<string, unknown>[]) {
    const pId = row.profile_id as string;
    const skill = row.skills as Skill;
    if (!profileSkillsMap.has(pId)) profileSkillsMap.set(pId, []);
    if (skill) profileSkillsMap.get(pId)!.push(skill);
  }

  // Map techs by profile
  const profileTechMap = new Map<string, Technology[]>();
  for (const row of (techsRes.data || []) as Record<string, unknown>[]) {
    const pId = row.profile_id as string;
    const tech = row.technologies as Technology;
    if (!profileTechMap.has(pId)) profileTechMap.set(pId, []);
    if (tech) profileTechMap.get(pId)!.push(tech);
  }

  // Map connections by target profile
  const connectionMap = new Map<string, ConnectionStateResult>();
  if (currentUserId && connectionsRes.data) {
    for (const c of connectionsRes.data) {
      const otherId = c.requester_id === currentUserId ? c.recipient_id : c.requester_id;
      if (c.status === 'accepted') {
        connectionMap.set(otherId, { state: 'connected', connectionId: c.id });
      } else if (c.status === 'pending') {
        connectionMap.set(otherId, {
          state: 'pending',
          connectionId: c.id,
          isRequester: c.requester_id === currentUserId,
        });
      }
    }
  }

  // 4. Calculate deterministic relevance for each developer
  const developers: DeveloperWithRelevance[] = rawProfiles.map((p) => {
    const skills = profileSkillsMap.get(p.id) || [];
    const technologies = profileTechMap.get(p.id) || [];

    const sharedSkills = skills
      .filter((s) => currentUserSkills.includes(s.name.toLowerCase()))
      .map((s) => s.name);

    const sharedTech = technologies
      .filter((t) => currentUserTech.includes(t.name.toLowerCase()))
      .map((t) => t.name);

    const isAvailabilityCompatible =
      Math.abs((p.availability_hours_per_week || 10) - currentUserAvailability) <= 10;

    const connectionState = connectionMap.get(p.id) || { state: 'none' };

    return {
      profile: p as Profile,
      skills,
      technologies,
      connectionState,
      sharedSkills,
      sharedTech,
      isAvailabilityCompatible,
    };
  });

  // Apply skill/tech filter if provided
  let filtered = developers;
  if (filters?.skill) {
    const s = filters.skill.toLowerCase();
    filtered = filtered.filter((d) => d.skills.some((sk) => sk.name.toLowerCase() === s));
  }
  if (filters?.tech) {
    const t = filters.tech.toLowerCase();
    filtered = filtered.filter((d) => d.technologies.some((tc) => tc.name.toLowerCase() === t));
  }

  // Sort deterministically:
  // 1. More shared skills and tech first
  // 2. Compatible availability
  filtered.sort((a, b) => {
    const overlapA = a.sharedSkills.length + a.sharedTech.length;
    const overlapB = b.sharedSkills.length + b.sharedTech.length;
    if (overlapB !== overlapA) {
      return overlapB - overlapA;
    }
    return new Date(b.profile.updated_at).getTime() - new Date(a.profile.updated_at).getTime();
  });

  return filtered;
}
