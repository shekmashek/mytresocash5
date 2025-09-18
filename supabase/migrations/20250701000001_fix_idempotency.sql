/*
  # Migration: Idempotent Schema Setup
  This script sets up or updates the entire database schema, ensuring it can be run multiple times without errors. It creates tables if they don't exist and replaces policies and triggers to ensure the latest version is applied.

  ## Query Description: 
  This operation will set up or update your database structure. It is designed to be safe to run multiple times. It will not delete any of your data.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: false
*/

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  subscription_status text,
  trial_ends_at timestamptz
);
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);

-- 2. PROJECTS TABLE
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  currency text not null default '€',
  start_date date not null,
  is_archived boolean not null default false,
  annual_goals jsonb,
  expense_targets jsonb,
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;
drop policy if exists "Users can manage their own projects." on public.projects;
create policy "Users can manage their own projects." on public.projects for all using (auth.uid() = user_id);

-- 3. TIERS TABLE
create table if not exists public.tiers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  type text not null, -- 'client' or 'fournisseur'
  created_at timestamptz not null default now()
);
alter table public.tiers enable row level security;
drop policy if exists "Users can manage their own tiers." on public.tiers;
create policy "Users can manage their own tiers." on public.tiers for all using (auth.uid() = user_id);

-- 4. CASH ACCOUNTS TABLE
create table if not exists public.cash_accounts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users not null,
  main_category_id text not null,
  name text not null,
  initial_balance numeric not null default 0,
  initial_balance_date date not null,
  is_closed boolean not null default false,
  closure_date date,
  created_at timestamptz not null default now()
);
alter table public.cash_accounts enable row level security;
drop policy if exists "Users can manage their own cash accounts." on public.cash_accounts;
create policy "Users can manage their own cash accounts." on public.cash_accounts for all using (auth.uid() = user_id);

-- 5. BUDGET ENTRIES TABLE
create table if not exists public.budget_entries (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users not null,
  loan_id uuid, -- Can be null
  type text not null, -- 'revenu' or 'depense'
  category text not null,
  frequency text not null,
  amount numeric not null,
  date date, -- For 'ponctuel'
  start_date date, -- For recurring
  end_date date, -- For recurring
  supplier text not null,
  description text,
  is_off_budget boolean not null default false,
  payments jsonb, -- For 'irregulier'
  provision_details jsonb,
  created_at timestamptz not null default now()
);
alter table public.budget_entries enable row level security;
drop policy if exists "Users can manage their own budget entries." on public.budget_entries;
create policy "Users can manage their own budget entries." on public.budget_entries for all using (auth.uid() = user_id);

-- 6. ACTUAL TRANSACTIONS TABLE
create table if not exists public.actual_transactions (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references public.budget_entries on delete set null,
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users not null,
  type text not null, -- 'payable' or 'receivable'
  category text not null,
  third_party text not null,
  description text,
  date date not null,
  amount numeric not null,
  status text not null default 'pending',
  is_off_budget boolean not null default false,
  is_provision boolean not null default false,
  is_final_provision_payment boolean not null default false,
  provision_details jsonb,
  is_internal_transfer boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.actual_transactions enable row level security;
drop policy if exists "Users can manage their own actual transactions." on public.actual_transactions;
create policy "Users can manage their own actual transactions." on public.actual_transactions for all using (auth.uid() = user_id);

-- 7. PAYMENTS TABLE
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  actual_id uuid references public.actual_transactions on delete cascade not null,
  user_id uuid references auth.users not null,
  payment_date date not null,
  paid_amount numeric not null,
  cash_account uuid references public.cash_accounts on delete set null,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "Users can manage their own payments." on public.payments;
create policy "Users can manage their own payments." on public.payments for all using (auth.uid() = user_id);

-- 8. SCENARIOS TABLE
create table if not exists public.scenarios (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  color text,
  is_visible boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.scenarios enable row level security;
drop policy if exists "Users can manage their own scenarios." on public.scenarios;
create policy "Users can manage their own scenarios." on public.scenarios for all using (auth.uid() = user_id);

-- 9. SCENARIO ENTRIES TABLE
create table if not exists public.scenario_entries (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid references public.scenarios on delete cascade not null,
  user_id uuid references auth.users not null,
  entry_id uuid not null, -- This is the ID of the budget_entry it modifies, or a new UUID
  type text,
  category text,
  frequency text,
  amount numeric,
  date date,
  start_date date,
  end_date date,
  supplier text,
  description text,
  is_deleted boolean,
  payments jsonb,
  created_at timestamptz not null default now()
);
alter table public.scenario_entries enable row level security;
drop policy if exists "Users can manage their own scenario entries." on public.scenario_entries;
create policy "Users can manage their own scenario entries." on public.scenario_entries for all using (auth.uid() = user_id);

-- 10. LOANS TABLE
create table if not exists public.loans (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users not null,
  type text not null, -- 'borrowing' or 'loan'
  third_party text not null,
  principal numeric not null,
  term integer not null, -- in months
  monthly_payment numeric not null,
  principal_date date not null,
  repayment_start_date date not null,
  created_at timestamptz not null default now()
);
alter table public.loans enable row level security;
drop policy if exists "Users can manage their own loans." on public.loans;
create policy "Users can manage their own loans." on public.loans for all using (auth.uid() = user_id);

-- 11. NOTES TABLE
create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  content text,
  color text,
  x integer,
  y integer,
  is_minimized boolean default false,
  created_at timestamptz not null default now()
);
alter table public.notes enable row level security;
drop policy if exists "Users can manage their own notes." on public.notes;
create policy "Users can manage their own notes." on public.notes for all using (auth.uid() = user_id);

-- 12. TRIGGER for new user profile creation
drop function if exists public.handle_new_user();
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, subscription_status, trial_ends_at)
  values (new.id, new.raw_user_meta_data->>'full_name', 'trialing', now() + interval '14 days');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
