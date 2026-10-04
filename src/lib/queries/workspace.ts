import { createClient } from '@/lib/supabase/server';
import type {
  Project,
  Profile,
  ProjectMemberRole,
  Goal,
  Milestone,
  RoadmapItem,
  Task,
  TaskStatus,
  TaskPriority,
  ActivityLog,
} from '@/types/database';

export interface WorkspaceContext {
  isAuthorized: boolean;
  project: Project;
  role: ProjectMemberRole;
  isAdmin: boolean;
  userProfile: Profile;
}

export interface DetailedTask extends Task {
  assignee: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'> | null;
  creator: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  milestone: Pick<Milestone, 'id' | 'title'> | null;
  goal: Pick<Goal, 'id' | 'title'> | null;
}

export interface DetailedMilestone extends Milestone {
  goal: Pick<Goal, 'id' | 'title'> | null;
  totalTasks: number;
  completedTasks: number;
}

type RawMilestone = Milestone & { goal: Pick<Goal, 'id' | 'title'> | null };

export interface DetailedRoadmapItem extends RoadmapItem {
  goal: Pick<Goal, 'id' | 'title'> | null;
  milestone: Pick<Milestone, 'id' | 'title'> | null;
}

export interface DetailedActivityLog extends ActivityLog {
  actor: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'> | null;
}

export interface WorkspaceOverviewData {
  goalsCount: number;
  achievedGoalsCount: number;
  milestonesCount: number;
  completedMilestonesCount: number;
  roadmapCount: number;
  tasksByStatus: Record<TaskStatus, number>;
  totalTasks: number;
  membersCount: number;
  recentActivity: DetailedActivityLog[];
  recentGoals: Goal[];
  upcomingMilestones: DetailedMilestone[];
}

export interface AssignableMember {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  role: ProjectMemberRole;
}

/**
 * Validates whether the caller has access to the project workspace and returns authorization context.
 */
export async function getWorkspaceContext(
  slug: string,
  userId: string
): Promise<WorkspaceContext | null> {
  const supabase = await createClient();

  // 1. Fetch project by slug
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!project) return null;

  // 2. Fetch user profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!userProfile) return null;

  // 3. Check ownership
  if (project.owner_id === userId) {
    return {
      isAuthorized: true,
      project: project as Project,
      role: 'owner',
      isAdmin: true,
      userProfile: userProfile as Profile,
    };
  }

  // 4. Check project membership
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', project.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    return {
      isAuthorized: false,
      project: project as Project,
      role: 'viewer',
      isAdmin: false,
      userProfile: userProfile as Profile,
    };
  }

  const role = membership.role as ProjectMemberRole;

  return {
    isAuthorized: true,
    project: project as Project,
    role,
    isAdmin: role === 'owner' || role === 'maintainer',
    userProfile: userProfile as Profile,
  };
}

/**
 * Returns all eligible assignees for tasks in a project (owner + accepted members).
 */
export async function getAssignableProjectMembers(
  projectId: string
): Promise<AssignableMember[]> {
  const supabase = await createClient();

  // 1. Get project owner
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id, owner:profiles!projects_owner_id_fkey(id, username, full_name, avatar_url)')
    .eq('id', projectId)
    .single();

  // 2. Get accepted members
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id, role, profile:profiles!project_members_user_id_fkey(id, username, full_name, avatar_url)')
    .eq('project_id', projectId);

  const list: AssignableMember[] = [];

  if (project?.owner) {
    const owner = project.owner as unknown as Profile;
    list.push({
      userId: owner.id,
      username: owner.username,
      fullName: owner.full_name,
      avatarUrl: owner.avatar_url,
      role: 'owner',
    });
  }

  if (members) {
    for (const m of members) {
      if (m.user_id !== project?.owner_id && m.profile) {
        const p = m.profile as unknown as Profile;
        list.push({
          userId: p.id,
          username: p.username,
          fullName: p.full_name,
          avatarUrl: p.avatar_url,
          role: m.role as ProjectMemberRole,
        });
      }
    }
  }

  return list;
}

/**
 * Fetches workspace overview metrics and summaries.
 */
