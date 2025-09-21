/*
# [Function] Create Project Handler
Creates a secure function to handle new project creation.

## Query Description:
This script creates a PostgreSQL function `handle_new_project`. This function is called by the application to create a new project, assign ownership to the current user, and create a default cash account. It ensures that all operations are performed securely within the database. This is a safe, non-destructive operation.

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true (the function can be dropped)

## Structure Details:
- Function: `public.handle_new_project`

## Security Implications:
- RLS Status: Not applicable to function creation itself, but the function is designed to work with RLS policies.
- Policy Changes: No
- Auth Requirements: The function uses `auth.uid()` to get the current user's ID.
*/
CREATE OR REPLACE FUNCTION public.handle_new_project(
    project_name text,
    project_start_date date,
    project_currency text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_project_id uuid;
BEGIN
    -- Insert the new project and get its ID
    INSERT INTO public.projects (user_id, name, start_date, currency)
    VALUES (auth.uid(), project_name, project_start_date, project_currency)
    RETURNING id INTO new_project_id;

    -- Create a default cash account for the new project
    INSERT INTO public.cash_accounts (project_id, user_id, main_category_id, name, initial_balance, initial_balance_date)
    VALUES (new_project_id, auth.uid(), 'cash', 'Caisse Espèce', 0, project_start_date);

    -- Return the new project's ID
    RETURN new_project_id;
END;
$$;
