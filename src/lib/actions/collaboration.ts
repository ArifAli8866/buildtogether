'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/api';
import type {
  ProjectMemberRole,
  Discussion,
  DiscussionComment,
  Meeting,
  MeetingNote,
  ProjectNote,
  ProjectCanvasItem,
} from '@/types/database';
import {
  createDiscussionSchema,
  updateDiscussionSchema,
  deleteDiscussionSchema,
  createDiscussionCommentSchema,
  updateDiscussionCommentSchema,
  deleteDiscussionCommentSchema,
  createMeetingSchema,
  updateMeetingSchema,
  deleteMeetingSchema,
  updateMeetingParticipantSchema,
  saveMeetingNoteSchema,
  createProjectNoteSchema,
  updateProjectNoteSchema,
  deleteProjectNoteSchema,
  saveCanvasItemSchema,
  updateCanvasItemPositionSchema,
  deleteCanvasItemSchema,
  type CreateDiscussionInput,
  type UpdateDiscussionInput,
  type CreateDiscussionCommentInput,
  type UpdateDiscussionCommentInput,
  type CreateMeetingInput,
  type UpdateMeetingInput,
  type UpdateMeetingParticipantInput,
  type SaveMeetingNoteInput,
  type CreateProjectNoteInput,
  type UpdateProjectNoteInput,
  type SaveCanvasItemInput,
  type UpdateCanvasItemPositionInput,
} from '@/lib/validators/collaboration';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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

function revalidateCollaboration(slug: string, ...subpaths: string[]) {
  revalidatePath(`/projects/${slug}/workspace`);
  for (const sub of subpaths) {
    revalidatePath(`/projects/${slug}/workspace/${sub}`);
  }
}

// ==========================================
// DISCUSSIONS ACTIONS
// ==========================================

export async function createDiscussionAction(
  rawInput: CreateDiscussionInput
): Promise<ActionResult<Discussion>> {
  const validated = createDiscussionSchema.parse(rawInput);
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

  const { data: discussion, error } = await supabase
    .from('discussions')
    .insert({
      project_id: validated.projectId,
      author_id: user.id,
      title: validated.title,
      content: validated.content,
      category: validated.category,
      pinned: validated.pinned,
    })
    .select('*')
    .single();

  if (error || !discussion) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create discussion.' } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'discussion_created',
    entityType: 'discussion',
    entityId: discussion.id,
    metadata: { title: validated.title, category: validated.category },
  });

  revalidateCollaboration(context.projectSlug, 'discussions');
  return { success: true, data: discussion as Discussion, message: 'Discussion started.' };
}

export async function updateDiscussionAction(
  rawInput: UpdateDiscussionInput
): Promise<ActionResult<Discussion>> {
  const validated = updateDiscussionSchema.parse(rawInput);
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

  const { data: existing } = await supabase
    .from('discussions')
    .select('id, author_id')
    .eq('id', validated.discussionId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Discussion not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only the author or admins can edit this discussion.' } };
  }

  const updatePayload: Record<string, unknown> = {};
  if (validated.title !== undefined) updatePayload.title = validated.title;
  if (validated.content !== undefined) updatePayload.content = validated.content;
  if (validated.category !== undefined) updatePayload.category = validated.category;
  if (validated.pinned !== undefined && context.isAdmin) updatePayload.pinned = validated.pinned;

  const { data: updated, error } = await supabase
    .from('discussions')
    .update(updatePayload)
    .eq('id', validated.discussionId)
    .select('*')
    .single();

  if (error || !updated) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update discussion.' } };
  }

  revalidateCollaboration(context.projectSlug, 'discussions', `discussions/${validated.discussionId}`);
  return { success: true, data: updated as Discussion, message: 'Discussion updated.' };
}

