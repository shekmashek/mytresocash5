-- First, allow 'owner' role in the collaborators table
ALTER TABLE public.project_collaborators DROP CONSTRAINT IF EXISTS project_collaborators_role_check;
ALTER TABLE public.project_collaborators ADD CONSTRAINT project_collaborators_role_check CHECK (role IN ('viewer', 'editor', 'owner'));

-- Create the RPC function to handle new project creation atomically and securely
CREATE OR REPLACE FUNCTION public.handle_new_project(
  project_name TEXT,
  project_start_date DATE,
  project_currency TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_project_id uuid;
  new_user_id uuid := auth.uid();
BEGIN
  -- Insert the new project
  INSERT INTO public.projects (user_id, name, start_date, currency, annual_goals, expense_targets)
  VALUES (new_user_id, project_name, project_start_date, project_currency, '{}'::jsonb, '{}'::jsonb)
  RETURNING id INTO new_project_id;

  -- Add the owner as a collaborator
  INSERT INTO public.project_collaborators (project_id, user_id, role)
  VALUES (new_project_id, new_user_id, 'owner');

  -- Add the default cash account
  INSERT INTO public.cash_accounts (project_id, user_id, main_category_id, name, initial_balance, initial_balance_date)
  VALUES (new_project_id, new_user_id, 'cash', 'Caisse Espèce', 0, project_start_date);

  RETURN new_project_id;
END;
$$;
