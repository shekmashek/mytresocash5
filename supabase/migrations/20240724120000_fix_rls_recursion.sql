/*
          # [Refactor] RLS Policies Refactoring
          This migration completely refactors the Row Level Security (RLS) policies to prevent infinite recursion errors and follow security best practices.

          ## Query Description: 
          This operation will drop all existing RLS policies and helper functions, then recreate them using a more robust and secure pattern. It centralizes permission checks into a single SECURITY DEFINER function to break recursive loops between tables. This is a critical security and stability update. No data will be lost, but access rules will be redefined.

          ## Metadata:
          - Schema-Category: ["Structural", "Security"]
          - Impact-Level: ["High"]
          - Requires-Backup: false
          - Reversible: false
          
          ## Structure Details:
          - All RLS policies on tables: projects, project_collaborators, budget_entries, actual_transactions, cash_accounts, loans, scenarios, scenario_entries, payments, tiers, notes, consolidated_views, referrals.
          - All previous RLS helper functions.
          
          ## Security Implications:
          - RLS Status: Enabled
          - Policy Changes: Yes
          - Auth Requirements: This change is fundamental to how authentication and authorization work across the app.
          
          ## Performance Impact:
          - Indexes: None
          - Triggers: None
          - Estimated Impact: This may slightly improve query performance by simplifying RLS checks.
          */

-- Step 1: Drop all existing policies and helper functions to start fresh.
-- The order is important: drop policies before the functions they depend on.

-- Drop policies from all tables
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their projects" ON public.projects;

DROP POLICY IF EXISTS "Owners can manage collaborators for their projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Collaborators can view other collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.project_collaborators;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can manage budget entries for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Viewers can see budget entries" ON public.budget_entries;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can manage actuals for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Viewers can see actuals" ON public.actual_transactions;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can manage cash accounts for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Viewers can see cash accounts" ON public.cash_accounts;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Users can manage loans for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Viewers can see loans" ON public.loans;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can manage scenarios for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Viewers can see scenarios" ON public.scenarios;

DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage scenario entries for accessible scenarios" ON public.scenario_entries;
DROP POLICY IF EXISTS "Viewers can see scenario entries" ON public.scenario_entries;

DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can manage payments for accessible actuals" ON public.payments;
DROP POLICY IF EXISTS "Viewers can see payments" ON public.payments;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.tiers;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;

-- Drop old helper functions
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- Step 2: Create the new, robust architecture

-- This is the master helper function that centralizes permission checks.
-- As a SECURITY DEFINER, it bypasses the caller's RLS, thus breaking recursive loops.
CREATE OR REPLACE FUNCTION public.get_project_role(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search_path to prevent hijacking
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- First, check if the user is the direct owner of the project
  SELECT 'owner' INTO v_role
  FROM public.projects
  WHERE id = p_project_id AND user_id = auth.uid();
  
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- If not the owner, check if they are a collaborator
  SELECT role INTO v_role
  FROM public.project_collaborators
  WHERE project_id = p_project_id AND user_id = auth.uid();
  
  RETURN v_role; -- This will be 'editor', 'viewer', or NULL if not found
END;
$$;

-- Step 3: Recreate all RLS policies using the new helper function

-- projects
CREATE POLICY "Users can view projects they have access to" ON public.projects
  FOR SELECT USING (get_project_role(id) IS NOT NULL);
CREATE POLICY "Users can insert their own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their projects" ON public.projects
  FOR UPDATE USING (get_project_role(id) = 'owner');
CREATE POLICY "Owners can delete their projects" ON public.projects
  FOR DELETE USING (get_project_role(id) = 'owner');

-- project_collaborators
CREATE POLICY "Owners can manage collaborators" ON public.project_collaborators
  FOR ALL USING (get_project_role(project_id) = 'owner');
CREATE POLICY "Collaborators can view other collaborators" ON public.project_collaborators
  FOR SELECT USING (get_project_role(project_id) IS NOT NULL);

-- budget_entries
CREATE POLICY "Users can manage budget entries for accessible projects" ON public.budget_entries
  FOR ALL USING (get_project_role(project_id) IN ('owner', 'editor'));
CREATE POLICY "Viewers can see budget entries" ON public.budget_entries
  FOR SELECT USING (get_project_role(project_id) IS NOT NULL);

-- actual_transactions
CREATE POLICY "Users can manage actuals for accessible projects" ON public.actual_transactions
  FOR ALL USING (get_project_role(project_id) IN ('owner', 'editor'));
CREATE POLICY "Viewers can see actuals" ON public.actual_transactions
  FOR SELECT USING (get_project_role(project_id) IS NOT NULL);

-- cash_accounts
CREATE POLICY "Users can manage cash accounts for accessible projects" ON public.cash_accounts
  FOR ALL USING (get_project_role(project_id) IN ('owner', 'editor'));
CREATE POLICY "Viewers can see cash accounts" ON public.cash_accounts
  FOR SELECT USING (get_project_role(project_id) IS NOT NULL);

-- loans
CREATE POLICY "Users can manage loans for accessible projects" ON public.loans
  FOR ALL USING (get_project_role(project_id) IN ('owner', 'editor'));
CREATE POLICY "Viewers can see loans" ON public.loans
  FOR SELECT USING (get_project_role(project_id) IS NOT NULL);

-- scenarios
CREATE POLICY "Users can manage scenarios for accessible projects" ON public.scenarios
  FOR ALL USING (get_project_role(project_id) IN ('owner', 'editor'));
CREATE POLICY "Viewers can see scenarios" ON public.scenarios
  FOR SELECT USING (get_project_role(project_id) IS NOT NULL);

-- scenario_entries
CREATE POLICY "Users can manage scenario entries for accessible scenarios" ON public.scenario_entries
  FOR ALL USING (get_project_role((SELECT project_id FROM scenarios WHERE id = scenario_id)) IN ('owner', 'editor'));
CREATE POLICY "Viewers can see scenario entries" ON public.scenario_entries
  FOR SELECT USING (get_project_role((SELECT project_id FROM scenarios WHERE id = scenario_id)) IS NOT NULL);

-- payments
CREATE POLICY "Users can manage payments for accessible actuals" ON public.payments
  FOR ALL USING (get_project_role((SELECT project_id FROM actual_transactions WHERE id = actual_id)) IN ('owner', 'editor'));
CREATE POLICY "Viewers can see payments" ON public.payments
  FOR SELECT USING (get_project_role((SELECT project_id FROM actual_transactions WHERE id = actual_id)) IS NOT NULL);

-- tiers
CREATE POLICY "Users can manage their own tiers" ON public.tiers
  FOR ALL USING (auth.uid() = user_id);

-- notes
CREATE POLICY "Users can manage their own notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id);

-- consolidated_views
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views
  FOR ALL USING (auth.uid() = user_id);

-- referrals
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_user_id);
CREATE POLICY "Users can insert their own referral records" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_user_id);
