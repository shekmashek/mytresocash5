-- =================================================================
-- Step 1: Drop all existing policies to remove dependencies.
-- We drop them in reverse order of dependency, or just all at once.
-- =================================================================

-- Drop policies from tables that depend on the functions
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;

DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;

DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;

DROP POLICY IF EXISTS "Users can manage their own project collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators for their projects" ON public.project_collaborators;

-- Drop policies from other tables for completeness
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own referrals" ON public.referrals;

-- =================================================================
-- Step 2: Drop the functions now that no policies depend on them.
-- =================================================================
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);

-- =================================================================
-- Step 3: Recreate the helper functions correctly.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_user_accessible_projects()
RETURNS TABLE(project_id uuid, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id as project_id,
    'owner' as role
  FROM public.projects p
  WHERE p.user_id = auth.uid()
  UNION ALL
  SELECT
    pc.project_id,
    pc.role
  FROM public.project_collaborators pc
  WHERE pc.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'editor'
  ) OR is_project_owner(p_project_id);
$$;

CREATE OR REPLACE FUNCTION public.is_project_viewer(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role IN ('viewer', 'editor')
  ) OR is_project_owner(p_project_id);
$$;


-- =================================================================
-- Step 4: Recreate all policies using the new functions.
-- =================================================================

-- Policies for 'projects'
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (is_project_owner(id));
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (is_project_owner(id));

-- Policies for 'project_collaborators'
CREATE POLICY "Users can view collaborators for their projects" ON public.project_collaborators FOR SELECT USING (is_project_owner(project_id));
CREATE POLICY "Users can manage their own project collaborators" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));

-- Policies for data tables
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (is_project_editor((SELECT project_id FROM scenarios WHERE id = scenario_id)));

CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (user_id = auth.uid());

-- Policies for other tables
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());
