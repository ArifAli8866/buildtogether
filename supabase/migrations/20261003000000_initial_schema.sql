-- ==============================================================================
-- Build Together — Initial Database Schema Migration
-- Migration: 20261003000000_initial_schema.sql
-- PostgreSQL Version: 15+ (Supabase)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
CREATE TYPE project_stage AS ENUM ('idea', 'planning', 'in_development', 'testing', 'shipped');
CREATE TYPE project_visibility AS ENUM ('public', 'private');
CREATE TYPE project_member_role AS ENUM ('owner', 'maintainer', 'contributor', 'viewer');
CREATE TYPE project_role_status AS ENUM ('open', 'filled', 'closed');
CREATE TYPE contribution_request_status AS ENUM ('pending', 'under_review', 'info_requested', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE code_review_status AS ENUM ('draft', 'review', 'changes_requested', 'approved', 'merged');
CREATE TYPE code_review_change_type AS ENUM ('added', 'modified', 'deleted');
CREATE TYPE community_post_type AS ENUM (
  'project_announcement',
  'recruitment',
  'technical_discussion',
  'project_update',
  'question',
  'achievement',
  'learning'
);
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
CREATE TYPE canvas_item_type AS ENUM ('sticky_note', 'idea', 'risk', 'tech_stack', 'decision');

-- 3. TABLES: IDENTITY & TAXONOMY

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  headline TEXT,
  bio TEXT,
  location TEXT,
  timezone TEXT DEFAULT 'UTC',
  availability_hours_per_week INTEGER DEFAULT 10 CHECK (availability_hours_per_week >= 0),
  github_username TEXT,
  portfolio_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT username_length_check CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format_check CHECK (username ~* '^[a-zA-Z0-9_-]+$')
);

CREATE INDEX idx_profiles_username ON public.profiles(username);

CREATE TABLE public.profile_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_or_project TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_profile_experiences_profile ON public.profile_experiences(profile_id);

CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.profile_skills (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, skill_id)
);

CREATE TABLE public.profile_technologies (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technology_id UUID NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, technology_id)
);

CREATE TABLE public.user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT unique_connection_pair UNIQUE (requester_id, recipient_id),
  CONSTRAINT no_self_connection CHECK (requester_id <> recipient_id)
);

CREATE INDEX idx_user_connections_requester ON public.user_connections(requester_id);
CREATE INDEX idx_user_connections_recipient ON public.user_connections(recipient_id);

-- 4. TABLES: PROJECTS & TEAMS

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  proposed_solution TEXT NOT NULL,
  category TEXT NOT NULL,
  stage project_stage NOT NULL DEFAULT 'idea',
  visibility project_visibility NOT NULL DEFAULT 'public',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  logo_url TEXT,
  banner_url TEXT,
  tsv TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(problem_statement, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'D')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT project_slug_format CHECK (slug ~* '^[a-z0-9-]+$')
);

CREATE INDEX idx_projects_slug ON public.projects(slug);
CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_category ON public.projects(category);
CREATE INDEX idx_projects_stage ON public.projects(stage);
CREATE INDEX idx_projects_tsv ON public.projects USING GIN(tsv);

CREATE TABLE public.project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills JSONB DEFAULT '[]'::jsonb,
  capacity_count INTEGER NOT NULL DEFAULT 1 CHECK (capacity_count > 0),
  filled_count INTEGER NOT NULL DEFAULT 0 CHECK (filled_count >= 0),
  commitment_hours_per_week INTEGER DEFAULT 10,
  status project_role_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_project_roles_project ON public.project_roles(project_id);

CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL,
  role project_member_role NOT NULL DEFAULT 'contributor',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);

CREATE TABLE public.contribution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pitch TEXT NOT NULL,
  portfolio_links JSONB DEFAULT '[]'::jsonb,
  weekly_hours INTEGER NOT NULL CHECK (weekly_hours > 0),
  status contribution_request_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_contribution_requests_project ON public.contribution_requests(project_id);
CREATE INDEX idx_contribution_requests_applicant ON public.contribution_requests(applicant_id);

-- 5. TABLES: PLANNING & EXECUTION

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_goals_project ON public.goals(project_id);

CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_milestones_project ON public.milestones(project_id);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  estimate_hours NUMERIC(5, 1) CHECK (estimate_hours >= 0),
  due_date DATE,
  position DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
  labels TEXT[] DEFAULT '{}',
  tsv TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(project_id, status);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_tsv ON public.tasks USING GIN(tsv);

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);

-- 6. TABLES: COLLABORATION & CANVAS

CREATE TABLE public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_discussions_project ON public.discussions(project_id);

CREATE TABLE public.discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_discussion_comments_discussion ON public.discussion_comments(discussion_id);

