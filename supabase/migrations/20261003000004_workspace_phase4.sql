-- ==============================================================================
-- Build Together — Collaborative Project Workspace Migration
-- Migration: 20261003000004_workspace_phase4.sql
-- Phase 4: Goals, Roadmap, Milestones, Tasks & Workspace Activity
-- ==============================================================================

-- 1. EXTEND TASKS WITH GOAL RELATIONSHIP
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_goal ON public.tasks(goal_id);

-- 2. CREATE PROJECT ROADMAP ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.project_roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'blocked')),
  target_date DATE,
  target_quarter TEXT, -- e.g. "Q1 2026", "Sprint 3"
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  position DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_roadmap_project_pos ON public.project_roadmap_items(project_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_roadmap_goal ON public.project_roadmap_items(goal_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_milestone ON public.project_roadmap_items(milestone_id);

-- Updated_at trigger for roadmap items
CREATE OR REPLACE TRIGGER trg_roadmap_items_updated_at
  BEFORE UPDATE ON public.project_roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. TASK ASSIGNEE MEMBERSHIP INVARIANT TRIGGER
-- Guarantees at the database level that a task can only be assigned to a valid project member
CREATE OR REPLACE FUNCTION public.validate_task_assignee_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = NEW.project_id AND user_id = NEW.assignee_id
    ) THEN
      RAISE EXCEPTION 'Task assignee % is not a member of project %', NEW.assignee_id, NEW.project_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_task_assignee ON public.tasks;
CREATE TRIGGER trg_validate_task_assignee
  BEFORE INSERT OR UPDATE OF assignee_id, project_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_assignee_membership();

-- 4. RLS POLICIES FOR PHASE 4 WORKSPACE ENTITIES

-- Enable RLS
ALTER TABLE public.project_roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 4.1 ROADMAP ITEMS RLS
DROP POLICY IF EXISTS "Roadmap items viewable by members" ON public.project_roadmap_items;
CREATE POLICY "Roadmap items viewable by members"
  ON public.project_roadmap_items
  FOR SELECT
  USING (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Members can insert roadmap items" ON public.project_roadmap_items;
CREATE POLICY "Members can insert roadmap items"
  ON public.project_roadmap_items
  FOR INSERT
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Members can update roadmap items" ON public.project_roadmap_items;
CREATE POLICY "Members can update roadmap items"
  ON public.project_roadmap_items
  FOR UPDATE
  USING (public.is_project_member(project_id, auth.uid()))
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Admins or creators can delete roadmap items" ON public.project_roadmap_items;
CREATE POLICY "Admins or creators can delete roadmap items"
  ON public.project_roadmap_items
  FOR DELETE
  USING (
    public.is_project_admin(project_id, auth.uid()) OR
    auth.uid() = created_by
  );

-- 4.2 GOALS RLS (Allow members to collaborate on goals)
DROP POLICY IF EXISTS "Project members can insert goals" ON public.goals;
CREATE POLICY "Project members can insert goals"
  ON public.goals
  FOR INSERT
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Project members can update goals" ON public.goals;
CREATE POLICY "Project members can update goals"
  ON public.goals
  FOR UPDATE
  USING (public.is_project_member(project_id, auth.uid()))
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Admins or creators can delete goals" ON public.goals;
CREATE POLICY "Admins or creators can delete goals"
  ON public.goals
  FOR DELETE
  USING (
    public.is_project_admin(project_id, auth.uid()) OR
    auth.uid() = created_by
  );

-- 4.3 MILESTONES RLS
DROP POLICY IF EXISTS "Project members can insert milestones" ON public.milestones;
CREATE POLICY "Project members can insert milestones"
  ON public.milestones
  FOR INSERT
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Project members can update milestones" ON public.milestones;
CREATE POLICY "Project members can update milestones"
  ON public.milestones
  FOR UPDATE
  USING (public.is_project_member(project_id, auth.uid()))
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can delete milestones" ON public.milestones;
CREATE POLICY "Admins can delete milestones"
  ON public.milestones
  FOR DELETE
  USING (public.is_project_admin(project_id, auth.uid()));

-- 4.4 ACTIVITY LOGS RLS
DROP POLICY IF EXISTS "Project members can insert activity logs" ON public.activity_logs;
CREATE POLICY "Project members can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (public.is_project_member(project_id, auth.uid()));
