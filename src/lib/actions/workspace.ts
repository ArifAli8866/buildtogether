'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/api';
import type { ProjectMemberRole } from '@/types/database';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
import {
  createGoalSchema,
  updateGoalSchema,
  createRoadmapItemSchema,
  updateRoadmapItemSchema,
  reorderRoadmapSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  updateTaskPrioritySchema,
  type CreateGoalInput,
  type UpdateGoalInput,
  type CreateRoadmapItemInput,
  type UpdateRoadmapItemInput,
  type ReorderRoadmapInput,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type UpdateTaskStatusInput,
  type UpdateTaskPriorityInput,
} from '@/lib/validators/workspace';

// ==========================================
// INTERNAL AUTHORIZATION & AUDIT HELPERS
// ==========================================

interface MemberContext {
  isMember: boolean;
  role: ProjectMemberRole;
  isAdmin: boolean;
  projectSlug: string;
}

async function verifyMemberAccess(
  supabase: SupabaseServerClient,
  projectId: string,
  userId: string
): Promise<MemberContext | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, owner_id')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return null;

  if (project.owner_id === userId) {
    return {
      isMember: true,
      role: 'owner',
      isAdmin: true,
      projectSlug: project.slug,
    };
  }

  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!member) {
    return null;
  }

  const role = member.role as ProjectMemberRole;
  return {
    isMember: true,
    role,
    isAdmin: role === 'owner' || role === 'maintainer',
    projectSlug: project.slug,
  };
}

async function isUserProjectMember(
  supabase: SupabaseServerClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle();

  if (project?.owner_id === userId) return true;

  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(member);
}

async function recordActivity(
  supabase: SupabaseServerClient,
  event: {
    projectId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from('activity_logs').insert({
      project_id: event.projectId,
      actor_id: event.actorId,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      metadata: event.metadata || {},
    });
  } catch (err) {
    console.error('Failed to append activity log:', err);
  }
}

function revalidateWorkspace(slug: string, ...subpaths: string[]) {
  revalidatePath(`/projects/${slug}/workspace`);
  for (const sub of subpaths) {
    revalidatePath(`/projects/${slug}/workspace/${sub}`);
  }
}

// ==========================================
// 1. GOALS ACTIONS
// ==========================================

export async function createGoalAction(
  rawInput: CreateGoalInput
): Promise<ActionResult<{ id: string }>> {
  const validated = createGoalSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  const { data: newGoal, error } = await supabase
    .from('goals')
    .insert({
      project_id: validated.projectId,
      title: validated.title,
      description: validated.description || null,
      target_date: validated.targetDate || null,
      status: validated.status,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !newGoal) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create goal.' } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'goal_created',
    entityType: 'goal',
    entityId: newGoal.id,
    metadata: { title: validated.title, status: validated.status },
  });

  revalidateWorkspace(context.projectSlug, 'goals');
  return { success: true, data: { id: newGoal.id }, message: 'Project goal created.' };
}

export async function updateGoalAction(
  rawInput: UpdateGoalInput
): Promise<ActionResult<void>> {
  const validated = updateGoalSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  const updateFields: Record<string, unknown> = {};
  if (validated.title !== undefined) updateFields.title = validated.title;
  if (validated.description !== undefined) updateFields.description = validated.description;
  if (validated.targetDate !== undefined) updateFields.target_date = validated.targetDate;
  if (validated.status !== undefined) updateFields.status = validated.status;

  const { error } = await supabase
    .from('goals')
    .update(updateFields)
    .eq('id', validated.goalId)
    .eq('project_id', validated.projectId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'goal_updated',
    entityType: 'goal',
    entityId: validated.goalId,
    metadata: updateFields,
  });

  revalidateWorkspace(context.projectSlug, 'goals');
  return { success: true, data: undefined, message: 'Goal updated.' };
}

