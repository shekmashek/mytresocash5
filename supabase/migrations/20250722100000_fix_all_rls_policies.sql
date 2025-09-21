-- MASTER SECURITY MIGRATION SCRIPT
-- This script resets and reapplies all RLS policies and helper functions.

-- STEP 1: Drop all existing RLS policies on all tables
-- Dropping policies in reverse order of dependency if possible, but dropping all should work.

-- Drop policies on 'payments'
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;

-- Drop policies on 'scenario_entries'
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;

-- Drop policies on 'scenarios'
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;

-- Drop policies on 'loans'
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Users can view their loans" ON public.loans;

-- Drop policies on 'cash_accounts'
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;

-- Drop policies on 'actual_transactions'
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;

-- Drop policies on 'budget_entries'
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;

-- Drop policies on 'project_collaborators'
DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators for their projects" ON public.project_collaborators;

-- Drop policies on 'consolidated_views'
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;

-- Drop policies on 'projects'
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;

-- Drop policies on 'profiles'
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Drop policies on 'notes'
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;

-- Drop policies on 'tiers'
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;

-- Drop policies on 'referrals'
DROP POLICY IF EXISTS "Users can manage their own referrals" ON public.referrals;


-- STEP 2: Drop all helper functions
-- The trigger depends on handle_new_user, so we need to drop the trigger first.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS get_user_accessible_projects();
DROP FUNCTION IF EXISTS is_project_editor(uuid);
DROP FUNCTION IF EXISTS is_project_viewer(uuid);
DROP FUNCTION IF EXISTS is_project_owner(uuid);
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS delete_user_account();
DROP FUNCTION IF EXISTS handle_new_project(text, date, text);
DROP FUNCTION IF EXISTS get_user_id_from_email(text);


-- STEP 3: Recreate all helper functions with consistent naming
CREATE OR REPLACE FUNCTION get_user_accessible_projects()
RETURNS TABLE(project_id uuid) AS $$
BEGIN
  RETURN QUERY
    SELECT p.id FROM public.projects p WHERE p.user_id = auth.uid()
    UNION
    SELECT pc.project_id FROM public.project_collaborators pc WHERE pc.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
DECLARE
  is_owner boolean;
BEGIN
  SELECT user_id = auth.uid() INTO is_owner
  FROM public.projects
  WHERE id = p_project_id;
  RETURN COALESCE(is_owner, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_editor(p_project_id uuid)
RETURNS boolean AS $$
DECLARE
  role_permission text;
BEGIN
  IF is_project_owner(p_project_id) THEN
    RETURN true;
  END IF;
  SELECT role INTO role_permission
  FROM public.project_collaborators
  WHERE project_id = p_project_id AND user_id = auth.uid();
  RETURN role_permission = 'editor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_viewer(p_project_id uuid)
RETURNS boolean AS $$
DECLARE
  role_permission text;
BEGIN
  IF is_project_owner(p_project_id) THEN
    RETURN true;
  END IF;
  SELECT role INTO role_permission
  FROM public.project_collaborators
  WHERE project_id = p_project_id AND user_id = auth.uid();
  RETURN role_permission IN ('editor', 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (new.id, new.email, public.generate_referral_code());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void AS $$
BEGIN
  -- This will cascade delete all related data due to foreign key constraints
  DELETE FROM public.profiles WHERE id = auth.uid();
  -- The trigger on profiles will then delete the auth.user
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_project(
    p_project_name text,
    p_project_start_date date,
    p_project_currency text
)
RETURNS uuid AS $$
DECLARE
    new_project_id uuid;
    default_cash_account_id uuid;
BEGIN
    -- Insert the new project
    INSERT INTO public.projects (user_id, name, start_date, currency)
    VALUES (auth.uid(), p_project_name, p_project_start_date, p_project_currency)
    RETURNING id INTO new_project_id;

    -- Create a default cash account for this project
    INSERT INTO public.cash_accounts (project_id, user_id, main_category_id, name, initial_balance, initial_balance_date)
    VALUES (new_project_id, auth.uid(), 'cash', 'Caisse Espèce', 0, p_project_start_date)
    RETURNING id INTO default_cash_account_id;

    RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_id_from_email(p_email text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = p_email;
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- STEP 4: Recreate RLS policies and trigger

-- Trigger for new user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Policies for 'profiles'
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Policies for 'projects'
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (id IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can manage their projects" ON public.projects FOR UPDATE USING (is_project_owner(id));
CREATE POLICY "Owners can delete their projects" ON public.projects FOR DELETE USING (is_project_owner(id));

-- Policies for 'project_collaborators'
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view collaborators for their projects" ON public.project_collaborators FOR SELECT USING (project_id IN (SELECT get_user_accessible_projects()));
CREATE POLICY "Owners can manage collaborators" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));

-- Policies for 'consolidated_views'
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);

-- Policies for other tables
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (is_project_editor(project_id));

ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (is_project_editor(project_id));

ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (is_project_editor(project_id));

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (is_project_editor(project_id));

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (is_project_editor(project_id));

ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage data for accessible projects" ON public.scenario_entries FOR ALL USING (is_project_editor((SELECT project_id FROM scenarios WHERE id = scenario_id)));

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage data for accessible projects" ON public.payments FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (auth.uid() = referrer_user_id);
