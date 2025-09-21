/*
          # [Refactor] RLS Policies Refactoring
          [This script refactors all Row Level Security (RLS) policies to use helper functions, preventing infinite recursion issues and improving security and maintainability. It also makes the script idempotent by dropping existing policies before recreating them.]

          ## Query Description: [This operation will completely redefine the security rules for accessing your data. It will first drop all existing policies on your tables and then recreate them with a more secure and robust logic. There is no risk to your existing data, but it's a critical change to the application's security architecture.]
          
          ## Metadata:
          - Schema-Category: ["Structural", "Security"]
          - Impact-Level: ["High"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          - Affects RLS policies on tables: projects, cash_accounts, budget_entries, actual_transactions, payments, tiers, scenarios, scenario_entries, notes, loans, consolidated_views, project_collaborators.
          - Creates helper functions: is_project_owner, is_project_member, is_project_editor, is_project_viewer.
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [All data access will be strictly governed by the new policies, ensuring users can only access their own data or data shared with them.]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Slight overhead on queries due to RLS checks, but this is necessary for security and is optimized by Supabase.]
          */

-- =================================================================
-- Step 1: Create Helper Functions for RLS Policies
-- These functions will be used in our policies to avoid recursion.
-- =================================================================

-- Drop existing functions if they exist to ensure a clean slate
DROP FUNCTION IF EXISTS is_project_owner(uuid);
DROP FUNCTION IF EXISTS is_project_member(uuid);
DROP FUNCTION IF EXISTS is_project_editor(uuid);
DROP FUNCTION IF EXISTS is_project_viewer(uuid);

-- Function to check if the current user is the owner of a project
CREATE OR REPLACE FUNCTION is_project_owner(project_id_to_check uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = project_id_to_check AND user_id = auth.uid()
  );
$$;

-- Function to check if the current user is a member (owner or collaborator) of a project
CREATE OR REPLACE FUNCTION is_project_member(project_id_to_check uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = project_id_to_check AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = project_id_to_check AND user_id = auth.uid()
  );
$$;

-- Function to check if the current user has editor rights on a project
CREATE OR REPLACE FUNCTION is_project_editor(project_id_to_check uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = project_id_to_check AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = project_id_to_check AND user_id = auth.uid() AND role = 'editor'
  );
$$;

-- Function to check if the current user has viewer rights on a project
CREATE OR REPLACE FUNCTION is_project_viewer(project_id_to_check uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = project_id_to_check AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = project_id_to_check AND user_id = auth.uid() AND role IN ('editor', 'viewer')
  );
$$;


-- =================================================================
-- Step 2: Drop all existing policies before recreating them
-- This makes the script idempotent.
-- =================================================================

-- Drop policies for 'projects'
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their own projects" ON public.projects;

-- Drop policies for 'cash_accounts'
DROP POLICY IF EXISTS "Users can manage cash accounts for their accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view cash accounts for their accessible projects" ON public.cash_accounts;

-- Drop policies for 'budget_entries'
DROP POLICY IF EXISTS "Users can manage budget entries for their accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view budget entries for their accessible projects" ON public.budget_entries;

-- Drop policies for 'actual_transactions'
DROP POLICY IF EXISTS "Users can manage actuals for their accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view actuals for their accessible projects" ON public.actual_transactions;

-- Drop policies for 'payments'
DROP POLICY IF EXISTS "Users can manage payments for their accessible projects" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments for their accessible projects" ON public.payments;

-- Drop policies for 'tiers'
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;

-- Drop policies for 'scenarios'
DROP POLICY IF EXISTS "Users can manage scenarios for their accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view scenarios for their accessible projects" ON public.scenarios;

-- Drop policies for 'scenario_entries'
DROP POLICY IF EXISTS "Users can manage scenario entries for their accessible projects" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can view scenario entries for their accessible projects" ON public.scenario_entries;

-- Drop policies for 'notes'
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;

-- Drop policies for 'loans'
DROP POLICY IF EXISTS "Users can manage loans for their accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Users can view loans for their accessible projects" ON public.loans;

-- Drop policies for 'consolidated_views'
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;