export async function deleteDiscussionAction(
  discussionId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const validated = deleteDiscussionSchema.parse({ discussionId, projectId });
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

  const { data: existing } = await supabase
    .from('discussions')
    .select('id, author_id, title')
    .eq('id', validated.discussionId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Discussion not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only the author or admins can delete this discussion.' } };
  }

  const { error } = await supabase
    .from('discussions')
    .delete()
    .eq('id', validated.discussionId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'discussion_deleted',
    entityType: 'discussion',
    entityId: validated.discussionId,
    metadata: { title: existing.title },
  });

  revalidateCollaboration(context.projectSlug, 'discussions');
  return { success: true, data: undefined, message: 'Discussion deleted.' };
}

export async function toggleDiscussionPinnedAction(
  discussionId: string,
  projectId: string
): Promise<ActionResult<boolean>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } };
  }

  const context = await verifyMemberAccess(supabase, projectId, user.id);
  if (!context || !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only project admins can pin discussions.' } };
  }

  const { data: discussion } = await supabase
    .from('discussions')
    .select('pinned')
    .eq('id', discussionId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (!discussion) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Discussion not found.' } };
  }

  const nextPinned = !discussion.pinned;
  const { error } = await supabase
    .from('discussions')
    .update({ pinned: nextPinned })
    .eq('id', discussionId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  revalidateCollaboration(context.projectSlug, 'discussions', `discussions/${discussionId}`);
  return { success: true, data: nextPinned, message: nextPinned ? 'Discussion pinned.' : 'Discussion unpinned.' };
}

// ==========================================
// DISCUSSION COMMENTS ACTIONS
// ==========================================

export async function createDiscussionCommentAction(
  rawInput: CreateDiscussionCommentInput
): Promise<ActionResult<DiscussionComment>> {
  const validated = createDiscussionCommentSchema.parse(rawInput);
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

  // Verify discussion belongs to project
  const { data: discussion } = await supabase
    .from('discussions')
    .select('id, title')
    .eq('id', validated.discussionId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!discussion) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Discussion not found in this project.' } };
  }

  // If replying to a parent comment, verify parent comment belongs to this discussion
  if (validated.parentCommentId) {
    const { data: parentComment } = await supabase
      .from('discussion_comments')
      .select('id')
      .eq('id', validated.parentCommentId)
      .eq('discussion_id', validated.discussionId)
      .maybeSingle();

    if (!parentComment) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Parent comment does not exist in this discussion.' } };
    }
  }

  const { data: comment, error } = await supabase
    .from('discussion_comments')
    .insert({
      discussion_id: validated.discussionId,
      author_id: user.id,
      parent_comment_id: validated.parentCommentId || null,
      content: validated.content,
    })
    .select('*')
    .single();

  if (error || !comment) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to post comment.' } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'discussion_comment_added',
    entityType: 'discussion',
    entityId: validated.discussionId,
    metadata: { discussionTitle: discussion.title },
  });

  revalidateCollaboration(context.projectSlug, 'discussions', `discussions/${validated.discussionId}`);
  return { success: true, data: comment as DiscussionComment, message: 'Comment posted.' };
}

export async function updateDiscussionCommentAction(
  rawInput: UpdateDiscussionCommentInput
): Promise<ActionResult<DiscussionComment>> {
  const validated = updateDiscussionCommentSchema.parse(rawInput);
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

  const { data: existing } = await supabase
    .from('discussion_comments')
    .select('id, author_id, discussion_id')
    .eq('id', validated.commentId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Comment not found.' } };
  }

  if (existing.author_id !== user.id) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own comments.' } };
  }

  const { data: updated, error } = await supabase
    .from('discussion_comments')
    .update({ content: validated.content })
    .eq('id', validated.commentId)
    .select('*')
    .single();

  if (error || !updated) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update comment.' } };
  }

  revalidateCollaboration(context.projectSlug, 'discussions', `discussions/${existing.discussion_id}`);
  return { success: true, data: updated as DiscussionComment, message: 'Comment updated.' };
}

