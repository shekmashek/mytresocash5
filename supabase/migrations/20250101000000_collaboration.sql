/*
          # [Feature] Collaboration System
          This migration adds the necessary tables, functions, and security policies to enable project collaboration.

          ## Query Description: This script will:
          1. Create a `project_collaborators` table to store invitations and roles.
          2. Create helper functions to check user permissions.
          3. Update Row Level Security (RLS) policies on existing tables to allow access for collaborators. This is a critical security update that ensures users can only see projects they own or have been invited to. No data will be lost, but access rules will be refined.

          ## Metadata:
          - Schema-Category: ["Structural", "Security"]
          - Impact-Level: ["Medium"]
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Adds table: `project_collaborators`
          - Adds functions: `is_project_member`, `get_user_id_from_email`
          - Modifies RLS policies on: `projects`, `budget_entries`, `actual_transactions`, `cash_accounts`, `tiers`, `loans`, `scenarios`, `notes`, `consolidated_views`
          
          ## Security Implications:
          - RLS Status: Enabled/Modified
          - Policy Changes: Yes
          - Auth Requirements: This change is fundamental to multi-user access control.
          
          ## Performance Impact:
          - Indexes: Adds indexes on `project_collaborators` for fast permission checks.
          - Triggers: None
          - Estimated Impact: Low. Permission checks are highly optimized.
          */

-- 1. Create the collaborators table
CREATE TABLE IF NOT EXISTS public.project_collaborators (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text CHECK (role IN ('viewer', 'editor')) NOT NULL,
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check if a user can access a project (as owner or collaborator)
DROP FUNCTION IF EXISTS is_project_member(uuid, uuid);
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper function to get user ID from email for invitations
DROP FUNCTION IF EXISTS get_user_id_from_email(text);
CREATE OR REPLACE FUNCTION get_user_id_from_email(p_email text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = p_email;
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policies
-- Policy for collaborators table itself
DROP POLICY IF EXISTS "Allow full access to project owners" ON public.project_collaborators;
CREATE POLICY "Allow full access to project owners" ON public.project_collaborators
FOR ALL USING (
  (SELECT user_id FROM public.projects WHERE id = project_id) = auth.uid()
);

-- Update RLS policies for all relevant tables
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN (
            'projects', 'budget_entries', 'actual_transactions', 'cash_accounts', 
            'tiers', 'loans', 'scenarios', 'notes', 'scenario_entries', 'payments', 'consolidated_views'
        )
    LOOP
        -- Drop old policies if they exist to avoid conflicts
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for members" ON public.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for user" ON public.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Enable full access for owners" ON public.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own data" ON public.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update their own data" ON public.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own data" ON public.%I;', t_name);

        -- Generic policy for owners
        EXECUTE format('CREATE POLICY "Enable full access for owners" ON public.%I FOR ALL USING (user_id = auth.uid());', t_name);

        -- Specific policies for collaborators
        IF t_name = 'projects' THEN
            EXECUTE format('CREATE POLICY "Enable read access for members" ON public.%I FOR SELECT USING (is_project_member(id, auth.uid()));', t_name);
        ELSIF t_name = 'consolidated_views' THEN
            -- No change needed, owner-only access is correct.
        ELSE
            -- Read access for viewers and editors
            EXECUTE format('CREATE POLICY "Enable read access for collaborators" ON public.%I FOR SELECT USING (is_project_member(project_id, auth.uid()));', t_name);
            -- Write access for editors
            EXECUTE format('CREATE POLICY "Enable write access for editors" ON public.%I FOR ALL USING (
                (SELECT role FROM project_collaborators WHERE project_id = %I.project_id AND user_id = auth.uid()) = ''editor''
            );', t_name, t_name);
        END IF;

    END LOOP;
END;
$$;

-- 5. Helper function to get all accessible projects (owned and shared)
CREATE OR REPLACE FUNCTION get_user_accessible_projects()
RETURNS TABLE(project_id uuid) AS $$
BEGIN
  RETURN QUERY
    SELECT id FROM public.projects WHERE user_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_collaborators WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;
