/*
  # [SECURITY & COLLABORATION] RLS Policy Overhaul

  This migration completely overhauls the Row Level Security (RLS) policies to introduce a robust, role-based collaboration system. It also fixes idempotency issues from previous migrations.

  ## Query Description:
  This script will:
  1. Drop all existing RLS policies on the main data tables to avoid conflicts.
  2. Drop the helper functions used by these policies.
  3. Re-create the helper functions with improved security (setting `search_path`).
  4. Re-create all RLS policies with new, more granular logic that supports 'owner', 'editor', and 'viewer' roles.

  This is a critical structural change. It ensures that data is only accessible by the owner of a project or users explicitly invited as collaborators.

  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "High"
  - Requires-Backup: true
  - Reversible: false (requires manual policy recreation)

  ## Security Implications:
  - RLS Status: Enabled on all user data tables.
  - Policy Changes: Yes. All policies are redefined.
  - Auth Requirements: All data access is now gated by `auth.uid()`.
*/

-- Step 1: Drop all existing policies on all tables to ensure a clean slate.
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;

DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenario_entries;

DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.payments;

DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can view their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can manage their own data" ON public.tiers;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own data" ON public.notes;

DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can view their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own data" ON public.consolidated_views;

DROP POLICY IF EXISTS "Users can manage their own collaborations" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborations for their projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Owners can manage collaborations for their projects" ON public.project_collaborators;

DROP POLICY IF EXISTS "Users can manage their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can manage their own data" ON public.referrals;

DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their own projects" ON public.projects;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- Step 2: Drop the helper functions. Now that no policies depend on them, this will succeed.
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.check_project_access(uuid, text);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- Step 3: Re-create the helper functions with improved security.
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT is_project_owner(p_project_id) OR EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'editor'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_viewer(p_project_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT is_project_owner(p_project_id) OR EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role IN ('viewer', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.check_project_access(p_project_id uuid, required_role text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF required_role = 'owner' THEN RETURN is_project_owner(p_project_id);
  ELSIF required_role = 'editor' THEN RETURN is_project_editor(p_project_id);
  ELSIF required_role = 'viewer' THEN RETURN is_project_viewer(p_project_id);
  ELSE RETURN false;
  END IF;
END;
$$;

-- Step 4: Re-create all RLS policies.
-- profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- projects
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (check_project_access(id, 'viewer'));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their own projects" ON public.projects FOR UPDATE USING (check_project_access(id, 'owner'));
CREATE POLICY "Owners can delete their own projects" ON public.projects FOR DELETE USING (check_project_access(id, 'owner'));

-- project_collaborators
CREATE POLICY "Owners can manage collaborations for their projects" ON public.project_collaborators FOR ALL USING (check_project_access(project_id, 'owner'));

-- Data tables
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (check_project_access(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (check_project_access(project_id, 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (check_project_access(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (check_project_access(project_id, 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (check_project_access(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (check_project_access(project_id, 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (check_project_access(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (check_project_access(project_id, 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (check_project_access(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (check_project_access(project_id, 'editor'));

CREATE POLICY "Editors can manage data for accessible projects" ON public.scenario_entries FOR ALL USING (check_project_access((SELECT project_id FROM scenarios WHERE id = scenario_id), 'editor'));
CREATE POLICY "Editors can manage data for accessible projects" ON public.payments FOR ALL USING (check_project_access((SELECT project_id FROM actual_transactions WHERE id = actual_id), 'editor'));

-- User-specific tables
CREATE POLICY "Users can manage their own data" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.referrals FOR ALL USING (auth.uid() = referrer_user_id);
