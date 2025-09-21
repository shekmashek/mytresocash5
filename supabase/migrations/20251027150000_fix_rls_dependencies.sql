-- =================================================================
--  MIGRATION SCRIPT: Fix RLS Dependency Order
--  This script will reset and correctly re-apply all Row Level
--  Security (RLS) policies and their helper functions.
-- =================================================================

-- Step 1: Drop all existing policies on all tables to remove dependencies.
-- The order here doesn't matter as we are removing all of them.
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.project_collaborators;
DROP POLICY IF EXISTS "Enable read access for project members" ON public.project_collaborators;
DROP POLICY IF EXISTS "Enable delete for project owners" ON public.project_collaborators;
DROP POLICY IF EXISTS "Enable update for project owners" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;

-- Step 2: Now that policies are dropped, we can safely drop the functions.
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();
DROP FUNCTION IF EXISTS public.handle_new_project(text, date, text);
DROP FUNCTION IF EXISTS public.get_user_id_from_email(text);
DROP FUNCTION IF EXISTS public.delete_user_account();

-- Step 3: Re-create all helper functions with improved security.
CREATE OR REPLACE FUNCTION public.get_user_accessible_projects()
RETURNS TABLE(project_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM projects WHERE user_id = auth.uid()
  UNION
  SELECT project_id FROM project_collaborators WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
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
    SELECT 1 FROM project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'editor'
  ) OR is_project_owner(p_project_id);
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid()
  ) OR is_project_owner(p_project_id);
$$;

-- Step 4: Re-create all policies in the correct order.

-- Policies for `projects` table
CREATE POLICY "Users can view their own and shared projects" ON public.projects
FOR SELECT USING (id IN (SELECT get_user_accessible_projects.project_id FROM get_user_accessible_projects()));

CREATE POLICY "Users can insert their own projects" ON public.projects
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own projects" ON public.projects
FOR UPDATE, DELETE USING (is_project_owner(id));

-- Policies for `project_collaborators`
CREATE POLICY "Enable read access for project members" ON public.project_collaborators
FOR SELECT USING (is_project_member(project_id));

CREATE POLICY "Enable management for project owners" ON public.project_collaborators
FOR INSERT, UPDATE, DELETE USING (is_project_owner(project_id));

-- Policies for main data tables
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries
FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries
FOR INSERT, UPDATE, DELETE USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions
FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions
FOR INSERT, UPDATE, DELETE USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts
FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts
FOR INSERT, UPDATE, DELETE USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.loans
FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans
FOR INSERT, UPDATE, DELETE USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.scenarios
FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios
FOR INSERT, UPDATE, DELETE USING (is_project_editor(project_id));

-- Policies for tables linked to main data
CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries
FOR ALL USING (is_project_editor((SELECT project_id FROM scenarios WHERE id = scenario_id)));

CREATE POLICY "Users can manage their own payments" ON public.payments
FOR ALL USING (is_project_editor((SELECT project_id FROM actual_transactions WHERE id = actual_id)));

-- Policies for user-specific, non-project tables
CREATE POLICY "Users can manage their own notes" ON public.notes
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tiers" ON public.tiers
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own referrals" ON public.referrals
FOR ALL USING (auth.uid() = referrer_user_id);

-- Policies for `profiles` table
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.profiles
FOR UPDATE USING (auth.uid() = id);
