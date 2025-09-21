/*
          # [Correctif de Dépendances SQL]
          Ce script corrige les erreurs de dépendance en réorganisant l'ordre de suppression et de création des politiques de sécurité et des fonctions associées.

          ## Query Description: [Ce script va d'abord supprimer toutes les politiques de sécurité (RLS) liées à la collaboration, puis les fonctions d'aide, avant de les recréer proprement. Cette opération est sécuritaire et ne causera aucune perte de données.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          [Affecte les politiques RLS sur les tables: projects, budget_entries, actual_transactions, cash_accounts, loans, scenarios, scenario_entries, payments, et les fonctions: get_user_accessible_projects, is_project_owner, is_project_editor, is_project_viewer]
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [N/A]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Aucun impact sur les performances.]
          */

-- 1. Drop all policies that depend on the functions
-- on budget_entries
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
-- on actual_transactions
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
-- on cash_accounts
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;
-- on loans
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
-- on scenarios
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
-- on scenario_entries
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
-- on payments
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
-- on projects
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
-- on project_collaborators
DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators for their projects" ON public.project_collaborators;
-- on tiers
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
-- on notes
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
-- on consolidated_views
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;

-- 2. Drop the functions
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- 3. Recreate the helper functions with security enhancements
CREATE OR REPLACE FUNCTION public.get_user_accessible_projects()
RETURNS TABLE(project_id uuid, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  select
      pc.project_id,
      pc.role
  from
      project_collaborators pc
  where
      pc.user_id = auth.uid()
  union
  select
      p.id as project_id,
      'owner' as role
  from
      projects p
  where
      p.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM projects
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
    FROM get_user_accessible_projects() AS accessible_projects
    WHERE accessible_projects.project_id = p_project_id AND accessible_projects.role IN ('owner', 'editor')
  );
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
    FROM get_user_accessible_projects() AS accessible_projects
    WHERE accessible_projects.project_id = p_project_id
  );
END;
$$;

-- 4. Recreate all policies in the correct order
-- projects
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (is_project_viewer(id));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (is_project_owner(id));
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (is_project_owner(id));

-- project_collaborators
CREATE POLICY "Owners can manage collaborators" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));
CREATE POLICY "Users can view collaborators for their projects" ON public.project_collaborators FOR SELECT USING (is_project_viewer(project_id));

-- budget_entries
CREATE POLICY "Users can view entries for their projects" ON public.budget_entries FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (is_project_editor(project_id));

-- actual_transactions
CREATE POLICY "Users can view actuals for their projects" ON public.actual_transactions FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (is_project_editor(project_id));

-- cash_accounts
CREATE POLICY "Users can view their cash accounts" ON public.cash_accounts FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (is_project_editor(project_id));

-- loans
CREATE POLICY "Enable all actions for users based on project access" ON public.loans FOR ALL USING (is_project_editor(project_id)) WITH CHECK (is_project_editor(project_id));

-- scenarios
CREATE POLICY "Users can view their scenarios" ON public.scenarios FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (is_project_editor(project_id));

-- scenario_entries
CREATE POLICY "Enable all actions for users based on scenario access" ON public.scenario_entries FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM scenarios s
    WHERE s.id = scenario_id AND is_project_editor(s.project_id)
  )
);

-- payments
CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (auth.uid() = user_id);

-- tiers, notes, consolidated_views
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);
