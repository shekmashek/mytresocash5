/*
          # [Corrective Migration] Fix RLS Policies and Function Dependencies
          [This script corrects dependency issues from the previous migration by properly dropping and recreating RLS policies and their helper functions.]

          ## Query Description: [This operation rebuilds the security layer for collaboration. It will temporarily drop all data access policies, redefine the security functions, and then re-apply all policies correctly. There is no risk to existing data, but it is a critical structural change.]
          
          ## Metadata:
          - Schema-Category: ["Structural", "Security"]
          - Impact-Level: ["Medium"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          - Affects RLS policies on all major tables.
          - Affects helper functions: is_project_owner, is_project_editor, is_project_viewer.
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [Authenticated Users]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Low. A brief moment of policy recalculation.]
          */

-- =================================================================
-- 1. Drop existing policies that have dependencies
-- =================================================================

-- Drop policies on 'projects'
ALTER TABLE public.projects DROP POLICY IF EXISTS "Users can view their own and shared projects";
ALTER TABLE public.projects DROP POLICY IF EXISTS "Users can insert their own projects";
ALTER TABLE public.projects DROP POLICY IF EXISTS "Owners can update their own projects";
ALTER TABLE public.projects DROP POLICY IF EXISTS "Owners can delete their own projects";

-- Drop policies on 'project_collaborators'
ALTER TABLE public.project_collaborators DROP POLICY IF EXISTS "Owners can manage collaborators for their projects";
ALTER TABLE public.project_collaborators DROP POLICY IF EXISTS "Users can view collaborations for projects they have access to";

-- Drop policies on 'budget_entries'
ALTER TABLE public.budget_entries DROP POLICY IF EXISTS "Users can manage data for their own projects";
ALTER TABLE public.budget_entries DROP POLICY IF EXISTS "Editors can manage data for accessible projects";
ALTER TABLE public.budget_entries DROP POLICY IF EXISTS "Viewers can read data for accessible projects";

-- Drop policies on 'actual_transactions'
ALTER TABLE public.actual_transactions DROP POLICY IF EXISTS "Users can manage data for their own projects";
ALTER TABLE public.actual_transactions DROP POLICY IF EXISTS "Editors can manage data for accessible projects";
ALTER TABLE public.actual_transactions DROP POLICY IF EXISTS "Viewers can read data for accessible projects";

-- Drop policies on 'cash_accounts'
ALTER TABLE public.cash_accounts DROP POLICY IF EXISTS "Users can manage data for their own projects";
ALTER TABLE public.cash_accounts DROP POLICY IF EXISTS "Editors can manage data for accessible projects";
ALTER TABLE public.cash_accounts DROP POLICY IF EXISTS "Viewers can read data for accessible projects";

-- Drop policies on 'loans'
ALTER TABLE public.loans DROP POLICY IF EXISTS "Users can manage data for their own projects";
ALTER TABLE public.loans DROP POLICY IF EXISTS "Editors can manage data for accessible projects";
ALTER TABLE public.loans DROP POLICY IF EXISTS "Viewers can read data for accessible projects";

-- Drop policies on 'scenarios'
ALTER TABLE public.scenarios DROP POLICY IF EXISTS "Users can manage data for their own projects";
ALTER TABLE public.scenarios DROP POLICY IF EXISTS "Editors can manage data for accessible projects";
ALTER TABLE public.scenarios DROP POLICY IF EXISTS "Viewers can read data for accessible projects";

-- Drop policies on 'scenario_entries'
ALTER TABLE public.scenario_entries DROP POLICY IF EXISTS "Users can manage their own scenario entries";

-- Drop policies on 'payments'
ALTER TABLE public.payments DROP POLICY IF EXISTS "Users can manage their own payments";

-- Drop policies on 'notes'
ALTER TABLE public.notes DROP POLICY IF EXISTS "Users can manage their own notes";

-- Drop policies on 'tiers'
ALTER TABLE public.tiers DROP POLICY IF EXISTS "Users can manage their own tiers";

-- Drop policies on 'consolidated_views'
ALTER TABLE public.consolidated_views DROP POLICY IF EXISTS "Users can manage their own consolidated views";

-- =================================================================
-- 2. Drop helper functions
-- =================================================================
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);

-- =================================================================
-- 3. Recreate helper functions with security best practices
-- =================================================================

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role = 'editor'
  ) OR is_project_owner(p_project_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_project_viewer(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  ) OR is_project_owner(p_project_id);
END;
$$;

-- =================================================================
-- 4. Re-enable RLS and recreate all policies
-- =================================================================

-- Policies for 'projects' table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (is_project_viewer(id));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their own projects" ON public.projects FOR UPDATE USING (is_project_owner(id));
CREATE POLICY "Owners can delete their own projects" ON public.projects FOR DELETE USING (is_project_owner(id));

-- Policies for 'project_collaborators' table
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage collaborators for their projects" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));
CREATE POLICY "Users can view collaborations for projects they have access to" ON public.project_collaborators FOR SELECT USING (is_project_viewer(project_id));

-- Policies for 'budget_entries' table
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage data for accessible projects" ON public.budget_entries FOR ALL USING (is_project_viewer(project_id));

-- Policies for 'actual_transactions' table
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (is_project_viewer(project_id));

-- Policies for 'cash_accounts' table
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (is_project_viewer(project_id));

-- Policies for 'loans' table
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage data for accessible projects" ON public.loans FOR ALL USING (is_project_viewer(project_id));

-- Policies for 'scenarios' table
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage data for accessible projects" ON public.scenarios FOR ALL USING (is_project_viewer(project_id));

-- Policies for 'scenario_entries' table
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.scenarios
    WHERE id = scenario_id AND is_project_editor(project_id)
  )
);

-- Policies for 'payments' table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (auth.uid() = user_id);

-- Policies for 'notes' table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Policies for 'tiers' table
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);

-- Policies for 'consolidated_views' table
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);
