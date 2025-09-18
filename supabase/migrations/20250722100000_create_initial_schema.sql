/*
          # =================================================
          # ==         INITIAL DATABASE SCHEMA SETUP       ==
          # =================================================
          This script creates all the necessary tables, relationships,
          and security policies for the Trezocash application.

          ## Query Description: This script is foundational and will:
          1. Create a `profiles` table to store user-specific data.
          2. Set up a trigger to automatically create a profile for new users.
          3. Create tables for all application data (projects, entries, actuals, etc.).
          4. Establish relationships between tables using foreign keys.
          5. Enable and configure Row Level Security (RLS) on ALL tables to ensure
             users can only access their own data. This is a critical security measure.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "High" (Creates the entire app structure)
          - Requires-Backup: false (This is for initial setup on a new database)
          - Reversible: false (Requires manual dropping of all created objects)
          */

-- =================================================
-- ==              PROFILES & AUTH                ==
-- =================================================

-- Create a table for public profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  subscription_status text DEFAULT 'trialing',
  trial_ends_at timestamptz,
  PRIMARY KEY (id)
);
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );


-- This trigger automatically creates a profile for new users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, trial_ends_at)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    (now() + interval '14 days')
  );
  RETURN new;
END;
$$;

-- Trigger the function after a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- =================================================
-- ==              APPLICATION TABLES             ==
-- =================================================

-- PROJECTS Table
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  currency text NOT NULL DEFAULT '€',
  start_date date NOT NULL,
  is_archived boolean NOT NULL DEFAULT false,
  annual_goals jsonb,
  expense_targets jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own projects." ON public.projects FOR ALL USING (auth.uid() = user_id);

-- TIERS Table
CREATE TABLE public.tiers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- 'client' or 'fournisseur'
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(user_id, name, type)
);
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers." ON public.tiers FOR ALL USING (auth.uid() = user_id);

-- NOTES Table
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content text,
  color text,
  x float8,
  y float8,
  is_minimized boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes." ON public.notes FOR ALL USING (auth.uid() = user_id);

-- LOANS Table
CREATE TABLE public.loans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  type text NOT NULL, -- 'borrowing' or 'loan'
  third_party text NOT NULL,
  principal numeric NOT NULL,
  term integer NOT NULL,
  monthly_payment numeric NOT NULL,
  principal_date date NOT NULL,
  repayment_start_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own loans." ON public.loans FOR ALL USING (auth.uid() = user_id);

-- SCENARIOS Table
CREATE TABLE public.scenarios (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  is_visible boolean DEFAULT true,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scenarios." ON public.scenarios FOR ALL USING (auth.uid() = user_id);

-- BUDGET_ENTRIES Table
CREATE TABLE public.budget_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  loan_id uuid REFERENCES public.loans ON DELETE SET NULL,
  type text NOT NULL, -- 'revenu' or 'depense'
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
  provision_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own budget entries." ON public.budget_entries FOR ALL USING (auth.uid() = user_id);

-- ACTUAL_TRANSACTIONS Table
CREATE TABLE public.actual_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  budget_id uuid REFERENCES public.budget_entries ON DELETE SET NULL,
  type text NOT NULL, -- 'payable' or 'receivable'
  category text NOT NULL,
  third_party text,
  description text,
  date date NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL,
  is_off_budget boolean DEFAULT false,
  is_provision boolean DEFAULT false,
  is_final_provision_payment boolean DEFAULT false,
  provision_details jsonb,
  is_internal_transfer boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own actual transactions." ON public.actual_transactions FOR ALL USING (auth.uid() = user_id);

-- CASH_ACCOUNTS Table
CREATE TABLE public.cash_accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  main_category_id text NOT NULL,
  name text NOT NULL,
  initial_balance numeric NOT NULL DEFAULT 0,
  initial_balance_date date NOT NULL,
  is_closed boolean DEFAULT false,
  closure_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own cash accounts." ON public.cash_accounts FOR ALL USING (auth.uid() = user_id);

-- PAYMENTS Table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  actual_id uuid NOT NULL REFERENCES public.actual_transactions ON DELETE CASCADE,
  payment_date date NOT NULL,
  paid_amount numeric NOT NULL,
  cash_account uuid REFERENCES public.cash_accounts ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own payments." ON public.payments FOR ALL USING (auth.uid() = user_id);

-- SCENARIO_ENTRIES Table
CREATE TABLE public.scenario_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  scenario_id uuid NOT NULL REFERENCES public.scenarios ON DELETE CASCADE,
  -- This table stores deltas, so it doesn't reference budget_entries directly with a foreign key
  -- The link is logical via the entry 'id' which is a UUID.
  entry_id uuid NOT NULL,
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
  payments jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(scenario_id, entry_id)
);
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scenario entries." ON public.scenario_entries FOR ALL USING (auth.uid() = user_id);
