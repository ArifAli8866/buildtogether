-- ============================================================
-- BuildTogether Database Schema
-- Supabase PostgreSQL
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE availability_type AS ENUM ('full_time', 'part_time', 'weekends', 'flexible', 'not_available');
CREATE TYPE experience_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE project_status AS ENUM ('ideation', 'planning', 'in_progress', 'testing', 'launched', 'on_hold', 'completed');
CREATE TYPE project_visibility AS ENUM ('public', 'private');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'removed');
CREATE TYPE application_status AS ENUM ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'code', 'link', 'system');
CREATE TYPE channel_type AS ENUM ('general', 'announcements', 'resources', 'custom');
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed');
CREATE TYPE notification_type AS ENUM (
  'application_received', 'application_accepted', 'application_rejected',
  'new_message', 'project_update', 'invitation', 'mention',
  'comment', 'like', 'milestone_update', 'new_follower'
);
CREATE TYPE role_title AS ENUM (
  'frontend_developer', 'backend_developer', 'full_stack_developer',
  'ui_designer', 'ux_designer', 'flutter_developer',
  'react_native_developer', 'ai_engineer', 'devops', 'qa', 'project_manager'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  country TEXT,
  website TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  availability availability_type DEFAULT 'flexible',
  timezone TEXT,
  years_of_experience INTEGER DEFAULT 0,
  experience_level experience_level DEFAULT 'beginner',
  skills TEXT[] DEFAULT '{}',
  tech_stack TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User follows
CREATE TABLE public.user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  problem_statement TEXT,
  solution TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  difficulty difficulty_level DEFAULT 'intermediate',
  status project_status DEFAULT 'ideation',
  visibility project_visibility DEFAULT 'public',
  estimated_duration TEXT,
  repository_url TEXT,
  live_demo_url TEXT,
  discord_url TEXT,
  figma_url TEXT,
  logo_url TEXT,
  screenshots TEXT[] DEFAULT '{}',
  video_demo_url TEXT,
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  max_team_size INTEGER DEFAULT 5 CHECK (max_team_size >= 2 AND max_team_size <= 50),
  current_team_size INTEGER DEFAULT 1,
  stars_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_open_source BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project roles
CREATE TABLE public.project_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title role_title NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  experience_level experience_level DEFAULT 'intermediate',
  vacancies INTEGER DEFAULT 1 CHECK (vacancies >= 1),
  filled INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL,
  role_title role_title DEFAULT 'full_stack_developer',
  status member_status DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.project_roles(id) ON DELETE CASCADE,
  introduction TEXT NOT NULL,
  why_join TEXT NOT NULL,
  github_url TEXT,
  portfolio_url TEXT,
  hours_per_week INTEGER DEFAULT 10 CHECK (hours_per_week >= 1 AND hours_per_week <= 80),
  resume_url TEXT,
  previous_projects TEXT[] DEFAULT '{}',
  status application_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id, role_id)
);

-- Channels
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type channel_type DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  attachment_url TEXT,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel read status
CREATE TABLE public.channel_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Milestones
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status milestone_status DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project updates
CREATE TABLE public.project_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  code_snippet TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_id UUID NOT NULL REFERENCES public.project_updates(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update likes
CREATE TABLE public.update_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_id UUID NOT NULL REFERENCES public.project_updates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(update_id, user_id)
);

-- Saved projects
CREATE TABLE public.saved_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Project stars
CREATE TABLE public.project_stars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources (files shared in projects)
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Users
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_skills ON public.users USING GIN(skills);
CREATE INDEX idx_users_tech_stack ON public.users USING GIN(tech_stack);
CREATE INDEX idx_users_experience_level ON public.users(experience_level);
CREATE INDEX idx_users_availability ON public.users(availability);
CREATE INDEX idx_users_full_name_trgm ON public.users USING GIN(full_name gin_trgm_ops);

-- User follows
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);

-- Projects
CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_difficulty ON public.projects(difficulty);
CREATE INDEX idx_projects_visibility ON public.projects(visibility);
CREATE INDEX idx_projects_tech_stack ON public.projects USING GIN(tech_stack);
CREATE INDEX idx_projects_tags ON public.projects USING GIN(tags);
CREATE INDEX idx_projects_categories ON public.projects USING GIN(categories);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX idx_projects_stars_count ON public.projects(stars_count DESC);
CREATE INDEX idx_projects_views_count ON public.projects(views_count DESC);
CREATE INDEX idx_projects_featured ON public.projects(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_projects_name_trgm ON public.projects USING GIN(name gin_trgm_ops);

-- Project roles
CREATE INDEX idx_project_roles_project ON public.project_roles(project_id);

-- Project members
CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);

