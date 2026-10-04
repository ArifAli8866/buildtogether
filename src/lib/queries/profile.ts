import { createClient } from '@/lib/supabase/server';
import type { Profile, ProfileExperience, Skill, Technology } from '@/types/database';

/**
 * Retrieves the currently authenticated Supabase user and their profile.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile: profile as Profile | null };
}

/**
 * Retrieves a developer profile by unique username, along with their skills, technologies, and experiences.
 */
export async function getProfileByUsername(username: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  // Fetch experiences
  const { data: experiences } = await supabase
    .from('profile_experiences')
    .select('*')
    .eq('profile_id', profile.id)
    .order('start_date', { ascending: false });

  // Fetch associated skills
  const { data: profileSkills } = await supabase
    .from('profile_skills')
    .select('skill_id, skills(id, name, category)')
    .eq('profile_id', profile.id);

  // Fetch associated technologies
  const { data: profileTechs } = await supabase
    .from('profile_technologies')
    .select('technology_id, technologies(id, name, icon)')
    .eq('profile_id', profile.id);

  const skills = (profileSkills || [])
    .map((ps: Record<string, unknown>) => ps.skills as Skill)
    .filter(Boolean);

  const technologies = (profileTechs || [])
    .map((pt: Record<string, unknown>) => pt.technologies as Technology)
    .filter(Boolean);

  return {
    profile: profile as Profile,
    experiences: (experiences || []) as ProfileExperience[],
    skills,
    technologies,
  };
}

/**
 * Fetches all available skills from the standard taxonomy.
 */
export async function getAllSkills(): Promise<Skill[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('skills')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  return (data || []) as Skill[];
}

/**
 * Fetches all available technologies from the standard taxonomy.
 */
export async function getAllTechnologies(): Promise<Technology[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('technologies')
    .select('*')
    .order('name', { ascending: true });

  return (data || []) as Technology[];
}
