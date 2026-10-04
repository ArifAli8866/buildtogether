'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/api';
import type {
  ProjectMemberRole,
  ProjectFile,
  CodeSnippet,
  CodeReview,
  CodeReviewComment,
} from '@/types/database';
import {
  uploadFileSchema,
  deleteFileSchema,
  getDownloadUrlSchema,
  createSnippetSchema,
  updateSnippetSchema,
  deleteSnippetSchema,
  createCodeReviewSchema,
  updateCodeReviewSchema,
  submitReviewDecisionSchema,
  addCodeReviewCommentSchema,
  deleteCodeReviewCommentSchema,
  resolveCodeReviewCommentSchema,
  deleteCodeReviewSchema,
  type CreateSnippetInput,
  type UpdateSnippetInput,
  type CreateCodeReviewInput,
  type UpdateCodeReviewInput,
  type SubmitReviewDecisionInput,
  type AddCodeReviewCommentInput,
} from '@/lib/validators/files-and-code';

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

function revalidateFilesAndCode(slug: string, ...subpaths: string[]) {
  revalidatePath(`/projects/${slug}/workspace`);
  for (const sub of subpaths) {
    revalidatePath(`/projects/${slug}/workspace/${sub}`);
  }
}

// Sanitize filename to avoid path traversal and control characters
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 100);
}

// ==========================================
// FILE MANAGEMENT ACTIONS
// ==========================================

export async function uploadProjectFileAction(
  formData: FormData
): Promise<ActionResult<ProjectFile>> {
  const file = formData.get('file') as File | null;
  const projectId = formData.get('projectId') as string | null;
  const folderPath = (formData.get('folderPath') as string | null) || '/';
  const description = (formData.get('description') as string | null) || null;

  if (!file || !projectId) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'File and project ID are required.' } };
  }

  // Validate metadata through schema
  const validation = uploadFileSchema.safeParse({
    projectId,
    folderPath,
    description,
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
  });

  if (!validation.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: validation.error.errors[0]?.message || 'Invalid file upload.' },
    };
  }

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

  // Generate safe storage path: <projectId>/<uuid>_<sanitizedName>
  const safeName = sanitizeFileName(file.name);
  const fileUniqueId = crypto.randomUUID();
  const storagePath = `${projectId}/${fileUniqueId}_${safeName}`;

  // Upload to Supabase Storage
  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('workspace-files')
    .upload(storagePath, fileBuffer, {
      contentType: validation.data.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: uploadError.message || 'Failed to upload file to storage.' },
    };
  }

  // Record in project_files table
  const { data: fileRow, error: dbError } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      uploader_id: user.id,
      bucket_name: 'workspace-files',
      storage_path: storagePath,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: validation.data.mimeType,
      folder_path: validation.data.folderPath,
      description: validation.data.description,
    })
    .select('*')
    .single();

  if (dbError || !fileRow) {
    // Cleanup orphaned storage object
    await supabase.storage.from('workspace-files').remove([storagePath]);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: dbError?.message || 'Failed to save file metadata.' },
    };
  }

  await recordActivity(supabase, {
    projectId,
    actorId: user.id,
    action: 'file_uploaded',
    entityType: 'file',
    entityId: fileRow.id,
    metadata: { fileName: file.name, fileSize: file.size, folderPath },
  });

  revalidateFilesAndCode(context.projectSlug, 'files');
  return { success: true, data: fileRow as ProjectFile, message: 'File uploaded successfully.' };
}

export async function getProjectFileDownloadUrlAction(input: {
  fileId: string;
  projectId: string;
}): Promise<ActionResult<{ downloadUrl: string; fileName: string }>> {
  const validated = getDownloadUrlSchema.parse(input);
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

  const { data: file } = await supabase
    .from('project_files')
    .select('id, storage_path, file_name')
    .eq('id', validated.fileId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!file) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'File not found.' } };
  }

  // Create signed URL valid for 1 hour (3600 seconds)
  const { data: signedUrlData, error: signError } = await supabase.storage
    .from('workspace-files')
    .createSignedUrl(file.storage_path, 3600);

  if (signError || !signedUrlData?.signedUrl) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: signError?.message || 'Failed to generate download URL.' },
    };
  }

  return {
    success: true,
    data: {
      downloadUrl: signedUrlData.signedUrl,
      fileName: file.file_name,
    },
  };
}

