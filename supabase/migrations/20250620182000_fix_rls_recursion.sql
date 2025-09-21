-- Drop all potentially problematic policies first
DROP POLICY IF EXISTS "Users can view their own projects or shared projects." ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects." ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects." ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects." ON public.projects;

DROP POLICY IF EXISTS "Users can manage collaborators for projects they own." ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can manage collaborators for projects they own or are part of." ON public.project_collaborators;

DROP POLICY IF EXISTS "Users can manage budget entries for their projects." ON public.budget_entries;
DROP POLICY IF EXISTS "Users can manage actual transactions for their projects." ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can manage cash accounts for their projects." ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can manage loans for their projects." ON public.loans;
DROP POLICY IF EXISTS "Users can manage scenarios for their projects." ON public.scenarios;
DROP POLICY IF EXISTS "Users can manage scenario entries for their projects." ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage notes for their projects." ON public.notes;
DROP POLICY IF EXISTS "Users can manage tiers for their projects." ON public.tiers;
DROP POLICY IF EXISTS "Users can manage payments for their projects." ON public.payments;

-- Create helper function to get project owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_project_owner(p_project_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.projects WHERE id = p_project_id;
$$;

-- Create helper functions to check read/write access (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_read_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.get_project_owner(p_project_id) = auth.uid()) OR
  EXISTS (
    SELECT 1
    FROM project_collaborators
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.get_project_owner(p_project_id) = auth.uid()) OR
  EXISTS (
    SELECT 1
    FROM project_collaborators
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role = 'editor'
  );
$$;

-- Helper functions for linked tables
CREATE OR REPLACE FUNCTION public.get_scenario_project_id(p_scenario_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM public.scenarios WHERE id = p_scenario_id;
$$;

CREATE OR REPLACE FUNCTION public.get_payment_project_id(p_actual_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM public.actual_transactions WHERE id = p_actual_id;
$$;

-- Recreate policies using the helper functions

-- Table: projects
CREATE POLICY "Users can view their own projects or shared projects." ON public.projects FOR SELECT
USING ( public.can_read_project(id) );
CREATE POLICY "Users can insert their own projects." ON public.projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own projects." ON public.projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own projects." ON public.projects FOR DELETE USING (user_id = auth.uid());

-- Table: project_collaborators
CREATE POLICY "Users can manage collaborators for projects they own or are part of." ON public.project_collaborators FOR ALL
USING ( (public.get_project_owner(project_id) = auth.uid()) OR (user_id = auth.uid()) )
WITH CHECK ( (public.get_project_owner(project_id) = auth.uid()) );

-- Policies for project-related tables
CREATE POLICY "Users can manage budget entries for their projects." ON public.budget_entries FOR ALL
USING ( public.can_read_project(project_id) ) WITH CHECK ( public.can_write_project(project_id) );

CREATE POLICY "Users can manage actual transactions for their projects." ON public.actual_transactions FOR ALL
USING ( public.can_read_project(project_id) ) WITH CHECK ( public.can_write_project(project_id) );

CREATE POLICY "Users can manage cash accounts for their projects." ON public.cash_accounts FOR ALL
USING ( public.can_read_project(project_id) ) WITH CHECK ( public.can_write_project(project_id) );

CREATE POLICY "Users can manage loans for their projects." ON public.loans FOR ALL
USING ( public.can_read_project(project_id) ) WITH CHECK ( public.can_write_project(project_id) );

CREATE POLICY "Users can manage scenarios for their projects." ON public.scenarios FOR ALL
USING ( public.can_read_project(project_id) ) WITH CHECK ( public.can_write_project(project_id) );

-- Policies for tables linked via other tables
CREATE POLICY "Users can manage scenario entries for their projects." ON public.scenario_entries FOR ALL
USING ( public.can_read_project(public.get_scenario_project_id(scenario_id)) ) WITH CHECK ( public.can_write_project(public.get_scenario_project_id(scenario_id)) );

CREATE POLICY "Users can manage payments for their projects." ON public.payments FOR ALL
USING ( public.can_read_project(public.get_payment_project_id(actual_id)) ) WITH CHECK ( public.can_write_project(public.get_payment_project_id(actual_id)) );

-- Policies for user-specific tables (no change, but good to re-affirm)
CREATE POLICY "Users can manage their own notes." ON public.notes FOR ALL
USING ( user_id = auth.uid() ) WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "Users can manage their own tiers." ON public.tiers FOR ALL
USING ( user_id = auth.uid() ) WITH CHECK ( user_id = auth.uid() );
