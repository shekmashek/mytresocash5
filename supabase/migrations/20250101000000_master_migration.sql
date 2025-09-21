/*
          # [Master Migration]
          Ce script initialise l'ensemble de la base de données Trezocash. Il est conçu pour être exécuté sur une base de données vierge ou pour réinitialiser une base de données existante.

          ## Query Description: [Ce script va supprimer toutes les données existantes (s'il y en a) et reconstruire entièrement la structure de la base de données. C'est une opération destructive mais nécessaire pour garantir une base saine. Une sauvegarde est recommandée si vous avez des données que vous ne voulez pas perdre.]
          
          ## Metadata:
          - Schema-Category: ["Dangerous", "Structural"]
          - Impact-Level: ["High"]
          - Requires-Backup: [true]
          - Reversible: [false]
          
          ## Structure Details:
          - Toutes les tables de l'application seront créées.
          - Toutes les politiques de sécurité (RLS) seront définies.
          - Toutes les fonctions et déclencheurs seront mis en place.
          
          ## Security Implications:
          - RLS Status: [Enabled on all tables]
          - Policy Changes: [Yes, all policies are defined here]
          - Auth Requirements: [User authentication is required for all operations]
          */

-- 1. Drop existing objects (for idempotency)
-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop policies from all tables
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT
            'DROP POLICY IF EXISTS "' || policyname || '" ON public."' || tablename || '";' as stmt
        FROM
            pg_policies
        WHERE
            schemaname = 'public'
    LOOP
        EXECUTE rec.stmt;
    END LOOP;
END
$$;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_project(text, date, text);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.get_user_id_from_email(text);
DROP FUNCTION IF EXISTS public.delete_user_account();

-- Drop tables in reverse order of dependency
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.scenario_entries;
DROP TABLE IF EXISTS public.actual_transactions;
DROP TABLE IF EXISTS public.budget_entries;
DROP TABLE IF EXISTS public.loans;
DROP TABLE IF EXISTS public.scenarios;
DROP TABLE IF EXISTS public.cash_accounts;
DROP TABLE IF EXISTS public.project_collaborators;
DROP TABLE IF EXISTS public.consolidated_views;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.tiers;
DROP TABLE IF EXISTS public.notes;
DROP TABLE IF EXISTS public.referrals;
DROP TABLE IF EXISTS public.profiles;

-- 2. Create tables
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    avatar_url text,
    stripe_customer_id text,
    subscription_status text,
    plan_id text,
    subscription_id text,
    trial_ends_at timestamp with time zone,
    referral_code text UNIQUE,
    referred_by uuid REFERENCES public.profiles(id),
    currency text DEFAULT '€'::text,
    display_unit text DEFAULT 'standard'::text,
    decimal_places integer DEFAULT 2,
    language text DEFAULT 'fr'::text,
    timezone_offset integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    currency text NOT NULL,
    start_date date NOT NULL,
    is_archived boolean DEFAULT false,
    annual_goals jsonb,
    expense_targets jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.consolidated_views (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    project_ids uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.project_collaborators (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text NOT NULL, -- 'owner', 'editor', 'viewer'
    invited_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.cash_accounts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    main_category_id text NOT NULL,
    name text NOT NULL,
    initial_balance numeric DEFAULT 0,
    initial_balance_date date NOT NULL,
    is_closed boolean DEFAULT false,
    closure_date date,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.loans (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'borrowing' or 'loan'
    third_party text NOT NULL,
    principal numeric NOT NULL,
    term integer NOT NULL,
    monthly_payment numeric NOT NULL,
    principal_date date NOT NULL,
    repayment_start_date date NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.budget_entries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    loan_id uuid REFERENCES public.loans(id) ON DELETE SET NULL,
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
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.actual_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id uuid REFERENCES public.budget_entries(id) ON DELETE SET NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    actual_id uuid REFERENCES public.actual_transactions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    payment_date date NOT NULL,
    paid_amount numeric NOT NULL,
    cash_account uuid REFERENCES public.cash_accounts(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scenarios (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    color text,
    is_visible boolean DEFAULT true,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scenario_entries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id uuid REFERENCES public.scenarios(id) ON DELETE CASCADE,
    entry_id uuid NOT NULL, -- Can't be a FK because it can reference an entry that doesn't exist in base budget
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tiers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL, -- 'client' or 'fournisseur'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name, type)
);

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text,
    color text,
    x integer,
    y integer,
    is_minimized boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending', -- pending, completed
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 4. Create helper functions
CREATE FUNCTION public.get_user_id_from_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  RETURN v_user_id;
END;
$$;

CREATE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators WHERE project_id = p_project_id AND user_id = auth.uid()
  );
END;
$$;

CREATE FUNCTION public.is_project_editor(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_collaborators WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'editor'
  );
END;
$$;

-- 5. Create security policies
-- Profiles
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (public.is_project_member(id));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Project Collaborators
CREATE POLICY "Users can view collaborators of their projects" ON public.project_collaborators FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Owners can manage collaborators" ON public.project_collaborators FOR ALL USING (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND user_id = auth.uid()));

-- Consolidated Views
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);

-- Generic policies for project-related data
CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (public.is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (public.is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (public.is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (public.is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (public.is_project_member(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (public.is_project_editor(project_id));

-- Policies for payments (corrected)
CREATE POLICY "Users can view payments for accessible projects" ON public.payments FOR SELECT USING (public.is_project_member((SELECT project_id FROM public.actual_transactions WHERE id = payments.actual_id)));
CREATE POLICY "Users can manage payments for editable projects" ON public.payments FOR ALL USING (public.is_project_editor((SELECT project_id FROM public.actual_transactions WHERE id = payments.actual_id)));

-- Policies for scenario_entries
CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (auth.uid() = user_id);

-- Policies for tiers, notes, referrals
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- 6. Create triggers and related functions
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, referral_code, trial_ends_at)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    substring(md5(random()::text) for 8),
    (now() + interval '14 days')
  );
  
  -- Handle referral
  IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_user_id, referred_user_id)
    SELECT id, new.id FROM public.profiles WHERE referral_code = new.raw_user_meta_data->>'referral_code';
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE FUNCTION public.handle_new_project(project_name text, project_start_date date, project_currency text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project_id uuid;
BEGIN
  INSERT INTO public.projects (user_id, name, start_date, currency)
  VALUES (auth.uid(), project_name, project_start_date, project_currency)
  RETURNING id INTO new_project_id;

  INSERT INTO public.cash_accounts (project_id, user_id, main_category_id, name, initial_balance, initial_balance_date)
  VALUES (new_project_id, auth.uid(), 'cash', 'Caisse Espèce', 0, project_start_date);
  
  INSERT INTO public.project_collaborators (project_id, user_id, role, invited_by)
  VALUES (new_project_id, auth.uid(), 'owner', auth.uid());

  RETURN new_project_id;
END;
$$;

CREATE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This will cascade delete all related data in public tables
  DELETE FROM public.profiles WHERE id = auth.uid();
  -- Finally, delete the user from auth.users
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- 7. Seed initial data (optional, for new users)
-- The default categories are now handled in the frontend context, so no seeding is needed here.
-- This keeps the database schema clean.
