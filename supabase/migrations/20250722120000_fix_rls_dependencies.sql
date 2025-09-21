-- =============================================
-- Step 1: Drop all existing policies on all tables
-- This ensures a clean slate and avoids "already exists" errors.
-- =============================================

-- Table: projects
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Table: project_collaborators
DROP POLICY IF EXISTS "Owners can manage collaborators for their projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Collaborators can view their own invitations" ON public.project_collaborators;

-- Table: consolidated_views
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;

-- Table: budget_entries
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;

-- Table: actual_transactions
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;

-- Table: payments
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;

-- Table: cash_accounts
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;

-- Table: loans
DROP POLICY IF EXISTS "Users can view their loans" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;

-- Table: scenarios
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;

-- Table: scenario_entries
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;

-- Table: tiers
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;

-- Table: notes
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;

-- Table: referrals
DROP POLICY IF EXISTS "Users can manage their own referrals" ON public.referrals;

-- =============================================
-- Step 2: Drop all helper functions
-- Now that no policies depend on them, we can safely drop them.
-- =============================================
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.get_user_id_from_email(text);
DROP FUNCTION IF EXISTS public.handle_new_project(text, date, text);
DROP FUNCTION IF EXISTS public.delete_user_account();

-- =============================================
-- Step 3: Recreate all helper functions
-- We use CREATE OR REPLACE for idempotency.
-- =============================================

/*
          # [Function] get_user_accessible_projects
          Retrieves a list of project IDs that the current authenticated user can access, either as an owner or a collaborator.

          ## Query Description: "This function is a core part of the security system. It combines projects owned by the user with projects shared with them to determine access rights. It has no impact on existing data."
          
          ## Metadata:
          - Schema-Category: ["Safe", "Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - Reads from: public.projects, public.project_collaborators
          
          ## Security Implications:
          - RLS Status: [Used by RLS policies]
          - Policy Changes: [No]
          - Auth Requirements: [Requires authenticated user]
          
          ## Performance Impact:
          - Indexes: [Benefits from indexes on user_id columns]
          - Triggers: [No]
          - Estimated Impact: [Low, query is efficient]
          */
CREATE OR REPLACE FUNCTION public.get_user_accessible_projects()
RETURNS TABLE(project_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id FROM public.projects p WHERE p.user_id = auth.uid()
  UNION
  SELECT pc.project_id FROM public.project_collaborators pc WHERE pc.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
          # [Function] is_project_owner
          Checks if the current user is the owner of a given project.

          ## Query Description: "Security helper function. Checks for project ownership. No data is modified."
          ## Metadata:
          - Schema-Category: ["Safe", "Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          ## Security Implications:
          - RLS Status: [Used by RLS policies]
*/
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
          # [Function] is_project_editor
          Checks if the current user has 'editor' or 'owner' rights on a given project.

          ## Query Description: "Security helper function. Checks for editor-level project access. No data is modified."
          ## Metadata:
          - Schema-Category: ["Safe", "Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          ## Security Implications:
          - RLS Status: [Used by RLS policies]
*/
CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = p_project_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.project_collaborators
      WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'editor'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
          # [Function] handle_new_project
          Creates a new project and a default cash account for the current user.

          ## Query Description: "This function automates project creation. It inserts a new project and a corresponding cash account. It is safe and only adds new data."
          ## Metadata:
          - Schema-Category: ["Data"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [false]
          ## Security Implications:
          - RLS Status: [Bypasses RLS due to SECURITY DEFINER]
*/
CREATE OR REPLACE FUNCTION public.handle_new_project(project_name text, project_start_date date, project_currency text)
RETURNS uuid AS $$
DECLARE
  new_project_id uuid;
BEGIN
  INSERT INTO public.projects (user_id, name, start_date, currency)
  VALUES (auth.uid(), project_name, project_start_date, project_currency)
  RETURNING id INTO new_project_id;

  INSERT INTO public.cash_accounts (project_id, user_id, main_category_id, name, initial_balance, initial_balance_date)
  VALUES (new_project_id, auth.uid(), 'cash', 'Caisse Espèce', 0, project_start_date);
  
  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
          # [Function] delete_user_account
          Deletes all data associated with the current user and then deletes the user account itself.

          ## Query Description: "This is a highly destructive operation that will permanently delete all user data, including projects, transactions, and profile information, before deleting the user's authentication record. This action is irreversible. Backup is strongly recommended before execution."
          ## Metadata:
          - Schema-Category: ["Dangerous"]
          - Impact-Level: ["High"]
          - Requires-Backup: [true]
          - Reversible: [false]
          ## Security Implications:
          - RLS Status: [Bypasses RLS due to SECURITY DEFINER]
*/
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
DECLARE
  user_id_to_delete uuid := auth.uid();
BEGIN
  -- This function should be called by an authenticated user.
  -- The RLS policies will prevent users from deleting data they don't own.
  -- However, running as SECURITY DEFINER with explicit user_id checks is safer.
  DELETE FROM public.projects WHERE user_id = user_id_to_delete;
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  
  -- The user's auth record is deleted last.
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Step 4: Recreate all policies
-- =============================================

-- Table: profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Table: projects
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (id IN (SELECT get_user_accessible_projects.project_id FROM get_user_accessible_projects()));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (is_project_owner(id));
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (is_project_owner(id));

-- Table: project_collaborators
CREATE POLICY "Owners can manage collaborators for their projects" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));
CREATE POLICY "Collaborators can view their own invitations" ON public.project_collaborators FOR SELECT USING (user_id = auth.uid());

-- Table: consolidated_views
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);

-- Generic policies for project-related data
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects.project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects.project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.payments FOR SELECT USING (actual_id IN (SELECT id FROM public.actual_transactions WHERE project_id IN (SELECT get_user_accessible_projects.project_id FROM get_user_accessible_projects())));
CREATE POLICY "Editors can manage data for accessible projects" ON public.payments FOR ALL USING (actual_id IN (SELECT id FROM public.actual_transactions WHERE is_project_editor(project_id)));

CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects.project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects.project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects.project_id FROM get_user_accessible_projects()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.scenario_entries FOR SELECT USING (scenario_id IN (SELECT id FROM public.scenarios WHERE project_id IN (SELECT get_user_accessible_projects.project_id FROM get_user_accessible_projects())));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenario_entries FOR ALL USING (scenario_id IN (SELECT id FROM public.scenarios WHERE is_project_editor(project_id)));

-- Tables with simple user_id ownership
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());
