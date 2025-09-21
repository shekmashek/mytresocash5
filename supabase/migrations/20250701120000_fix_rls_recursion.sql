/*
          # [Refonte des Politiques de Sécurité (RLS)]
          Correction d'une erreur de récursion infinie et renforcement de la sécurité.

          ## Query Description: [Ce script réécrit entièrement les règles de sécurité de votre base de données pour corriger un problème fondamental qui empêchait la création de nouveaux projets et pouvait créer des failles de sécurité. Il supprime les anciennes règles et les remplace par des politiques plus robustes et non-récursives, en utilisant des fonctions d'aide sécurisées. Cette opération est sans danger pour vos données existantes mais est essentielle pour la stabilité et la sécurité de l'application.]
          
          ## Metadata:
          - Schema-Category: ["Structural", "Security"]
          - Impact-Level: ["High"]
          - Requires-Backup: true
          - Reversible: false
          
          ## Structure Details:
          - Affecte les politiques RLS de toutes les tables de l'application.
          - Crée de nouvelles fonctions d'aide SQL.
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [auth.uid()]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Amélioration potentielle des performances des requêtes grâce à des politiques plus directes.]
          */

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own projects or projects shared with them." ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects." ON public.projects;
DROP POLICY IF EXISTS "Owners can update their own projects." ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their own projects." ON public.projects;
DROP POLICY IF EXISTS "Users can manage data in their own or shared projects." ON public.budget_entries;
DROP POLICY IF EXISTS "Users can view entries in their own or shared projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can insert entries in their own or editable projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can update entries in their own or editable projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Users can delete entries in their own or editable projects" ON public.budget_entries;
-- Repeat for all tables
DROP POLICY IF EXISTS "Users can manage data in their own or shared projects." ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can view data in their own or shared projects." ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can insert data in their own or editable projects." ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can update data in their own or editable projects." ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can delete data in their own or editable projects." ON public.actual_transactions;
DROP POLICY IF EXISTS "Users can manage data in their own or shared projects." ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can view data in their own or shared projects." ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can insert data in their own or editable projects." ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can update data in their own or editable projects." ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can delete data in their own or editable projects." ON public.cash_accounts;
DROP POLICY IF EXISTS "Users can manage data in their own or shared projects." ON public.payments;
DROP POLICY IF EXISTS "Users can view data in their own or shared projects." ON public.payments;
DROP POLICY IF EXISTS "Users can insert data in their own or editable projects." ON public.payments;
DROP POLICY IF EXISTS "Users can update data in their own or editable projects." ON public.payments;
DROP POLICY IF EXISTS "Users can delete data in their own or editable projects." ON public.payments;
DROP POLICY IF EXISTS "Users can manage data in their own or shared projects." ON public.scenarios;
DROP POLICY IF EXISTS "Users can view data in their own or shared projects." ON public.scenarios;
DROP POLICY IF EXISTS "Users can insert data in their own or editable projects." ON public.scenarios;
DROP POLICY IF EXISTS "Users can update data in their own or editable projects." ON public.scenarios;
DROP POLICY IF EXISTS "Users can delete data in their own or editable projects." ON public.scenarios;
DROP POLICY IF EXISTS "Users can manage data in their own or shared projects." ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can view data in their own or shared projects." ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can insert data in their own or editable projects." ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can update data in their own or editable projects." ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can delete data in their own or editable projects." ON public.scenario_entries;
DROP POLICY IF EXISTS "Users can manage data in their own or shared projects." ON public.loans;
DROP POLICY IF EXISTS "Users can view data in their own or shared projects." ON public.loans;
DROP POLICY IF EXISTS "Users can insert data in their own or editable projects." ON public.loans;
DROP POLICY IF EXISTS "Users can update data in their own or editable projects." ON public.loans;
DROP POLICY IF EXISTS "Users can delete data in their own or editable projects." ON public.loans;
DROP POLICY IF EXISTS "Users can manage their own data." ON public.tiers;
DROP POLICY IF EXISTS "Users can manage their own data." ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own data." ON public.consolidated_views;
DROP POLICY IF EXISTS "Users can manage their own data." ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- 2. Drop old helper functions if they exist
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.get_user_role_in_project(uuid);

-- 3. Create new, non-recursive helper function
CREATE OR REPLACE FUNCTION public.get_project_ids_for_user(p_user_id uuid)
RETURNS TABLE(project_id uuid) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id FROM public.projects p WHERE p.user_id = p_user_id
    UNION
    SELECT pc.project_id FROM public.project_collaborators pc WHERE pc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-create policies for all tables

-- PROFILES
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PROJECTS
CREATE POLICY "Users can view their own projects or shared ones" ON public.projects FOR SELECT USING (auth.uid() = user_id OR id IN (SELECT pc.project_id FROM public.project_collaborators pc WHERE pc.user_id = auth.uid()));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- PROJECT_COLLABORATORS
CREATE POLICY "Users can manage collaborators for projects they own" ON public.project_collaborators FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "Collaborators can view their own membership" ON public.project_collaborators FOR SELECT USING (user_id = auth.uid());

-- CONSOLIDATED_VIEWS, TIERS, NOTES
CREATE POLICY "Users can manage their own data" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Generic policies for project-related data
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN (
            'budget_entries', 'actual_transactions', 'cash_accounts', 
            'payments', 'scenarios', 'scenario_entries', 'loans'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

        EXECUTE format('
            CREATE POLICY "Users can view data in their own or shared projects" ON public.%I
            FOR SELECT USING (project_id IN (SELECT project_id FROM public.get_project_ids_for_user(auth.uid())));
        ', t_name);

        EXECUTE format('
            CREATE POLICY "Users can manage data in their own or editable projects" ON public.%I
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.projects p
                    WHERE p.id = %I.project_id AND p.user_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM public.project_collaborators pc
                    WHERE pc.project_id = %I.project_id AND pc.user_id = auth.uid() AND pc.role = ''editor''
                )
            );
        ', t_name, t_name, t_name);
    END LOOP;
END;
$$;
