/*
          # [Feature] Collaboration
          This migration sets up the database structure for project collaboration.

          ## Query Description: 
          This script creates a `project_collaborators` table to manage user permissions on projects. It also introduces a function to fetch all projects a user has access to (owned and shared) and updates all existing Row Level Security (RLS) policies to enforce these new permissions. This change is fundamental for multi-user functionality. No data will be lost, but access rules will be stricter.

          ## Metadata:
          - Schema-Category: ["Structural", "Security"]
          - Impact-Level: ["High"]
          - Requires-Backup: true
          - Reversible: false
          
          ## Structure Details:
          - Adds table: `project_collaborators`
          - Adds function: `get_user_accessible_projects`
          - Adds function: `get_user_id_from_email`
          - Modifies RLS policies on: `projects`, `budget_entries`, `actual_transactions`, `cash_accounts`, `loans`, `scenarios`, `scenario_entries`.
          
          ## Security Implications:
          - RLS Status: Enabled/Modified
          - Policy Changes: Yes
          - Auth Requirements: This migration is central to the new multi-user auth requirements.
          
          ## Performance Impact:
          - Indexes: Adds indexes on foreign keys in `project_collaborators`.
          - Triggers: None
          - Estimated Impact: Low impact on performance. Queries will now check for collaboration, which is a fast lookup.
          */

-- 1. Create the collaborators table to store who has access to which project and with what role.
CREATE TABLE IF NOT EXISTS public.project_collaborators (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('viewer', 'editor')),
    invited_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT project_collaborators_pkey PRIMARY KEY (id),
    CONSTRAINT project_collaborators_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT project_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT project_collaborators_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT project_collaborators_project_id_user_id_key UNIQUE (project_id, user_id)
);
COMMENT ON TABLE public.project_collaborators IS 'Manages user roles and access to projects.';

-- Enable Row Level Security for the new table
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for the collaborators table
DROP POLICY IF EXISTS "Enable read access for project owners and collaborators" ON public.project_collaborators;
CREATE POLICY "Enable read access for project owners and collaborators"
    ON public.project_collaborators FOR SELECT
    USING (
        (project_id IN (SELECT p.id FROM projects p WHERE p.user_id = auth.uid())) OR
        (user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Enable insert for project owners" ON public.project_collaborators;
CREATE POLICY "Enable insert for project owners"
    ON public.project_collaborators FOR INSERT
    WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Enable delete for project owners" ON public.project_collaborators;
CREATE POLICY "Enable delete for project owners"
    ON public.project_collaborators FOR DELETE
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 3. Create a function to get all projects a user can access (owned or shared)
CREATE OR REPLACE FUNCTION public.get_user_accessible_projects()
RETURNS TABLE(project_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id as project_id FROM public.projects WHERE user_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_collaborators WHERE user_id = auth.uid();
$$;

-- 4. Create a function to find a user by email (for invitations)
CREATE OR REPLACE FUNCTION public.get_user_id_from_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = p_email;
  RETURN user_id;
END;
$$;

-- 5. Update RLS policies for existing tables to include collaborators
-- PROJECTS
DROP POLICY IF EXISTS "Enable read access for owner" ON public.projects;
DROP POLICY IF EXISTS "Enable read access for owner and collaborators" ON public.projects;
CREATE POLICY "Enable read access for owner and collaborators" ON public.projects FOR SELECT USING (
    auth.uid() = user_id OR
    id IN (SELECT pc.project_id FROM public.project_collaborators pc WHERE pc.user_id = auth.uid())
);
-- Note: Insert, Update, Delete policies for projects remain owner-only for security.

-- A helper function to check editor role
CREATE OR REPLACE FUNCTION public.can_edit_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = auth.uid()
    UNION
    SELECT 1 FROM project_collaborators WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'editor'
  );
$$;

-- BUDGET_ENTRIES
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON public.budget_entries;
CREATE POLICY "Enable all actions for users based on project access" ON public.budget_entries FOR ALL USING (
    project_id IN (SELECT project_id FROM public.get_user_accessible_projects())
) WITH CHECK (
    public.can_edit_project(project_id)
);

-- ACTUAL_TRANSACTIONS
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON public.actual_transactions;
CREATE POLICY "Enable all actions for users based on project access" ON public.actual_transactions FOR ALL USING (
    project_id IN (SELECT project_id FROM public.get_user_accessible_projects())
) WITH CHECK (
    public.can_edit_project(project_id)
);

-- CASH_ACCOUNTS
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON public.cash_accounts;
CREATE POLICY "Enable all actions for users based on project access" ON public.cash_accounts FOR ALL USING (
    project_id IN (SELECT project_id FROM public.get_user_accessible_projects())
) WITH CHECK (
    public.can_edit_project(project_id)
);

-- LOANS
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON public.loans;
CREATE POLICY "Enable all actions for users based on project access" ON public.loans FOR ALL USING (
    project_id IN (SELECT project_id FROM public.get_user_accessible_projects())
) WITH CHECK (
    public.can_edit_project(project_id)
);

-- SCENARIOS
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON public.scenarios;
CREATE POLICY "Enable all actions for users based on project access" ON public.scenarios FOR ALL USING (
    project_id IN (SELECT project_id FROM public.get_user_accessible_projects())
) WITH CHECK (
    public.can_edit_project(project_id)
);

-- SCENARIO_ENTRIES
DROP POLICY IF EXISTS "Enable all actions for users based on user_id" ON public.scenario_entries;
CREATE POLICY "Enable all actions for users based on scenario access" ON public.scenario_entries FOR ALL USING (
    scenario_id IN (SELECT id FROM scenarios WHERE project_id IN (SELECT project_id FROM public.get_user_accessible_projects()))
) WITH CHECK (
    scenario_id IN (SELECT id FROM scenarios WHERE public.can_edit_project(project_id))
);