-- Applications
CREATE INDEX idx_applications_project ON public.applications(project_id);
CREATE INDEX idx_applications_user ON public.applications(user_id);
CREATE INDEX idx_applications_status ON public.applications(status);

-- Channels
CREATE INDEX idx_channels_project ON public.channels(project_id);

-- Messages
CREATE INDEX idx_messages_channel ON public.messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- Channel reads
CREATE INDEX idx_channel_reads_user_channel ON public.channel_reads(user_id, channel_id);

-- Milestones
CREATE INDEX idx_milestones_project ON public.milestones(project_id);

-- Project updates
CREATE INDEX idx_project_updates_project ON public.project_updates(project_id);
CREATE INDEX idx_project_updates_author ON public.project_updates(author_id);

-- Comments
CREATE INDEX idx_comments_update ON public.comments(update_id);

-- Notifications
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- Achievements
CREATE INDEX idx_achievements_user ON public.achievements(user_id);

-- Resources
CREATE INDEX idx_resources_project ON public.resources(project_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment a numeric column
CREATE OR REPLACE FUNCTION increment_column(table_name TEXT, column_name TEXT, row_id UUID)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET %I = %I + 1 WHERE id = $1', table_name, column_name, column_name)
  USING row_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement a numeric column
CREATE OR REPLACE FUNCTION decrement_column(table_name TEXT, column_name TEXT, row_id UUID)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET %I = GREATEST(%I - 1, 0) WHERE id = $1', table_name, column_name, column_name)
  USING row_id;
END;
$$ LANGUAGE plpgsql;

-- Create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Updated at triggers
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_project_updates_updated_at
  BEFORE UPDATE ON public.project_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- New user trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles"
  ON public.users FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- User follows policies
CREATE POLICY "Anyone can view follows"
  ON public.user_follows FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can follow"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Projects policies
CREATE POLICY "Anyone can view public projects"
  ON public.projects FOR SELECT
  USING (visibility = 'public' OR owner_id = auth.uid());

CREATE POLICY "Members can view private projects"
  ON public.projects FOR SELECT
  USING (
    visibility = 'private' AND EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = id AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);

-- Project roles policies
CREATE POLICY "Anyone can view roles"
  ON public.project_roles FOR SELECT
  USING (TRUE);

CREATE POLICY "Owners can manage roles"
  ON public.project_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Project members policies
CREATE POLICY "Members can view team"
  ON public.project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND (visibility = 'public' OR owner_id = auth.uid())
    )
  );

CREATE POLICY "System can manage members"
  ON public.project_members FOR ALL
  USING (TRUE);

-- Applications policies
CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owners can view project applications"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update applications"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Members can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.channels c ON c.project_id = pm.project_id
      WHERE c.id = channel_id AND pm.user_id = auth.uid() AND pm.status = 'active'
    )
  );

CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.channels c ON c.project_id = pm.project_id
      WHERE c.id = channel_id AND pm.user_id = auth.uid() AND pm.status = 'active'
    )
  );

-- Channels policies
CREATE POLICY "Members can view channels"
  ON public.channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = channels.project_id AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Saved projects policies
CREATE POLICY "Users can view own saved projects"
  ON public.saved_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save projects"
  ON public.saved_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave projects"
  ON public.saved_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Project stars policies
CREATE POLICY "Anyone can view stars"
  ON public.project_stars FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can star projects"
  ON public.project_stars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unstar projects"
  ON public.project_stars FOR DELETE
  USING (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  USING (TRUE);

-- Channel reads policies
CREATE POLICY "Users can manage own read status"
  ON public.channel_reads FOR ALL
  USING (auth.uid() = user_id);

-- Milestones policies
CREATE POLICY "Members can view milestones"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = milestones.project_id AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners can manage milestones"
  ON public.milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Project updates policies
CREATE POLICY "Members can view updates"
  ON public.project_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = project_updates.project_id AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Members can create updates"
  ON public.project_updates FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = project_updates.project_id AND user_id = auth.uid() AND status = 'active'
    )
  );

-- Comments policies
CREATE POLICY "Anyone can view comments"
  ON public.comments FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = author_id);

-- Update likes policies
CREATE POLICY "Anyone can view likes"
  ON public.update_likes FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can like"
  ON public.update_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
  ON public.update_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Resources policies
CREATE POLICY "Members can view resources"
  ON public.resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = resources.project_id AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Members can upload resources"
  ON public.resources FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = resources.project_id AND user_id = auth.uid() AND status = 'active'
    )
  );
