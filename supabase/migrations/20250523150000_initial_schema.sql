/*
          # Initial Schema Setup
          This script creates all the necessary tables, relationships, and security policies for the Trezocash application.

          ## Query Description: 
          This is a foundational script. It builds the entire database structure from scratch. It is safe to run on a new, empty Supabase project. DO NOT run this on a project that already has data, as it may cause conflicts.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "High"
          - Requires-Backup: false (since it's for initial setup)
          - Reversible: false (requires manual deletion of tables)
          
          ## Structure Details:
          - Creates tables: profiles, projects, cash_accounts, tiers, budget_entries, actual_transactions, payments, loans, scenarios, scenario_entries, notes.
          - Sets up foreign key relationships between tables.
          - Creates a trigger to automatically create a user profile on sign-up.
          
          ## Security Implications:
          - RLS Status: Enables Row Level Security on all tables.
          - Policy Changes: Adds policies to ensure users can only access their own data.
          - Auth Requirements: All table access is tied to the authenticated user's ID.
          
          ## Performance Impact:
          - Indexes: Adds primary key and foreign key indexes.
          - Triggers: Adds one trigger on user creation.
          - Estimated Impact: Low impact on a new project.
          */

-- 1. PROFILES TABLE
-- Stores public user data.
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    full_name text,
    subscription_status text DEFAULT 'trialing',
    trial_ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. TRIGGER FOR NEW USERS
-- This trigger automatically creates a profile for new users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, trial_ends_at)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', now() + interval '14 days');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. PROJECTS TABLE
CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    name text NOT NULL,
    currency character varying(10) DEFAULT '€'::character varying NOT NULL,
    start_date date NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    annual_goals jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own projects." ON public.projects FOR ALL USING (auth.uid() = user_id);

-- 4. CASH ACCOUNTS TABLE
CREATE TABLE public.cash_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
    name text NOT NULL,
    main_category_id text NOT NULL,
    initial_balance numeric DEFAULT 0 NOT NULL,
    initial_balance_date date NOT NULL,
    is_closed boolean DEFAULT false NOT NULL,
    closure_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage cash accounts of their own projects." ON public.cash_accounts FOR ALL USING (
    (EXISTS (SELECT 1 FROM projects WHERE projects.id = cash_accounts.project_id AND projects.user_id = auth.uid()))
);

-- 5. TIERS TABLE (Suppliers/Clients)
CREATE TABLE public.tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL, -- 'fournisseur' or 'client'
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, name, type)
);
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers." ON public.tiers FOR ALL USING (auth.uid() = user_id);

-- 6. BUDGET ENTRIES TABLE
CREATE TABLE public.budget_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
    type text NOT NULL, -- 'revenu' or 'depense'
    category text NOT NULL,
    supplier text NOT NULL,
    description text,
    frequency text NOT NULL,
    amount numeric NOT NULL,
    date date,
    start_date date,
    end_date date,
    payments jsonb,
    provision_details jsonb,
    is_off_budget boolean DEFAULT false,
    loan_id uuid, -- Can be null
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage budget entries of their own projects." ON public.budget_entries FOR ALL USING (
    (EXISTS (SELECT 1 FROM projects WHERE projects.id = budget_entries.project_id AND projects.user_id = auth.uid()))
);

-- 7. ACTUAL TRANSACTIONS TABLE
CREATE TABLE public.actual_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
    budget_id uuid REFERENCES public.budget_entries ON DELETE SET NULL,
    type text NOT NULL, -- 'payable' or 'receivable'
    category text NOT NULL,
    third_party text NOT NULL,
    description text,
    date date NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL,
    is_off_budget boolean DEFAULT false,
    is_provision boolean DEFAULT false,
    is_final_provision_payment boolean DEFAULT false,
    is_internal_transfer boolean DEFAULT false,
    provision_details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage actuals of their own projects." ON public.actual_transactions FOR ALL USING (
    (EXISTS (SELECT 1 FROM projects WHERE projects.id = actual_transactions.project_id AND projects.user_id = auth.uid()))
);

-- 8. PAYMENTS TABLE
CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    actual_id uuid NOT NULL REFERENCES public.actual_transactions ON DELETE CASCADE,
    payment_date date NOT NULL,
    paid_amount numeric NOT NULL,
    cash_account_id uuid NOT NULL, -- No FK to avoid complexity across projects, will be handled by app logic
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage payments of their own actuals." ON public.payments FOR ALL USING (
    (EXISTS (
        SELECT 1 FROM actual_transactions
        JOIN projects ON actual_transactions.project_id = projects.id
        WHERE actual_transactions.id = payments.actual_id AND projects.user_id = auth.uid()
    ))
);

-- 9. LOANS TABLE
CREATE TABLE public.loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
    type text NOT NULL, -- 'borrowing' or 'loan'
    third_party text NOT NULL,
    principal numeric NOT NULL,
    term integer NOT NULL,
    monthly_payment numeric NOT NULL,
    principal_date date NOT NULL,
    repayment_start_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage loans of their own projects." ON public.loans FOR ALL USING (
    (EXISTS (SELECT 1 FROM projects WHERE projects.id = loans.project_id AND projects.user_id = auth.uid()))
);
ALTER TABLE public.budget_entries ADD CONSTRAINT fk_loan_id FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE SET NULL;

-- 10. SCENARIOS TABLE
CREATE TABLE public.scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    color text,
    is_visible boolean DEFAULT true NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage scenarios of their own projects." ON public.scenarios FOR ALL USING (
    (EXISTS (SELECT 1 FROM projects WHERE projects.id = scenarios.project_id AND projects.user_id = auth.uid()))
);

-- 11. SCENARIO ENTRIES TABLE
CREATE TABLE public.scenario_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    scenario_id uuid NOT NULL REFERENCES public.scenarios ON DELETE CASCADE,
    entry_delta jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage scenario entries of their own scenarios." ON public.scenario_entries FOR ALL USING (
    (EXISTS (
        SELECT 1 FROM scenarios
        JOIN projects ON scenarios.project_id = projects.id
        WHERE scenarios.id = scenario_entries.scenario_id AND projects.user_id = auth.uid()
    ))
);

-- 12. NOTES TABLE
CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    content text,
    position jsonb,
    color text,
    is_minimized boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes." ON public.notes FOR ALL USING (auth.uid() = user_id);
