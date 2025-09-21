-- =================================================================
-- This script makes the database schema setup idempotent.
-- It ensures that it can be run multiple times without errors
-- by checking for the existence of objects before creating them.
-- =================================================================

-- =================================================================
-- SECTION 1: Helper Functions for RLS
-- These functions check user roles and permissions.
-- We use CREATE OR REPLACE to ensure they are always up-to-date.
-- =================================================================

/*
          # [Function] get_user_role
          Retrieves the role of the current user for a given project.

          ## Query Description: "This function is a security helper to determine a user's role within a project. It is safe and does not modify data."
          
          ## Metadata:
          - Schema-Category: ["Safe"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          */
CREATE OR REPLACE FUNCTION public.get_user_role(project_id_to_check uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.project_collaborators
  WHERE project_id = project_id_to_check AND user_id = auth.uid();

  IF user_role IS NOT NULL THEN
    RETURN user_role;
  END IF;

  SELECT 'owner' INTO user_role
  FROM public.projects
  WHERE id = project_id_to_check AND user_id = auth.uid();

  RETURN user_role;
END;
$$;

/*
          # [Function] is_project_member
          Checks if the current user is a member (owner or collaborator) of a project.

          ## Query Description: "This is a security check function. It is safe and does not modify data."
          
          ## Metadata:
          - Schema-Category: ["Safe"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          */
CREATE OR REPLACE FUNCTION public.is_project_member(project_id_to_check uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id_to_check AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators WHERE project_id = project_id_to_check AND user_id = auth.uid()
  );
END;
$$;

/*
          # [Function] is_project_editor
          Checks if the user has editor or owner rights on a project.

          ## Query Description: "This is a security check function for write permissions. It is safe and does not modify data."
          
          ## Metadata:
          - Schema-Category: ["Safe"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          */
CREATE OR REPLACE FUNCTION public.is_project_editor(project_id_to_check uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_user_role(project_id_to_check);
  RETURN user_role IN ('owner', 'editor');
END;
$$;


-- =================================================================
-- SECTION 2: RLS Policies
-- We drop existing policies before creating them to avoid "already exists" errors.
-- =================================================================

-- Profiles Table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects Table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own and shared projects." ON public.projects;
CREATE POLICY "Users can view their own and shared projects." ON public.projects FOR SELECT USING (public.is_project_member(id));
DROP POLICY IF EXISTS "Users can insert their own projects." ON public.projects;
CREATE POLICY "Users can insert their own projects." ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can update their own projects." ON public.projects;
CREATE POLICY "Owners can update their own projects." ON public.projects FOR UPDATE USING (public.get_user_role(id) = 'owner');
DROP POLICY IF EXISTS "Owners can delete their own projects." ON public.projects;
CREATE POLICY "Owners can delete their own projects." ON public.projects FOR DELETE USING (public.get_user_role(id) = 'owner');

-- Generic Data Tables (Entries, Actuals, Accounts, etc.)
DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'budget_entries', 'actual_transactions', 'cash_accounts', 'loans', 
        'scenarios', 'scenario_entries', 'payments', 'notes', 'tiers', 
        'consolidated_views', 'project_collaborators', 'referrals'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);

        -- SELECT Policy
        EXECUTE format('DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.%I;', table_name);
        IF table_name = 'projects' OR table_name = 'project_collaborators' OR table_name = 'consolidated_views' THEN
             EXECUTE format('CREATE POLICY "Users can view data for accessible projects" ON public.%I FOR SELECT USING (user_id = auth.uid());', table_name);
        ELSEIF table_name = 'profiles' THEN
            -- Profiles has its own specific policies
        ELSE
            EXECUTE format('CREATE POLICY "Users can view data for accessible projects" ON public.%I FOR SELECT USING (public.is_project_member(project_id));', table_name);
        END IF;

        -- INSERT Policy
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert data for their projects" ON public.%I;', table_name);
        IF table_name = 'profiles' OR table_name = 'projects' OR table_name = 'project_collaborators' OR table_name = 'consolidated_views' THEN
             EXECUTE format('CREATE POLICY "Users can insert data for their projects" ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid());', table_name);
        ELSE
            EXECUTE format('CREATE POLICY "Users can insert data for their projects" ON public.%I FOR INSERT WITH CHECK (public.is_project_editor(project_id));', table_name);
        END IF;
        
        -- UPDATE Policy
        EXECUTE format('DROP POLICY IF EXISTS "Editors can update data for accessible projects" ON public.%I;', table_name);
        IF table_name = 'profiles' THEN
             EXECUTE format('CREATE POLICY "Editors can update data for accessible projects" ON public.%I FOR UPDATE USING (user_id = auth.uid());', table_name);
        ELSEIF table_name = 'projects' OR table_name = 'project_collaborators' OR table_name = 'consolidated_views' THEN
             EXECUTE format('CREATE POLICY "Editors can update data for accessible projects" ON public.%I FOR UPDATE USING (user_id = auth.uid());', table_name);
        ELSE
            EXECUTE format('CREATE POLICY "Editors can update data for accessible projects" ON public.%I FOR UPDATE USING (public.is_project_editor(project_id));', table_name);
        END IF;

        -- DELETE Policy
        EXECUTE format('DROP POLICY IF EXISTS "Editors can delete data for accessible projects" ON public.%I;', table_name);
        IF table_name = 'profiles' THEN
            -- Profiles cannot be deleted directly
        ELSEIF table_name = 'projects' OR table_name = 'project_collaborators' OR table_name = 'consolidated_views' THEN
             EXECUTE format('CREATE POLICY "Editors can delete data for accessible projects" ON public.%I FOR DELETE USING (user_id = auth.uid());', table_name);
        ELSE
            EXECUTE format('CREATE POLICY "Editors can delete data for accessible projects" ON public.%I FOR DELETE USING (public.is_project_editor(project_id));', table_name);
        END IF;

    END LOOP;
END;
$$;

-- =================================================================
-- SECTION 3: Triggers
-- Drop and recreate triggers to ensure they are correctly defined.
-- =================================================================

-- Trigger for creating a profile on new user sign-up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for creating a referral code on new profile creation
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();
