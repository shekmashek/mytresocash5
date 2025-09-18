/*
# [Initial Schema Setup]
This migration script sets up the complete initial database schema for the Trezocash application. It creates all necessary tables, relationships, security policies (RLS), and automated triggers for user profile management.

## Query Description:
This is a foundational script. It does not modify existing data as it's intended for a fresh database. It establishes the entire structure required for user authentication, project management, budgeting, transactions, and other core features.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: false
- Reversible: false

## Structure Details:
- Tables Created: profiles, projects, cash_accounts, loans, budget_entries, actual_transactions, payments, scenarios, scenario_entries, notes, tiers, user_settings, main_categories, sub_categories.
- Functions Created: handle_new_user, populate_default_data_for_user.
- Triggers Created: on_auth_user_created.

## Security Implications:
- RLS Status: Enabled on all user-data tables.
- Policy Changes: Creates all initial RLS policies to ensure users can only access their own data.
- Auth Requirements: Relies on Supabase Auth (`auth.users`).

## Performance Impact:
- Indexes: Primary keys and foreign keys are indexed by default.
- Triggers: Adds a trigger on `auth.users` for profile creation and data seeding.
- Estimated Impact: Low impact on a new database.
*/

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp" with schema extensions;

-- 2. Profiles Table
-- Stores public user data.
create table public.profiles (
  id uuid not null primary key,
  username text,
  created_at timestamptz default now() not null,
  constraint id foreign key(id) references auth.users(id) on delete cascade
);
comment on table public.profiles is 'Public user profiles, linked to auth.users.';

-- 3. Profiles RLS
alter table public.profiles enable row level security;
create policy "Users can view their own profile." on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);

-- 4. Projects Table
create table public.projects (
  id uuid not null primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default '€'::text,
  start_date date not null,
  is_archived boolean not null default false,
  annual_goals jsonb,
  created_at timestamptz not null default now()
);
comment on table public.projects is 'Stores user projects.';

-- 5. Projects RLS
alter table public.projects enable row level security;
create policy "Users can manage their own projects." on public.projects for all using (auth.uid() = user_id);

-- 6. Cash Accounts Table
create table public.cash_accounts (
  id uuid not null primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  main_category_id text,
  initial_balance numeric not null default 0,
  initial_balance_date date not null,
  is_closed boolean not null default false,
  closure_date date,
  created_at timestamptz not null default now()
);
comment on table public.cash_accounts is 'Stores user cash accounts (bank, cash, etc.).';

-- 7. Cash Accounts RLS
alter table public.cash_accounts enable row level security;
create policy "Users can manage their own cash accounts." on public.cash_accounts for all using (auth.uid() = user_id);

-- 8. Loans Table
create table public.loans (
  id uuid not null primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- 'borrowing' or 'loan'
  third_party text not null,
  principal numeric not null,
  monthly_payment numeric not null,
  term integer not null,
  principal_date date not null,
  repayment_start_date date not null,
  created_at timestamptz not null default now()
);
comment on table public.loans is 'Stores user loans and borrowings.';

-- 9. Loans RLS
alter table public.loans enable row level security;
create policy "Users can manage their own loans." on public.loans for all using (auth.uid() = user_id);