export async function deleteGoalAction(
  goalId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  const { data: goal } = await supabase
    .from('goals')
    .select('id, created_by, title')
    .eq('id', goalId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (!goal) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Goal not found.' } };
  }

  if (!context.isAdmin && goal.created_by !== user.id) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only project admins or the goal creator can delete this goal.' } };
  }

  const { error } = await supabase.from('goals').delete().eq('id', goalId);
  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId,
    actorId: user.id,
    action: 'goal_deleted',
    entityType: 'goal',
    entityId: goalId,
    metadata: { title: goal.title },
  });

  revalidateWorkspace(context.projectSlug, 'goals');
  return { success: true, data: undefined, message: 'Goal removed.' };
}

// ==========================================
// 2. ROADMAP ACTIONS
// ==========================================

export async function createRoadmapItemAction(
  rawInput: CreateRoadmapItemInput
): Promise<ActionResult<{ id: string }>> {
  const validated = createRoadmapItemSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  // Validate relationships belong to the same project
  if (validated.goalId) {
    const { data: goal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', validated.goalId)
      .eq('project_id', validated.projectId)
      .maybeSingle();
    if (!goal) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'The linked goal does not belong to this project.' } };
    }
  }

  if (validated.milestoneId) {
    const { data: milestone } = await supabase
      .from('milestones')
      .select('id')
      .eq('id', validated.milestoneId)
      .eq('project_id', validated.projectId)
      .maybeSingle();
    if (!milestone) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'The linked milestone does not belong to this project.' } };
    }
  }

  // Calculate position if not provided
  let position = validated.position;
  if (position === undefined) {
    const { data: lastItem } = await supabase
      .from('project_roadmap_items')
      .select('position')
      .eq('project_id', validated.projectId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    position = (lastItem?.position || 0) + 1000.0;
  }

  const { data: newItem, error } = await supabase
    .from('project_roadmap_items')
    .insert({
      project_id: validated.projectId,
      title: validated.title,
      description: validated.description || null,
      status: validated.status,
      target_date: validated.targetDate || null,
      target_quarter: validated.targetQuarter || null,
      goal_id: validated.goalId || null,
      milestone_id: validated.milestoneId || null,
      position,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !newItem) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create roadmap item.' } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'roadmap_item_created',
    entityType: 'roadmap_item',
    entityId: newItem.id,
    metadata: { title: validated.title, status: validated.status },
  });

  revalidateWorkspace(context.projectSlug, 'roadmap');
  return { success: true, data: { id: newItem.id }, message: 'Roadmap item created.' };
}

export async function updateRoadmapItemAction(
  rawInput: UpdateRoadmapItemInput
): Promise<ActionResult<void>> {
  const validated = updateRoadmapItemSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  const updateFields: Record<string, unknown> = {};
  if (validated.title !== undefined) updateFields.title = validated.title;
  if (validated.description !== undefined) updateFields.description = validated.description;
  if (validated.status !== undefined) updateFields.status = validated.status;
  if (validated.targetDate !== undefined) updateFields.target_date = validated.targetDate;
  if (validated.targetQuarter !== undefined) updateFields.target_quarter = validated.targetQuarter;
  if (validated.goalId !== undefined) updateFields.goal_id = validated.goalId;
  if (validated.milestoneId !== undefined) updateFields.milestone_id = validated.milestoneId;
  if (validated.position !== undefined) updateFields.position = validated.position;

  const { error } = await supabase
    .from('project_roadmap_items')
    .update(updateFields)
    .eq('id', validated.itemId)
    .eq('project_id', validated.projectId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'roadmap_item_updated',
    entityType: 'roadmap_item',
    entityId: validated.itemId,
    metadata: updateFields,
  });

  revalidateWorkspace(context.projectSlug, 'roadmap');
  return { success: true, data: undefined, message: 'Roadmap item updated.' };
}

export async function reorderRoadmapAction(
  rawInput: ReorderRoadmapInput
): Promise<ActionResult<void>> {
  const validated = reorderRoadmapSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  for (let i = 0; i < validated.itemIds.length; i++) {
    const id = validated.itemIds[i];
    await supabase
      .from('project_roadmap_items')
      .update({ position: (i + 1) * 1000.0 })
      .eq('id', id)
      .eq('project_id', validated.projectId);
  }

  revalidateWorkspace(context.projectSlug, 'roadmap');
  return { success: true, data: undefined, message: 'Roadmap order saved.' };
}

