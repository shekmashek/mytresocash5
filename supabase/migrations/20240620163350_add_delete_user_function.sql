/*
  # [Function] delete_user_account
  [This function handles the complete deletion of a user's account and all associated data.]

  ## Query Description: [This is a highly destructive operation that will permanently remove all data associated with the calling user. This includes all projects, transactions, scenarios, and personal settings. This action is irreversible and should be used with extreme caution. A full backup is strongly recommended before execution.]
  
  ## Metadata:
  - Schema-Category: "Dangerous"
  - Impact-Level: "High"
  - Requires-Backup: true
  - Reversible: false
  
  ## Structure Details:
  - Deletes all rows from tables where user_id matches the caller.
  - Tables affected via direct DELETE: projects, tiers, notes, loans, scenarios, budget_entries, actual_transactions, cash_accounts, profiles.
  - Tables affected via CASCADE: payments, scenario_entries.
  
  ## Security Implications:
  - RLS Status: This function bypasses RLS for deletion due to SECURITY DEFINER.
  - Policy Changes: No
  - Auth Requirements: Must be called by an authenticated user.
  
  ## Performance Impact:
  - Indexes: N/A
  - Triggers: N/A
  - Estimated Impact: High load during execution, proportional to the amount of data the user has.
*/
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.projects where user_id = auth.uid();
  delete from public.tiers where user_id = auth.uid();
  delete from public.notes where user_id = auth.uid();
  delete from public.loans where user_id = auth.uid();
  delete from public.scenarios where user_id = auth.uid();
  delete from public.budget_entries where user_id = auth.uid();
  delete from public.actual_transactions where user_id = auth.uid();
  delete from public.cash_accounts where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();

  delete from auth.users where id = auth.uid();
end;
$$;
