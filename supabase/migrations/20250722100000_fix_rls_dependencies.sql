/*
          # [Correctif] Réorganisation des dépendances de sécurité (RLS)
          Ce script corrige les erreurs de dépendance en supprimant et recréant les politiques de sécurité (RLS) et les fonctions associées dans le bon ordre.

          ## Query Description: ["Ce script va d'abord supprimer toutes les politiques de sécurité et les fonctions personnalisées existantes, puis les recréer proprement. C'est une opération de maintenance sûre qui n'affecte pas vos données, mais qui est essentielle pour la stabilité et la sécurité de l'application."]
          
          ## Metadata:
          - Schema-Category: ["Structural", "Safe"]
          - Impact-Level: ["Low"]
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Affecte les politiques RLS sur toutes les tables de l'application.
          - Affecte les fonctions d'aide SQL : `get_user_accessible_projects`, `is_project_owner`, `is_project_editor`, `is_project_viewer`.
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [authenticated]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Aucun impact sur les performances, améliore la maintenabilité.]
          */

-- ÉTAPE 1: Supprimer toutes les politiques RLS existantes sur toutes les tables.
-- L'ordre n'est pas important ici car nous supprimons tout.

DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view entries for their projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view their cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.loans;
DROP POLICY IF EXISTS "Users can view their loans" ON public.loans;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON public.scenarios;
DROP POLICY IF EXISTS "Users can view their scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own collaborations" ON public.project_collaborators;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;

-- ÉTAPE 2: Supprimer les fonctions d'aide.
-- Maintenant que plus aucune politique ne les utilise, nous pouvons les supprimer sans erreur.

DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- ÉTAPE 3: Recréer les fonctions d'aide.

CREATE OR REPLACE FUNCTION public.get_user_accessible_projects()
RETURNS TABLE(project_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM projects WHERE user_id = auth.uid()
  UNION
  SELECT project_id FROM project_collaborators WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_collaborators 
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'editor'
  ) OR is_project_owner(p_project_id);
$$;

CREATE OR REPLACE FUNCTION public.is_project_viewer(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_collaborators 
    WHERE project_id = p_project_id AND user_id = auth.uid() AND role IN ('viewer', 'editor')
  ) OR is_project_owner(p_project_id);
$$;


-- ÉTAPE 4: Recréer toutes les politiques RLS proprement.

-- Table: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Table: projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (is_project_viewer(id));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own projects" ON public.projects FOR UPDATE USING (is_project_owner(id));
CREATE POLICY "Owners can delete their projects" ON public.projects FOR DELETE USING (is_project_owner(id));

-- Table: project_collaborators
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage collaborators" ON public.project_collaborators FOR ALL USING (is_project_owner(project_id));

-- Table: consolidated_views
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);

-- Tables de données (budget_entries, actual_transactions, etc.)
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (is_project_viewer(project_id));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (is_project_editor(project_id));

CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (
  is_project_editor((SELECT project_id FROM scenarios WHERE id = scenario_id))
);

CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
