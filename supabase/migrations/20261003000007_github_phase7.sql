-- ==============================================================================
-- Migration: Phase 7 — GitHub Integration & Repository Connection
-- Date: 2026-10-03
-- ==============================================================================

-- 1. USER GITHUB OAUTH ACCOUNTS
CREATE TABLE IF NOT EXISTS public.user_github_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_user_id BIGINT NOT NULL,
  github_username TEXT NOT NULL,
  avatar_url TEXT,
  encrypted_access_token TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'read:user,repo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_github_accounts_user ON public.user_github_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_github_accounts_gh_user ON public.user_github_accounts(github_user_id);

ALTER TABLE public.user_github_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own GitHub account"
  ON public.user_github_accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. EXTEND PROJECT GITHUB REPOSITORIES
ALTER TABLE public.project_github_repos
  ADD COLUMN IF NOT EXISTS repo_full_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS html_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS branches_cached JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS open_issues_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stars_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forks_count INTEGER DEFAULT 0;

-- Update RLS on project_github_repos:
-- Drop existing single policy if present so we can separate admin write vs member read
DROP POLICY IF EXISTS "Project GitHub repos accessible by admins only" ON public.project_github_repos;

-- Project members can view connected repository metadata
CREATE POLICY "Project members can view connected GitHub repository"
  ON public.project_github_repos
  FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

-- Only project admins can connect, update, or disconnect repositories
CREATE POLICY "Project admins can modify connected GitHub repository"
  ON public.project_github_repos
  FOR INSERT
  WITH CHECK (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Project admins can update connected GitHub repository"
  ON public.project_github_repos
  FOR UPDATE
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));

CREATE POLICY "Project admins can delete connected GitHub repository"
  ON public.project_github_repos
  FOR DELETE
  USING (is_project_admin(project_id, auth.uid()));

-- 3. GITHUB WEBHOOK IDEMPOTENCY & EVENT LOGGING
CREATE TABLE IF NOT EXISTS public.github_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  repo_id BIGINT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  error_message TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_github_webhook_events_delivery ON public.github_webhook_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_github_webhook_events_project ON public.github_webhook_events(project_id, created_at DESC);

ALTER TABLE public.github_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project admins can view project webhook events"
  ON public.github_webhook_events
  FOR SELECT
  USING (project_id IS NOT NULL AND is_project_admin(project_id, auth.uid()));

-- 4. EXTEND CODE REVIEWS FOR GITHUB PR TRACKING
ALTER TABLE public.code_reviews
  ADD COLUMN IF NOT EXISTS github_pr_number INTEGER,
  ADD COLUMN IF NOT EXISTS github_pr_status TEXT DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS github_head_branch TEXT;

CREATE INDEX IF NOT EXISTS idx_code_reviews_pr_number ON public.code_reviews(project_id, github_pr_number);

-- 5. UPDATED_AT TRIGGERS
CREATE OR REPLACE TRIGGER handle_updated_at_user_github_accounts
  BEFORE UPDATE ON public.user_github_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER handle_updated_at_project_github_repos
  BEFORE UPDATE ON public.project_github_repos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. REALTIME PUBLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_github_repos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_github_repos;
  END IF;
END $$;
