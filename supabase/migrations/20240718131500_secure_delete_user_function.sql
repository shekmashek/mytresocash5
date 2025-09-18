/*
          # [Function Security Update]
          Sets the search_path for the delete_user_account function.

          ## Query Description: [This operation enhances the security of the user account deletion function by explicitly setting its search path. This prevents potential hijacking attacks where a malicious user could create objects in a public schema that the function might inadvertently access. It's a non-destructive security best practice.]
          
          ## Metadata:
          - Schema-Category: ["Security", "Safe"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - Affects function: public.delete_user_account
          
          ## Security Implications:
          - RLS Status: [N/A]
          - Policy Changes: [No]
          - Auth Requirements: [SECURITY DEFINER]
          
          ## Performance Impact:
          - Indexes: [N/A]
          - Triggers: [N/A]
          - Estimated Impact: [None]
          */

ALTER FUNCTION public.delete_user_account() SET search_path = '';
