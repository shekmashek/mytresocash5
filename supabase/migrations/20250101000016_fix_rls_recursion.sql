-- Drop existing policies in reverse order of dependency
DROP POLICY IF EXISTS "Enable all actions for users based on scenario access" ON "public"."scenario_entries";
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON "public"."scenario_entries";
DROP POLICY IF EXISTS "Users can view scenario entries for their projects" ON "public"."scenario_entries";

DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."scenarios";
DROP POLICY IF EXISTS "Users can view their scenarios" ON "public"."scenarios";
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."scenarios";

DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."loans";
DROP POLICY IF EXISTS "Users can view their loans" ON "public"."loans";
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."loans";

DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."cash_accounts";
DROP POLICY IF EXISTS "Users can view their cash accounts" ON "public"."cash_accounts";
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."cash_accounts";

DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."actual_transactions";
DROP POLICY IF EXISTS "Users can view actuals for their projects" ON "public"."actual_transactions";
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."actual_transactions";

DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON "public"."budget_entries";
DROP POLICY IF EXISTS "Users can view entries for their projects" ON "public"."budget_entries";
DROP POLICY IF EXISTS "Enable all actions for users based on project access" ON "public"."budget_entries";

DROP POLICY IF EXISTS "Users can manage their own payments" ON "public"."payments";
DROP POLICY IF EXISTS "Users can view their payments" ON "public"."payments";

DROP POLICY IF EXISTS "Users can manage their own tiers" ON "public"."tiers";
DROP POLICY IF EXISTS "Users can view their own tiers" ON "public"."tiers";

DROP POLICY IF EXISTS "Users can manage their own notes" ON "public"."notes";
DROP POLICY IF EXISTS "Users can view their own notes" ON "public"."notes";

DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON "public"."consolidated_views";
DROP POLICY IF EXISTS "Users can view their own consolidated views" ON "public"."consolidated_views";

DROP POLICY IF EXISTS "Users can manage their own referrals" ON "public"."referrals";
DROP POLICY IF EXISTS "Users can view their own referrals" ON "public"."referrals";

DROP POLICY IF EXISTS "Users can manage their project collaborations" ON "public"."project_collaborators";
DROP POLICY IF EXISTS "Users can view their project collaborations" ON "public"."project_collaborators";

DROP POLICY IF EXISTS "Users can insert their own projects" ON "public"."projects";
DROP POLICY IF EXISTS "Users can update their own projects" ON "public"."projects";
DROP POLICY IF EXISTS "Users can delete their own projects" ON "public"."projects";
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON "public"."projects";

DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON "public"."profiles";
DROP POLICY IF EXISTS "Users can insert their own profile." ON "public"."profiles";

-- Drop the functions that might be causing recursion or conflicts
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- Recreate helper functions with better security and no recursion
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id AND p.user_id = p_user_id
  ) OR EXISTS (
    SELECT 1
    FROM public.project_collaborators pc
    WHERE pc.project_id = p_project_id AND pc.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_project_role(p_project_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT
    CASE
      WHEN (SELECT user_id FROM public.projects WHERE id = p_project_id) = p_user_id THEN 'owner'
      ELSE (SELECT role FROM public.project_collaborators WHERE project_id = p_project_id AND user_id = p_user_id)
    END;
$$;


-- Re-enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Recreate policies from scratch with safe logic

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (auth.uid() = id);

-- Projects
CREATE POLICY "Users can view their own and shared projects" ON public.projects FOR SELECT USING (public.is_project_member(id, auth.uid()));
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Project Collaborators
CREATE POLICY "Users can view collaborations for projects they own" ON public.project_collaborators FOR SELECT USING (
  (SELECT user_id FROM public.projects WHERE id = project_id) = auth.uid()
);
CREATE POLICY "Users can manage collaborations for projects they own" ON public.project_collaborators FOR ALL USING (
  (SELECT user_id FROM public.projects WHERE id = project_id) = auth.uid()
);

-- Generic policy for project-related data
CREATE POLICY "Users can view data for accessible projects" ON public.budget_entries FOR SELECT USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.budget_entries FOR ALL USING (public.get_project_role(project_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON public.actual_transactions FOR SELECT USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.actual_transactions FOR ALL USING (public.get_project_role(project_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON public.cash_accounts FOR SELECT USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.cash_accounts FOR ALL USING (public.get_project_role(project_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON public.loans FOR SELECT USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.loans FOR ALL USING (public.get_project_role(project_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Users can view data for accessible projects" ON public.scenarios FOR SELECT USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "Editors can manage data for accessible projects" ON public.scenarios FOR ALL USING (public.get_project_role(project_id, auth.uid()) IN ('owner', 'editor'));

-- Policies for tables linked to other tables
CREATE POLICY "Users can manage their own payments" ON public.payments FOR ALL USING (
  public.is_project_member((SELECT project_id FROM actual_transactions WHERE id = actual_id), auth.uid())
);

CREATE POLICY "Users can manage their own scenario entries" ON public.scenario_entries FOR ALL USING (
  public.is_project_member((SELECT project_id FROM scenarios WHERE id = scenario_id), auth.uid())
);

-- Policies for user-specific data not tied to a project
CREATE POLICY "Users can manage their own data" ON public.tiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.consolidated_views FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.referrals FOR ALL USING (auth.uid() = referrer_user_id);
