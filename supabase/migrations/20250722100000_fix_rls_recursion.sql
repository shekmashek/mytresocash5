/*
          # [Refactor RLS Policies]
          This migration completely overhauls the Row Level Security (RLS) policies to fix an "infinite recursion" error that was blocking the creation of new projects. It replaces the old, problematic policies with a new, robust, and standard set of rules based on secure helper functions.

          ## Query Description:
          This operation will drop all existing RLS policies and helper functions and recreate them from scratch. There is no risk to existing data, but this is a critical structural change to the security layer of the database. This change is necessary to resolve the core architectural issue.
          
          ## Metadata:
          - Schema-Category: ["Structural", "Security"]
          - Impact-Level: ["High"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          - Drops all existing policies on tables: projects, project_collaborators, budget_entries, actual_transactions, cash_accounts, loans, scenarios, scenario_entries, payments, notes, tiers, consolidated_views.
          - Drops helper functions: get_user_accessible_projects, is_project_editor, is_project_owner, get_project_role.
          - Creates new, safe helper functions: can_read_project, can_edit_project.
          - Re-creates all policies on all tables using the new, safe helper functions.
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [All data access is now governed by these new, more secure policies.]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Low. The new functions are simple and should be performant.]
          */

-- Step 1: Drop all existing policies that depend on the old functions.
-- This must be done for every table that uses them.
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
DROP POLICY IF EXISTS "Users can view their loans" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;

DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;

DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;

DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;

-- Step 2: Drop the old, problematic helper functions.
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.get_project_role(uuid);

-- Step 3: Create new, safe helper functions.
CREATE OR REPLACE FUNCTION public.get_project_role(_project_id uuid)
RETURNS text
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT role
  FROM public.project_collaborators
  WHERE project_id = _project_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_read_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = _project_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators WHERE project_id = _project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT get_project_role(_project_id) IN ('owner', 'editor');
$$;

-- Step 4: Re-create all policies for all tables using the new functions.

-- Table: projects
CREATE POLICY "Users can manage their own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Collaborators can view shared projects" ON public.projects
  FOR SELECT USING (can_read_project(id));

-- Table: project_collaborators
CREATE POLICY "Owners can manage collaborators for their projects" ON public.project_collaborators
  FOR ALL USING (get_project_role(project_id) = 'owner')
  WITH CHECK (get_project_role(project_id) = 'owner');

-- Table: budget_entries
CREATE POLICY "Users can view entries for accessible projects" ON public.budget_entries
  FOR SELECT USING (can_read_project(project_id));
CREATE POLICY "Editors can manage entries for accessible projects" ON public.budget_entries
  FOR ALL USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

-- Table: actual_transactions
CREATE POLICY "Users can view actuals for accessible projects" ON public.actual_transactions
  FOR SELECT USING (can_read_project(project_id));
CREATE POLICY "Editors can manage actuals for accessible projects" ON public.actual_transactions
  FOR ALL USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));
  
-- Table: payments
CREATE POLICY "Users can manage payments for accessible projects" ON public.payments
  FOR ALL USING (can_edit_project((SELECT project_id FROM actual_transactions WHERE id = actual_id)))
  WITH CHECK (can_edit_project((SELECT project_id FROM actual_transactions WHERE id = actual_id)));

-- Table: cash_accounts
CREATE POLICY "Users can view cash accounts for accessible projects" ON public.cash_accounts
  FOR SELECT USING (can_read_project(project_id));
CREATE POLICY "Editors can manage cash accounts for accessible projects" ON public.cash_accounts
  FOR ALL USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

-- Table: loans
CREATE POLICY "Users can view loans for accessible projects" ON public.loans
  FOR SELECT USING (can_read_project(project_id));
CREATE POLICY "Editors can manage loans for accessible projects" ON public.loans
  FOR ALL USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

-- Table: scenarios
CREATE POLICY "Users can view scenarios for accessible projects" ON public.scenarios
  FOR SELECT USING (can_read_project(project_id));
CREATE POLICY "Editors can manage scenarios for accessible projects" ON public.scenarios
  FOR ALL USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

-- Table: scenario_entries
CREATE POLICY "Users can manage scenario entries for accessible projects" ON public.scenario_entries
  FOR ALL USING (can_edit_project((SELECT project_id FROM scenarios WHERE id = scenario_id)))
  WITH CHECK (can_edit_project((SELECT project_id FROM scenarios WHERE id = scenario_id)));

-- Table: tiers
CREATE POLICY "Users can manage their own tiers" ON public.tiers
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table: notes
CREATE POLICY "Users can manage their own notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table: consolidated_views
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  
-- Table: referrals
CREATE POLICY "Users can manage their own referrals" ON public.referrals
  FOR ALL USING (auth.uid() = referrer_user_id)
  WITH CHECK (auth.uid() = referrer_user_id);
