-- This is the initial schema for the Trezocash application.
-- It sets up all the necessary tables, relationships, and security policies.

-- Create a table for public profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  subscription_status text,
  trial_ends_at timestamp with time zone
);
-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- This trigger automatically creates a profile for new users.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, subscription_status, trial_ends_at)
  values (new.id, new.raw_user_meta_data->>'full_name', 'trialing', now() + interval '14 days');
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists to avoid errors on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Projects Table
create table if not exists public.projects (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    name text not null,
    currency text not null default '€',
    start_date date not null,
    is_archived boolean not null default false,
    annual_goals jsonb,
    expense_targets jsonb,
    created_at timestamp with time zone not null default now()
);
alter table public.projects enable row level security;
create policy "Users can manage their own projects." on public.projects for all using (auth.uid() = user_id);

-- Cash Accounts Table
create table if not exists public.cash_accounts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    project_id uuid references public.projects on delete cascade not null,
    main_category_id text not null,
    name text not null,
    initial_balance numeric not null default 0,
    initial_balance_date date not null,
    is_closed boolean not null default false,
    closure_date date,
    created_at timestamp with time zone not null default now()
);
alter table public.cash_accounts enable row level security;
create policy "Users can manage their own cash accounts." on public.cash_accounts for all using (auth.uid() = user_id);

-- Tiers Table (Suppliers/Clients)
create table if not exists public.tiers (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    name text not null,
    type text not null, -- 'client' or 'fournisseur'
    created_at timestamp with time zone not null default now(),
    unique(user_id, name, type)
);
alter table public.tiers enable row level security;
create policy "Users can manage their own tiers." on public.tiers for all using (auth.uid() = user_id);

-- Budget Entries Table
create table if not exists public.budget_entries (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    project_id uuid references public.projects on delete cascade not null,
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
    provision_details jsonb, -- For 'provision'
    created_at timestamp with time zone not null default now()
);
alter table public.budget_entries enable row level security;
create policy "Users can manage their own budget entries." on public.budget_entries for all using (auth.uid() = user_id);

-- Actual Transactions Table
create table if not exists public.actual_transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    project_id uuid references public.projects on delete cascade not null,
    budget_id uuid, -- Can be null for off-budget
    type text not null, -- 'payable' or 'receivable'
    category text not null,
    third_party text not null,
    description text,
    date date not null,
    amount numeric not null,
    status text not null,
    is_off_budget boolean not null default false,
    is_provision boolean not null default false,
    is_final_provision_payment boolean not null default false,
    provision_details jsonb,
    is_internal_transfer boolean not null default false,
    created_at timestamp with time zone not null default now()
);
alter table public.actual_transactions enable row level security;
create policy "Users can manage their own actual transactions." on public.actual_transactions for all using (auth.uid() = user_id);

-- Payments Table
create table if not exists public.payments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    actual_id uuid references public.actual_transactions on delete cascade not null,
    payment_date date not null,
    paid_amount numeric not null,
    cash_account uuid not null,
    created_at timestamp with time zone not null default now()
);
alter table public.payments enable row level security;
create policy "Users can manage their own payments." on public.payments for all using (auth.uid() = user_id);

-- Scenarios Table
create table if not exists public.scenarios (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    project_id uuid references public.projects on delete cascade not null,
    name text not null,
    description text,
    color text,
    is_visible boolean not null default true,
    is_archived boolean not null default false,
    created_at timestamp with time zone not null default now()
);
alter table public.scenarios enable row level security;
create policy "Users can manage their own scenarios." on public.scenarios for all using (auth.uid() = user_id);

-- Scenario Entries Table (Deltas)
create table if not exists public.scenario_entries (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    scenario_id uuid references public.scenarios on delete cascade not null,
    entry_id uuid not null, -- References an entry in budget_entries OR a new UUID for a new entry
    type text,
    category text,
    frequency text,
    amount numeric,
    date date,
    start_date date,
    end_date date,
    supplier text,
    description text,
    is_deleted boolean default false,
    payments jsonb,
    created_at timestamp with time zone not null default now()
);
alter table public.scenario_entries enable row level security;
create policy "Users can manage their own scenario entries." on public.scenario_entries for all using (auth.uid() = user_id);

-- Loans Table
create table if not exists public.loans (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    project_id uuid references public.projects on delete cascade not null,
    type text not null, -- 'borrowing' or 'loan'
    third_party text not null,
    principal numeric not null,
    term integer not null, -- in months
    monthly_payment numeric not null,
    principal_date date not null,
    repayment_start_date date not null,
    created_at timestamp with time zone not null default now()
);
alter table public.loans enable row level security;
create policy "Users can manage their own loans." on public.loans for all using (auth.uid() = user_id);

-- Notes Table
create table if not exists public.notes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users on delete cascade not null,
    content text,
    color text,
    x numeric,
    y numeric,
    is_minimized boolean default false,
    created_at timestamp with time zone not null default now()
);
alter table public.notes enable row level security;
create policy "Users can manage their own notes." on public.notes for all using (auth.uid() = user_id);
