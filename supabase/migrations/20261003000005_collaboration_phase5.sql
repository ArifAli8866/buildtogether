-- ==============================================================================
-- Migration: 20261003000005_collaboration_phase5.sql
-- Description: Phase 5 Collaborative Communication — Discussions, Comments,
--              Meetings, Meeting Notes, Project Notes, Canvas Resizing & Realtime
-- ==============================================================================

-- 1. Extend project_canvas_items with width and height for resizing
ALTER TABLE public.project_canvas_items
  ADD COLUMN IF NOT EXISTS width DOUBLE PRECISION NOT NULL DEFAULT 220.0,
  ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION NOT NULL DEFAULT 180.0;

-- 2. Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_meetings_project ON public.meetings(project_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer ON public.meetings(organizer_id);

-- 3. Meeting Participants Table
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'declined', 'tentative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT unique_meeting_participant UNIQUE (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON public.meeting_participants(user_id);

-- 4. Meeting Notes Table
CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  decisions TEXT NOT NULL DEFAULT '',
  action_items TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting ON public.meeting_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_project ON public.meeting_notes(project_id);

-- 5. Updated At Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_meetings_updated_at') THEN
    CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_meeting_notes_updated_at') THEN
    CREATE TRIGGER trg_meeting_notes_updated_at BEFORE UPDATE ON public.meeting_notes FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_discussion_comments_updated_at') THEN
    CREATE TRIGGER trg_discussion_comments_updated_at BEFORE UPDATE ON public.discussion_comments FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_project_notes_updated_at') THEN
    CREATE TRIGGER trg_project_notes_updated_at BEFORE UPDATE ON public.project_notes FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END $$;

-- 6. Enable Row Level Security
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for Meetings
CREATE POLICY "Meetings viewable by project members"
  ON public.meetings
  FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can schedule meetings"
  ON public.meetings
  FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid()) AND auth.uid() = organizer_id);

CREATE POLICY "Organizers or admins can update meetings"
  ON public.meetings
  FOR UPDATE
  USING (organizer_id = auth.uid() OR is_project_admin(project_id, auth.uid()));

CREATE POLICY "Organizers or admins can delete meetings"
  ON public.meetings
  FOR DELETE
  USING (organizer_id = auth.uid() OR is_project_admin(project_id, auth.uid()));

-- 8. RLS Policies for Meeting Participants
CREATE POLICY "Meeting participants viewable by project members"
  ON public.meeting_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND is_project_member(m.project_id, auth.uid())
    )
  );

CREATE POLICY "Members can RSVP or be invited to meetings"
  ON public.meeting_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND is_project_member(m.project_id, auth.uid())
    )
  );

CREATE POLICY "Users can update own RSVP or organizers manage participants"
  ON public.meeting_participants
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND (m.organizer_id = auth.uid() OR is_project_admin(m.project_id, auth.uid()))
    )
  );

CREATE POLICY "Users can remove own RSVP or organizers manage participants"
  ON public.meeting_participants
  FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND (m.organizer_id = auth.uid() OR is_project_admin(m.project_id, auth.uid()))
    )
  );

-- 9. RLS Policies for Meeting Notes
CREATE POLICY "Meeting notes viewable by project members"
  ON public.meeting_notes
  FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can create meeting notes"
  ON public.meeting_notes
  FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Authors or admins can update meeting notes"
  ON public.meeting_notes
  FOR UPDATE
  USING (author_id = auth.uid() OR is_project_admin(project_id, auth.uid()));

CREATE POLICY "Authors or admins can delete meeting notes"
  ON public.meeting_notes
  FOR DELETE
  USING (author_id = auth.uid() OR is_project_admin(project_id, auth.uid()));

-- 10. Enable Supabase Realtime Publication for collaboration tables
-- Only add if not already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'discussion_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_comments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_canvas_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_canvas_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'discussions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
  END IF;
END $$;
