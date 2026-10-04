'use server';

import { createClient } from '@/lib/supabase/server';
import {
  updateProfileSchema,
  addExperienceSchema,
  type UpdateProfileInput,
  type AddExperienceInput,
} from '@/lib/validators/profile';
import type { ActionResult } from '@/types/api';
import type { Profile, ProfileExperience } from '@/types/database';
import { revalidatePath } from 'next/cache';

/**
 * Updates the authenticated user's profile, including skills and technologies.
 */
export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<ActionResult<Profile>> {
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
        message: 'You must be signed in to update your profile.',
      },
    };
  }

  const result = updateProfileSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid profile data provided.',
        details: result.error.flatten().fieldErrors,
      },
    };
  }

  const validated = result.data;

  // Verify username uniqueness if changed
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', validated.username)
    .neq('id', user.id)
    .maybeSingle();

  if (existingUser) {
    return {
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Username is already taken by another developer.',
        details: { username: ['Username is already taken'] },
      },
    };
  }

  // 1. Update profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({
      username: validated.username,
      full_name: validated.fullName,
      headline: validated.headline || null,
      bio: validated.bio || null,
      location: validated.location || null,
      timezone: validated.timezone,
      availability_hours_per_week: validated.availabilityHours,
      github_username: validated.githubUsername || null,
      portfolio_url: validated.portfolioUrl || null,
      social_links: validated.socialLinks || {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: profileError?.message || 'Failed to update profile.',
      },
    };
  }

  // 2. Sync profile_skills (atomic replace)
  await supabase.from('profile_skills').delete().eq('profile_id', user.id);
  if (validated.skillIds.length > 0) {
    const skillRows = validated.skillIds.map((skill_id) => ({
      profile_id: user.id,
      skill_id,
    }));
    const { error: skillsError } = await supabase.from('profile_skills').insert(skillRows);
    if (skillsError) {
      console.error('Error syncing profile skills:', skillsError);
    }
  }

  // 3. Sync profile_technologies (atomic replace)
  await supabase.from('profile_technologies').delete().eq('profile_id', user.id);
  if (validated.technologyIds.length > 0) {
    const techRows = validated.technologyIds.map((technology_id) => ({
      profile_id: user.id,
      technology_id,
    }));
    const { error: techError } = await supabase.from('profile_technologies').insert(techRows);
    if (techError) {
      console.error('Error syncing profile technologies:', techError);
    }
  }

  revalidatePath(`/developers/${validated.username}`);
  revalidatePath('/settings/profile');
  revalidatePath('/dashboard');

  return {
    success: true,
    data: profile as Profile,
    message: 'Profile updated successfully.',
  };
}

/**
 * Adds a new experience entry to the authenticated user's portfolio.
 */
export async function addExperienceAction(
  input: AddExperienceInput
): Promise<ActionResult<ProfileExperience>> {
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
        message: 'You must be signed in to add work experience.',
      },
    };
  }

  const result = addExperienceSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid experience data provided.',
        details: result.error.flatten().fieldErrors,
      },
    };
  }

  const validated = result.data;

  const { data: experience, error } = await supabase
    .from('profile_experiences')
    .insert({
      profile_id: user.id,
      title: validated.title,
      company_or_project: validated.companyOrProject,
      start_date: validated.startDate,
      end_date: validated.isCurrent ? null : validated.endDate || null,
      is_current: validated.isCurrent,
      description: validated.description || null,
    })
    .select()
    .single();

  if (error || !experience) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || 'Failed to add experience entry.',
      },
    };
  }

  revalidatePath('/settings/profile');

  return {
    success: true,
    data: experience as ProfileExperience,
    message: 'Experience added successfully.',
  };
}

/**
 * Deletes an experience entry belonging to the authenticated user.
 */
export async function deleteExperienceAction(
  experienceId: string
): Promise<ActionResult<void>> {
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
        message: 'You must be signed in.',
      },
    };
  }

  const { error } = await supabase
    .from('profile_experiences')
    .delete()
    .eq('id', experienceId)
    .eq('profile_id', user.id);

  if (error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to remove experience.',
      },
    };
  }

  revalidatePath('/settings/profile');

  return {
    success: true,
    data: undefined,
    message: 'Experience removed.',
  };
}

/**
 * Uploads a profile avatar to Supabase Storage and updates the user's avatar_url.
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<ActionResult<{ avatarUrl: string }>> {
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
        message: 'You must be signed in to upload an avatar.',
      },
    };
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'No file provided.',
      },
    };
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Avatar file size must be less than 2MB.',
      },
    };
  }

  // Validate file MIME type
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid file format. Please upload a PNG, JPEG, or WebP image.',
      },
    };
  }

  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: uploadError.message || 'Failed to upload avatar to storage.',
      },
    };
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const avatarUrl = urlData.publicUrl;

  // Update profile record with new avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateError) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Avatar uploaded but failed to update profile record.',
      },
    };
  }

  revalidatePath('/settings/profile');
  revalidatePath('/dashboard');

  return {
    success: true,
    data: { avatarUrl },
    message: 'Avatar updated successfully.',
  };
}
