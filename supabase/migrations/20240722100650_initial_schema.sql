-- =================================================================
--  Trezocash - Initial Schema Migration
-- =================================================================
-- This script sets up the entire database schema for Trezocash,
-- including tables, policies, and functions for a multi-project
-- budget management system.
--
-- Best Practice:
-- This script is designed to be idempotent. It first drops
-- existing objects (if they exist) before creating them,
-- ensuring it can be run multiple times without errors.
-- The order of operations is crucial to respect dependencies.
-- =================================================================

-- =================================================================
--  Phase 1: Drop Existing Objects (in reverse order of creation)
-- =================================================================
-- This ensures a clean slate and avoids "already exists" errors.

-- Step 1.1: Drop Triggers
/*
          # [Operation] Drop Trigger on_auth_user_created
          [This operation removes the trigger that automatically creates a user profile upon registration.]

          ## Query Description: [This is a safe cleanup step. The trigger will be recreated later in the script. No data is affected.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          [auth.users]
          
          ## Security Implications:
          - RLS Status: [N/A]
          - Policy Changes: [No]
          - Auth Requirements: [None]
          
          ## Performance Impact:
          - Triggers: [Removed]
          - Estimated Impact: [Low]
          */
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 1.2: Drop Functions
/*
          # [Operation] Drop Function handle_new_user
          [This operation removes the function that handles new user profile creation.]

          ## Query Description: [This is a safe cleanup step. The function will be recreated later in the script. No data is affected.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          [N/A]
          
          ## Security Implications:
          - RLS Status: [N/A]
          - Policy Changes: [No]
          - Auth Requirements: [None]
          
          ## Performance Impact:
          - Triggers: [None]
          - Estimated Impact: [Low]
          */
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 1.3: Drop Policies
-- We drop all policies before dropping tables to remove dependencies.
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.payments;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.actual_transactions;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.budget_entries;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.scenario_entries;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.scenarios;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.loans;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.notes;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.tiers;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.cash_accounts;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Step 1.4: Drop Tables
-- Dropped in reverse order of dependency (child tables first).
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.actual_transactions;
DROP TABLE IF EXISTS public.budget_entries;
DROP TABLE IF EXISTS public.scenario_entries;
DROP TABLE IF EXISTS public.scenarios;
DROP TABLE IF EXISTS public.loans;
DROP TABLE IF EXISTS public.notes;
DROP TABLE IF EXISTS public.tiers;
DROP TABLE IF EXISTS public.cash_accounts;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.profiles;


-- =================================================================
--  Phase 2: Create Tables
-- =================================================================

-- Step 2.1: Profiles Table
/*
          # [Table] profiles
          [Stores public-facing user data, linked to Supabase's internal auth.users table.]

          ## Query Description: [This table will hold user profile information like full name and subscription status. It is essential for user management.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["High"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - id: UUID (Primary Key, Foreign Key to auth.users.id)
          - full_name: TEXT
          - subscription_status: TEXT
          - trial_ends_at: TIMESTAMPTZ
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [User must be authenticated to interact with their own profile.]
          
          ## Performance Impact:
          - Indexes: [Primary Key on id]
          - Triggers: [None]
          - Estimated Impact: [Low]
          */
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  subscription_status TEXT,
  trial_ends_at TIMESTAMPTZ
);
COMMENT ON TABLE public.profiles IS 'Stores public user profile information.';

-- Step 2.2: Projects Table
/*
          # [Table] projects
          [Stores user projects, which are the top-level containers for all financial data.]

          ## Query Description: [Creates the main table for projects. Each user can have multiple projects.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["High"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - id: UUID (Primary Key)
          - user_id: UUID (Foreign Key to auth.users.id)
          - name: TEXT
          - currency: TEXT
          - start_date: DATE
          - is_archived: BOOLEAN
          - annual_goals: JSONB
          - expense_targets: JSONB
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [User must be authenticated.]
          
          ## Performance Impact:
          - Indexes: [Primary Key on id, Index on user_id]
          - Triggers: [None]
          - Estimated Impact: [Low]
          */
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT '€',
  start_date DATE NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  annual_goals JSONB,
  expense_targets JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
