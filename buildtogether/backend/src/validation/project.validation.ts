import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    tagline: z.string().min(10).max(200),
    description: z.string().min(50).max(5000),
    long_description: z.string().max(50000).optional(),
    problem_statement: z.string().max(5000).optional(),
    solution: z.string().max(5000).optional(),
    tech_stack: z.array(z.string()).min(1).max(30),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    status: z.enum(['ideation', 'planning', 'in_progress', 'testing', 'launched', 'on_hold', 'completed']),
    visibility: z.enum(['public', 'private']),
    estimated_duration: z.string().max(50).optional(),
    repository_url: z.string().url().optional().or(z.literal('')),
    live_demo_url: z.string().url().optional().or(z.literal('')),
    discord_url: z.string().url().optional().or(z.literal('')),
    figma_url: z.string().url().optional().or(z.literal('')),
    video_demo_url: z.string().url().optional().or(z.literal('')),
    tags: z.array(z.string()).max(15),
    categories: z.array(z.string()).max(5),
    max_team_size: z.number().int().min(2).max(50),
    is_open_source: z.boolean(),
    roles: z.array(
      z.object({
        title: z.enum([
          'frontend_developer',
          'backend_developer',
          'full_stack_developer',
          'ui_designer',
          'ux_designer',
          'flutter_developer',
          'react_native_developer',
          'ai_engineer',
          'devops',
          'qa',
          'project_manager',
        ]),
        description: z.string().min(20).max(1000),
        required_skills: z.array(z.string()).min(1).max(20),
        experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
        vacancies: z.number().int().min(1).max(10),
        priority: z.number().int().min(1).max(10),
      })
    ).min(1),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    tagline: z.string().min(10).max(200).optional(),
    description: z.string().min(50).max(5000).optional(),
    long_description: z.string().max(50000).optional(),
    problem_statement: z.string().max(5000).optional(),
    solution: z.string().max(5000).optional(),
    tech_stack: z.array(z.string()).max(30).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    status: z.enum(['ideation', 'planning', 'in_progress', 'testing', 'launched', 'on_hold', 'completed']).optional(),
    visibility: z.enum(['public', 'private']).optional(),
    estimated_duration: z.string().max(50).optional(),
    repository_url: z.string().url().optional().or(z.literal('')),
    live_demo_url: z.string().url().optional().or(z.literal('')),
    discord_url: z.string().url().optional().or(z.literal('')),
    figma_url: z.string().url().optional().or(z.literal('')),
    video_demo_url: z.string().url().optional().or(z.literal('')),
    tags: z.array(z.string()).max(15).optional(),
    categories: z.array(z.string()).max(5).optional(),
    max_team_size: z.number().int().min(2).max(50).optional(),
    is_open_source: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const applyToProjectSchema = z.object({
  body: z.object({
    role_id: z.string().uuid(),
    introduction: z.string().min(50).max(2000),
    why_join: z.string().min(50).max(2000),
    github_url: z.string().url().optional().or(z.literal('')),
    portfolio_url: z.string().url().optional().or(z.literal('')),
    hours_per_week: z.number().int().min(1).max(80),
    previous_projects: z.array(z.string().url()).max(10),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const projectIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