export async function deleteProjectFileAction(input: {
  fileId: string;
  projectId: string;
}): Promise<ActionResult<void>> {
  const validated = deleteFileSchema.parse(input);
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

  const { data: file } = await supabase
    .from('project_files')
    .select('id, uploader_id, storage_path, file_name')
    .eq('id', validated.fileId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!file) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'File not found.' } };
  }

  if (file.uploader_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only the uploader or project admins can delete this file.' } };
  }

  // Remove from storage
  await supabase.storage.from('workspace-files').remove([file.storage_path]);

  // Remove from database
  const { error: dbError } = await supabase
    .from('project_files')
    .delete()
    .eq('id', validated.fileId);

  if (dbError) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: dbError.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'file_deleted',
    entityType: 'file',
    entityId: validated.fileId,
    metadata: { fileName: file.file_name },
  });

  revalidateFilesAndCode(context.projectSlug, 'files');
  return { success: true, data: undefined, message: 'File deleted.' };
}

// ==========================================
// CODE SNIPPETS ACTIONS
// ==========================================

export async function createCodeSnippetAction(
  rawInput: CreateSnippetInput
): Promise<ActionResult<CodeSnippet>> {
  const validated = createSnippetSchema.parse(rawInput);
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

  const { data: snippet, error } = await supabase
    .from('code_snippets')
    .insert({
      project_id: validated.projectId,
      author_id: user.id,
      title: validated.title,
      file_path: validated.filePath,
      language: validated.language,
      code_content: validated.codeContent,
    })
    .select('*')
    .single();

  if (error || !snippet) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create snippet.' } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'code_snippet_created',
    entityType: 'code_snippet',
    entityId: snippet.id,
    metadata: { title: validated.title, filePath: validated.filePath },
  });

  revalidateFilesAndCode(context.projectSlug, 'code');
  return { success: true, data: snippet as CodeSnippet, message: 'Code snippet saved.' };
}

export async function updateCodeSnippetAction(
  rawInput: UpdateSnippetInput
): Promise<ActionResult<CodeSnippet>> {
  const validated = updateSnippetSchema.parse(rawInput);
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
    .from('code_snippets')
    .select('id, author_id')
    .eq('id', validated.snippetId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Snippet not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admins can edit this snippet.' } };
  }

  const updateFields: Record<string, unknown> = {};
  if (validated.title !== undefined) updateFields.title = validated.title;
  if (validated.filePath !== undefined) updateFields.file_path = validated.filePath;
  if (validated.language !== undefined) updateFields.language = validated.language;
  if (validated.codeContent !== undefined) updateFields.code_content = validated.codeContent;

  const { data: updated, error } = await supabase
    .from('code_snippets')
    .update(updateFields)
    .eq('id', validated.snippetId)
    .select('*')
    .single();

  if (error || !updated) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update snippet.' } };
  }

  revalidateFilesAndCode(context.projectSlug, 'code');
  return { success: true, data: updated as CodeSnippet, message: 'Code snippet updated.' };
}

export async function deleteCodeSnippetAction(
  snippetId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const validated = deleteSnippetSchema.parse({ snippetId, projectId });
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
    .from('code_snippets')
    .select('id, author_id, title')
    .eq('id', validated.snippetId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Snippet not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admins can delete this snippet.' } };
  }

  const { error } = await supabase
    .from('code_snippets')
    .delete()
    .eq('id', validated.snippetId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'code_snippet_deleted',
    entityType: 'code_snippet',
    entityId: validated.snippetId,
    metadata: { title: existing.title },
  });

  revalidateFilesAndCode(context.projectSlug, 'code');
  return { success: true, data: undefined, message: 'Snippet deleted.' };
}

// ==========================================
// CODE REVIEWS ACTIONS
// ==========================================