CREATE TABLE public.project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_project_notes_project ON public.project_notes(project_id);

CREATE TABLE public.project_canvas_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  item_type canvas_item_type NOT NULL DEFAULT 'sticky_note',
  content TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#fef08a',
  position_x DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_project_canvas_items_project ON public.project_canvas_items(project_id);

CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  bucket_name TEXT NOT NULL DEFAULT 'workspace-files',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_project_files_project ON public.project_files(project_id);

-- 7. TABLES: CODE WORKSPACE & CODE REVIEWS

CREATE TABLE public.code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'typescript',
  code_content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_code_snippets_project ON public.code_snippets(project_id);

CREATE TABLE public.code_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'main',
  target_branch TEXT NOT NULL,
  status code_review_status NOT NULL DEFAULT 'draft',
  github_pr_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_code_reviews_project ON public.code_reviews(project_id);

CREATE TABLE public.code_review_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_review_id UUID NOT NULL REFERENCES public.code_reviews(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  change_type code_review_change_type NOT NULL DEFAULT 'modified',
  old_content TEXT,
  new_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_code_review_files_review ON public.code_review_files(code_review_id);

CREATE TABLE public.code_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_review_id UUID NOT NULL REFERENCES public.code_reviews(id) ON DELETE CASCADE,
  code_review_file_id UUID NOT NULL REFERENCES public.code_review_files(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  line_number INTEGER,
  diff_side TEXT CHECK (diff_side IN ('left', 'right')),
  content TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_code_review_comments_review ON public.code_review_comments(code_review_id);

CREATE TABLE public.project_github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  connected_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  repo_id BIGINT NOT NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  encrypted_access_token TEXT NOT NULL,
  webhook_id BIGINT,
  sync_status TEXT NOT NULL DEFAULT 'connected',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_project_github_repos_project ON public.project_github_repos(project_id);

-- 8. TABLES: COMMUNITY FEED, NOTIFICATIONS & AUDIT

CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  post_type community_post_type NOT NULL DEFAULT 'technical_discussion',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_community_posts_author ON public.community_posts(author_id);
CREATE INDEX idx_community_posts_created ON public.community_posts(created_at DESC);

CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_post_comments_post ON public.post_comments(post_id);

CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE public.post_saves (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, is_read);

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_activity_logs_project ON public.activity_logs(project_id, created_at DESC);

-- 9. SECURITY DEFINER HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = _user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_project_admin(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id
      AND user_id = _user_id
      AND role IN ('owner', 'maintainer')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_canvas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_review_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_github_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles & Taxonomy Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profile experiences are viewable by everyone" ON public.profile_experiences FOR SELECT USING (true);
CREATE POLICY "Users can manage their own experiences" ON public.profile_experiences FOR ALL USING (auth.uid() = profile_id);

CREATE POLICY "Skills are viewable by everyone" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Technologies are viewable by everyone" ON public.technologies FOR SELECT USING (true);
CREATE POLICY "User skills are viewable by everyone" ON public.profile_skills FOR SELECT USING (true);
CREATE POLICY "Users manage their own skills" ON public.profile_skills FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "User technologies are viewable by everyone" ON public.profile_technologies FOR SELECT USING (true);
CREATE POLICY "Users manage their own technologies" ON public.profile_technologies FOR ALL USING (auth.uid() = profile_id);

-- Connections Policies
CREATE POLICY "Users can view their connections" ON public.user_connections FOR SELECT USING (auth.uid() IN (requester_id, recipient_id));
CREATE POLICY "Users can send connection requests" ON public.user_connections FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update their connection status" ON public.user_connections FOR UPDATE USING (auth.uid() IN (requester_id, recipient_id));
CREATE POLICY "Users can delete their connections" ON public.user_connections FOR DELETE USING (auth.uid() IN (requester_id, recipient_id));

-- Projects Policies
CREATE POLICY "Public projects are viewable by everyone" ON public.projects FOR SELECT USING (
  visibility = 'public' OR is_project_member(id, auth.uid())
);
CREATE POLICY "Authenticated users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Project admins can update project" ON public.projects FOR UPDATE USING (is_project_admin(id, auth.uid()));
CREATE POLICY "Project owner can delete project" ON public.projects FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Project roles viewable if project viewable" ON public.project_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.visibility = 'public' OR is_project_member(p.id, auth.uid())))
);
CREATE POLICY "Project admins manage roles" ON public.project_roles FOR ALL USING (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Project members viewable if project viewable" ON public.project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.visibility = 'public' OR is_project_member(p.id, auth.uid())))
);
CREATE POLICY "Project admins manage members" ON public.project_members FOR ALL USING (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Contribution requests viewable by applicant and project admins" ON public.contribution_requests FOR SELECT USING (
  applicant_id = auth.uid() OR is_project_admin(project_id, auth.uid())
);
CREATE POLICY "Authenticated users can submit contribution requests" ON public.contribution_requests FOR INSERT WITH CHECK (
  auth.uid() = applicant_id
);
CREATE POLICY "Contribution requests can be updated by applicant or admins" ON public.contribution_requests FOR UPDATE USING (
  applicant_id = auth.uid() OR is_project_admin(project_id, auth.uid())
);

-- Workspace Execution Policies
CREATE POLICY "Workspace goals viewable by members" ON public.goals FOR SELECT USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "Project admins manage goals" ON public.goals FOR ALL USING (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Workspace milestones viewable by members" ON public.milestones FOR SELECT USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "Project admins manage milestones" ON public.milestones FOR ALL USING (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Tasks viewable by members" ON public.tasks FOR SELECT USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "Members manage tasks" ON public.tasks FOR ALL USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Task comments viewable by members" ON public.task_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND is_project_member(t.project_id, auth.uid()))
);
CREATE POLICY "Members add task comments" ON public.task_comments FOR INSERT WITH CHECK (
  auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND is_project_member(t.project_id, auth.uid()))
);
CREATE POLICY "Authors or admins update task comments" ON public.task_comments FOR UPDATE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND is_project_admin(t.project_id, auth.uid()))
);
CREATE POLICY "Authors or admins delete task comments" ON public.task_comments FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND is_project_admin(t.project_id, auth.uid()))
);

