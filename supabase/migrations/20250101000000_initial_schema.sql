/*
          # [Creation] Initial Schema
          This script sets up the entire initial database schema for the Trezocash application. It creates all necessary tables, relationships, security policies, and automation for user management.

          ## Query Description: This is a foundational script. It will create a new, empty structure for all your application data. It is safe to run on a new database but should not be run on a database that already contains data, as it assumes a clean slate.
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["High"]
          - Requires-Backup: false
          - Reversible: false
          
          ## Structure Details:
          - Tables Created: profiles, projects, cash_accounts, budget_entries, actual_transactions, payments, tiers, scenarios, scenario_entries, loans, notes, user_categories.
          - Triggers Created: on_auth_user_created to handle new user profiles.
          
          ## Security Implications:
          - RLS Status: Enabled on all user-data tables.
          - Policy Changes: Yes, policies are created to ensure users can only access their own data.
          - Auth Requirements: Policies rely on `auth.uid()` to identify the current user.
          
          ## Performance Impact:
          - Indexes: Primary keys and foreign keys will be indexed automatically.
          - Triggers: One trigger is added to the `auth.users` table.
          - Estimated Impact: Low impact on a new database.
          */

-- 1. PROFILES & USER MANAGEMENT
-- This function creates a new user profile whenever a new user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

-- This trigger calls the function above after a new user is created.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create the profiles table to store public user data.
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  username text,
  settings jsonb,
  updated_at timestamptz default now(),
  primary key (id)
);

-- Enable Row Level Security for profiles.
alter table public.profiles enable row level security;

-- Policy: Users can see their own profile.
create policy "Users can view their own profile."
  on public.profiles for select
  using ( auth.uid() = id );

-- Policy: Users can update their own profile.
create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );


-- 2. CORE PROJECT TABLES
-- Create projects table
create table public.projects (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  start_date date not null,
  is_archived boolean not null default false,
  annual_goals jsonb,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id) references auth.users(id) on delete cascade
);
alter table public.projects enable row level security;
create policy "Users can manage their own projects." on public.projects for all using (auth.uid() = user_id);

-- Create cash_accounts table
create table public.cash_accounts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  name text not null,
  initial_balance numeric not null default 0,
  initial_balance_date date not null,
  main_category_id text,
  is_closed boolean not null default false,
  closure_date date,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id) references auth.users(id) on delete cascade,
  foreign key (project_id) references public.projects(id) on delete cascade
);
alter table public.cash_accounts enable row level security;
create policy "Users can manage their own cash accounts." on public.cash_accounts for all using (auth.uid() = user_id);

-- Create budget_entries table
create table public.budget_entries (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  type text not null, -- 'revenu' or 'depense'
  category text not null,
  frequency text not null,
  amount numeric not null,
  date date,
  start_date date,
  end_date date,
  supplier text,
  description text,
  payments jsonb,
  is_off_budget boolean default false,
  loan_id uuid,
  provision_details jsonb,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id) references auth.users(id) on delete cascade,
  foreign key (project_id) references public.projects(id) on delete cascade
);
alter table public.budget_entries enable row level security;
create policy "Users can manage their own budget entries." on public.budget_entries for all using (auth.uid() = user_id);

-- Create actual_transactions table
create table public.actual_transactions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  budget_id uuid,
  type text not null, -- 'payable' or 'receivable'
  category text not null,
  third_party text,
  description text,
  date date not null,
  amount numeric not null,
  status text not null,
  is_internal_transfer boolean default false,
  is_provision boolean default false,
  is_final_provision_payment boolean default false,
  provision_details jsonb,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id) references auth.users(id) on delete cascade,
  foreign key (project_id) references public.projects(id) on delete cascade,
  foreign key (budget_id) references public.budget_entries(id) on delete set null
);
alter table public.actual_transactions enable row level security;
create policy "Users can manage their own actual transactions." on public.actual_transactions for all using (auth.uid() = user_id);

-- Create payments table
create table public.payments (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  actual_transaction_id uuid not null,
  payment_date date not null,
  paid_amount numeric not null,
  cash_account_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id) references auth.users(id) on delete cascade,
  foreign key (actual_transaction_id) references public.actual_transactions(id) on delete cascade,
  foreign key (cash_account_id) references public.cash_accounts(id) on delete restrict
);
alter table public.payments enable row level security;
create policy "Users can manage their own payments." on public.payments for all using (auth.uid() = user_id);


-- 3. SUPPORTING DATA TABLES
-- Create tiers table
create table public.tiers (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  type text not null, -- 'client' or 'fournisseur'
  created_at timestamptz not null default now(),
  primary key (id),
  unique(user_id, name, type),
  foreign key (user_id) references auth.users(id) on delete cascade
);
alter table public.tiers enable row level security;
create policy "Users can manage their own tiers." on public.tiers for all using (auth.uid() = user_id);

-- Create loans table
create table public.loans (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  type text not null, -- 'borrowing' or 'loan'
  third_party text not null,
  principal numeric not null,
  term integer not null,
  monthly_payment numeric not null,
  principal_date date not null,
  repayment_start_date date not null,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id) references auth.users(id) on delete cascade,
  foreign key (project_id) references public.projects(id) on delete cascade
);
alter table public.loans enable row level security;
create policy "Users can manage their own loans." on public.loans for all using (auth.uid() = user_id);

-- Add foreign key from budget_entries to loans
alter table public.budget_entries add constraint fk_loan_id foreign key (loan_id) references public.loans(id) on delete set null;

-- Create notes table
create table public.notes (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  content text,
  position_x integer not null default 100,
  position_y integer not null default 100,
  color text,
  is_minimized boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id) references auth.users(id) on delete cascade
);
alter table public.notes enable row level security;
create policy "Users can manage their own notes." on public.notes for all using (auth.uid() = user_id);

-- Create user_categories table
create table public.user_categories (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  type text not null, -- 'revenue' or 'expense'
  main_category_id text not null,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (id),
  unique(user_id, type, main_category_id, name),
  foreign key (user_id) references auth.users(id) on delete cascade
);
alter table public.user_categories enable row level security;
create policy "Users can manage their own categories." on public.user_categories for all using (auth.uid() = user_id);


-- 4. SCENARIO-RELATED TABLES
-- Create scenarios table
create table public.scenarios (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null,
  name text not null,
  description text,
  is_visible boolean not null default true,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id) references auth.users(id) on delete cascade,
  foreign key (project_id) references public.projects(id) on delete cascade
);
alter table public.scenarios enable row level security;
create policy "Users can manage their own scenarios." on public.scenarios for all using (auth.uid() = user_id);

-- Create scenario_entries table
create table public.scenario_entries (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  scenario_id uuid not null,
  base_budget_entry_id uuid,
  is_deleted boolean not null default false,
  entry_data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (id),
  foreign key (user_id) references auth.users(id) on delete cascade,
  foreign key (scenario_id) references public.scenarios(id) on delete cascade,
  foreign key (base_budget_entry_id) references public.budget_entries(id) on delete cascade
);
alter table public.scenario_entries enable row level security;
create policy "Users can manage their own scenario entries." on public.scenario_entries for all using (auth.uid() = user_id);
