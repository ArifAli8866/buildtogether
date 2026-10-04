'use server';

import { createClient } from '@/lib/supabase/server';
import {
  submitContributionSchema,
  reviewContributionSchema,
  manageMemberRoleSchema,
  removeMemberSchema,
  type SubmitContributionInput,
  type ReviewContributionInput,
  type ManageMemberRoleInput,
  type RemoveMemberInput,
} from '@/lib/validators/contribution';
import type { ActionResult } from '@/types/api';
import type { ContributionRequest, ProjectMember } from '@/types/database';
import { revalidatePath } from 'next/cache';

/**
 * Submits a new contribution request to a project.
 * Enforces server-side authentication, checks project access, prevents duplicate active
 * requests, and prevents project owners or existing members from applying.
 */
export async function submitContributionRequestAction(
  input: SubmitContributionInput
): Promise<ActionResult<ContributionRequest>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'You must be signed in to apply to contribute.',
      },
    };
  }

  const result = submitContributionSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid application data provided.',
        details: result.error.flatten().fieldErrors,
      },
    };
  }

  const validated = result.data;

  // 1. Check project exists and get its metadata
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, slug, owner_id, visibility')
    .eq('id', validated.projectId)
    .maybeSingle();

  if (projectError || !project) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Project not found.',
      },
    };
  }

  // 2. Prevent project owner from applying to their own project
  if (project.owner_id === user.id) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'You are the owner of this project and cannot apply to contribute.',
      },
    };
  }

  // 3. Prevent existing project members from applying
  const { data: existingMember } = await supabase
    .from('project_members')
    .select('id, role')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMember) {
    return {
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'You are already a member of this project.',
      },
    };
  }

  // 4. Prevent duplicate active requests (pending or under_review)
  const { data: activeRequest } = await supabase
    .from('contribution_requests')
    .select('id, status')
    .eq('project_id', project.id)
    .eq('applicant_id', user.id)
    .in('status', ['pending', 'under_review'])
    .maybeSingle();

  if (activeRequest) {
    return {
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'You already have an active application pending review for this project.',
      },
    };
  }

  // 5. Validate requested role if provided
  if (validated.projectRoleId) {
    const { data: roleData } = await supabase
      .from('project_roles')
      .select('id, project_id, status, capacity_count, filled_count')
      .eq('id', validated.projectRoleId)
      .maybeSingle();

    if (!roleData || roleData.project_id !== project.id) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The selected role does not belong to this project.',
        },
      };
    }

    if (roleData.status !== 'open' || roleData.filled_count >= roleData.capacity_count) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The selected role has already been filled.',
        },
      };
    }
  }

  // 6. Insert into contribution_requests (applicant_id strictly server-derived)
  const { data: request, error: insertError } = await supabase
    .from('contribution_requests')
    .insert({
      project_id: project.id,
      project_role_id: validated.projectRoleId || null,
      applicant_id: user.id,
      pitch: validated.pitch,
      portfolio_links: validated.portfolioLinks,
      weekly_hours: validated.weeklyHours,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError || !request) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: insertError?.message || 'Failed to submit contribution request.',
      },
    };
  }

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath(`/projects/${project.slug}/team`);
  revalidatePath('/dashboard');

  return {
    success: true,
    data: request as ContributionRequest,
    message: 'Your contribution request has been submitted!',
  };
}

/**
 * Reviews a contribution request (accept, reject, put under review).
 * Strictly restricted to project owners and maintainers.
 * Trigger `trg_contribution_accepted` atomically creates project membership upon acceptance.
 */