export async function deleteDiscussionCommentAction(
  commentId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const validated = deleteDiscussionCommentSchema.parse({ commentId, projectId });
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

  const { data: existing } = await supabase
    .from('discussion_comments')
    .select('id, author_id, discussion_id')
    .eq('id', validated.commentId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Comment not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admins can delete this comment.' } };
  }

  const { error } = await supabase
    .from('discussion_comments')
    .delete()
    .eq('id', validated.commentId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  revalidateCollaboration(context.projectSlug, 'discussions', `discussions/${existing.discussion_id}`);
  return { success: true, data: undefined, message: 'Comment deleted.' };
}

// ==========================================
// MEETINGS ACTIONS
// ==========================================

export async function createMeetingAction(
  rawInput: CreateMeetingInput
): Promise<ActionResult<Meeting>> {
  const validated = createMeetingSchema.parse(rawInput);
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

  // Validate participants belong to project
  for (const participantId of validated.participantIds) {
    const isMember = await isUserProjectMember(supabase, validated.projectId, participantId);
    if (!isMember) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'All meeting participants must be members of this project.' } };
    }
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      project_id: validated.projectId,
      organizer_id: user.id,
      title: validated.title,
      description: validated.description,
      scheduled_at: validated.scheduledAt,
      duration_minutes: validated.durationMinutes,
      meeting_url: validated.meetingUrl || null,
      status: validated.status,
    })
    .select('*')
    .single();

  if (error || !meeting) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create meeting.' } };
  }

  // Insert participants (including organizer)
  const participantIdsToInsert = Array.from(new Set([user.id, ...validated.participantIds]));
  const participantRows = participantIdsToInsert.map((uid) => ({
    meeting_id: meeting.id,
    user_id: uid,
    status: uid === user.id ? ('attending' as const) : ('tentative' as const),
  }));

  if (participantRows.length > 0) {
    await supabase.from('meeting_participants').insert(participantRows);
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'meeting_scheduled',
    entityType: 'meeting',
    entityId: meeting.id,
    metadata: { title: validated.title, scheduledAt: validated.scheduledAt },
  });

  revalidateCollaboration(context.projectSlug, 'meetings');
  return { success: true, data: meeting as Meeting, message: 'Meeting scheduled.' };
}

export async function updateMeetingAction(
  rawInput: UpdateMeetingInput
): Promise<ActionResult<Meeting>> {
  const validated = updateMeetingSchema.parse(rawInput);
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

  const { data: existing } = await supabase
    .from('meetings')
    .select('id, organizer_id')
    .eq('id', validated.meetingId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found.' } };
  }

  if (existing.organizer_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only organizer or admins can update this meeting.' } };
  }

  const updatePayload: Record<string, unknown> = {};
  if (validated.title !== undefined) updatePayload.title = validated.title;
  if (validated.description !== undefined) updatePayload.description = validated.description;
  if (validated.scheduledAt !== undefined) updatePayload.scheduled_at = validated.scheduledAt;
  if (validated.durationMinutes !== undefined) updatePayload.duration_minutes = validated.durationMinutes;
  if (validated.meetingUrl !== undefined) updatePayload.meeting_url = validated.meetingUrl;
  if (validated.status !== undefined) updatePayload.status = validated.status;

  const { data: updated, error } = await supabase
    .from('meetings')
    .update(updatePayload)
    .eq('id', validated.meetingId)
    .select('*')
    .single();

  if (error || !updated) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update meeting.' } };
  }

  revalidateCollaboration(context.projectSlug, 'meetings');
  return { success: true, data: updated as Meeting, message: 'Meeting updated.' };
}

export async function deleteMeetingAction(
  meetingId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const validated = deleteMeetingSchema.parse({ meetingId, projectId });
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

  const { data: existing } = await supabase
    .from('meetings')
    .select('id, organizer_id, title')
    .eq('id', validated.meetingId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found.' } };
  }

  if (existing.organizer_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only organizer or admins can delete this meeting.' } };
  }

  const { error } = await supabase.from('meetings').delete().eq('id', validated.meetingId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'meeting_deleted',
    entityType: 'meeting',
    entityId: validated.meetingId,
    metadata: { title: existing.title },
  });

  revalidateCollaboration(context.projectSlug, 'meetings');
  return { success: true, data: undefined, message: 'Meeting cancelled.' };
}

