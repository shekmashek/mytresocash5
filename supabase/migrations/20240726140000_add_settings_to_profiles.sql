/*
# [Schema Update] Add Settings to Profiles
Adds columns to the `public.profiles` table to store user-specific display settings.

## Query Description:
This operation alters the `profiles` table to include new columns for currency, display unit, decimal places, language, and timezone offset. It sets default values for these new columns to ensure existing users have a valid configuration.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Table `public.profiles`:
  - Adds column `currency` (text, default '€')
  - Adds column `display_unit` (text, default 'standard')
  - Adds column `decimal_places` (integer, default 2)
  - Adds column `language` (text, default 'fr')
  - Adds column `timezone_offset` (integer, default 0)

## Security Implications:
- RLS Status: Enabled
- Policy Changes: No
- Auth Requirements: User must be authenticated to modify their own profile. Existing RLS policies already cover this.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible.
*/

-- Add settings columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '€',
ADD COLUMN IF NOT EXISTS display_unit TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0;

-- Backfill existing users with default settings just in case
UPDATE public.profiles
SET
  currency = COALESCE(currency, '€'),
  display_unit = COALESCE(display_unit, 'standard'),
  decimal_places = COALESCE(decimal_places, 2),
  language = COALESCE(language, 'fr'),
  timezone_offset = COALESCE(timezone_offset, 0)
WHERE
  currency IS NULL OR
  display_unit IS NULL OR
  decimal_places IS NULL OR
  language IS NULL OR
  timezone_offset IS NULL;
