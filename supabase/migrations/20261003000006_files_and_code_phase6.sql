-- ==============================================================================
-- Build Together — Phase 6: Files, Code Workspace & Code Reviews
-- Migration: 20261003000006_files_and_code_phase6.sql
-- ==============================================================================

-- 1. CONFIGURE STORAGE BUCKET: workspace-files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-files',
  'workspace-files',
  false, -- Private bucket: access requires membership
  26214400, -- 25MB max file size
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ];

-- 2. STORAGE OBJECTS RLS POLICIES FOR WORKSPACE FILES
-- Project members can download/read files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Project members view workspace files'
  ) THEN
    CREATE POLICY "Project members view workspace files"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'workspace-files'
      AND auth.role() = 'authenticated'
      AND (
        SELECT is_project_member((storage.foldername(name))[1]::uuid, auth.uid())
      )
    );
  END IF;
END $$;

-- Project members can upload files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Project members upload workspace files'
  ) THEN
    CREATE POLICY "Project members upload workspace files"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'workspace-files'
      AND auth.role() = 'authenticated'
      AND (
        SELECT is_project_member((storage.foldername(name))[1]::uuid, auth.uid())
      )
    );
  END IF;
END $$;

-- Uploaders or project admins can delete files from storage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Uploaders or admins delete workspace files'
  ) THEN
    CREATE POLICY "Uploaders or admins delete workspace files"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'workspace-files'
      AND auth.role() = 'authenticated'
      AND (
        SELECT is_project_admin((storage.foldername(name))[1]::uuid, auth.uid())
        OR owner = auth.uid()
      )
    );
  END IF;
END $$;

-- 3. EXTEND PROJECT FILES TABLE
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS folder_path TEXT NOT NULL DEFAULT '/',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_project_files_folder ON public.project_files(project_id, folder_path);

-- 4. EXTEND CODE REVIEW COMMENTS FOR REPLIES
ALTER TABLE public.code_review_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.code_review_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_code_review_comments_parent ON public.code_review_comments(parent_comment_id);

-- 5. CODE REVIEW DECISIONS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.code_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_review_id UUID NOT NULL REFERENCES public.code_reviews(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision code_review_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_code_review_decisions_review ON public.code_review_decisions(code_review_id);
CREATE INDEX IF NOT EXISTS idx_code_review_decisions_reviewer ON public.code_review_decisions(reviewer_id);

ALTER TABLE public.code_review_decisions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'code_review_decisions' AND policyname = 'Project members view review decisions'
  ) THEN
    CREATE POLICY "Project members view review decisions"
    ON public.code_review_decisions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.code_reviews cr
        WHERE cr.id = code_review_decisions.code_review_id
          AND is_project_member(cr.project_id, auth.uid())
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'code_review_decisions' AND policyname = 'Reviewers record review decisions'
  ) THEN
    CREATE POLICY "Reviewers record review decisions"
    ON public.code_review_decisions FOR INSERT
    WITH CHECK (
      auth.uid() = reviewer_id
      AND EXISTS (
        SELECT 1 FROM public.code_reviews cr
        WHERE cr.id = code_review_decisions.code_review_id
          AND is_project_member(cr.project_id, auth.uid())
      )
    );
  END IF;
END $$;

-- 6. UPDATED_AT TRIGGERS
CREATE TRIGGER trg_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_code_snippets_updated_at
  BEFORE UPDATE ON public.code_snippets
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trg_code_review_comments_updated_at
  BEFORE UPDATE ON public.code_review_comments
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 7. REPLICATION FOR REALTIME COLLABORATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.code_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.code_review_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.code_snippets;