-- Collaboration & Canvas Policies
CREATE POLICY "Discussions viewable by members" ON public.discussions FOR SELECT USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "Members create discussions" ON public.discussions FOR INSERT WITH CHECK (is_project_member(project_id, auth.uid()) AND auth.uid() = author_id);
CREATE POLICY "Authors or admins manage discussions" ON public.discussions FOR UPDATE USING (author_id = auth.uid() OR is_project_admin(project_id, auth.uid()));
CREATE POLICY "Authors or admins delete discussions" ON public.discussions FOR DELETE USING (author_id = auth.uid() OR is_project_admin(project_id, auth.uid()));

CREATE POLICY "Discussion comments viewable by members" ON public.discussion_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.discussions d WHERE d.id = discussion_id AND is_project_member(d.project_id, auth.uid()))
);
CREATE POLICY "Members create discussion comments" ON public.discussion_comments FOR INSERT WITH CHECK (
  auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.discussions d WHERE d.id = discussion_id AND is_project_member(d.project_id, auth.uid()))
);
CREATE POLICY "Authors or admins update discussion comments" ON public.discussion_comments FOR UPDATE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.discussions d WHERE d.id = discussion_id AND is_project_admin(d.project_id, auth.uid()))
);
CREATE POLICY "Authors or admins delete discussion comments" ON public.discussion_comments FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.discussions d WHERE d.id = discussion_id AND is_project_admin(d.project_id, auth.uid()))
);

CREATE POLICY "Project notes viewable by members" ON public.project_notes FOR SELECT USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "Members manage project notes" ON public.project_notes FOR ALL USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Canvas items viewable by members" ON public.project_canvas_items FOR SELECT USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "Members manage canvas items" ON public.project_canvas_items FOR ALL USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project files viewable by members" ON public.project_files FOR SELECT USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "Members upload project files" ON public.project_files FOR INSERT WITH CHECK (is_project_member(project_id, auth.uid()) AND auth.uid() = uploader_id);
CREATE POLICY "Uploaders or admins delete project files" ON public.project_files FOR DELETE USING (uploader_id = auth.uid() OR is_project_admin(project_id, auth.uid()));

-- Code & Code Reviews Policies
CREATE POLICY "Code snippets viewable by members" ON public.code_snippets FOR SELECT USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "Members manage code snippets" ON public.code_snippets FOR ALL USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Code reviews viewable by members" ON public.code_reviews FOR SELECT USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "Members create code reviews" ON public.code_reviews FOR INSERT WITH CHECK (is_project_member(project_id, auth.uid()) AND auth.uid() = author_id);
CREATE POLICY "Members update code reviews" ON public.code_reviews FOR UPDATE USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Code review files viewable by members" ON public.code_review_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.code_reviews cr WHERE cr.id = code_review_id AND is_project_member(cr.project_id, auth.uid()))
);
CREATE POLICY "Members manage code review files" ON public.code_review_files FOR ALL USING (
  EXISTS (SELECT 1 FROM public.code_reviews cr WHERE cr.id = code_review_id AND is_project_member(cr.project_id, auth.uid()))
);

