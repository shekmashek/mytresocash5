/*
  # [Function] delete_user_account
  [This function handles the complete deletion of a user's account and all associated data.]

  ## Query Description: [This is a highly destructive operation. It will permanently delete the user's authentication record and all their data across all tables, including projects, transactions, scenarios, etc. This action is irreversible. A full backup is strongly recommended before execution.]
  
  ## Metadata:
  - Schema-Category: "Dangerous"
  - Impact-Level: "High"
  - Requires-Backup: true
  - Reversible: false
  
  ## Structure Details:
  - Deletes from: profiles, projects, tiers, cash_accounts, budget_entries, actual_transactions, payments, scenarios, scenario_entries, notes, loans.
  - Deletes user from: auth.users
  
  ## Security Implications:
  - RLS Status: Bypassed via SECURITY DEFINER.
  - Policy Changes: No.
  - Auth Requirements: User must be authenticated. The function uses auth.uid() to target the calling user.
  
  ## Performance Impact:
  - Indexes: N/A
  - Triggers: N/A
  - Estimated Impact: High load during deletion, proportional to the amount of user data.
*/
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id_to_delete uuid := auth.uid();
begin
  -- Delete data from child tables first to respect foreign key constraints
  delete from public.payments where user_id = user_id_to_delete;
  delete from public.scenario_entries where user_id = user_id_to_delete;
  delete from public.actual_transactions where user_id = user_id_to_delete;
  delete from public.budget_entries where user_id = user_id_to_delete;
  delete from public.notes where user_id = user_id_to_delete;
  delete from public.loans where user_id = user_id_to_delete;
  delete from public.cash_accounts where user_id = user_id_to_delete;
  delete from public.scenarios where user_id = user_id_to_delete;
  delete from public.tiers where user_id = user_id_to_delete;
  delete from public.projects where user_id = user_id_to_delete;
  
  -- Delete from the profiles table
  delete from public.profiles where id = user_id_to_delete;

  -- Finally, delete the user from the auth schema
  -- This requires the 'supabase_auth_admin' role, which SECURITY DEFINER provides.
  perform auth.admin_delete_user(user_id_to_delete);
end;
$$;
