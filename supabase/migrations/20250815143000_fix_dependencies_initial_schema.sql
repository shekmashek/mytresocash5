/*
  # Initial Schema Setup (v2 - Patched)
  This script sets up the initial database schema for Trezocash.
  It creates all necessary tables, enables Row Level Security,
  and sets up policies to ensure data privacy.
  It also creates a trigger to automatically create a user profile
  upon new user signup.
  This version fixes a dependency issue in the DROP statements.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "High"
  - Requires-Backup: false (as it's for initial setup)
  - Reversible: false (requires manual drop)
*/

-- Drop existing objects in reverse order to avoid dependency issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop tables with CASCADE to also remove dependent policies
DROP TABLE IF EXISTS public.scenario_entries CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.actual_transactions CASCADE;
DROP TABLE IF EXISTS public.budget_entries CASCADE;
DROP TABLE IF EXISTS public.scenarios CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.cash_accounts CASCADE;
DROP TABLE IF EXISTS public.tiers CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


-- Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  subscription_status text,
  trial_ends_at timestamp with time zone
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- Create projects table
CREATE TABLE public.projects (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  currency text NOT NULL DEFAULT '€',
  start_date date NOT NULL,
  is_archived boolean NOT NULL DEFAULT false,
  annual_goals jsonb,
  expense_targets jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own projects." ON public.projects FOR ALL USING (auth.uid() = user_id);


-- Create tiers table (clients/suppliers)
CREATE TABLE public.tiers (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- 'client' or 'fournisseur'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, type)
);
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers." ON public.tiers FOR ALL USING (auth.uid() = user_id);


-- Create cash_accounts table
CREATE TABLE public.cash_accounts (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  main_category_id text NOT NULL,
  name text NOT NULL,
  initial_balance numeric NOT NULL DEFAULT 0,
  initial_balance_date date NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  closure_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage accounts of their own projects." ON public.cash_accounts FOR ALL USING (auth.uid() = user_id);


-- Create budget_entries table
CREATE TABLE public.budget_entries (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id uuid, -- Can be null
  type text NOT NULL,
  category text NOT NULL,
  frequency text NOT NULL,
  amount numeric NOT NULL,
  date date,
  start_date date,
  end_date date,
  supplier text NOT NULL,
  description text,
  is_off_budget boolean DEFAULT false,
  payments jsonb,
  provision_details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage budget entries of their own projects." ON public.budget_entries FOR ALL USING (auth.uid() = user_id);


-- Create actual_transactions table
CREATE TABLE public.actual_transactions (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES public.budget_entries(id) ON DELETE SET NULL,
  type text NOT NULL,
  category text NOT NULL,
  third_party text NOT NULL,
  description text,
  date date NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL,
  is_off_budget boolean DEFAULT false,
  is_provision boolean DEFAULT false,
  is_final_provision_payment boolean DEFAULT false,
  provision_details jsonb,
  is_internal_transfer boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage actuals of their own projects." ON public.actual_transactions FOR ALL USING (auth.uid() = user_id);


-- Create payments table
CREATE TABLE public.payments (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  actual_id uuid NOT NULL REFERENCES public.actual_transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  paid_amount numeric NOT NULL,
  cash_account uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage payments of their own projects." ON public.payments FOR ALL USING (auth.uid() = user_id);


-- Create scenarios table
CREATE TABLE public.scenarios (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  is_visible boolean DEFAULT true,
  is_archived boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scenarios." ON public.scenarios FOR ALL USING (auth.uid() = user_id);


-- Create scenario_entries table
CREATE TABLE public.scenario_entries (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL, -- This is the ID of the budget_entry it modifies or the new ID
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
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scenario entries." ON public.scenario_entries FOR ALL USING (auth.uid() = user_id);


-- Create loans table
CREATE TABLE public.loans (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'borrowing' or 'loan'
  third_party text NOT NULL,
  principal numeric NOT NULL,
  term integer NOT NULL,
  monthly_payment numeric NOT NULL,
  principal_date date NOT NULL,
  repayment_start_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own loans." ON public.loans FOR ALL USING (auth.uid() = user_id);


-- Create notes table
CREATE TABLE public.notes (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  color text,
  x integer,
  y integer,
  is_minimized boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes." ON public.notes FOR ALL USING (auth.uid() = user_id);


-- Function and Trigger for new user profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, trial_ends_at)
  values (new.id, new.raw_user_meta_data->>'full_name', now() + interval '14 days');
  return new;
end;
$$ language plpgsql security definer;

-- create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
