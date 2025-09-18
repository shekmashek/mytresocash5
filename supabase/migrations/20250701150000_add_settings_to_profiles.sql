/*
  # [Schema Upgrade] Add User Settings to Profiles Table
  [This migration adds columns to the `profiles` table to store user-specific display and localization settings, such as currency, number formatting, and timezone. This change is necessary to persist user preferences in the database.]

  ## Query Description: [This operation adds new columns to the `profiles` table. It is non-destructive and will not affect existing data. Default values are provided for all new columns to ensure existing users have a seamless experience.]
  
  ## Metadata:
  - Schema-Category: ["Structural"]
  - Impact-Level: ["Low"]
  - Requires-Backup: [false]
  - Reversible: [true]
  
  ## Structure Details:
  - Table(s) Affected: `public.profiles`
  - Columns Added: `currency`, `display_unit`, `decimal_places`, `language`, `timezone_offset`
  
  ## Security Implications:
  - RLS Status: [Enabled]
  - Policy Changes: [No]
  - Auth Requirements: [This change affects the `profiles` table, which is linked to `auth.users`.]
  
  ## Performance Impact:
  - Indexes: [None]
  - Triggers: [None]
  - Estimated Impact: [Low. Adding columns with default values may cause a brief lock on the table during the migration.]
*/

-- Add currency column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '€';

-- Add display_unit column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_unit TEXT DEFAULT 'standard';

-- Add decimal_places column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2;

-- Add language column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr';

-- Add timezone_offset column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0;