-- 10. Budget Entries Table
create table public.budget_entries (
  id uuid not null primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid references public.loans(id) on delete set null,
  type text not null,
  category text not null,
  supplier text not null,
  description text,
  frequency text not null,
  amount numeric not null,
  date date,
  start_date date,
  end_date date,
  payments jsonb default '[]'::jsonb,
  provision_details jsonb,
  is_off_budget boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.budget_entries is 'Stores budget line items.';

-- 11. Budget Entries RLS
alter table public.budget_entries enable row level security;
create policy "Users can manage their own budget entries." on public.budget_entries for all using (auth.uid() = user_id);

-- 12. Actual Transactions Table
create table public.actual_transactions (
  id uuid not null primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid references public.budget_entries(id) on delete set null,
  type text not null,
  category text not null,
  third_party text not null,
  description text,
  date date not null,
  amount numeric not null,
  status text not null,
  is_off_budget boolean not null default false,
  is_provision boolean not null default false,
  is_final_provision_payment boolean not null default false,
  is_internal_transfer boolean not null default false,
  provision_details jsonb,
  created_at timestamptz not null default now()
);
comment on table public.actual_transactions is 'Stores actual transactions/invoices.';

-- 13. Actual Transactions RLS
alter table public.actual_transactions enable row level security;
create policy "Users can manage their own actual transactions." on public.actual_transactions for all using (auth.uid() = user_id);

-- 14. Payments Table
create table public.payments (
  id uuid not null primary key default uuid_generate_v4(),
  actual_transaction_id uuid not null references public.actual_transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_date date not null,
  paid_amount numeric not null,
  cash_account_id uuid references public.cash_accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.payments is 'Stores individual payments for actual transactions.';

-- 15. Payments RLS
alter table public.payments enable row level security;
create policy "Users can manage their own payments." on public.payments for all using (auth.uid() = user_id);

-- 16. Scenarios Table
create table public.scenarios (
  id uuid not null primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text,
  is_visible boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.scenarios is 'Stores user-created financial scenarios.';

-- 17. Scenarios RLS
alter table public.scenarios enable row level security;
create policy "Users can manage their own scenarios." on public.scenarios for all using (auth.uid() = user_id);

-- 18. Scenario Entries Table
create table public.scenario_entries (
  scenario_id uuid not null primary key references public.scenarios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entries jsonb not null default '[]'::jsonb
);
comment on table public.scenario_entries is 'Stores an array of entry deltas for a scenario.';

-- 19. Scenario Entries RLS
alter table public.scenario_entries enable row level security;
create policy "Users can manage their own scenario entries." on public.scenario_entries for all using (auth.uid() = user_id);

-- 20. Notes Table
create table public.notes (
  id uuid not null primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text,
  x float8,
  y float8,
  color text,
  is_minimized boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.notes is 'Stores user sticky notes.';

-- 21. Notes RLS
alter table public.notes enable row level security;
create policy "Users can manage their own notes." on public.notes for all using (auth.uid() = user_id);

-- 22. Tiers Table (Suppliers/Clients)
create table public.tiers (
  id uuid not null primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null, -- 'fournisseur' or 'client'
  created_at timestamptz not null default now(),
  unique(user_id, name, type)
);
comment on table public.tiers is 'Stores suppliers and clients.';

-- 23. Tiers RLS
alter table public.tiers enable row level security;
create policy "Users can manage their own tiers." on public.tiers for all using (auth.uid() = user_id);

-- 24. User Settings Table
create table public.user_settings (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  settings jsonb not null
);
comment on table public.user_settings is 'Stores user-specific application settings.';

-- 25. User Settings RLS
alter table public.user_settings enable row level security;
create policy "Users can manage their own settings." on public.user_settings for all using (auth.uid() = user_id);

-- 26. Categories Tables
create table public.main_categories (
  id text not null primary key,
  name text not null,
  type text not null, -- 'revenue' or 'expense'
  is_fixed boolean not null default false
);
comment on table public.main_categories is 'Fixed main categories for budget structure.';
create table public.sub_categories (
  id uuid not null primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  main_category_id text not null references public.main_categories(id) on delete cascade,
  name text not null,
  unique(user_id, main_category_id, name)
);
comment on table public.sub_categories is 'User-specific sub-categories.';

-- 27. Categories RLS
alter table public.sub_categories enable row level security;
create policy "Users can manage their own sub-categories." on public.sub_categories for all using (auth.uid() = user_id);

-- 28. Insert fixed Main Categories data
insert into public.main_categories (id, name, type, is_fixed) values
('rev-main-1', 'Entrées des Ventes', false, false),
('rev-main-2', 'Entrées Financières', false, false),
('rev-main-3', 'Autres Entrées', false, false),
('exp-main-1', 'Exploitation', true, true),
('exp-main-2', 'Masse Salariale', true, true),
('exp-main-3', 'Investissement', true, true),
('exp-main-4', 'Financement', true, true),
('exp-main-5', 'Épargne et Provision', true, true),
('exp-main-6', 'Exceptionnel', true, true),
('exp-main-7', 'Impôts et Taxes', true, true),
('exp-main-8', 'Formation', true, true),
('exp-main-9', 'Innovation, Recherche et développement', true, true),
('exp-main-10', 'Personnel', true, true),
('exp-main-11', 'Loisirs et plaisirs', true, true),
('exp-main-12', 'Dons et cadeaux', true, true),
('exp-main-13', 'Achat pour revente', true, true);

-- 29. Function to populate default data for a new user
create or replace function public.populate_default_data_for_user(user_id uuid)
returns void as $$
declare
  initial_sub_cats jsonb;
begin
  -- Insert default settings
  insert into public.user_settings (user_id, settings)
  values (user_id, '{
    "displayUnit": "standard",
    "decimalPlaces": 2,
    "currency": "€",
    "language": "fr",
    "timezoneOffset": 0
  }');

  -- Insert default sub-categories
  initial_sub_cats := '{
    "rev-main-1": ["Ventes de produits", "Ventes de services"],
    "rev-main-2": ["Intérêts perçus", "Réception Emprunt", "Remboursement de prêt reçu", "Intérêts de prêt reçus"],
    "rev-main-3": ["Subventions", "Revenus Exceptionnels"],
    "exp-main-1": ["Loyer et charges", "Fournitures de bureau", "Marketing et publicité", "Frais de déplacement", "Frais administratives et de gestion", "Frais de transport", "Entretien, réparation et maintenance", "Recherche et développement", "Petit équipement"],
    "exp-main-2": ["Salaires et traitements", "Charges sociales"],
    "exp-main-3": ["Investissements financiers", "Investissements immobiliers", "Investissement dans sa propre entreprise", "Autres investissements"],
    "exp-main-4": ["Octroi de Prêt", "Remboursement d''emprunt", "Intérêts d''emprunt"],
    "exp-main-5": ["Provision pour risques", "Fond d''urgence", "Epargne Projet à court et moyen termes", "Epargne retraite"],
    "exp-main-6": ["Amendes"],
    "exp-main-7": ["Impôt sur les sociétés", "TVA", "Autres taxes"],
    "exp-main-8": ["Matériel", "Livres", "Logiciels", "Abonnement", "Ateliers pratiques", "Formations certifiantes", "Stage"],
    "exp-main-9": [],
    "exp-main-10": ["Logement", "Eau et Electricité", "Frais de réparation et entretien", "Décoration et ameublement", "Frais de nettoyage", "Nourriture & alimentation", "Transports et déplacement", "Santé et bien etre", "Communication et divertissement", "Enfant et education", "Habillement & Textile", "Assurance divers", "Impots & obligation fiscales", "DIvers et imprévus"],
    "exp-main-11": ["Sorties et restaurants", "Abonnement digitaux", "Hobbies et passion", "Shopping", "Soins personnel"],
    "exp-main-12": ["Cadeaux pour occasions", "Célébration", "Charité"],
    "exp-main-13": ["Matière premiere", "Marchandises", "Emballage", "Etude et prestation de service", "Equipement et travaux"]
  }';

  insert into public.sub_categories (user_id, main_category_id, name)
  select user_id, key, value
  from jsonb_each_text(initial_sub_cats) as main_cat(key, sub_cat_array_str)
  cross join jsonb_array_elements_text(sub_cat_array_str::jsonb) as sub_cat(value);

end;
$$ language plpgsql security definer;

-- 30. Function and Trigger for new user setup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Create a public profile
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');

  -- Populate default settings and categories
  perform public.populate_default_data_for_user(new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists to avoid errors on re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
