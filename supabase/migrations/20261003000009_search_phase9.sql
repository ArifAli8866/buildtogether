-- ==============================================================================
-- Build Together — Phase 9: Global Search & Full-Text Search Vectors
-- Migration: 20261003000009_search_phase9.sql
-- ==============================================================================

-- 1. Full-Text Search Vector on Developer Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tsv TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(username, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(headline, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'D')
) STORED;

CREATE INDEX IF NOT EXISTS idx_profiles_tsv ON public.profiles USING GIN(tsv);

-- 2. Full-Text Search Vector on Community Posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS tsv TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B')
) STORED;

CREATE INDEX IF NOT EXISTS idx_community_posts_tsv ON public.community_posts USING GIN(tsv);

-- 3. Composite Indexes for Fast Search Query Resolution
CREATE INDEX IF NOT EXISTS idx_projects_search_visibility ON public.projects(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project_search ON public.tasks(project_id, status);
