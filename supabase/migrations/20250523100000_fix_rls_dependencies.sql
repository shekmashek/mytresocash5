-- Drop all policies that might depend on the functions to be dropped.
-- This ensures a clean slate before recreating them.
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can manage collaborators for their projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators for accessible projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;

-- Now, safely drop the functions.
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- Re-create helper functions with security definer for proper RLS execution.
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND (role = 'editor' OR role = 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_viewer(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create RLS policies for all tables.

-- Table: projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (is_project_viewer(id));
CREATE POLICY "Users can manage their own projects" ON public.projects FOR ALL USING (is_project_owner(id));

-- Table: project_collaborators
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view collaborators for accessible projects" ON public.project_collaborators FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Owners can manage collaborators for their projects" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));

-- Tables with direct project_id link
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (is_project_editor(project_id));

-- Tables with user_id but no project_id
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);

-- Tables with indirect project links
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.scenarios s
    WHERE s.id = scenario_entries.scenario_id AND is_project_editor(s.project_id)
  )
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.actual_transactions at_
    WHERE at_.id = payments.actual_id AND is_project_editor(at_.project_id)
  )
);
