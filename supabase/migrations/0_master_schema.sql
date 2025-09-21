-- =============================================
-- SECTION 1: EXTENSIONS, TYPES, HELPER FUNCTIONS
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define custom types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_role') THEN
        CREATE TYPE public.project_role AS ENUM ('owner', 'editor', 'viewer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE public.transaction_type AS ENUM ('revenu', 'depense');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actual_type') THEN
        CREATE TYPE public.actual_type AS ENUM ('receivable', 'payable');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'frequency_type') THEN
        CREATE TYPE public.frequency_type AS ENUM ('ponctuel', 'journalier', 'hebdomadaire', 'mensuel', 'bimestriel', 'trimestriel', 'annuel', 'irregulier', 'provision');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE public.transaction_status AS ENUM ('pending', 'partially_paid', 'paid', 'partially_received', 'received', 'written_off');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_type') THEN
        CREATE TYPE public.loan_type AS ENUM ('borrowing', 'loan');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_status') THEN
        CREATE TYPE public.referral_status AS ENUM ('pending', 'completed');
    END IF;
END$$;


-- =============================================
-- SECTION 2: TABLE CREATION
-- =============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text UNIQUE,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES public.profiles(id),
  stripe_customer_id text,
  subscription_status text,
  plan_id text,
  trial_ends_at timestamptz,
  subscription_id text,
  currency text DEFAULT '€'::text,
  display_unit text DEFAULT 'standard'::text,
  decimal_places integer DEFAULT 2,
  language text DEFAULT 'fr'::text,
  timezone_offset integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  currency text NOT NULL,
  start_date date NOT NULL,
  is_archived boolean DEFAULT false,
  annual_goals jsonb,
  expense_targets jsonb,
  created_at timestamptz DEFAULT now()
);

-- Collaborators table
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.project_role NOT NULL,
  invited_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Consolidated Views table
CREATE TABLE IF NOT EXISTS public.consolidated_views (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  project_ids uuid[],
  created_at timestamptz DEFAULT now()
);

-- Tiers table (clients/suppliers)
CREATE TABLE IF NOT EXISTS public.tiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- 'client' or 'fournisseur'
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name, type)
);

-- Notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text,
  color text,
  x float,
  y float,
  is_minimized boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.loan_type NOT NULL,
  third_party text NOT NULL,
  principal numeric NOT NULL,
  term integer NOT NULL,
  monthly_payment numeric NOT NULL,
  principal_date date NOT NULL,
  repayment_start_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Scenarios table
CREATE TABLE IF NOT EXISTS public.scenarios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  is_visible boolean DEFAULT true,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Budget Entries table
CREATE TABLE IF NOT EXISTS public.budget_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  loan_id uuid REFERENCES public.loans(id) ON DELETE SET NULL,
  type public.transaction_type NOT NULL,
  category text NOT NULL,
  frequency public.frequency_type NOT NULL,
  amount numeric NOT NULL,
  date date,
  start_date date,
  end_date date,
  supplier text NOT NULL,
  description text,
  is_off_budget boolean DEFAULT false,
  payments jsonb,
  provision_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Actual Transactions table
CREATE TABLE IF NOT EXISTS public.actual_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id uuid REFERENCES public.budget_entries(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.actual_type NOT NULL,
  category text NOT NULL,
  third_party text NOT NULL,
  description text,
  date date NOT NULL,
  amount numeric NOT NULL,
  status public.transaction_status DEFAULT 'pending',
  is_off_budget boolean DEFAULT false,
  is_provision boolean DEFAULT false,
  is_final_provision_payment boolean DEFAULT false,
  provision_details jsonb,
  is_internal_transfer boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Cash Accounts table
CREATE TABLE IF NOT EXISTS public.cash_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  main_category_id text NOT NULL,
  name text NOT NULL,
  initial_balance numeric DEFAULT 0,
  initial_balance_date date NOT NULL,
  is_closed boolean DEFAULT false,
  closure_date date,
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actual_id uuid NOT NULL REFERENCES public.actual_transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  paid_amount numeric NOT NULL,
  cash_account uuid NOT NULL REFERENCES public.cash_accounts(id),
  created_at timestamptz DEFAULT now()
);

