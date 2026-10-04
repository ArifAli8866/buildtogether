-- ==============================================================================
-- Build Together — Phase 2: Project Technologies, Collaboration Type & Matching
-- Migration: 20261003000002_projects_phase2.sql
-- ==============================================================================

-- 1. Add collaboration_type column to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS collaboration_type TEXT NOT NULL DEFAULT 'remote';

-- 2. Create normalized project_technologies join table
CREATE TABLE IF NOT EXISTS public.project_technologies (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  technology_id UUID NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, technology_id)
);

CREATE INDEX IF NOT EXISTS idx_project_technologies_project ON public.project_technologies(project_id);
CREATE INDEX IF NOT EXISTS idx_project_technologies_tech ON public.project_technologies(technology_id);

-- 3. RLS for project_technologies
ALTER TABLE public.project_technologies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'project_technologies' AND policyname = 'Project technologies viewable if project viewable'
  ) THEN
    CREATE POLICY "Project technologies viewable if project viewable" 
    ON public.project_technologies FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id = project_id 
        AND (p.visibility = 'public' OR is_project_member(p.id, auth.uid()))
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'project_technologies' AND policyname = 'Project admins manage project technologies'
  ) THEN
    CREATE POLICY "Project admins manage project technologies" 
    ON public.project_technologies FOR ALL USING (
      is_project_admin(project_id, auth.uid())
    );
  END IF;
END $$;

-- 4. Full Deterministic Matching Function: Skill (40) + Tech (30) + Availability (20) + Timezone (10)
CREATE OR REPLACE FUNCTION public.calculate_project_match_score(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_skills_score INTEGER := 0;
  v_tech_score INTEGER := 0;
  v_avail_score INTEGER := 0;
  v_tz_score INTEGER := 0;

  v_role_skills_match NUMERIC := 0.0;
  v_tech_match NUMERIC := 0.0;

  v_user_avail INTEGER := 10;
  v_role_req_avail INTEGER := 10;
  v_user_tz TEXT := 'UTC';
  v_owner_tz TEXT := 'UTC';
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

  v_skills_score := LEAST(40, ROUND(v_role_skills_match * 40));

  -- 2. Technology match (up to 30 pts)
  SELECT COALESCE(
    COUNT(DISTINCT pt.technology_id)::NUMERIC / NULLIF(COUNT(DISTINCT proj_tech.technology_id), 0),
    0.0
  ) INTO v_tech_match
  FROM public.project_technologies proj_tech
  LEFT JOIN public.profile_technologies pt 
    ON pt.technology_id = proj_tech.technology_id AND pt.profile_id = p_user_id
  WHERE proj_tech.project_id = p_project_id;

  v_tech_score := LEAST(30, ROUND(v_tech_match * 30));

  -- 3. Availability fit (up to 20 pts)
  SELECT COALESCE(availability_hours_per_week, 10), COALESCE(timezone, 'UTC') 
  INTO v_user_avail, v_user_tz 
  FROM public.profiles WHERE id = p_user_id;

  SELECT COALESCE(MIN(commitment_hours_per_week), 10) INTO v_role_req_avail 
  FROM public.project_roles WHERE project_id = p_project_id AND status = 'open';

  IF v_user_avail >= v_role_req_avail THEN
    v_avail_score := 20;
  ELSIF v_user_avail >= (v_role_req_avail / 2) THEN
    v_avail_score := 10;
  ELSE
    v_avail_score := 0;
  END IF;

  -- 4. Timezone proximity (up to 10 pts)
  SELECT COALESCE(p_owner.timezone, 'UTC') INTO v_owner_tz
  FROM public.projects proj
  JOIN public.profiles p_owner ON p_owner.id = proj.owner_id
  WHERE proj.id = p_project_id;

  IF v_user_tz = v_owner_tz THEN
    v_tz_score := 10;
  ELSIF abs(char_length(v_user_tz) - char_length(v_owner_tz)) <= 2 THEN
    v_tz_score := 7;
  ELSE
    v_tz_score := 5;
  END IF;

  v_score := v_skills_score + v_tech_score + v_avail_score + v_tz_score;
  RETURN LEAST(100, GREATEST(0, v_score));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