export async function getWorkspaceOverviewData(
  projectId: string
): Promise<WorkspaceOverviewData> {
  const supabase = await createClient();

  const [
    goalsRes,
    milestonesRes,
    roadmapRes,
    tasksRes,
    membersRes,
    activityRes,
  ] = await Promise.all([
    supabase.from('goals').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('milestones').select('*, goal:goals(id, title)').eq('project_id', projectId).order('due_date', { ascending: true }),
    supabase.from('project_roadmap_items').select('id').eq('project_id', projectId),
    supabase.from('tasks').select('id, status, milestone_id').eq('project_id', projectId),
    supabase.from('project_members').select('id').eq('project_id', projectId),
    supabase
      .from('activity_logs')
      .select('*, actor:profiles!activity_logs_actor_id_fkey(id, username, full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const goals = (goalsRes.data || []) as Goal[];
  const tasks = tasksRes.data || [];
  const milestonesRaw = milestonesRes.data || [];
  const activity = (activityRes.data || []) as unknown as DetailedActivityLog[];

  const tasksByStatus: Record<TaskStatus, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };

  const tasksByMilestone: Record<string, { total: number; done: number }> = {};

  for (const t of tasks) {
    const status = t.status as TaskStatus;
    if (tasksByStatus[status] !== undefined) {
      tasksByStatus[status]++;
    }
    if (t.milestone_id) {
      if (!tasksByMilestone[t.milestone_id]) {
        tasksByMilestone[t.milestone_id] = { total: 0, done: 0 };
      }
      tasksByMilestone[t.milestone_id].total++;
      if (status === 'done') {
        tasksByMilestone[t.milestone_id].done++;
      }
    }
  }

  const milestones: DetailedMilestone[] = (milestonesRaw as unknown as RawMilestone[]).map((m) => ({
    ...m,
    totalTasks: tasksByMilestone[m.id]?.total || 0,
    completedTasks: tasksByMilestone[m.id]?.done || 0,
  }));

  const achievedGoalsCount = goals.filter((g) => g.status === 'achieved').length;
  const completedMilestonesCount = milestones.filter((m) => m.status === 'completed').length;

  return {
    goalsCount: goals.length,
    achievedGoalsCount,
    milestonesCount: milestones.length,
    completedMilestonesCount,
    roadmapCount: roadmapRes.data?.length || 0,
    tasksByStatus,
    totalTasks: tasks.length,
    membersCount: (membersRes.data?.length || 0) + 1, // +1 for owner
    recentActivity: activity,
    recentGoals: goals.slice(0, 4),
    upcomingMilestones: milestones.slice(0, 4),
  };
}

/**
 * Returns all goals for a project.
 */
export async function getProjectGoals(projectId: string): Promise<Goal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals:', error);
    return [];
  }
  return (data || []) as Goal[];
}

/**
 * Returns all roadmap items for a project ordered by position.
 */
export async function getProjectRoadmap(
  projectId: string
): Promise<DetailedRoadmapItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_roadmap_items')
    .select('*, goal:goals(id, title), milestone:milestones(id, title)')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching roadmap:', error);
    return [];
  }
  return (data || []) as unknown as DetailedRoadmapItem[];
}

/**
 * Returns all milestones for a project with task completion counts.
 */
export async function getProjectMilestones(
  projectId: string
): Promise<DetailedMilestone[]> {
  const supabase = await createClient();

  const [milestonesRes, tasksRes] = await Promise.all([
    supabase
      .from('milestones')
      .select('*, goal:goals(id, title)')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true }),
    supabase
      .from('tasks')
      .select('id, status, milestone_id')
      .eq('project_id', projectId),
  ]);

  if (milestonesRes.error) {
    console.error('Error fetching milestones:', milestonesRes.error);
    return [];
  }

  const tasks = tasksRes.data || [];
  const tasksByMilestone: Record<string, { total: number; done: number }> = {};

  for (const t of tasks) {
    if (t.milestone_id) {
      if (!tasksByMilestone[t.milestone_id]) {
        tasksByMilestone[t.milestone_id] = { total: 0, done: 0 };
      }
      tasksByMilestone[t.milestone_id].total++;
      if (t.status === 'done') {
        tasksByMilestone[t.milestone_id].done++;
      }
    }
  }

  return ((milestonesRes.data || []) as unknown as RawMilestone[]).map((m) => ({
    ...m,
    totalTasks: tasksByMilestone[m.id]?.total || 0,
    completedTasks: tasksByMilestone[m.id]?.done || 0,
  }));
}

/**
 * Returns all project tasks with relational metadata.
 */
export async function getProjectTasks(
  projectId: string,
  filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    milestoneId?: string;
  }
): Promise<DetailedTask[]> {
  const supabase = await createClient();

  let query = supabase
    .from('tasks')
    .select(
      `
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, username, full_name, avatar_url),
      creator:profiles!tasks_creator_id_fkey(id, username, full_name, avatar_url),
      milestone:milestones(id, title),
      goal:goals(id, title)
    `
    )
    .eq('project_id', projectId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.assigneeId) {
    query = query.eq('assignee_id', filters.assigneeId);
  }
  if (filters?.milestoneId) {
    query = query.eq('milestone_id', filters.milestoneId);
  }

  const { data, error } = await query
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return (data || []) as unknown as DetailedTask[];
}

/**
 * Returns a single task by ID within a project.
 */
export async function getTaskById(
  taskId: string,
  projectId: string
): Promise<DetailedTask | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, username, full_name, avatar_url),
      creator:profiles!tasks_creator_id_fkey(id, username, full_name, avatar_url),
      milestone:milestones(id, title),
      goal:goals(id, title)
    `
    )
    .eq('id', taskId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !data) return null;

  return data as unknown as DetailedTask;
}

/**
 * Returns audit activity feed for a project.
 */
export async function getWorkspaceActivity(
  projectId: string,
  limit = 50
): Promise<DetailedActivityLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity_logs')
    .select(
      '*, actor:profiles!activity_logs_actor_id_fkey(id, username, full_name, avatar_url)'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching workspace activity:', error);
    return [];
  }

  return (data || []) as unknown as DetailedActivityLog[];
}