export async function reviewContributionRequestAction(
  input: ReviewContributionInput
): Promise<ActionResult<ContributionRequest>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in to review applications.' },
    };
  }

  const result = reviewContributionSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid review parameters.',
        details: result.error.flatten().fieldErrors,
      },
    };
  }

  const validated = result.data;

  // 1. Fetch the request
  const { data: request, error: reqError } = await supabase
    .from('contribution_requests')
    .select('*, project:projects(slug)')
    .eq('id', validated.requestId)
    .maybeSingle();

  if (reqError || !request) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Contribution request not found.' },
    };
  }

  // 2. Authorization check: Must be project owner or maintainer
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', request.project_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || (member.role !== 'owner' && member.role !== 'maintainer')) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to review contribution requests for this project.',
      },
    };
  }

  // 3. Status check: Cannot re-review already decided/withdrawn requests
  if (
    request.status === 'accepted' ||
    request.status === 'rejected' ||
    request.status === 'withdrawn'
  ) {
    return {
      success: false,
      error: {
        code: 'CONFLICT',
        message: `This application has already been ${request.status}.`,
      },
    };
  }

  // 4. Update the request status
  const { data: updatedRequest, error: updateError } = await supabase
    .from('contribution_requests')
    .update({
      status: validated.decision,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: validated.reviewNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.requestId)
    .select()
    .single();

  if (updateError || !updatedRequest) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: updateError?.message || 'Failed to update application review state.',
      },
    };
  }

  // 5. If accepted, verify/guarantee project membership is present (trigger fallback)
  if (validated.decision === 'accepted') {
    const { data: existingMembership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', request.project_id)
      .eq('user_id', request.applicant_id)
      .maybeSingle();

    if (!existingMembership) {
      await supabase.from('project_members').insert({
        project_id: request.project_id,
        user_id: request.applicant_id,
        project_role_id: request.project_role_id || null,
        role: 'contributor',
      });
    }
  }

  const projectSlug = (request.project as { slug?: string })?.slug;
  if (projectSlug) {
    revalidatePath(`/projects/${projectSlug}`);
    revalidatePath(`/projects/${projectSlug}/team`);
  }
  revalidatePath('/dashboard');

  return {
    success: true,
    data: updatedRequest as ContributionRequest,
    message: `Application marked as ${validated.decision}.`,
  };
}

/**
 * Withdraws a pending or under-review contribution request.
 * Strictly restricted to the original applicant.
 */
export async function withdrawContributionRequestAction(
  requestId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in to withdraw an application.' },
    };
  }

  // Fetch request and verify applicant identity
  const { data: request, error: reqError } = await supabase
    .from('contribution_requests')
    .select('*, project:projects(slug)')
    .eq('id', requestId)
    .maybeSingle();

  if (reqError || !request) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Contribution request not found.' },
    };
  }

  if (request.applicant_id !== user.id) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only withdraw your own applications.',
      },
    };
  }

  if (request.status !== 'pending' && request.status !== 'under_review') {
    return {
      success: false,
      error: {
        code: 'CONFLICT',
        message: `Cannot withdraw an application that is already ${request.status}.`,
      },
    };
  }

  const { error: updateError } = await supabase
    .from('contribution_requests')
    .update({
      status: 'withdrawn',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: updateError.message },
    };
  }

  const projectSlug = (request.project as { slug?: string })?.slug;
  if (projectSlug) {
    revalidatePath(`/projects/${projectSlug}`);
    revalidatePath(`/projects/${projectSlug}/team`);
  }
  revalidatePath('/dashboard');

  return {
    success: true,
    data: undefined,
    message: 'Application withdrawn.',
  };
}

/**
 * Updates a member's role (maintainer, contributor, viewer).
 * Protected by project admin permissions; project owner role cannot be altered.
 */
