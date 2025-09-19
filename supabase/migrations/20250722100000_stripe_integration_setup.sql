/*
  # [Stripe Integration] - Add subscription columns to profiles
  [This operation adds columns to the profiles table to store Stripe customer and subscription information.]

  ## Query Description: [This operation will add new columns to the 'profiles' table to manage user subscriptions via Stripe. It is a non-destructive structural change.]
  
  ## Metadata:
  - Schema-Category: ["Structural"]
  - Impact-Level: ["Low"]
  - Requires-Backup: [false]
  - Reversible: [true]
  
  ## Structure Details:
  - Table 'profiles':
    - ADD COLUMN stripe_customer_id TEXT
    - ADD COLUMN subscription_status TEXT
    - ADD COLUMN subscription_id TEXT
    - ADD COLUMN plan_id TEXT
  
  ## Security Implications:
  - RLS Status: [No change]
  - Policy Changes: [No]
  - Auth Requirements: [None]
  
  ## Performance Impact:
  - Indexes: [None]
  - Triggers: [None]
  - Estimated Impact: [Negligible performance impact.]
*/

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS plan_id TEXT;
