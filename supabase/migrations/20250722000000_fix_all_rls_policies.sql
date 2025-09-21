/*
          # [Refactor] RLS Policies and Helper Functions
          [This script completely rebuilds all Row Level Security (RLS) policies and their dependent helper functions to resolve dependency conflicts during migration.]

          ## Query Description: [This operation is a safe refactoring of security rules. It will first remove all existing RLS policies and helper functions, then recreate them in the correct order. There is no risk to your existing data, but it is a critical step to ensure the database security model is stable and correct. This will resolve the "cannot drop function because other objects depend on it" error.]
          
          ## Metadata:
          - Schema-Category: ["Structural", "Security"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          - Drops and recreates all RLS policies on all tables.
          - Drops and recreates all SQL helper functions (`is_project_owner`, `is_project_editor`, etc.).
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [This script ensures that all data access is correctly restricted to the authenticated user and their collaborators.]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Negligible performance impact. This is a structural change to security rules.]
          */

-- =================================================================
--  Step 1: Drop all existing policies to ensure a clean slate
-- =================================================================
-- This is crucial to avoid dependency errors when dropping functions.

-- Drop policies on 'projects' table
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Drop policies on 'project_collaborators' table
DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborations for their projects" ON public.project_collaborators;

-- Drop policies on 'budget_entries' table
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;

-- Drop policies on 'actual_transactions' table
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;

-- Drop policies on 'cash_accounts' table
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;

-- Drop policies on 'loans' table
DROP POLICY IF EXISTS "Users can view their loans" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;

-- Drop policies on 'scenarios' table
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;

-- Drop policies on 'scenario_entries' table
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;

-- Drop policies on 'payments' table
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;

-- Drop policies on 'notes' table
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;

-- Drop policies on 'tiers' table
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;

-- Drop policies on 'consolidated_views' table
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;

-- Drop policies on 'referrals' table
DROP POLICY IF EXISTS "Users can manage their own referrals" ON public.referrals;

-- Drop policies on 'profiles' table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;


-- =================================================================
-- Step 2: Drop all helper functions
-- =================================================================
-- Now that policies are gone, we can safely drop the functions.
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_project(text, date, text);
DROP FUNCTION IF EXISTS public.get_user_id_from_email(text);
DROP FUNCTION IF EXISTS public.delete_user_account();

-- =================================================================
-- Step 3: Recreate all helper functions with security improvements
-- =================================================================

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

CREATE OR REPLACE FUNCTION public.is_project_viewer(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'viewer'
  ) OR is_project_editor(p_project_id);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    substring(md5(random()::text) for 10)
  );
  
  -- Handle referral
  IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_user_id, referred_user_id, status)
    SELECT id, new.id, 'pending' FROM public.profiles WHERE referral_code = new.raw_user_meta_data->>'referral_code';
  END IF;

  RETURN new;
END;
$$;

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
  VALUES (new_project_id, auth.uid(), 'cash', 'Caisse Espèce', 0, project_start_date)
  RETURNING id INTO new_cash_account_id;
  
  RETURN new_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_id_from_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = p_email;
  RETURN user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- This will cascade delete all related data due to foreign key constraints
  DELETE FROM public.projects WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE id = auth.uid();
  
  -- Finally, delete the user from auth.users
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- =================================================================
-- Step 4: Recreate all policies
-- =================================================================

-- Policies for 'profiles'
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for 'projects'
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (is_project_editor(id));
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (is_project_owner(id));

-- Policies for 'project_collaborators'
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage collaborators" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));
CREATE POLICY "Users can view collaborations for their projects" ON public.project_collaborators FOR SELECT USING (is_project_viewer(project_id));

-- Policies for 'budget_entries'
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view entries for their projects" ON public.budget_entries FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (is_project_editor(project_id));

-- Policies for 'actual_transactions'
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view actuals for their projects" ON public.actual_transactions FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (is_project_editor(project_id));

-- Policies for 'cash_accounts'
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their cash accounts" ON public.cash_accounts FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (is_project_editor(project_id));

-- Policies for 'loans'
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their loans" ON public.loans FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (is_project_editor(project_id));

-- Policies for 'scenarios'
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their scenarios" ON public.scenarios FOR SELECT USING (project_id IN (SELECT project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (is_project_editor(project_id));

-- Policies for 'scenario_entries'
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (
    is_project_editor((SELECT project_id FROM scenarios WHERE id = scenario_id))
);

-- Policies for 'payments'
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (auth.uid() = user_id);

-- Policies for 'notes'
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Policies for 'tiers'
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);

-- Policies for 'consolidated_views'
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);

-- Policies for 'referrals'
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (auth.uid() = referrer_user_id);