export async function updateMeetingParticipantAction(
  rawInput: UpdateMeetingParticipantInput
): Promise<ActionResult<void>> {
  const validated = updateMeetingParticipantSchema.parse(rawInput);
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

  const { error } = await supabase
    .from('meeting_participants')
    .upsert({
      meeting_id: validated.meetingId,
      user_id: user.id,
      status: validated.status,
    }, { onConflict: 'meeting_id,user_id' });

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  revalidateCollaboration(context.projectSlug, 'meetings');
  return { success: true, data: undefined, message: 'RSVP updated.' };
}

export async function saveMeetingNoteAction(
  rawInput: SaveMeetingNoteInput
): Promise<ActionResult<MeetingNote>> {
  const validated = saveMeetingNoteSchema.parse(rawInput);
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

  // Check meeting belongs to project
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, title')
    .eq('id', validated.meetingId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!meeting) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found.' } };
  }

  // Check if note exists
  const { data: existingNote } = await supabase
    .from('meeting_notes')
    .select('id')
    .eq('meeting_id', validated.meetingId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  let noteData: MeetingNote;

  if (existingNote) {
    const { data: updated, error } = await supabase
      .from('meeting_notes')
      .update({
        content: validated.content,
        decisions: validated.decisions,
        action_items: validated.actionItems,
      })
      .eq('id', existingNote.id)
      .select('*')
      .single();

    if (error || !updated) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update meeting note.' } };
    }
    noteData = updated as MeetingNote;
  } else {
    const { data: inserted, error } = await supabase
      .from('meeting_notes')
      .insert({
        meeting_id: validated.meetingId,
        project_id: validated.projectId,
        author_id: user.id,
        content: validated.content,
        decisions: validated.decisions,
        action_items: validated.actionItems,
      })
      .select('*')
      .single();

    if (error || !inserted) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create meeting note.' } };
    }
    noteData = inserted as MeetingNote;
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'meeting_notes_updated',
    entityType: 'meeting',
    entityId: validated.meetingId,
    metadata: { meetingTitle: meeting.title },
  });

  revalidateCollaboration(context.projectSlug, 'meetings');
  return { success: true, data: noteData, message: 'Meeting notes saved.' };
}

// ==========================================
// PROJECT NOTES ACTIONS
// ==========================================

export async function createProjectNoteAction(
  rawInput: CreateProjectNoteInput
): Promise<ActionResult<ProjectNote>> {
  const validated = createProjectNoteSchema.parse(rawInput);
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

  const { data: note, error } = await supabase
    .from('project_notes')
    .insert({
      project_id: validated.projectId,
      author_id: user.id,
      title: validated.title,
      content: validated.content,
      category: validated.category,
    })
    .select('*')
    .single();

  if (error || !note) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create note.' } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'note_created',
    entityType: 'note',
    entityId: note.id,
    metadata: { title: validated.title, category: validated.category },
  });

  revalidateCollaboration(context.projectSlug, 'notes');
  return { success: true, data: note as ProjectNote, message: 'Note created.' };
}

export async function updateProjectNoteAction(
  rawInput: UpdateProjectNoteInput
): Promise<ActionResult<ProjectNote>> {
  const validated = updateProjectNoteSchema.parse(rawInput);
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

  const { data: existing } = await supabase
    .from('project_notes')
    .select('id, author_id')
    .eq('id', validated.noteId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Note not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admins can edit this note.' } };
  }

  const updatePayload: Record<string, unknown> = {};
  if (validated.title !== undefined) updatePayload.title = validated.title;
  if (validated.content !== undefined) updatePayload.content = validated.content;
  if (validated.category !== undefined) updatePayload.category = validated.category;

  const { data: updated, error } = await supabase
    .from('project_notes')
    .update(updatePayload)
    .eq('id', validated.noteId)
    .select('*')
    .single();

  if (error || !updated) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update note.' } };
  }

  revalidateCollaboration(context.projectSlug, 'notes');
  return { success: true, data: updated as ProjectNote, message: 'Note saved.' };
}

