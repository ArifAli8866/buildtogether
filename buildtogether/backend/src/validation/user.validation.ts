import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    full_name: z.string().min(2).max(100).optional(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
    bio: z.string().max(1000).optional(),
    country: z.string().max(100).optional(),
    website: z.string().url().optional().or(z.literal('')),
    github_url: z.string().url().optional().or(z.literal('')),
    linkedin_url: z.string().url().optional().or(z.literal('')),
    portfolio_url: z.string().url().optional().or(z.literal('')),
    availability: z.enum(['full_time', 'part_time', 'weekends', 'flexible', 'not_available']).optional(),
    timezone: z.string().max(50).optional(),
    years_of_experience: z.number().int().min(0).max(50).optional(),
    experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    skills: z.array(z.string()).max(50).optional(),
    tech_stack: z.array(z.string()).max(50).optional(),
    languages: z.array(z.string()).max(20).optional(),
  }),
});

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const usernameSchema = z.object({
  params: z.object({
    username: z.string().min(3).max(30),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1).max(100).optional(),
    skills: z.string().optional(),
    experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    availability: z.enum(['full_time', 'part_time', 'weekends', 'flexible', 'not_available']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});