export async function createCodeReviewAction(
  rawInput: CreateCodeReviewInput
): Promise<ActionResult<CodeReview>> {
  const validated = createCodeReviewSchema.parse(rawInput);
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

  // 1. Create code review header
  const { data: review, error: reviewError } = await supabase
    .from('code_reviews')
    .insert({
      project_id: validated.projectId,
      author_id: user.id,
      title: validated.title,
      summary: validated.summary,
      base_branch: validated.baseBranch,
      target_branch: validated.targetBranch,
      status: validated.status,
    })
    .select('*')
    .single();

  if (reviewError || !review) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: reviewError?.message || 'Failed to create code review.' },
    };
  }

  // 2. Insert changed files
  const fileRows = validated.files.map((f) => ({
    code_review_id: review.id,
    file_path: f.filePath,
    change_type: f.changeType,
    old_content: f.oldContent || null,
    new_content: f.newContent,
  }));

  const { error: filesError } = await supabase
    .from('code_review_files')
    .insert(fileRows);

  if (filesError) {
    // Delete orphan review
    await supabase.from('code_reviews').delete().eq('id', review.id);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: filesError.message || 'Failed to save review files.' },
    };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: validated.status === 'review' ? 'code_review_submitted' : 'code_change_created',
    entityType: 'code_review',
    entityId: review.id,
    metadata: { title: validated.title, fileCount: fileRows.length },
  });

  revalidateFilesAndCode(context.projectSlug, 'code');
  return { success: true, data: review as CodeReview, message: 'Code change submission created.' };
}

export async function updateCodeReviewAction(
  rawInput: UpdateCodeReviewInput
): Promise<ActionResult<CodeReview>> {
  const validated = updateCodeReviewSchema.parse(rawInput);
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
    .from('code_reviews')
    .select('id, author_id, status, title')
    .eq('id', validated.reviewId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Review not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admins can edit this review.' } };
  }

  const updateFields: Record<string, unknown> = {};
  if (validated.title !== undefined) updateFields.title = validated.title;
  if (validated.summary !== undefined) updateFields.summary = validated.summary;
  if (validated.baseBranch !== undefined) updateFields.base_branch = validated.baseBranch;
  if (validated.targetBranch !== undefined) updateFields.target_branch = validated.targetBranch;
  if (validated.status !== undefined) updateFields.status = validated.status;

  const { data: updated, error } = await supabase
    .from('code_reviews')
    .update(updateFields)
    .eq('id', validated.reviewId)
    .select('*')
    .single();

  if (error || !updated) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update review.' } };
  }

  if (validated.status === 'review' && existing.status !== 'review') {
    await recordActivity(supabase, {
      projectId: validated.projectId,
      actorId: user.id,
      action: 'code_review_submitted',
      entityType: 'code_review',
      entityId: validated.reviewId,
      metadata: { title: existing.title },
    });
  }

  revalidateFilesAndCode(context.projectSlug, 'code', `code/${validated.reviewId}`);
  return { success: true, data: updated as CodeReview, message: 'Review updated.' };
}

export async function submitReviewDecisionAction(
  rawInput: SubmitReviewDecisionInput
): Promise<ActionResult<CodeReview>> {
  const validated = submitReviewDecisionSchema.parse(rawInput);
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

  const { data: review } = await supabase
    .from('code_reviews')
    .select('id, author_id, status, title')
    .eq('id', validated.reviewId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!review) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Review not found.' } };
  }

  // Permission checks:
  // Authors cannot approve or merge their own review unless they are project owner/maintainer
  if (validated.decision === 'approved' || validated.decision === 'merged') {
    if (review.author_id === user.id && !context.isAdmin) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Review author cannot approve or merge their own changes.' },
      };
    }
  }

  // 1. Record decision in code_review_decisions
  await supabase.from('code_review_decisions').insert({
    code_review_id: validated.reviewId,
    reviewer_id: user.id,
    decision: validated.decision,
    notes: validated.notes || null,
  });

  // 2. Update review status
  const { data: updatedReview, error: updateError } = await supabase
    .from('code_reviews')
    .update({ status: validated.decision })
    .eq('id', validated.reviewId)
    .select('*')
    .single();

  if (updateError || !updatedReview) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: updateError?.message || 'Failed to update review status.' },
    };
  }

  // 3. Log activity
  let actionName = 'review_decision_submitted';
  if (validated.decision === 'approved') actionName = 'review_approved';
  else if (validated.decision === 'changes_requested') actionName = 'changes_requested';
  else if (validated.decision === 'merged') actionName = 'change_marked_merged';

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: actionName,
    entityType: 'code_review',
    entityId: validated.reviewId,
    metadata: { title: review.title, decision: validated.decision, notes: validated.notes },
  });

  revalidateFilesAndCode(context.projectSlug, 'code', `code/${validated.reviewId}`);
  return {
    success: true,
    data: updatedReview as CodeReview,
    message: `Review marked as ${validated.decision.replace('_', ' ')}.`,
  };
}

