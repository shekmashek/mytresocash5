-- =================================================================
-- Step 1: Drop all existing RLS policies to ensure a clean slate
-- This is ordered to drop policies before the functions they depend on.
-- =================================================================

-- Drop policies from all tables
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can manage their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators for their projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;


-- =================================================================
-- Step 2: Drop all helper functions
-- =================================================================

DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();
DROP FUNCTION IF EXISTS public.handle_new_project(text, date, text);
DROP FUNCTION IF EXISTS public.get_user_id_from_email(text);
DROP FUNCTION IF EXISTS public.delete_user_account();


-- =================================================================
-- Step 3: Recreate all helper functions with security definer
-- =================================================================

-- Function to get all project_ids a user has access to (owned or collaborated)
create or replace function public.get_user_accessible_projects()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
    select project_id from project_collaborators where user_id = auth.uid()
    union
    select id from projects where user_id = auth.uid();
$$;

-- Function to check if a user is the owner of a project
create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from projects where id = p_project_id and user_id = auth.uid());
$$;

-- Function to check if a user is an editor of a project
create or replace function public.is_project_editor(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from project_collaborators 
    where project_id = p_project_id and user_id = auth.uid() and role = 'editor'
  ) or is_project_owner(p_project_id);
$$;

-- Function to handle new project creation atomically
CREATE OR REPLACE FUNCTION public.handle_new_project(project_name text, project_start_date date, project_currency text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project_id uuid;
  new_cash_account_id uuid;
BEGIN
  -- Insert the new project
  INSERT INTO public.projects (user_id, name, start_date, currency)
  VALUES (auth.uid(), project_name, project_start_date, project_currency)
  RETURNING id INTO new_project_id;

  -- Create a default cash account for the new project
  INSERT INTO public.cash_accounts (project_id, user_id, main_category_id, name, initial_balance, initial_balance_date)
  VALUES (new_project_id, auth.uid(), 'cash', 'Caisse Espèce', 0, project_start_date);

  RETURN new_project_id;
END;
$$;

-- Function to get user ID from email
CREATE OR REPLACE FUNCTION public.get_user_id_from_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = p_email;
  RETURN user_id;
END;
$$;

-- Function to delete a user's account and all their data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This will cascade delete all related data due to foreign key constraints
  DELETE FROM projects WHERE user_id = auth.uid();
  DELETE FROM profiles WHERE id = auth.uid();
  
  -- Finally, delete the user from auth.users
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;


-- =================================================================
-- Step 4: Re-enable RLS and recreate all policies
-- =================================================================

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (id IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (is_project_owner(id));
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (is_project_owner(id));

-- Project Collaborators
CREATE POLICY "Users can view collaborators for their projects" ON public.project_collaborators FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Project owners can manage collaborators" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));

-- Generic data tables (budget_entries, actual_transactions, cash_accounts, loans, scenarios)
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (is_project_editor(project_id));

-- Scenario Entries
CREATE POLICY "Users can view data for accessible projects" ON public.scenario_entries FOR SELECT USING (get_project_id_from_scenario(scenario_id) IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (is_project_editor(get_project_id_from_scenario(scenario_id)));

-- Payments
CREATE POLICY "Users can view payments for their projects" ON public.payments FOR SELECT USING (get_project_id_from_actual(actual_id) IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Users can manage payments for their projects" ON public.payments FOR ALL USING (is_project_editor(get_project_id_from_actual(actual_id)));

-- User-specific tables (tiers, notes, consolidated_views, referrals)
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (auth.uid() = referrer_user_id);
