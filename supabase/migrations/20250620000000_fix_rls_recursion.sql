-- =============================================
-- Step 1: Drop all existing policies and functions to ensure a clean slate
-- =============================================

-- Drop policies from all tables in the correct order (dependents first)
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Users can view their loans" ON public.loans;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments for accessible actuals" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Enable all actions for project owners" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators for their projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- =============================================
-- Step 2: Recreate helper functions with secure, non-recursive logic
-- =============================================

/*
# [Function] get_user_role
[Description: Returns the role of the current user for a given project.
Roles can be 'owner', 'editor', or 'viewer'. Returns NULL if the user has no access.]

## Query Description: [This function safely checks if a user is the owner of a project or a collaborator. It is designed to be used in RLS policies without causing recursion.]
## Metadata:
- Schema-Category: ["Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]
*/
CREATE OR REPLACE FUNCTION public.get_user_role(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT
    CASE
      WHEN p.user_id = auth.uid() THEN 'owner'
      ELSE pc.role
    END
  INTO v_role
  FROM projects p
  LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = auth.uid()
  WHERE p.id = p_project_id AND (p.user_id = auth.uid() OR pc.user_id = auth.uid());

  RETURN v_role;
END;
$$;

-- =============================================
-- Step 3: Recreate RLS policies for all tables
-- =============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (get_user_role(id) IS NOT NULL);
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (get_user_role(id) = 'owner');
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (get_user_role(id) = 'owner');

-- Project Collaborators
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view collaborators for their projects" ON public.project_collaborators FOR SELECT USING (get_user_role(project_id) IS NOT NULL);
CREATE POLICY "Enable all actions for project owners" ON public.project_collaborators FOR ALL USING (get_user_role(project_id) = 'owner');

-- Budget Entries
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (get_user_role(project_id) IS NOT NULL);
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (get_user_role(project_id) IN ('owner', 'editor'));

-- Actual Transactions
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (get_user_role(project_id) IS NOT NULL);
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (get_user_role(project_id) IN ('owner', 'editor'));

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view payments for accessible actuals" ON public.payments FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM actual_transactions at
    WHERE at.id = payments.actual_id AND get_user_role(at.project_id) IS NOT NULL
  )
);
CREATE POLICY "Editors can manage payments for accessible actuals" ON public.payments FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM actual_transactions at
    WHERE at.id = payments.actual_id AND get_user_role(at.project_id) IN ('owner', 'editor')
  )
);

-- Cash Accounts
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (get_user_role(project_id) IS NOT NULL);
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (get_user_role(project_id) IN ('owner', 'editor'));

-- Loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (get_user_role(project_id) IS NOT NULL);
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (get_user_role(project_id) IN ('owner', 'editor'));

-- Scenarios
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (get_user_role(project_id) IS NOT NULL);
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (get_user_role(project_id) IN ('owner', 'editor'));

-- Scenario Entries
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view scenario entries for accessible scenarios" ON public.scenario_entries FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM scenarios s
    WHERE s.id = scenario_entries.scenario_id AND get_user_role(s.project_id) IS NOT NULL
  )
);
CREATE POLICY "Editors can manage scenario entries for accessible scenarios" ON public.scenario_entries FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM scenarios s
    WHERE s.id = scenario_entries.scenario_id AND get_user_role(s.project_id) IN ('owner', 'editor')
  )
);

-- Notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Tiers
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);

-- Consolidated Views
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);

-- Referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (auth.uid() = referrer_user_id);