export async function addCodeReviewCommentAction(
  rawInput: AddCodeReviewCommentInput
): Promise<ActionResult<CodeReviewComment>> {
  const validated = addCodeReviewCommentSchema.parse(rawInput);
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

  const { data: comment, error } = await supabase
    .from('code_review_comments')
    .insert({
      code_review_id: validated.reviewId,
      code_review_file_id: validated.codeReviewFileId,
      author_id: user.id,
      line_number: validated.lineNumber || null,
      diff_side: validated.diffSide || null,
      content: validated.content,
      parent_comment_id: validated.parentCommentId || null,
      is_resolved: false,
    })
    .select('*')
    .single();

  if (error || !comment) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to post review comment.' },
    };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'review_comment_added',
    entityType: 'code_review',
    entityId: validated.reviewId,
    metadata: { lineNumber: validated.lineNumber },
  });

  revalidateFilesAndCode(context.projectSlug, 'code', `code/${validated.reviewId}`);
  return { success: true, data: comment as CodeReviewComment, message: 'Comment posted.' };
}

export async function resolveCodeReviewCommentAction(
  commentId: string,
  projectId: string,
  isResolved: boolean
): Promise<ActionResult<void>> {
  const validated = resolveCodeReviewCommentSchema.parse({ commentId, projectId, isResolved });
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
    .from('code_review_comments')
    .select('code_review_id')
    .eq('id', validated.commentId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Comment not found.' } };
  }

  const { error } = await supabase
    .from('code_review_comments')
    .update({ is_resolved: validated.isResolved })
    .eq('id', validated.commentId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  revalidateFilesAndCode(context.projectSlug, 'code', `code/${existing.code_review_id}`);
  return { success: true, data: undefined, message: validated.isResolved ? 'Resolved.' : 'Reopened.' };
}

export async function deleteCodeReviewCommentAction(
  commentId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const validated = deleteCodeReviewCommentSchema.parse({ commentId, projectId });
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
    .from('code_review_comments')
    .select('id, author_id, code_review_id')
    .eq('id', validated.commentId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Comment not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admin can delete this comment.' } };
  }

  const { error } = await supabase
    .from('code_review_comments')
    .delete()
    .eq('id', validated.commentId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  revalidateFilesAndCode(context.projectSlug, 'code', `code/${existing.code_review_id}`);
  return { success: true, data: undefined, message: 'Comment deleted.' };
}

export async function deleteCodeReviewAction(
  reviewId: string,
  projectId: string
): Promise<ActionResult<void>> {
  const validated = deleteCodeReviewSchema.parse({ reviewId, projectId });
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
    .from('code_reviews')
    .select('id, author_id, title')
    .eq('id', validated.reviewId)
    .eq('project_id', validated.projectId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Review not found.' } };
  }

  if (existing.author_id !== user.id && !context.isAdmin) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only author or admins can delete this review.' } };
  }

  const { error } = await supabase
    .from('code_reviews')
    .delete()
    .eq('id', validated.reviewId);

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
  }

  await recordActivity(supabase, {
    projectId: validated.projectId,
    actorId: user.id,
    action: 'code_review_deleted',
    entityType: 'code_review',
    entityId: validated.reviewId,
    metadata: { title: existing.title },
  });

  revalidateFilesAndCode(context.projectSlug, 'code');
  return { success: true, data: undefined, message: 'Code review deleted.' };
}
