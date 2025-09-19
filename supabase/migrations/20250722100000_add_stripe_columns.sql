/*
  # Add Stripe Subscription Columns to Profiles
  [This migration adds columns to the `profiles` table to store Stripe customer and subscription information, enabling payment integration.]

  ## Query Description: [This operation alters the `profiles` table to add three new columns: `stripe_customer_id`, `subscription_id`, and `subscription_status`. These fields are essential for linking user profiles to their Stripe payment data and tracking their subscription status. This change is non-destructive and will not affect existing user data.]
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Table 'public.profiles':
    - Adds column `stripe_customer_id` (TEXT)
    - Adds column `subscription_id` (TEXT)
    - Adds column `subscription_status` (TEXT)
  
  ## Security Implications:
  - RLS Status: Unchanged
  - Policy Changes: No
  - Auth Requirements: None
  
  ## Performance Impact:
  - Indexes: None
  - Triggers: None
  - Estimated Impact: Low. The operation is a simple schema alteration on a table that is typically small.
*/

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT;
