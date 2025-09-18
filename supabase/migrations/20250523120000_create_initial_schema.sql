/*
          # ============================================================
          # ==                SCHEMA DE BASE DE DONNÉES               ==
          # ============================================================
          [Description : Ce script crée l'ensemble des tables, relations et politiques de sécurité nécessaires au fonctionnement de l'application Trezocash. Il est conçu pour être exécuté une seule fois sur une base de données vierge.]

          ## Query Description: [Ce script est fondamental et structurel. Il va créer 11 nouvelles tables dans votre base de données. Il n'y a pas de risque de perte de données car il ne modifie aucune donnée existante, mais il est crucial pour la première initialisation de l'application. Aucune précaution particulière n'est nécessaire si la base de données est vide.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["High"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          - Tables créées : profiles, projects, cash_accounts, tiers, budget_entries, actual_transactions, payments, scenarios, scenario_entries, loans, notes.
          - Relations : Des clés étrangères sont établies entre les tables (ex: projects -> cash_accounts).
          - Sécurité : La Row Level Security (RLS) est activée sur toutes les tables pour garantir la confidentialité des données.
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [auth.uid() est utilisé pour lier les données aux utilisateurs.]
          
          ## Performance Impact:
          - Indexes: [Les clés primaires et étrangères sont indexées automatiquement.]
          - Triggers: [Un trigger est créé pour automatiser la création de profils.]
          - Estimated Impact: [Faible impact à l'exécution, mais fondamental pour les performances futures.]
          */

-- 1. Table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  subscription_status TEXT DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + '14 days'::interval),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Stores public-facing profile data for each user.';

-- 2. Sécurité pour la table des profils
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Trigger pour la création automatique de profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Table des projets
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  currency TEXT DEFAULT '€' NOT NULL,
  start_date DATE NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  annual_goals JSONB,
  expense_targets JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.projects IS 'Stores user projects.';
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own projects." ON public.projects FOR ALL USING (auth.uid() = user_id);

-- 5. Table des comptes de trésorerie
CREATE TABLE public.cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  main_category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  initial_balance NUMERIC DEFAULT 0 NOT NULL,
  initial_balance_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false NOT NULL,
  closure_date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.cash_accounts IS 'Stores cash accounts for each project.';
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage accounts for their own projects." ON public.cash_accounts FOR ALL USING (auth.uid() = user_id);

-- 6. Table des tiers (clients/fournisseurs)
CREATE TABLE public.tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'client' or 'fournisseur'
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, name, type)
);
COMMENT ON TABLE public.tiers IS 'Stores third-parties like clients and suppliers.';
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers." ON public.tiers FOR ALL USING (auth.uid() = user_id);

-- 7. Table des écritures budgétaires
CREATE TABLE public.budget_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_id UUID, -- Nullable, can be linked to a loan later
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE,
  start_date DATE,
  end_date DATE,
  supplier TEXT,
  description TEXT,
  is_off_budget BOOLEAN DEFAULT false,
  payments JSONB,
  provision_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.budget_entries IS 'Stores all budget entries, recurring or one-off.';
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage entries for their own projects." ON public.budget_entries FOR ALL USING (auth.uid() = user_id);

-- 8. Table des transactions réelles
CREATE TABLE public.actual_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.budget_entries(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  third_party TEXT,
  description TEXT,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  is_off_budget BOOLEAN DEFAULT false,
  is_provision BOOLEAN DEFAULT false,
  is_final_provision_payment BOOLEAN DEFAULT false,
  provision_details JSONB,
  is_internal_transfer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.actual_transactions IS 'Stores actual transactions derived from budget entries.';
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage actuals for their own projects." ON public.actual_transactions FOR ALL USING (auth.uid() = user_id);

-- 9. Table des paiements
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actual_id UUID REFERENCES public.actual_transactions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_date DATE NOT NULL,
  paid_amount NUMERIC NOT NULL,
  cash_account UUID REFERENCES public.cash_accounts(id) ON DELETE RESTRICT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.payments IS 'Stores individual payments made against actual transactions.';
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage payments for their own transactions." ON public.payments FOR ALL USING (auth.uid() = user_id);

-- 10. Table des scénarios
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_visible BOOLEAN DEFAULT true NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.scenarios IS 'Stores financial scenarios for forecasting.';
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scenarios." ON public.scenarios FOR ALL USING (auth.uid() = user_id);

-- 11. Table des écritures de scénario (deltas)
CREATE TABLE public.scenario_entries (
  id UUID PRIMARY KEY, -- This ID matches the budget_entry ID it modifies, or is new
  scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  type TEXT,
  category TEXT,
  frequency TEXT,
  amount NUMERIC,
  date DATE,
  start_date DATE,
  end_date DATE,
  supplier TEXT,
  description TEXT,
  payments JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(id, scenario_id)
);
COMMENT ON TABLE public.scenario_entries IS 'Stores deltas (changes) for budget entries within a scenario.';
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scenario entries." ON public.scenario_entries FOR ALL USING (auth.uid() = user_id);

-- 12. Table des prêts et emprunts
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'loan' or 'borrowing'
  third_party TEXT NOT NULL,
  principal NUMERIC NOT NULL,
  term INTEGER NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  principal_date DATE NOT NULL,
  repayment_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.loans IS 'Stores loans and borrowings.';
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own loans." ON public.loans FOR ALL USING (auth.uid() = user_id);

-- 13. Table des notes
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  color TEXT,
  x NUMERIC,
  y NUMERIC,
  is_minimized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.notes IS 'Stores user-created sticky notes.';
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes." ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Add foreign key constraint for loans in budget_entries
ALTER TABLE public.budget_entries ADD CONSTRAINT fk_loan_id FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE SET NULL;