export async function deleteProjectNoteAction(
  noteId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const validated = deleteProjectNoteSchema.parse({ noteId, projectId });
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

  const { data: existing } = await supabase
    .from('project_notes')
    .select('id, author_id, title')
    .eq('id', validated.noteId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Note not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admins can delete this note.' } };
  }

  const { error } = await supabase.from('project_notes').delete().eq('id', validated.noteId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'note_deleted',
    entityType: 'note',
    entityId: validated.noteId,
    metadata: { title: existing.title },
  });

  revalidateCollaboration(context.projectSlug, 'notes');
  return { success: true, data: undefined, message: 'Note deleted.' };
}

// ==========================================
// PROJECT CANVAS ACTIONS
// ==========================================

export async function saveCanvasItemAction(
  rawInput: SaveCanvasItemInput
): Promise<ActionResult<ProjectCanvasItem>> {
  const validated = saveCanvasItemSchema.parse(rawInput);
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

  if (validated.id) {
    // Edit existing item
    const { data: existing } = await supabase
      .from('project_canvas_items')
      .select('id, author_id')
      .eq('id', validated.id)
      .eq('project_id', validated.projectId)
      .maybeSingle();

    if (!existing) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Canvas item not found.' } };
    }

    if (existing.author_id !== user.id && !context.isAdmin) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admins can edit this note.' } };
    }

    const { data: updated, error } = await supabase
      .from('project_canvas_items')
      .update({
        item_type: validated.itemType,
        content: validated.content,
        color: validated.color,
        position_x: validated.positionX,
        position_y: validated.positionY,
        width: validated.width,
        height: validated.height,
      })
      .eq('id', validated.id)
      .select('*')
      .single();

    if (error || !updated) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update canvas item.' } };
    }

    revalidateCollaboration(context.projectSlug, 'canvas');
    return { success: true, data: updated as ProjectCanvasItem, message: 'Sticky note updated.' };
  } else {
    // Create new item
    const { data: created, error } = await supabase
      .from('project_canvas_items')
      .insert({
        project_id: validated.projectId,
        author_id: user.id,
        item_type: validated.itemType,
        content: validated.content,
        color: validated.color,
        position_x: validated.positionX,
        position_y: validated.positionY,
        width: validated.width,
        height: validated.height,
      })
      .select('*')
      .single();

    if (error || !created) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create canvas item.' } };
    }

    await recordActivity(supabase, {
      projectId: validated.projectId,
      actorId: user.id,
      action: 'canvas_item_created',
      entityType: 'canvas_item',
      entityId: created.id,
      metadata: { itemType: validated.itemType },
    });

    revalidateCollaboration(context.projectSlug, 'canvas');
    return { success: true, data: created as ProjectCanvasItem, message: 'Sticky note added.' };
  }
}

export async function updateCanvasItemPositionAction(
  rawInput: UpdateCanvasItemPositionInput
): Promise<ActionResult<void>> {
  const validated = updateCanvasItemPositionSchema.parse(rawInput);
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

  const updateFields: Record<string, unknown> = {
    position_x: validated.positionX,
    position_y: validated.positionY,
  };
  if (validated.width !== undefined) updateFields.width = validated.width;
  if (validated.height !== undefined) updateFields.height = validated.height;

  const { error } = await supabase
    .from('project_canvas_items')
    .update(updateFields)
    .eq('id', validated.itemId)
    .eq('project_id', validated.projectId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  revalidateCollaboration(context.projectSlug, 'canvas');
  return { success: true, data: undefined, message: 'Item position updated.' };
}

export async function deleteCanvasItemAction(
  itemId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const validated = deleteCanvasItemSchema.parse({ itemId, projectId });
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

  const { data: existing } = await supabase
    .from('project_canvas_items')
    .select('id, author_id')
    .eq('id', validated.itemId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Canvas item not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admins can delete this sticky note.' } };
  }

  const { error } = await supabase
    .from('project_canvas_items')
    .delete()
    .eq('id', validated.itemId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'canvas_item_deleted',
    entityType: 'canvas_item',
    entityId: validated.itemId,
  });

  revalidateCollaboration(context.projectSlug, 'canvas');
  return { success: true, data: undefined, message: 'Sticky note deleted.' };
}