COMMENT ON TABLE public.projects IS 'Stores user-created financial projects.';

-- ... (Continue creating all other tables: cash_accounts, tiers, notes, loans, scenarios, budget_entries, etc.)
-- The following tables all follow the same pattern with a user_id and RLS policies.

CREATE TABLE IF NOT EXISTS public.cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  main_category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  initial_balance_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closure_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_project_id ON public.cash_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_user_id ON public.cash_accounts(user_id);

CREATE TABLE IF NOT EXISTS public.tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'client' or 'fournisseur'
  UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_tiers_user_id ON public.tiers(user_id);

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  color TEXT,
  x INT,
  y INT,
  is_minimized BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'borrowing' or 'loan'
  third_party TEXT NOT NULL,
  principal NUMERIC NOT NULL,
  term INT NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  principal_date DATE NOT NULL,
  repayment_start_date DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_loans_project_id ON public.loans(project_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);

CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_scenarios_project_id ON public.scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON public.scenarios(user_id);

CREATE TABLE IF NOT EXISTS public.budget_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE,
  start_date DATE,
  end_date DATE,
  supplier TEXT NOT NULL,
  description TEXT,
  is_off_budget BOOLEAN DEFAULT FALSE,
  payments JSONB,
  provision_details JSONB
);
CREATE INDEX IF NOT EXISTS idx_budget_entries_project_id ON public.budget_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_user_id ON public.budget_entries(user_id);

CREATE TABLE IF NOT EXISTS public.actual_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.budget_entries(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  third_party TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  is_off_budget BOOLEAN DEFAULT FALSE,
  is_provision BOOLEAN DEFAULT FALSE,
  is_final_provision_payment BOOLEAN DEFAULT FALSE,
  provision_details JSONB,
  is_internal_transfer BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_actual_transactions_project_id ON public.actual_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_actual_transactions_user_id ON public.actual_transactions(user_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actual_id UUID NOT NULL REFERENCES public.actual_transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  paid_amount NUMERIC NOT NULL,
  cash_account UUID NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_payments_actual_id ON public.payments(actual_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

CREATE TABLE IF NOT EXISTS public.scenario_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE,
  start_date DATE,
  end_date DATE,
  supplier TEXT NOT NULL,
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  payments JSONB
);
CREATE INDEX IF NOT EXISTS idx_scenario_entries_scenario_id ON public.scenario_entries(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_entries_user_id ON public.scenario_entries(user_id);

-- =================================================================
--  Phase 3: Enable Row Level Security (RLS)
-- =================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;

-- =================================================================
--  Phase 4: Create RLS Policies
-- =================================================================
-- These policies ensure that users can only access their own data.

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable all operations for users based on user_id" ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all operations for users based on user_id" ON public.cash_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all operations for users based on user_id" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all operations for users based on user_id" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all operations for users based on user_id" ON public.loans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all operations for users based on user_id" ON public.scenarios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all operations for users based on user_id" ON public.budget_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all operations for users based on user_id" ON public.actual_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all operations for users based on user_id" ON public.payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all operations for users based on user_id" ON public.scenario_entries FOR ALL USING (auth.uid() = user_id);

-- =================================================================
--  Phase 5: Create Functions and Triggers
-- =================================================================

-- Step 5.1: Function to create a profile for a new user
/*
          # [Function] handle_new_user
          [This function creates a profile for a new user in the public.profiles table.]

          ## Query Description: [Creates a profile for a new user.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          [public.profiles]
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [No]
          - Auth Requirements: [None]
          
          ## Performance Impact:
          - Indexes: [None]
          - Triggers: [Added]
          - Estimated Impact: [Low]
          */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, subscription_status, trial_ends_at)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'trialing', now() + interval '14 days');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5.2: Trigger to call the function on new user creation
/*
          # [Trigger] on_auth_user_created
          [This trigger calls the handle_new_user function when a new user is created.]

          ## Query Description: [Calls the handle_new_user function.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          [auth.users]
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [No]
          - Auth Requirements: [None]
          
          ## Performance Impact:
          - Indexes: [None]
          - Triggers: [Added]
          - Estimated Impact: [Low]
          */
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
