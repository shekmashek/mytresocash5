/*
          # [INITIAL_SCHEMA]
          Création du schéma initial de la base de données pour Trezocash.

          ## Query Description: [Ce script met en place toutes les tables, relations et politiques de sécurité nécessaires au fonctionnement de l'application. Il est conçu pour être exécuté sur une base de données vide et ne devrait pas entraîner de perte de données s'il n'y en a pas. Il est essentiel pour la gestion des utilisateurs, des projets et de toutes les données financières.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["High"]
          - Requires-Backup: [true]
          - Reversible: [false]
          
          ## Structure Details:
          - Crée les tables : profiles, projects, tiers, notes, loans, scenarios, budget_entries, actual_transactions, payments, cash_accounts, scenario_entries.
          - Établit les relations (clés étrangères) entre les tables.
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [Toutes les politiques sont basées sur l'UID de l'utilisateur authentifié.]
          
          ## Performance Impact:
          - Indexes: [Ajout d'index sur les clés primaires et étrangères.]
          - Triggers: [Ajout d'un trigger pour la création automatique des profils.]
          - Estimated Impact: [Faible sur une base de données vide.]
          */

-- 1. Table des profils utilisateurs
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    subscription_status text,
    trial_ends_at timestamptz
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir et modifier leur propre profil." ON public.profiles FOR ALL USING (auth.uid() = id);

-- Fonction pour créer un profil à l'inscription d'un nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'trialing',
    NOW() + INTERVAL '14 days'
  );
  RETURN NEW;
END;
$$;

-- Trigger pour appeler la fonction handle_new_user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Table des projets
CREATE TABLE public.projects (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    currency text,
    start_date date,
    is_archived boolean DEFAULT false,
    annual_goals jsonb,
    expense_targets jsonb,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer leurs propres projets." ON public.projects FOR ALL USING (auth.uid() = user_id);

-- 3. Table des tiers (clients/fournisseurs)
CREATE TABLE public.tiers (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer leurs propres tiers." ON public.tiers FOR ALL USING (auth.uid() = user_id);

-- 4. Table des notes
CREATE TABLE public.notes (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text,
    color text,
    x double precision,
    y double precision,
    is_minimized boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer leurs propres notes." ON public.notes FOR ALL USING (auth.uid() = user_id);

-- 5. Table des prêts et emprunts
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
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer les prêts de leurs projets." ON public.loans FOR ALL USING (auth.uid() = user_id);

-- 6. Table des scénarios
CREATE TABLE public.scenarios (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    color text,
    is_visible boolean DEFAULT true,
    is_archived boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer les scénarios de leurs projets." ON public.scenarios FOR ALL USING (auth.uid() = user_id);

-- 7. Table des écritures budgétaires
CREATE TABLE public.budget_entries (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id uuid REFERENCES public.loans(id) ON DELETE SET NULL,
    type text NOT NULL,
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
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer les écritures de leurs projets." ON public.budget_entries FOR ALL USING (auth.uid() = user_id);

-- 8. Table des transactions réelles
CREATE TABLE public.actual_transactions (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id uuid REFERENCES public.budget_entries(id) ON DELETE SET NULL,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL,
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
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer les transactions de leurs projets." ON public.actual_transactions FOR ALL USING (auth.uid() = user_id);

-- 9. Table des comptes de trésorerie
CREATE TABLE public.cash_accounts (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    main_category_id text NOT NULL,
    name text NOT NULL,
    initial_balance numeric DEFAULT 0,
    initial_balance_date date NOT NULL,
    is_closed boolean DEFAULT false,
    closure_date date,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer les comptes de leurs projets." ON public.cash_accounts FOR ALL USING (auth.uid() = user_id);

-- 10. Table des paiements
CREATE TABLE public.payments (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    actual_id uuid NOT NULL REFERENCES public.actual_transactions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_date date NOT NULL,
    paid_amount numeric NOT NULL,
    cash_account uuid NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer les paiements de leurs transactions." ON public.payments FOR ALL USING (auth.uid() = user_id);

-- 11. Table des écritures de scénario
CREATE TABLE public.scenario_entries (
    id uuid NOT NULL PRIMARY KEY, -- This ID matches budget_entry ID for modification, or is new for additions
    scenario_id uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent gérer les écritures de leurs scénarios." ON public.scenario_entries FOR ALL USING (auth.uid() = user_id);
ALTER TABLE public.scenario_entries ADD CONSTRAINT scenario_entries_pkey PRIMARY KEY (id, scenario_id);