-- Drop policies for 'project_collaborators'
DROP POLICY IF EXISTS "Users can view collaborators of their own projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Owners can manage collaborators for their own projects" ON public.project_collaborators;

-- =================================================================
-- Step 3: Recreate all policies using the helper functions
-- =================================================================

-- Policies for 'projects' table
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT TO authenticated USING (is_project_member(id));
CREATE POLICY "Owners can update their own projects" ON public.projects FOR UPDATE TO authenticated USING (is_project_owner(id)) WITH CHECK (is_project_owner(id));
CREATE POLICY "Owners can delete their own projects" ON public.projects FOR DELETE TO authenticated USING (is_project_owner(id));

-- Policies for 'cash_accounts'
CREATE POLICY "Users can manage cash accounts for their accessible projects" ON public.cash_accounts FOR ALL TO authenticated USING (is_project_editor(project_id)) WITH CHECK (is_project_editor(project_id));
CREATE POLICY "Users can view cash accounts for their accessible projects" ON public.cash_accounts FOR SELECT TO authenticated USING (is_project_member(project_id));

-- Policies for 'budget_entries'
CREATE POLICY "Users can manage budget entries for their accessible projects" ON public.budget_entries FOR ALL TO authenticated USING (is_project_editor(project_id)) WITH CHECK (is_project_editor(project_id));
CREATE POLICY "Users can view budget entries for their accessible projects" ON public.budget_entries FOR SELECT TO authenticated USING (is_project_member(project_id));

-- Policies for 'actual_transactions'
CREATE POLICY "Users can manage actuals for their accessible projects" ON public.actual_transactions FOR ALL TO authenticated USING (is_project_editor(project_id)) WITH CHECK (is_project_editor(project_id));
CREATE POLICY "Users can view actuals for their accessible projects" ON public.actual_transactions FOR SELECT TO authenticated USING (is_project_member(project_id));

-- Policies for 'payments'
CREATE POLICY "Users can manage payments for their accessible projects" ON public.payments FOR ALL TO authenticated USING (is_project_editor((SELECT project_id FROM actual_transactions WHERE id = actual_id))) WITH CHECK (is_project_editor((SELECT project_id FROM actual_transactions WHERE id = actual_id)));
CREATE POLICY "Users can view payments for their accessible projects" ON public.payments FOR SELECT TO authenticated USING (is_project_member((SELECT project_id FROM actual_transactions WHERE id = actual_id)));

-- Policies for 'tiers'
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies for 'scenarios'
CREATE POLICY "Users can manage scenarios for their accessible projects" ON public.scenarios FOR ALL TO authenticated USING (is_project_editor(project_id)) WITH CHECK (is_project_editor(project_id));
CREATE POLICY "Users can view scenarios for their accessible projects" ON public.scenarios FOR SELECT TO authenticated USING (is_project_member(project_id));

-- Policies for 'scenario_entries'
CREATE POLICY "Users can manage scenario entries for their accessible projects" ON public.scenario_entries FOR ALL TO authenticated USING (is_project_editor((SELECT project_id FROM scenarios WHERE id = scenario_id))) WITH CHECK (is_project_editor((SELECT project_id FROM scenarios WHERE id = scenario_id)));
CREATE POLICY "Users can view scenario entries for their accessible projects" ON public.scenario_entries FOR SELECT TO authenticated USING (is_project_member((SELECT project_id FROM scenarios WHERE id = scenario_id)));

-- Policies for 'notes'
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies for 'loans'
CREATE POLICY "Users can manage loans for their accessible projects" ON public.loans FOR ALL TO authenticated USING (is_project_editor(project_id)) WITH CHECK (is_project_editor(project_id));
CREATE POLICY "Users can view loans for their accessible projects" ON public.loans FOR SELECT TO authenticated USING (is_project_member(project_id));

-- Policies for 'consolidated_views'
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies for 'project_collaborators'
CREATE POLICY "Users can view collaborators of their own projects" ON public.project_collaborators FOR SELECT TO authenticated USING (is_project_owner(project_id));
CREATE POLICY "Owners can manage collaborators for their own projects" ON public.project_collaborators FOR ALL TO authenticated USING (is_project_owner(project_id)) WITH CHECK (is_project_owner(project_id));
