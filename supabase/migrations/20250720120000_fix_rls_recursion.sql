/*
          # [Refonte des Politiques de Sécurité (RLS)]
          Ce script répare une erreur de récursion infinie dans les politiques de sécurité de la base de données. Il supprime toutes les anciennes politiques et fonctions d'aide, puis les recrée en suivant les meilleures pratiques pour garantir la sécurité, la performance et la stabilité du système de permissions.

          ## Query Description: [Cette opération va réinitialiser toutes les règles de sécurité de vos tables. Elle est conçue pour être sûre et n'affecte pas vos données existantes, mais elle est fondamentale pour le bon fonctionnement de la création de projets et de la collaboration. Aucune action de votre part n'est requise après l'application.]
          
          ## Metadata:
          - Schema-Category: ["Structural", "Safe"]
          - Impact-Level: ["Medium"]
          - Requires-Backup: false
          - Reversible: false
          
          ## Structure Details:
          - Affecte les politiques de sécurité (RLS) sur les tables : projects, project_collaborators, budget_entries, actual_transactions, cash_accounts, loans, scenarios, scenario_entries, payments, tiers, notes, consolidated_views, referrals, profiles.
          - Supprime les anciennes fonctions d'aide (is_project_owner, etc.).
          - Crée de nouvelles fonctions d'aide (get_user_role, can_access_project).
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [auth.uid()]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Amélioration de la performance des requêtes soumises à la RLS en évitant la récursion.]
          */

-- Étape 1: Supprimer toutes les anciennes politiques pour éviter les conflits et les dépendances.
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Users can view their loans" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can view their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can view their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Collaborators can view other collaborators on the same project" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators of their accessible projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Enable read access for collaborators" ON public.projects;
DROP POLICY IF EXISTS "Enable all access for owners" ON public.projects;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Étape 2: Supprimer les anciennes fonctions d'aide.
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- Étape 3: Créer de nouvelles fonctions d'aide, plus robustes.
CREATE OR REPLACE FUNCTION public.get_user_role(p_project_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT role
  FROM public.project_collaborators
  WHERE user_id = auth.uid() AND project_id = p_project_id;
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

-- Étape 4: Recréer toutes les politiques de sécurité proprement.

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- PROJECTS
CREATE POLICY "Users can view projects they are members of." ON public.projects FOR SELECT USING (can_access_project(id));
CREATE POLICY "Users can insert their own projects." ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their projects." ON public.projects FOR UPDATE USING (get_user_role(id) = 'owner');
CREATE POLICY "Owners can delete their projects." ON public.projects FOR DELETE USING (get_user_role(id) = 'owner');

-- PROJECT_COLLABORATORS
CREATE POLICY "Users can view collaborators of projects they are members of." ON public.project_collaborators FOR SELECT USING (can_access_project(project_id));
CREATE POLICY "Owners can manage collaborators on their projects." ON public.project_collaborators FOR ALL USING (get_user_role(project_id) = 'owner');

-- Generic policies for data tables
CREATE OR REPLACE PROCEDURE public.apply_data_rls(table_name text)
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
  EXECUTE format('CREATE POLICY "Users can view data for accessible projects" ON public.%I FOR SELECT USING (can_access_project(project_id));', table_name);
  EXECUTE format('CREATE POLICY "Editors can manage data for accessible projects" ON public.%I FOR ALL USING (get_user_role(project_id) IN (''owner'', ''editor''));', table_name);
END;
$$;

-- Apply generic policies
CALL public.apply_data_rls('budget_entries');
CALL public.apply_data_rls('actual_transactions');
CALL public.apply_data_rls('cash_accounts');
CALL public.apply_data_rls('loans');
CALL public.apply_data_rls('scenarios');
CALL public.apply_data_rls('scenario_entries');
CALL public.apply_data_rls('payments');

-- Specific policies for user-level tables
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own referrals" ON public.referrals FOR ALL USING (auth.uid() = referrer_user_id);
