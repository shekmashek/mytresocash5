-- =============================================
-- Migration: Fix RLS Policy Dependencies
-- Description: This script resolves dependency issues by dropping all relevant RLS policies
-- before dropping the functions they depend on, and then recreating them in the correct order.
-- This ensures the migration can run idempotently without "cannot drop function" errors.
-- =============================================

-- Step 1: Drop all policies that depend on the functions we need to update.
-- The order of dropping policies doesn't matter, but they must all be dropped before the functions.

-- Policies on 'projects'
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON "public"."projects";
DROP POLICY IF EXISTS "Users can insert their own projects" ON "public"."projects";
DROP POLICY IF EXISTS "Owners can update their own projects" ON "public"."projects";
DROP POLICY IF EXISTS "Owners can delete their own projects" ON "public"."projects";

-- Policies on 'project_collaborators'
DROP POLICY IF EXISTS "Owners can manage collaborators for their projects" ON "public"."project_collaborators";
DROP POLICY IF EXISTS "Users can view collaborators for their accessible projects" ON "public"."project_collaborators";

-- Policies on data tables (budget_entries, actual_transactions, etc.)
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."budget_entries";
DROP POLICY IF EXISTS "Users can view entries for their projects" ON "public"."budget_entries";
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."budget_entries";

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."actual_transactions";
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON "public"."actual_transactions";
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."actual_transactions";

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."cash_accounts";
DROP POLICY IF EXISTS "Users can view their cash accounts" ON "public"."cash_accounts";
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."cash_accounts";

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."loans";
DROP POLICY IF EXISTS "Users can view their loans" ON "public"."loans";
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."loans";

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."scenarios";
DROP POLICY IF EXISTS "Users can view their scenarios" ON "public"."scenarios";
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."scenarios";

DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON "public"."scenario_entries";
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON "public"."scenario_entries";

DROP POLICY IF EXISTS "Users can manage their own payments" ON "public"."payments";

-- Step 2: Drop all helper functions. Now that no policies depend on them, this will succeed.
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.is_project_collaborator(uuid, text);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();
DROP FUNCTION IF EXISTS public.get_user_id_from_email(text);
DROP FUNCTION IF EXISTS public.handle_new_project(text, date, text);

-- Step 3: Recreate all helper functions with security best practices.

CREATE OR REPLACE FUNCTION public.get_user_id_from_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT id FROM auth.users WHERE email = p_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_projects()
RETURNS TABLE(project_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM project_collaborators WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_project_collaborator(project_id_to_check uuid, min_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM project_collaborators
  WHERE project_id = project_id_to_check AND user_id = auth.uid();

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  IF min_role = 'owner' THEN
    RETURN user_role = 'owner';
  ELSIF min_role = 'editor' THEN
    RETURN user_role IN ('owner', 'editor');
  ELSIF min_role = 'viewer' THEN
    RETURN user_role IN ('owner', 'editor', 'viewer');
  END IF;
  
  RETURN false;
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
  -- Insert the project
  INSERT INTO projects (user_id, name, start_date, currency)
  VALUES (auth.uid(), project_name, project_start_date, project_currency)
  RETURNING id INTO new_project_id;

  -- Add the creator as the owner in the collaborators table
  INSERT INTO project_collaborators (project_id, user_id, role, invited_by)
  VALUES (new_project_id, auth.uid(), 'owner', auth.uid());
  
  -- Create a default cash account for the new project
  INSERT INTO cash_accounts (project_id, user_id, main_category_id, name, initial_balance, initial_balance_date)
  VALUES (new_project_id, auth.uid(), 'cash', 'Caisse Espèce', 0, project_start_date);

  RETURN new_project_id;
END;
$$;


-- Step 4: Recreate all RLS policies.

-- Table: projects
CREATE POLICY "Users can view their own and shared projects" ON "public"."projects"
AS PERMISSIVE FOR SELECT TO authenticated USING (is_project_collaborator(id, 'viewer'));
CREATE POLICY "Users can insert their own projects" ON "public"."projects"
AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their own projects" ON "public"."projects"
AS PERMISSIVE FOR UPDATE TO authenticated USING (is_project_collaborator(id, 'owner')) WITH CHECK (is_project_collaborator(id, 'owner'));
CREATE POLICY "Owners can delete their own projects" ON "public"."projects"
AS PERMISSIVE FOR DELETE TO authenticated USING (is_project_collaborator(id, 'owner'));

-- Table: project_collaborators
CREATE POLICY "Users can view collaborators for their accessible projects" ON "public"."project_collaborators"
AS PERMISSIVE FOR SELECT TO authenticated USING (is_project_collaborator(project_id, 'viewer'));
CREATE POLICY "Owners can manage collaborators for their projects" ON "public"."project_collaborators"
AS PERMISSIVE FOR ALL TO authenticated USING (is_project_collaborator(project_id, 'owner')) WITH CHECK (is_project_collaborator(project_id, 'owner'));

-- Generic policies for data tables
CREATE POLICY "Users can view data for accessible projects" ON "public"."budget_entries"
AS PERMISSIVE FOR SELECT TO authenticated USING (is_project_collaborator(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON "public"."budget_entries"
AS PERMISSIVE FOR ALL TO authenticated USING (is_project_collaborator(project_id, 'editor')) WITH CHECK (is_project_collaborator(project_id, 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON "public"."actual_transactions"
AS PERMISSIVE FOR SELECT TO authenticated USING (is_project_collaborator(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON "public"."actual_transactions"
AS PERMISSIVE FOR ALL TO authenticated USING (is_project_collaborator(project_id, 'editor')) WITH CHECK (is_project_collaborator(project_id, 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON "public"."cash_accounts"
AS PERMISSIVE FOR SELECT TO authenticated USING (is_project_collaborator(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON "public"."cash_accounts"
AS PERMISSIVE FOR ALL TO authenticated USING (is_project_collaborator(project_id, 'editor')) WITH CHECK (is_project_collaborator(project_id, 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON "public"."loans"
AS PERMISSIVE FOR SELECT TO authenticated USING (is_project_collaborator(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON "public"."loans"
AS PERMISSIVE FOR ALL TO authenticated USING (is_project_collaborator(project_id, 'editor')) WITH CHECK (is_project_collaborator(project_id, 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON "public"."scenarios"
AS PERMISSIVE FOR SELECT TO authenticated USING (is_project_collaborator(project_id, 'viewer'));
CREATE POLICY "Editors can manage data for accessible projects" ON "public"."scenarios"
AS PERMISSIVE FOR ALL TO authenticated USING (is_project_collaborator(project_id, 'editor')) WITH CHECK (is_project_collaborator(project_id, 'editor'));

CREATE POLICY "Users can manage their own scenario entries" ON "public"."scenario_entries"
AS PERMISSIVE FOR ALL TO authenticated USING (is_project_collaborator((SELECT project_id FROM scenarios WHERE id = scenario_id), 'editor')) WITH CHECK (is_project_collaborator((SELECT project_id FROM scenarios WHERE id = scenario_id), 'editor'));

CREATE POLICY "Users can manage their own payments" ON "public"."payments"
AS PERMISSIVE FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