export async function deleteRoadmapItemAction(
  itemId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  const { data: item } = await supabase
    .from('project_roadmap_items')
    .select('id, created_by, title')
    .eq('id', itemId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (!item) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Roadmap item not found.' } };
  }

  if (!context.isAdmin && item.created_by !== user.id) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only project admins or the creator can delete this roadmap item.' } };
  }

  const { error } = await supabase.from('project_roadmap_items').delete().eq('id', itemId);
  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId,
    actorId: user.id,
    action: 'roadmap_item_deleted',
    entityType: 'roadmap_item',
    entityId: itemId,
    metadata: { title: item.title },
  });

  revalidateWorkspace(context.projectSlug, 'roadmap');
  return { success: true, data: undefined, message: 'Roadmap item deleted.' };
}

// ==========================================
// 3. MILESTONES ACTIONS
// ==========================================

export async function createMilestoneAction(
  rawInput: CreateMilestoneInput
): Promise<ActionResult<{ id: string }>> {
  const validated = createMilestoneSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  if (validated.goalId) {
    const { data: goal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', validated.goalId)
      .eq('project_id', validated.projectId)
      .maybeSingle();
    if (!goal) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'The linked goal does not belong to this project.' } };
    }
  }

  const { data: newMilestone, error } = await supabase
    .from('milestones')
    .insert({
      project_id: validated.projectId,
      goal_id: validated.goalId || null,
      title: validated.title,
      description: validated.description || null,
      due_date: validated.dueDate || null,
      status: validated.status,
    })
    .select('id')
    .single();

  if (error || !newMilestone) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create milestone.' } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'milestone_created',
    entityType: 'milestone',
    entityId: newMilestone.id,
    metadata: { title: validated.title, status: validated.status },
  });

  revalidateWorkspace(context.projectSlug, 'milestones', 'roadmap');
  return { success: true, data: { id: newMilestone.id }, message: 'Milestone created.' };
}

export async function updateMilestoneAction(
  rawInput: UpdateMilestoneInput
): Promise<ActionResult<void>> {
  const validated = updateMilestoneSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  const updateFields: Record<string, unknown> = {};
  if (validated.title !== undefined) updateFields.title = validated.title;
  if (validated.description !== undefined) updateFields.description = validated.description;
  if (validated.dueDate !== undefined) updateFields.due_date = validated.dueDate;
  if (validated.status !== undefined) updateFields.status = validated.status;
  if (validated.goalId !== undefined) updateFields.goal_id = validated.goalId;

  const { error } = await supabase
    .from('milestones')
    .update(updateFields)
    .eq('id', validated.milestoneId)
    .eq('project_id', validated.projectId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'milestone_updated',
    entityType: 'milestone',
    entityId: validated.milestoneId,
    metadata: updateFields,
  });

  revalidateWorkspace(context.projectSlug, 'milestones', 'roadmap');
  return { success: true, data: undefined, message: 'Milestone updated.' };
}

export async function deleteMilestoneAction(
  milestoneId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, projectId, user.id);
  if (!context || !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only project admins can delete milestones.' } };
  }

  const { data: milestone } = await supabase
    .from('milestones')
    .select('id, title')
    .eq('id', milestoneId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (!milestone) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Milestone not found.' } };
  }

  const { error } = await supabase.from('milestones').delete().eq('id', milestoneId);
  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId,
    actorId: user.id,
    action: 'milestone_deleted',
    entityType: 'milestone',
    entityId: milestoneId,
    metadata: { title: milestone.title },
  });

  revalidateWorkspace(context.projectSlug, 'milestones', 'roadmap');
  return { success: true, data: undefined, message: 'Milestone deleted.' };
}

// ==========================================
// 4. TASKS ACTIONS
// ==========================================

