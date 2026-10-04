'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createProjectSchema,
  updateProjectSchema,
  projectRoleInputSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ProjectRoleInput,
} from '@/lib/validators/project';
import type { ActionResult } from '@/types/api';
import type { Project, ProjectRole } from '@/types/database';
import { revalidatePath } from 'next/cache';

/**
 * Creates a new project, establishes the creator as the verified owner,
 * creates open roles, and links chosen technologies.
 */
export async function createProjectAction(
  input: CreateProjectInput
): Promise<ActionResult<Project>> {
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
        message: 'You must be signed in to create a project.',
      },
    };
  }

  const result = createProjectSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid project data provided.',
        details: result.error.flatten().fieldErrors,
      },
    };
  }

  const validated = result.data;

  // 1. Verify slug uniqueness
  const { data: existingSlug } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', validated.slug)
    .maybeSingle();

  if (existingSlug) {
    return {
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'A project with this URL slug already exists. Please choose a different slug.',
        details: { slug: ['Slug is already taken'] },
      },
    };
  }

  // 2. Insert into projects
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      title: validated.title,
      slug: validated.slug,
      tagline: validated.tagline,
      description: validated.description,
      problem_statement: validated.problemStatement,
      proposed_solution: validated.proposedSolution,
      category: validated.category,
      stage: validated.stage,
      visibility: validated.visibility,
      collaboration_type: validated.collaborationType,
      owner_id: user.id, // Strictly derived server-side
    })
    .select()
    .single();

  if (projectError || !project) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: projectError?.message || 'Failed to create project record.',
      },
    };
  }

  // 3. Automatically add creator as the project owner in project_members
  const { error: memberError } = await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    console.error('Error adding creator to project_members:', memberError);
  }

  // 4. Insert defined contributor roles
  if (validated.roles.length > 0) {
    const roleRows = validated.roles.map((role) => ({
      project_id: project.id,
      title: role.title,
      description: role.description,
      required_skills: role.requiredSkills,
      capacity_count: role.capacityCount,
      commitment_hours_per_week: role.commitmentHours,
      status: 'open',
    }));

    const { error: rolesError } = await supabase.from('project_roles').insert(roleRows);
    if (rolesError) {
      console.error('Error inserting project roles:', rolesError);
    }
  }

  // 5. Insert project technologies
  if (validated.technologyIds.length > 0) {
    const techRows = validated.technologyIds.map((techId) => ({
      project_id: project.id,
      technology_id: techId,
    }));

    const { error: techError } = await supabase.from('project_technologies').insert(techRows);
    if (techError) {
      console.error('Error linking project technologies:', techError);
    }
  }

  // 6. Insert initial goals if specified
  if (validated.initialGoals.length > 0) {
    const goalRows = validated.initialGoals.map((g) => ({
      project_id: project.id,
      title: g,
      created_by: user.id,
    }));
    await supabase.from('goals').insert(goalRows);
  }

  revalidatePath('/explore');
  revalidatePath('/dashboard');
  revalidatePath(`/projects/${project.slug}`);

  return {
    success: true,
    data: project as Project,
    message: 'Project created successfully!',
  };
}

/**
 * Updates project settings and metadata. Protected by owner / maintainer permissions.
 */
export async function updateProjectAction(
  input: UpdateProjectInput
): Promise<ActionResult<Project>> {
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

  const result = updateProjectSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid project update data.',
        details: result.error.flatten().fieldErrors,
      },
    };
  }

  const validated = result.data;

  // Authorization check: Verify caller is owner or maintainer
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', validated.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || (member.role !== 'owner' && member.role !== 'maintainer')) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this project.',
      },
    };
  }

  // Update projects table
  const { data: updatedProject, error: updateError } = await supabase
    .from('projects')
    .update({
      title: validated.title,
      tagline: validated.tagline,
      description: validated.description,
      problem_statement: validated.problemStatement,
      proposed_solution: validated.proposedSolution,
      category: validated.category,
      stage: validated.stage,
      visibility: validated.visibility,
      collaboration_type: validated.collaborationType,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.id)
    .select()
    .single();

  if (updateError || !updatedProject) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: updateError?.message || 'Failed to update project.',
      },
    };
  }

  // Sync project_technologies
  await supabase.from('project_technologies').delete().eq('project_id', validated.id);
  if (validated.technologyIds.length > 0) {
    const techRows = validated.technologyIds.map((techId) => ({
      project_id: validated.id,
      technology_id: techId,
    }));
    await supabase.from('project_technologies').insert(techRows);
  }

  revalidatePath(`/projects/${updatedProject.slug}`);
  revalidatePath('/explore');

  return {
    success: true,
    data: updatedProject as Project,
    message: 'Project updated successfully.',
  };
}

/**
 * Adds an open role to a project. Protected by project admin authorization.
 */
export async function addProjectRoleAction(
  projectId: string,
  input: ProjectRoleInput
): Promise<ActionResult<ProjectRole>> {
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

  const result = projectRoleInputSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid role data.',
        details: result.error.flatten().fieldErrors,
      },
    };
  }

  const validated = result.data;

  // Verify project admin role
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || (member.role !== 'owner' && member.role !== 'maintainer')) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions to add roles.' },
    };
  }

  const { data: role, error } = await supabase
    .from('project_roles')
    .insert({
      project_id: projectId,
      title: validated.title,
      description: validated.description,
      required_skills: validated.requiredSkills,
      capacity_count: validated.capacityCount,
      commitment_hours_per_week: validated.commitmentHours,
      status: 'open',
    })
    .select()
    .single();

  if (error || !role) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to add role.' },
    };
  }

  revalidatePath('/explore');

  return {
    success: true,
    data: role as ProjectRole,
    message: 'Role added successfully.',
  };
}

/**
 * Deletes a project. Strictly limited to the project owner.
 */
export async function deleteProjectAction(projectId: string): Promise<ActionResult<void>> {
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

  // Verify ownership
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id, slug')
    .eq('id', projectId)
    .maybeSingle();

  if (!project || project.owner_id !== user.id) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only the project owner can delete this project.' },
    };
  }

  const { error } = await supabase.from('projects').delete().eq('id', projectId);

  if (error) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    };
  }

  revalidatePath('/explore');
  revalidatePath('/dashboard');

  return {
    success: true,
    data: undefined,
    message: 'Project deleted.',
  };
}