-- Scenario Entries table
CREATE TABLE IF NOT EXISTS public.scenario_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  base_entry_id uuid, -- Can be null for new entries in scenario
  type public.transaction_type,
  category text,
  frequency public.frequency_type,
  amount numeric,
  date date,
  start_date date,
  end_date date,
  supplier text,
  description text,
  is_deleted boolean DEFAULT false,
  payments jsonb,
  created_at timestamptz DEFAULT now()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id),
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id),
  status public.referral_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);


-- =============================================
-- SECTION 3: RLS HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_role_in_project(p_project_id uuid)
RETURNS public.project_role AS $$
DECLARE
    v_role public.project_role;
BEGIN
    SELECT role INTO v_role
    FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid();

    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;

    SELECT 'owner' INTO v_role
    FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid();

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.project_collaborators WHERE project_id = p_project_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN public.get_user_role_in_project(p_project_id) IN ('owner', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- SECTION 4: ENABLE RLS & CREATE POLICIES
-- =============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own and shared projects." ON public.projects;
CREATE POLICY "Users can view their own and shared projects." ON public.projects FOR SELECT USING (public.is_project_member(id));
DROP POLICY IF EXISTS "Users can insert their own projects." ON public.projects;
CREATE POLICY "Users can insert their own projects." ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can update their projects." ON public.projects;
CREATE POLICY "Owners can update their projects." ON public.projects FOR UPDATE USING (public.get_user_role_in_project(id) = 'owner');
DROP POLICY IF EXISTS "Owners can delete their projects." ON public.projects;
CREATE POLICY "Owners can delete their projects." ON public.projects FOR DELETE USING (public.get_user_role_in_project(id) = 'owner');

-- Project Collaborators
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view collaborators of their projects." ON public.project_collaborators;
CREATE POLICY "Users can view collaborators of their projects." ON public.project_collaborators FOR SELECT USING (public.is_project_member(project_id));
DROP POLICY IF EXISTS "Owners can manage collaborators." ON public.project_collaborators;
CREATE POLICY "Owners can manage collaborators." ON public.project_collaborators FOR ALL USING (public.get_user_role_in_project(project_id) = 'owner');

-- All other tables...
-- Generic policies for project-based tables
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN (
            'budget_entries', 'actual_transactions', 'cash_accounts', 'loans', 'scenarios', 'payments', 'scenario_entries'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        
        EXECUTE format('DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.%I;', t_name);
        EXECUTE format('CREATE POLICY "Users can view data for accessible projects" ON public.%I FOR SELECT USING (public.is_project_member(project_id));', t_name);
        
        EXECUTE format('DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.%I;', t_name);
        EXECUTE format('CREATE POLICY "Editors can manage data for accessible projects" ON public.%I FOR ALL USING (public.is_project_editor(project_id)) WITH CHECK (public.is_project_editor(project_id));', t_name);
    END LOOP;
END;
$$;

-- Notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own notes." ON public.notes;
CREATE POLICY "Users can manage their own notes." ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Consolidated Views
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own consolidated views." ON public.consolidated_views;
CREATE POLICY "Users can manage their own consolidated views." ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);

-- Tiers
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own tiers." ON public.tiers;
CREATE POLICY "Users can manage their own tiers." ON public.tiers FOR ALL USING (auth.uid() = user_id);

-- Referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own referrals." ON public.referrals;
CREATE POLICY "Users can view their own referrals." ON public.referrals FOR SELECT USING (auth.uid() = referrer_user_id);
DROP POLICY IF EXISTS "Users can create referrals." ON public.referrals;
CREATE POLICY "Users can create referrals." ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_user_id);


-- =============================================
-- SECTION 5: TRIGGERS AND DATABASE FUNCTIONS
-- =============================================

-- Function to create a profile for a new user
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (new.id, new.email, new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to delete user data
DROP FUNCTION IF EXISTS public.delete_user_account();
CREATE FUNCTION public.delete_user_account()
RETURNS void AS $$
BEGIN
  DELETE FROM public.projects WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new project and default cash account
DROP FUNCTION IF EXISTS public.handle_new_project(text, date, text);
CREATE FUNCTION public.handle_new_project(project_name text, project_start_date date, project_currency text)
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

-- Function to get user ID from email
DROP FUNCTION IF EXISTS public.get_user_id_from_email(text);
CREATE FUNCTION public.get_user_id_from_email(p_email text)
RETURNS uuid AS $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