CREATE POLICY "Code review comments viewable by members" ON public.code_review_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.code_reviews cr WHERE cr.id = code_review_id AND is_project_member(cr.project_id, auth.uid()))
);
CREATE POLICY "Members post code review comments" ON public.code_review_comments FOR INSERT WITH CHECK (
  auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.code_reviews cr WHERE cr.id = code_review_id AND is_project_member(cr.project_id, auth.uid()))
);
CREATE POLICY "Authors or admins update code review comments" ON public.code_review_comments FOR UPDATE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.code_reviews cr WHERE cr.id = code_review_id AND is_project_admin(cr.project_id, auth.uid()))
);
CREATE POLICY "Authors or admins delete code review comments" ON public.code_review_comments FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.code_reviews cr WHERE cr.id = code_review_id AND is_project_admin(cr.project_id, auth.uid()))
);

CREATE POLICY "Project GitHub repos accessible by admins only" ON public.project_github_repos FOR ALL USING (
  is_project_admin(project_id, auth.uid())
);

-- Community Feed Policies
CREATE POLICY "Community posts are viewable by everyone" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their posts" ON public.community_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete their posts" ON public.community_posts FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Post comments are viewable by everyone" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their comments" ON public.post_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete their comments" ON public.post_comments FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Post likes are viewable by everyone" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like posts" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their like" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their saved posts" ON public.post_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts" ON public.post_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts" ON public.post_saves FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "Project activity logs viewable by members" ON public.activity_logs FOR SELECT USING (is_project_member(project_id, auth.uid()));

-- 11. AUTOMATED TRIGGERS & FUNCTIONS

-- Trigger: Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'user_name',
      'dev_' || substr(new.id::text, 1, 8)
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Developer'
    ),
    new.raw_user_meta_data->>'avatar_url',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger: set updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_code_reviews_updated_at BEFORE UPDATE ON public.code_reviews FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_contribution_requests_updated_at BEFORE UPDATE ON public.contribution_requests FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_canvas_updated_at BEFORE UPDATE ON public.project_canvas_items FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Trigger: Contribution accepted -> insert into project_members & update filled_count
CREATE OR REPLACE FUNCTION public.handle_contribution_request_accepted()
RETURNS trigger AS $$
BEGIN
  IF new.status = 'accepted' AND old.status <> 'accepted' THEN
    INSERT INTO public.project_members (project_id, user_id, project_role_id, role)
    VALUES (new.project_id, new.applicant_id, new.project_role_id, 'contributor')
    ON CONFLICT (project_id, user_id) DO NOTHING;

    IF new.project_role_id IS NOT NULL THEN
      UPDATE public.project_roles
      SET filled_count = filled_count + 1,
          status = CASE WHEN filled_count + 1 >= capacity_count THEN 'filled'::project_role_status ELSE status END
      WHERE id = new.project_role_id;
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_contribution_accepted
  AFTER UPDATE OF status ON public.contribution_requests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_contribution_request_accepted();

-- Trigger: Sync post comments count
CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = new.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = old.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_comments_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE PROCEDURE public.sync_post_comments_count();

-- Trigger: Sync post likes count
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = new.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = old.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE PROCEDURE public.sync_post_likes_count();

-- 12. DETERMINISTIC PROJECT MATCHING FUNCTION
CREATE OR REPLACE FUNCTION public.calculate_project_match_score(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_role_skills_match NUMERIC := 0.0;
  v_user_avail INTEGER := 10;
  v_role_req_avail INTEGER := 10;
BEGIN
  -- 1. Skill overlap (up to 40 pts)
  SELECT COALESCE(
    COUNT(DISTINCT ps.skill_id)::NUMERIC / NULLIF(COUNT(DISTINCT r_skills.value), 0),
    0.0
  ) INTO v_role_skills_match
  FROM public.project_roles pr
  CROSS JOIN LATERAL jsonb_array_elements_text(pr.required_skills) AS r_skills(value)
  LEFT JOIN public.skills s ON s.name ILIKE r_skills.value
  LEFT JOIN public.profile_skills ps ON ps.skill_id = s.id AND ps.profile_id = p_user_id
  WHERE pr.project_id = p_project_id AND pr.status = 'open';

  v_score := v_score + LEAST(40, ROUND(v_role_skills_match * 40));

  -- 2. Availability alignment (up to 20 pts)
  SELECT availability_hours_per_week INTO v_user_avail FROM public.profiles WHERE id = p_user_id;
  SELECT COALESCE(MIN(commitment_hours_per_week), 10) INTO v_role_req_avail 
  FROM public.project_roles WHERE project_id = p_project_id AND status = 'open';

  IF v_user_avail >= v_role_req_avail THEN
    v_score := v_score + 20;
  ELSIF v_user_avail >= (v_role_req_avail / 2) THEN
    v_score := v_score + 10;
  END IF;

  -- 3. Baseline presence points (10 pts)
  v_score := v_score + 10;

  RETURN LEAST(100, GREATEST(0, v_score));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
