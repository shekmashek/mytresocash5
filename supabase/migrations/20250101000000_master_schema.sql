-- =============================================
-- MASTER SCHEMA MIGRATION FOR TREZOCASH
-- Designed for a fresh, empty Supabase project.
-- =============================================

-- =============================================
-- SECTION 1: CLEANUP (Dropping existing objects if they exist)
-- This makes the script idempotent and safe to re-run.
-- =============================================

-- Drop policies from all tables in the correct order
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Users can view their loans" ON public.loans;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can manage their own project collaborations" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_project(text, date, text);
DROP FUNCTION IF EXISTS public.delete_user_account();
DROP FUNCTION IF EXISTS public.get_user_id_from_email(text);
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- =============================================
-- SECTION 2: TABLE CREATION
-- =============================================

-- Profiles Table
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    updated_at timestamp with time zone,
    subscription_status text DEFAULT 'trialing'::text,
    plan_id text,
    stripe_customer_id text,
    trial_ends_at timestamp with time zone DEFAULT (now() + '14 days'::interval),
    referral_code text UNIQUE,
    referred_by uuid REFERENCES public.profiles(id),
    currency text DEFAULT '€'::text,
    display_unit text DEFAULT 'standard'::text,
    decimal_places integer DEFAULT 2,
    language text DEFAULT 'fr'::text,
    timezone_offset integer DEFAULT 0
);

-- Projects Table
CREATE TABLE public.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    start_date date NOT NULL,
    currency text NOT NULL,
    is_archived boolean DEFAULT false,
    annual_goals jsonb,
    expense_targets jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Project Collaborators Table
CREATE TABLE public.project_collaborators (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('editor', 'viewer')),
    invited_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Consolidated Views Table
CREATE TABLE public.consolidated_views (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    project_ids uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Tiers (Third Parties) Table
CREATE TABLE public.tiers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    UNIQUE(user_id, name, type)
);

-- Cash Accounts Table
CREATE TABLE public.cash_accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    main_category_id text NOT NULL,
    name text NOT NULL,
    initial_balance numeric DEFAULT 0,
    initial_balance_date date NOT NULL,
    is_closed boolean DEFAULT false,
    closure_date date
);

-- Budget Entries Table
CREATE TABLE public.budget_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id uuid,
    type text NOT NULL,
    category text NOT NULL,
    frequency text NOT NULL,
    amount numeric NOT NULL,
    date date,
    start_date date,
    end_date date,
    supplier text,
    description text,
    is_off_budget boolean DEFAULT false,
    payments jsonb,
    provision_details jsonb
);

-- Actual Transactions Table
CREATE TABLE public.actual_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_id uuid REFERENCES public.budget_entries(id) ON DELETE SET NULL,
    type text NOT NULL,
    category text NOT NULL,
    third_party text,
    description text,
    date date NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'pending'::text,
    is_off_budget boolean DEFAULT false,
    is_provision boolean DEFAULT false,
    is_final_provision_payment boolean DEFAULT false,
    provision_details jsonb,
    is_internal_transfer boolean DEFAULT false
);

-- Payments Table
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    actual_id uuid NOT NULL REFERENCES public.actual_transactions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_date date NOT NULL,
    paid_amount numeric NOT NULL,
    cash_account uuid NOT NULL REFERENCES public.cash_accounts(id)
);

-- Loans Table
CREATE TABLE public.loans (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL,
    third_party text NOT NULL,
    principal numeric NOT NULL,
    term integer NOT NULL,
    monthly_payment numeric NOT NULL,
    principal_date date NOT NULL,
    repayment_start_date date NOT NULL
);

-- Scenarios Table
CREATE TABLE public.scenarios (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    color text,
    is_visible boolean DEFAULT true,
    is_archived boolean DEFAULT false
);

-- Scenario Entries Table
CREATE TABLE public.scenario_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    scenario_id uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text,
    category text,
    frequency text,
    amount numeric,
    date date,
    start_date date,
    end_date date,
    supplier text,
    description text,
    is_deleted boolean DEFAULT false,
    payments jsonb
);

-- Notes Table
CREATE TABLE public.notes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text,
    color text,
    x numeric,
    y numeric,
    is_minimized boolean DEFAULT false
);

-- Referrals Table
CREATE TABLE public.referrals (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);

-- =============================================
-- SECTION 3: FUNCTIONS & TRIGGERS
-- =============================================

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    substring(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    (SELECT id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referral_code' LIMIT 1)
  );
  -- If the new user was referred, create a referral record
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_user_id, referred_user_id)
    VALUES ((SELECT id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referral_code' LIMIT 1), NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to create a new project and its default cash account
CREATE OR REPLACE FUNCTION public.handle_new_project(project_name text, project_start_date date, project_currency text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
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
$$;

-- Function to delete all user data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is called by an authenticated user and deletes their own data.
  -- The RLS policies should prevent deletion of other users' data, but we use
  -- `auth.uid()` explicitly for safety.
  DELETE FROM public.projects WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE id = auth.uid();
  -- The rest of the data is deleted via CASCADE constraints.
  -- Finally, delete the user from auth.users
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Function to get user ID from email
CREATE OR REPLACE FUNCTION public.get_user_id_from_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = p_email;
  RETURN user_id;
END;
$$;

-- =============================================
-- SECTION 4: RLS POLICIES
-- =============================================

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'editor'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_viewer(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_projects()
RETURNS TABLE(project_id uuid)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM public.projects WHERE user_id = auth.uid()
  UNION
  SELECT project_id FROM public.project_collaborators WHERE user_id = auth.uid();
$$;

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies for `profiles`
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for `projects`
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (is_project_viewer(id));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (is_project_owner(id));
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (is_project_owner(id));

-- Policies for `project_collaborators`
CREATE POLICY "Users can manage collaborators for projects they own" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));

-- Policies for data tables
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

CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.scenarios
        WHERE id = scenario_id AND is_project_editor(project_id)
    )
);

CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (auth.uid() = referrer_user_id);
