-- ==============================================================================
-- Build Together — Phase 3: Contribution Requests, Membership & Team Formation
-- Migration: 20261003000003_contributions_phase3.sql
-- ==============================================================================

-- 1. Ensure Partial Unique Index: Prevent duplicate active applications per user/project
CREATE UNIQUE INDEX IF NOT EXISTS idx_contribution_requests_active_unique
ON public.contribution_requests(project_id, applicant_id)
WHERE status IN ('pending', 'under_review');

-- 2. Protect Project Owner Membership Invariants
CREATE OR REPLACE FUNCTION public.protect_project_owner_membership()
RETURNS trigger AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.projects WHERE id = COALESCE(OLD.project_id, NEW.project_id);

  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id = v_owner_id THEN
      RAISE EXCEPTION 'Cannot remove the project owner from project members.';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.user_id = v_owner_id AND NEW.role <> 'owner' THEN
      RAISE EXCEPTION 'Cannot demote or change the project owner role.';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_project_owner ON public.project_members;
CREATE TRIGGER trg_protect_project_owner
  BEFORE UPDATE OR DELETE ON public.project_members
  FOR EACH ROW EXECUTE PROCEDURE public.protect_project_owner_membership();

-- 3. Trigger: Automatically reopen a role when a member leaves or is removed
CREATE OR REPLACE FUNCTION public.handle_project_member_removed()
RETURNS trigger AS $$
BEGIN
  IF OLD.project_role_id IS NOT NULL THEN
    UPDATE public.project_roles
    SET filled_count = GREATEST(0, filled_count - 1),
        status = 'open'::project_role_status
    WHERE id = OLD.project_role_id AND status = 'filled'::project_role_status;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_project_member_removed ON public.project_members;
CREATE TRIGGER trg_project_member_removed
  AFTER DELETE ON public.project_members
  FOR EACH ROW EXECUTE PROCEDURE public.handle_project_member_removed();

-- 4. Refine RLS Policies on contribution_requests
-- Ensure applicants can withdraw their requests but cannot self-accept or self-reject.
DROP POLICY IF EXISTS "Contribution requests can be updated by applicant or admins" ON public.contribution_requests;

-- Applicants can update their request while pending, or mark it as withdrawn
CREATE POLICY "Applicants can update or withdraw their requests"
ON public.contribution_requests
FOR UPDATE
USING (
  applicant_id = auth.uid()
)
WITH CHECK (
  applicant_id = auth.uid()
  AND (
    (status = 'withdrawn'::contribution_request_status)
    OR (status = 'pending'::contribution_request_status)
  )
);

-- Project admins can review (accept, reject, put under review, add notes)
CREATE POLICY "Project admins can review contribution requests"
ON public.contribution_requests
FOR UPDATE
USING (
  is_project_admin(project_id, auth.uid())
)
WITH CHECK (
  is_project_admin(project_id, auth.uid())
);
