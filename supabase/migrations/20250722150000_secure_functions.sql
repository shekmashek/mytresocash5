/*
# [SECURITY] Secure Database Functions
[This operation secures existing database functions by setting a fixed search_path, preventing potential hijacking attacks.]

## Query Description: [This is a non-destructive security enhancement. It ensures that the 'handle_new_user' and 'delete_user_account' functions always execute with a predictable schema search path, mitigating risks associated with mutable search paths.]

## Metadata:
- Schema-Category: ["Security", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Functions affected: `handle_new_user`, `delete_user_account`

## Security Implications:
- RLS Status: [Not Applicable]
- Policy Changes: [No]
- Auth Requirements: [Admin privileges to alter functions]

## Performance Impact:
- Indexes: [No change]
- Triggers: [No change]
- Estimated Impact: [None]
*/

-- Secure the handle_new_user function
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Secure the delete_user_account function (re-applying for good measure)
ALTER FUNCTION public.delete_user_account() SET search_path = public;
