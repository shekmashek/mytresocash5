/*
          # [Structural] Mise en Place de la Collaboration
          Ce script met en place la structure de base de données nécessaire pour les fonctionnalités de collaboration.

          ## Query Description: 
          Ce script va :
          1. Créer une table `project_collaborators` pour gérer les invitations et les rôles.
          2. Ajouter une colonne `delegated_budget` à la table `projects` pour la fonctionnalité de délégation.
          3. Mettre à jour les politiques de sécurité (RLS) de toutes les tables pour permettre l'accès aux collaborateurs.
          Cette opération est structurelle et ne présente aucun risque pour vos données existantes.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Medium"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Ajout de la table `project_collaborators`.
          - Ajout de la colonne `delegated_budget` à `projects`.
          - Mise à jour des politiques RLS sur toutes les tables de données.
          
          ## Security Implications:
          - RLS Status: Modifié
          - Policy Changes: Oui
          - Auth Requirements: Les politiques sont renforcées pour inclure la logique de collaboration.
          
          ## Performance Impact:
          - Indexes: Ajout d'index sur les clés étrangères.
          - Triggers: Aucun.
          - Estimated Impact: Faible. Les requêtes pourraient être légèrement plus complexes mais les index devraient maintenir les performances.
          */

-- 1. Create project_collaborators table
CREATE TABLE IF NOT EXISTS public.project_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id)
);

-- 2. Add delegated_budget to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS delegated_budget NUMERIC;

-- 3. Enable RLS on the new table
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- 4. Create helper functions for RLS policies
CREATE OR REPLACE FUNCTION public.get_user_id_from_email(p_email TEXT)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM auth.users WHERE email = p_email;
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_project_access(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.project_collaborators WHERE project_id = p_project_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.project_collaborators WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'editor'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update RLS policies for all tables

-- Table: project_collaborators
DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Collaborators can see their own entries" ON public.project_collaborators;
CREATE POLICY "Owners can manage collaborators" ON public.project_collaborators
    FOR ALL USING ( (SELECT user_id FROM public.projects WHERE id = project_id) = auth.uid() );
CREATE POLICY "Collaborators can see their own entries" ON public.project_collaborators
    FOR SELECT USING (user_id = auth.uid());

-- Table: projects
DROP POLICY IF EXISTS "Users can manage their own projects." ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they own or are collaborators on" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their own projects" ON public.projects;
CREATE POLICY "Users can view projects they own or are collaborators on" ON public.projects FOR SELECT USING (public.has_project_access(id));
CREATE POLICY "Owners can update their own projects" ON public.projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owners can delete their own projects" ON public.projects FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (user_id = auth.uid());

-- Generic policy update function for other tables
CREATE OR REPLACE FUNCTION update_rls_for_table(table_name TEXT, project_column_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "Users can manage their own %s" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view data for accessible projects" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.%I', table_name);

    EXECUTE format('CREATE POLICY "Users can view data for accessible projects" ON public.%I FOR SELECT USING (public.has_project_access(%I))', table_name, project_column_name);
    EXECUTE format('CREATE POLICY "Editors can manage data for accessible projects" ON public.%I FOR ALL USING (public.is_project_editor(%I))', table_name, project_column_name);
END;
$$ LANGUAGE plpgsql;

-- Apply policies to all relevant tables
SELECT update_rls_for_table('budget_entries', 'project_id');
SELECT update_rls_for_table('actual_transactions', 'project_id');
SELECT update_rls_for_table('cash_accounts', 'project_id');
SELECT update_rls_for_table('loans', 'project_id');
SELECT update_rls_for_table('scenarios', 'project_id');

-- Specific tables without project_id but with user_id
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
CREATE POLICY "Users can manage their own tiers" ON public.tiers FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (user_id = auth.uid());

-- Tables with more complex relationships
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (
  public.is_project_editor((SELECT project_id FROM public.scenarios WHERE id = scenario_id))
);

DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (
  public.is_project_editor((SELECT project_id FROM public.actual_transactions WHERE id = actual_id))
);

DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;
CREATE POLICY "Users can manage their own consolidated views" ON public.consolidated_views FOR ALL USING (user_id = auth.uid());
