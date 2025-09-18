/*
# Initial Schema Setup
This script sets up the initial database schema for the Trezocash application.

## Query Description: 
This operation will create all necessary tables, relationships, and security policies for the application to function. It is designed to be run on a fresh database. If run on a database with existing tables of the same name, it might fail. It is safe to re-run if it fails, as create statements include "IF NOT EXISTS".

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: true
- Reversible: false

## Structure Details:
- Creates tables: profiles, projects, cash_accounts, tiers, budget_entries, actual_transactions, payments, scenarios, scenario_entries, notes, loans.
- Sets up foreign key relationships between tables.
- Enables Row Level Security on all tables.
- Creates policies to ensure users can only access their own data.
- Creates a trigger to automatically create a user profile upon registration.

## Security Implications:
- RLS Status: Enabled on all tables.
- Policy Changes: Yes, policies are created for all tables.
- Auth Requirements: Policies are based on `auth.uid()`, linking data to authenticated users.

## Performance Impact:
- Indexes: Primary keys and foreign keys are indexed by default.
- Triggers: One trigger is added on the `auth.users` table.
- Estimated Impact: Low on a new database.
*/

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  subscription_status text default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days')
);
comment on table public.profiles is 'Stores public-facing user data.';

-- Create projects table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  currency text default '€' not null,
  start_date date not null,
  is_archived boolean default false not null,
  annual_goals jsonb,
  expense_targets jsonb,
  created_at timestamptz default now() not null
);
comment on table public.projects is 'Stores user projects.';

-- Create cash_accounts table
create table if not exists public.cash_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete cascade not null,
  main_category_id text not null,
  name text not null,
  initial_balance numeric(15, 2) default 0.00 not null,
  initial_balance_date date not null,
  is_closed boolean default false not null,
  closure_date date,
  created_at timestamptz default now() not null
);
comment on table public.cash_accounts is 'Stores user cash accounts (bank, cash, etc.).';

-- Create tiers table
create table if not exists public.tiers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null, -- 'client' or 'fournisseur'
  created_at timestamptz default now() not null,
  unique(user_id, name)
);
comment on table public.tiers is 'Stores third parties like clients and suppliers.';

-- Create budget_entries table
create table if not exists public.budget_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete cascade not null,
  loan_id uuid, -- Can be null
  type text not null, -- 'revenu' or 'depense'
  category text not null,
  frequency text not null,
  amount numeric(15, 2) not null,
  date date, -- For 'ponctuel'
  start_date date, -- For recurring
  end_date date, -- For recurring
  supplier text not null,
  description text,
  is_off_budget boolean default false not null,
  payments jsonb, -- For 'irregulier'
  provision_details jsonb, -- For 'provision'
  created_at timestamptz default now() not null
);
comment on table public.budget_entries is 'Stores recurring or one-off budget forecasts.';

-- Create actual_transactions table
create table if not exists public.actual_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete cascade not null,
  budget_id uuid, -- Can be null for off-budget items
  type text not null, -- 'payable' or 'receivable'
  category text not null,
  third_party text not null,
  description text,
  date date not null,
  amount numeric(15, 2) not null,
  status text not null, -- 'pending', 'partially_paid', 'paid', 'partially_received', 'received', 'written_off'
  is_off_budget boolean default false not null,
  is_provision boolean default false not null,
  is_final_provision_payment boolean default false not null,
  provision_details jsonb,
  is_internal_transfer boolean default false not null,
  created_at timestamptz default now() not null
);
comment on table public.actual_transactions is 'Stores actual transactions/invoices.';

-- Create payments table
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  actual_id uuid references public.actual_transactions on delete cascade not null,
  payment_date date not null,
  paid_amount numeric(15, 2) not null,
  cash_account uuid not null,
  created_at timestamptz default now() not null
);
comment on table public.payments is 'Stores individual payments made against actual transactions.';

-- Create scenarios table
create table if not exists public.scenarios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete cascade not null,
  name text not null,
  description text,
  color text,
  is_visible boolean default true not null,
  is_archived boolean default false not null,
  created_at timestamptz default now() not null
);
comment on table public.scenarios is 'Stores financial simulation scenarios.';

-- Create scenario_entries table
create table if not exists public.scenario_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  scenario_id uuid references public.scenarios on delete cascade not null,
  entry_id uuid not null, -- References an entry in budget_entries OR is a new UUID for a new entry
  type text,
  category text,
  frequency text,
  amount numeric(15, 2),
  date date,
  start_date date,
  end_date date,
  supplier text,
  description text,
  is_deleted boolean default false not null,
  payments jsonb,
  created_at timestamptz default now() not null
);
comment on table public.scenario_entries is 'Stores deltas for scenario entries.';

