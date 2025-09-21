/*
# [Fix RLS Dependency Order]
[This migration corrects the order of operations for dropping and recreating RLS policies and their dependent functions to resolve a dependency conflict. It drops policies first, then functions, then recreates them.]

## Query Description: [This operation resets and rebuilds the security policies for all tables to ensure correct dependencies and fix a migration error. It is a safe structural change.]

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Drops and recreates RLS policies on all user-data tables.
- Drops and recreates helper functions: is_project_owner, is_project_editor, is_project_viewer, get_user_accessible_projects.

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes (recreation of all policies)
- Auth Requirements: Applies to all authenticated users.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. A brief schema cache reload may occur.
*/

-- =================================================================
-- STEP 1: DROP ALL POLICIES THAT DEPEND ON THE HELPER FUNCTIONS
-- =================================================================

-- Drop policies on 'projects'
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects and projects shared with them" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their own projects" ON public.projects;

-- Drop policies on 'project_collaborators'
DROP POLICY IF EXISTS "Owners can manage collaborators for their projects" ON public.project_collaborators;
DROP POLICY IF EXISTS "Collaborators can view their own invitations" ON public.project_collaborators;

-- Drop policies on 'budget_entries'
DROP POLICY IF EXISTS "Users can manage their own budget entries" ON public.budget_entries;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.budget_entries;
DROP POLICY IF EXISTS "Viewers can read data for accessible projects" ON public.budget_entries;

-- Drop policies on 'actual_transactions'
DROP POLICY IF EXISTS "Users can manage their own actual transactions" ON public.actual_transactions;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.actual_transactions;
DROP POLICY IF EXISTS "Viewers can read data for accessible projects" ON public.actual_transactions;

-- Drop policies on 'cash_accounts'
DROP POLICY IF EXISTS "Users can manage their own cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.cash_accounts;
DROP POLICY IF EXISTS "Viewers can read data for accessible projects" ON public.cash_accounts;

-- Drop policies on 'loans'
DROP POLICY IF EXISTS "Users can manage their own loans" ON public.loans;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.loans;
DROP POLICY IF EXISTS "Viewers can read data for accessible projects" ON public.loans;

-- Drop policies on 'scenarios'
DROP POLICY IF EXISTS "Users can manage their own scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Editors can manage data for accessible projects" ON public.scenarios;
DROP POLICY IF EXISTS "Viewers can read data for accessible projects" ON public.scenarios;

-- Drop policies on 'scenario_entries'
DROP POLICY IF EXISTS "Users can manage their own scenario entries" ON public.scenario_entries;
DROP POLICY IF EXISTS "Viewers can read scenario entries for accessible projects" ON public.scenario_entries;

-- Drop policies on 'payments'
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Viewers can read payments for accessible projects" ON public.payments;

-- Drop policies on 'tiers'
DROP POLICY IF EXISTS "Users can manage their own tiers" ON public.tiers;
DROP POLICY IF EXISTS "Users can view their own tiers" ON public.tiers;

-- Drop policies on 'notes'
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;

-- Drop policies on 'consolidated_views'
DROP POLICY IF EXISTS "Users can manage their own consolidated views" ON public.consolidated_views;

-- =================================================================
-- STEP 2: DROP THE HELPER FUNCTIONS
-- =================================================================

DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_project_editor(uuid);
DROP FUNCTION IF EXISTS public.is_project_viewer(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_projects();

-- =================================================================
-- STEP 3: RECREATE THE HELPER FUNCTIONS
-- =================================================================

create function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from projects
    where id = p_project_id and user_id = auth.uid()
  );
$$;

create function public.is_project_editor(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from project_collaborators
    where project_id = p_project_id and user_id = auth.uid() and role = 'editor'
  );
$$;

create function public.is_project_viewer(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from project_collaborators
    where project_id = p_project_id and user_id = auth.uid() and role in ('viewer', 'editor')
  );
$$;

create function public.get_user_accessible_projects()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select project_id from project_collaborators where user_id = auth.uid()
  union
  select id from projects where user_id = auth.uid();
$$;

-- =================================================================
-- STEP 4: RECREATE ALL RLS POLICIES
-- =================================================================

-- Policies for 'projects' table
create policy "Users can insert their own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can view their own projects and projects shared with them" on public.projects for select using (id in (select get_user_accessible_projects()));
create policy "Owners can update their own projects" on public.projects for update using (is_project_owner(id));
create policy "Owners can delete their own projects" on public.projects for delete using (is_project_owner(id));

-- Policies for 'project_collaborators' table
create policy "Owners can manage collaborators for their projects" on public.project_collaborators for all using (is_project_owner(project_id));
create policy "Collaborators can view their own invitations" on public.project_collaborators for select using (user_id = auth.uid());

-- Generic policies for most data tables
create policy "Users can manage their own budget entries" on public.budget_entries for all using (is_project_owner(project_id));
create policy "Editors can manage data for accessible projects" on public.budget_entries for all using (is_project_editor(project_id));
create policy "Viewers can read data for accessible projects" on public.budget_entries for select using (is_project_viewer(project_id));

create policy "Users can manage their own actual transactions" on public.actual_transactions for all using (is_project_owner(project_id));
create policy "Editors can manage data for accessible projects" on public.actual_transactions for all using (is_project_editor(project_id));
create policy "Viewers can read data for accessible projects" on public.actual_transactions for select using (is_project_viewer(project_id));

create policy "Users can manage their own cash accounts" on public.cash_accounts for all using (is_project_owner(project_id));
create policy "Editors can manage data for accessible projects" on public.cash_accounts for all using (is_project_editor(project_id));
create policy "Viewers can read data for accessible projects" on public.cash_accounts for select using (is_project_viewer(project_id));

create policy "Users can manage their own loans" on public.loans for all using (is_project_owner(project_id));
create policy "Editors can manage data for accessible projects" on public.loans for all using (is_project_editor(project_id));
create policy "Viewers can read data for accessible projects" on public.loans for select using (is_project_viewer(project_id));

create policy "Users can manage their own scenarios" on public.scenarios for all using (is_project_owner(project_id));
create policy "Editors can manage data for accessible projects" on public.scenarios for all using (is_project_editor(project_id));
create policy "Viewers can read data for accessible projects" on public.scenarios for select using (is_project_viewer(project_id));

-- Policies for tables with slightly different logic
create policy "Users can manage their own scenario entries" on public.scenario_entries for all using (exists (select 1 from scenarios where id = scenario_id and (is_project_owner(project_id) or is_project_editor(project_id))));
create policy "Viewers can read scenario entries for accessible projects" on public.scenario_entries for select using (exists (select 1 from scenarios where id = scenario_id and is_project_viewer(project_id)));

create policy "Users can manage their own payments" on public.payments for all using (exists (select 1 from actual_transactions where id = actual_id and (is_project_owner(project_id) or is_project_editor(project_id))));
create policy "Viewers can read payments for accessible projects" on public.payments for select using (exists (select 1 from actual_transactions where id = actual_id and is_project_viewer(project_id)));

-- Policies for user-global tables
create policy "Users can manage their own tiers" on public.tiers for all using (auth.uid() = user_id);
create policy "Users can manage their own notes" on public.notes for all using (auth.uid() = user_id);
create policy "Users can manage their own consolidated views" on public.consolidated_views for all using (auth.uid() = user_id);