export async function createTaskAction(
  rawInput: CreateTaskInput
): Promise<ActionResult<{ id: string }>> {
  const validated = createTaskSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  // 1. Task Assignment Validation: Must be a verified project member
  if (validated.assigneeId) {
    const isAssigneeMember = await isUserProjectMember(supabase, validated.projectId, validated.assigneeId);
    if (!isAssigneeMember) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tasks can only be assigned to accepted members of this project.',
        },
      };
    }
  }

  // 2. Validate milestone belongs to project
  if (validated.milestoneId) {
    const { data: milestone } = await supabase
      .from('milestones')
      .select('id')
      .eq('id', validated.milestoneId)
      .eq('project_id', validated.projectId)
      .maybeSingle();
    if (!milestone) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'The selected milestone does not belong to this project.' } };
    }
  }

  // 3. Validate goal belongs to project
  if (validated.goalId) {
    const { data: goal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', validated.goalId)
      .eq('project_id', validated.projectId)
      .maybeSingle();
    if (!goal) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'The selected goal does not belong to this project.' } };
    }
  }

  // 4. Compute next position in status column
  const { data: lastTask } = await supabase
    .from('tasks')
    .select('position')
    .eq('project_id', validated.projectId)
    .eq('status', validated.status)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (lastTask?.position || 0) + 1000.0;

  const { data: newTask, error } = await supabase
    .from('tasks')
    .insert({
      project_id: validated.projectId,
      milestone_id: validated.milestoneId || null,
      goal_id: validated.goalId || null,
      title: validated.title,
      description: validated.description || '',
      creator_id: user.id,
      assignee_id: validated.assigneeId || null,
      status: validated.status,
      priority: validated.priority,
      estimate_hours: validated.estimateHours || null,
      due_date: validated.dueDate || null,
      labels: validated.labels || [],
      position,
    })
    .select('id')
    .single();

  if (error || !newTask) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create task.' } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'task_created',
    entityType: 'task',
    entityId: newTask.id,
    metadata: {
      title: validated.title,
      status: validated.status,
      priority: validated.priority,
      assigneeId: validated.assigneeId || null,
    },
  });

  revalidateWorkspace(context.projectSlug, 'tasks', 'board');
  return { success: true, data: { id: newTask.id }, message: 'Task created.' };
}

export async function updateTaskAction(
  rawInput: UpdateTaskInput
): Promise<ActionResult<void>> {
  const validated = updateTaskSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  // 1. Fetch current task
  const { data: currentTask } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', validated.taskId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!currentTask) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Task not found in this project.' } };
  }

  // 2. Validate assignee is a project member
  if (validated.assigneeId) {
    const isAssigneeMember = await isUserProjectMember(supabase, validated.projectId, validated.assigneeId);
    if (!isAssigneeMember) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tasks can only be assigned to accepted members of this project.',
        },
      };
    }
  }

  // 3. Validate milestone
  if (validated.milestoneId) {
    const { data: milestone } = await supabase
      .from('milestones')
      .select('id')
      .eq('id', validated.milestoneId)
      .eq('project_id', validated.projectId)
      .maybeSingle();
    if (!milestone) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Selected milestone does not belong to this project.' } };
    }
  }

  // 4. Validate goal
  if (validated.goalId) {
    const { data: goal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', validated.goalId)
      .eq('project_id', validated.projectId)
      .maybeSingle();
    if (!goal) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Selected goal does not belong to this project.' } };
    }
  }

  const updateFields: Record<string, unknown> = {};
  if (validated.title !== undefined) updateFields.title = validated.title;
  if (validated.description !== undefined) updateFields.description = validated.description;
  if (validated.assigneeId !== undefined) updateFields.assignee_id = validated.assigneeId;
  if (validated.milestoneId !== undefined) updateFields.milestone_id = validated.milestoneId;
  if (validated.goalId !== undefined) updateFields.goal_id = validated.goalId;
  if (validated.status !== undefined) updateFields.status = validated.status;
  if (validated.priority !== undefined) updateFields.priority = validated.priority;
  if (validated.estimateHours !== undefined) updateFields.estimate_hours = validated.estimateHours;
  if (validated.dueDate !== undefined) updateFields.due_date = validated.dueDate;
  if (validated.labels !== undefined) updateFields.labels = validated.labels;

  const { error } = await supabase
    .from('tasks')
    .update(updateFields)
    .eq('id', validated.taskId)
    .eq('project_id', validated.projectId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  // Record specific audit events
  if (validated.assigneeId !== undefined && validated.assigneeId !== currentTask.assignee_id) {
    await recordActivity(supabase, {
      projectId: validated.projectId,
      actorId: user.id,
      action: 'task_assigned',
      entityType: 'task',
      entityId: validated.taskId,
      metadata: { newAssigneeId: validated.assigneeId, oldAssigneeId: currentTask.assignee_id },
    });
  }

  if (validated.status !== undefined && validated.status !== currentTask.status) {
    await recordActivity(supabase, {
      projectId: validated.projectId,
      actorId: user.id,
      action: 'task_status_changed',
      entityType: 'task',
      entityId: validated.taskId,
      metadata: { newStatus: validated.status, oldStatus: currentTask.status },
    });
  }

  if (validated.priority !== undefined && validated.priority !== currentTask.priority) {
    await recordActivity(supabase, {
      projectId: validated.projectId,
      actorId: user.id,
      action: 'task_priority_changed',
      entityType: 'task',
      entityId: validated.taskId,
      metadata: { newPriority: validated.priority, oldPriority: currentTask.priority },
    });
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'task_updated',
    entityType: 'task',
    entityId: validated.taskId,
    metadata: { title: validated.title || currentTask.title },
  });

  revalidateWorkspace(context.projectSlug, 'tasks', 'board');
  return { success: true, data: undefined, message: 'Task updated.' };
}