-- Create notes table
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content text,
  color text,
  x integer,
  y integer,
  is_minimized boolean default false not null,
  created_at timestamptz default now() not null
);
comment on table public.notes is 'Stores user sticky notes.';

-- Create loans table
create table if not exists public.loans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete cascade not null,
  type text not null, -- 'borrowing' or 'loan'
  third_party text not null,
  principal numeric(15, 2) not null,
  term integer not null, -- in months
  monthly_payment numeric(15, 2) not null,
  principal_date date not null,
  repayment_start_date date not null,
  created_at timestamptz default now() not null
);
comment on table public.loans is 'Stores loan and borrowing information.';

-- Enable Row Level Security (RLS) for all tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.cash_accounts enable row level security;
alter table public.tiers enable row level security;
alter table public.budget_entries enable row level security;
alter table public.actual_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_entries enable row level security;
alter table public.notes enable row level security;
alter table public.loans enable row level security;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using ( true );
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
create policy "Users can insert their own profile." on public.profiles for insert with check ( auth.uid() = id );
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
create policy "Users can update own profile." on public.profiles for update using ( auth.uid() = id );

-- RLS Policies for projects
DROP POLICY IF EXISTS "Users can view their own projects." ON public.projects;
create policy "Users can view their own projects." on public.projects for select using ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can insert their own projects." ON public.projects;
create policy "Users can insert their own projects." on public.projects for insert with check ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can update their own projects." ON public.projects;
create policy "Users can update their own projects." on public.projects for update using ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can delete their own projects." ON public.projects;
create policy "Users can delete their own projects." on public.projects for delete using ( auth.uid() = user_id );

-- RLS Policies for cash_accounts
DROP POLICY IF EXISTS "Users can view their own cash accounts." ON public.cash_accounts;
create policy "Users can view their own cash accounts." on public.cash_accounts for select using ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can insert their own cash accounts." ON public.cash_accounts;
create policy "Users can insert their own cash accounts." on public.cash_accounts for insert with check ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can update their own cash accounts." ON public.cash_accounts;
create policy "Users can update their own cash accounts." on public.cash_accounts for update using ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can delete their own cash accounts." ON public.cash_accounts;
create policy "Users can delete their own cash accounts." on public.cash_accounts for delete using ( auth.uid() = user_id );

-- RLS Policies for tiers
DROP POLICY IF EXISTS "Users can manage their own tiers." ON public.tiers;
create policy "Users can manage their own tiers." on public.tiers for all using ( auth.uid() = user_id );

-- RLS Policies for budget_entries
DROP POLICY IF EXISTS "Users can manage their own budget entries." ON public.budget_entries;
create policy "Users can manage their own budget entries." on public.budget_entries for all using ( auth.uid() = user_id );

-- RLS Policies for actual_transactions
DROP POLICY IF EXISTS "Users can manage their own actual transactions." ON public.actual_transactions;
create policy "Users can manage their own actual transactions." on public.actual_transactions for all using ( auth.uid() = user_id );

-- RLS Policies for payments
DROP POLICY IF EXISTS "Users can manage their own payments." ON public.payments;
create policy "Users can manage their own payments." on public.payments for all using ( auth.uid() = user_id );

-- RLS Policies for scenarios
DROP POLICY IF EXISTS "Users can manage their own scenarios." ON public.scenarios;
create policy "Users can manage their own scenarios." on public.scenarios for all using ( auth.uid() = user_id );

-- RLS Policies for scenario_entries
DROP POLICY IF EXISTS "Users can manage their own scenario entries." ON public.scenario_entries;
create policy "Users can manage their own scenario entries." on public.scenario_entries for all using ( auth.uid() = user_id );

-- RLS Policies for notes
DROP POLICY IF EXISTS "Users can manage their own notes." ON public.notes;
create policy "Users can manage their own notes." on public.notes for all using ( auth.uid() = user_id );

-- RLS Policies for loans
DROP POLICY IF EXISTS "Users can manage their own loans." ON public.loans;
create policy "Users can manage their own loans." on public.loans for all using ( auth.uid() = user_id );

-- Function to create a public profile for a new user
DROP FUNCTION IF EXISTS public.handle_new_user();
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

-- Trigger to run the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