export async function updateProjectMemberRoleAction(
  input: ManageMemberRoleInput
): Promise<ActionResult<ProjectMember>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' },
    };
  }

  const result = manageMemberRoleSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid role update data.' },
    };
  }

  const validated = result.data;

  // Caller authorization: must be owner or maintainer
  const { data: callerMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', validated.projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!callerMember || (callerMember.role !== 'owner' && callerMember.role !== 'maintainer')) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to manage member roles.' },
    };
  }

  // Fetch target member
  const { data: targetMember } = await supabase
    .from('project_members')
    .select('*, project:projects(slug, owner_id)')
    .eq('id', validated.memberId)
    .maybeSingle();

  if (!targetMember || targetMember.project_id !== validated.projectId) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Project member not found.' },
    };
  }

  // Invariant: The project owner role can never be changed
  if (targetMember.role === 'owner') {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'The project owner role cannot be modified.' },
    };
  }

  // Invariant: Only the project owner can promote/demote maintainers
  if (
    (validated.newRole === 'maintainer' || targetMember.role === 'maintainer') &&
    callerMember.role !== 'owner'
  ) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only the project owner can manage maintainer roles.' },
    };
  }

  const { data: updatedMember, error: updateError } = await supabase
    .from('project_members')
    .update({ role: validated.newRole })
    .eq('id', validated.memberId)
    .select()
    .single();

  if (updateError || !updatedMember) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: updateError?.message || 'Failed to update role.' },
    };
  }

  const projectSlug = (targetMember.project as { slug?: string })?.slug;
  if (projectSlug) {
    revalidatePath(`/projects/${projectSlug}`);
    revalidatePath(`/projects/${projectSlug}/team`);
  }

  return {
    success: true,
    data: updatedMember as ProjectMember,
    message: `Member role updated to ${validated.newRole}.`,
  };
}

/**
 * Removes a member from a project.
 * Project owner cannot be removed.
 */
export async function removeProjectMemberAction(
  input: RemoveMemberInput
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' },
    };
  }

  const result = removeMemberSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid member removal data.' },
    };
  }

  const validated = result.data;

  // Caller authorization: must be owner or maintainer
  const { data: callerMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', validated.projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!callerMember || (callerMember.role !== 'owner' && callerMember.role !== 'maintainer')) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to remove members.' },
    };
  }

  // Fetch target member
  const { data: targetMember } = await supabase
    .from('project_members')
    .select('*, project:projects(slug)')
    .eq('id', validated.memberId)
    .maybeSingle();

  if (!targetMember || targetMember.project_id !== validated.projectId) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Project member not found.' },
    };
  }

  // Invariant: Cannot remove the project owner
  if (targetMember.role === 'owner') {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'The project owner cannot be removed from the project.' },
    };
  }

  // Invariant: Maintainers cannot remove other maintainers
  if (targetMember.role === 'maintainer' && callerMember.role !== 'owner') {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only the project owner can remove maintainers.' },
    };
  }

  const { error: deleteError } = await supabase
    .from('project_members')
    .delete()
    .eq('id', validated.memberId);

  if (deleteError) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: deleteError.message },
    };
  }

  const projectSlug = (targetMember.project as { slug?: string })?.slug;
  if (projectSlug) {
    revalidatePath(`/projects/${projectSlug}`);
    revalidatePath(`/projects/${projectSlug}/team`);
  }

  return {
    success: true,
    data: undefined,
    message: 'Member removed from project.',
  };
}

/**
 * Allows a member to voluntarily leave a project.
 * The project owner cannot leave without transferring ownership or deleting the project.
 */
export async function leaveProjectAction(projectId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' },
    };
  }

  const { data: member } = await supabase
    .from('project_members')
    .select('id, role, project:projects(slug)')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'You are not a member of this project.' },
    };
  }

  if (member.role === 'owner') {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'The project owner cannot leave the project.',
      },
    };
  }

  const { error } = await supabase.from('project_members').delete().eq('id', member.id);

  if (error) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    };
  }

  const projectSlug = (member.project as { slug?: string })?.slug;
  if (projectSlug) {
    revalidatePath(`/projects/${projectSlug}`);
    revalidatePath(`/projects/${projectSlug}/team`);
  }
  revalidatePath('/dashboard');

  return {
    success: true,
    data: undefined,
    message: 'You have left the project.',
  };
}
