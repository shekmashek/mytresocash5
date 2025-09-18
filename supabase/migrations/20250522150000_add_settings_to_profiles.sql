/*
# [Schema Upgrade] Add Settings Columns to Profiles
[This operation adds columns to the 'profiles' table to store user-specific display settings.]

## Query Description: [Adds 'currency', 'display_unit', 'decimal_places', 'language', and 'timezone_offset' columns to the 'public.profiles' table. This is a non-destructive operation and will preserve existing user data.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Table affected: public.profiles
- Columns added: currency, display_unit, decimal_places, language, timezone_offset

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [No]
- Auth Requirements: [Users can only update their own profile.]

## Performance Impact:
- Indexes: [None]
- Triggers: [None]
- Estimated Impact: [Negligible. Adding columns with default values has minimal performance impact on existing queries.]
*/

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '€',
ADD COLUMN IF NOT EXISTS display_unit TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0;

-- Re-grant permissions to make sure the 'authenticated' role can update these new columns
-- This is safe to run even if permissions are already correct.
GRANT SELECT, UPDATE(full_name, currency, display_unit, decimal_places, language, timezone_offset) ON public.profiles TO authenticated;