export async function updateTaskStatusAction(
  rawInput: UpdateTaskStatusInput
): Promise<ActionResult<void>> {
  const validated = updateTaskStatusSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  const { data: currentTask } = await supabase
    .from('tasks')
    .select('id, status, title')
    .eq('id', validated.taskId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!currentTask) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Task not found in this project.' } };
  }

  const updateFields: Record<string, unknown> = {
    status: validated.status,
  };
  if (validated.position !== undefined) {
    updateFields.position = validated.position;
  }

  const { error } = await supabase
    .from('tasks')
    .update(updateFields)
    .eq('id', validated.taskId)
    .eq('project_id', validated.projectId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'task_status_changed',
    entityType: 'task',
    entityId: validated.taskId,
    metadata: {
      taskTitle: currentTask.title,
      oldStatus: currentTask.status,
      newStatus: validated.status,
    },
  });

  revalidateWorkspace(context.projectSlug, 'tasks', 'board');
  return { success: true, data: undefined, message: `Task moved to ${validated.status}.` };
}

export async function updateTaskPriorityAction(
  rawInput: UpdateTaskPriorityInput
): Promise<ActionResult<void>> {
  const validated = updateTaskPrioritySchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, validated.projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  const { data: currentTask } = await supabase
    .from('tasks')
    .select('id, priority, title')
    .eq('id', validated.taskId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!currentTask) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Task not found in this project.' } };
  }

  const { error } = await supabase
    .from('tasks')
    .update({ priority: validated.priority })
    .eq('id', validated.taskId)
    .eq('project_id', validated.projectId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'task_priority_changed',
    entityType: 'task',
    entityId: validated.taskId,
    metadata: {
      taskTitle: currentTask.title,
      oldPriority: currentTask.priority,
      newPriority: validated.priority,
    },
  });

  revalidateWorkspace(context.projectSlug, 'tasks', 'board');
  return { success: true, data: undefined, message: `Task priority set to ${validated.priority}.` };
}

export async function deleteTaskAction(
  taskId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, projectId, user.id);
  if (!context) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this project.' } };
  }

  const { data: task } = await supabase
    .from('tasks')
    .select('id, creator_id, title')
    .eq('id', taskId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (!task) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Task not found in this project.' } };
  }

  if (!context.isAdmin && task.creator_id !== user.id) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only project admins or the task creator can delete this task.' } };
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId,
    actorId: user.id,
    action: 'task_deleted',
    entityType: 'task',
    entityId: taskId,
    metadata: { title: task.title },
  });

  revalidateWorkspace(context.projectSlug, 'tasks', 'board');
  return { success: true, data: undefined, message: 'Task deleted.' };
}
