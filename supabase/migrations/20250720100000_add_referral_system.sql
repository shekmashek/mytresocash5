/*
  # [Feature] Referral System
  Adds the necessary database structures to support a user referral system.

  ## Query Description:
  This migration adds new columns to the `profiles` table for tracking referrals, creates a new `referrals` table to log referral events, and sets up functions to manage referral codes and application. This is a structural change and should not affect existing data, but as always, a backup is recommended before major schema changes.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: true
  - Reversible: false

  ## Structure Details:
  - `profiles` table: Adds `referral_code` and `referred_by` columns.
  - `referrals` table: New table to track the relationship between referrers and referred users.
  - `generate_referral_code()`: New function to create unique referral codes.
  - `apply_referral_code()`: New function to apply a referral code upon user signup.
  - `handle_new_user()`: Updated function to assign a referral code to new users.

  ## Security Implications:
  - RLS Status: Enabled on the new `referrals` table.
  - Policy Changes: New policies added for the `referrals` table.
  - Auth Requirements: Operations are tied to authenticated user IDs.

  ## Performance Impact:
  - Indexes: Adds a UNIQUE index on `profiles.referral_code`.
  - Triggers: Updates the `on_auth_user_created` trigger.
  - Estimated Impact: Low impact on general performance.
*/

-- 1. Add columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Create a function to generate a unique referral code
DROP FUNCTION IF EXISTS generate_referral_code();
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  is_unique BOOLEAN := FALSE;
BEGIN
  WHILE NOT is_unique LOOP
    new_code := upper(substring(md5(random()::text) for 8));
    PERFORM 1 FROM public.profiles WHERE referral_code = new_code;
    is_unique := NOT FOUND;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the handle_new_user function to set the referral code
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, referral_code)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    generate_referral_code()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, subscribed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    subscribed_at TIMESTAMPTZ,
    UNIQUE(referrer_id, referred_user_id)
);

-- 5. Enable RLS and create policies for referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT USING (auth.uid() = referrer_id);

-- 6. Create RPC function to apply referral code
DROP FUNCTION IF EXISTS apply_referral_code(text,uuid);
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_referral_code TEXT, p_referred_user_id UUID)
RETURNS void AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Find the referrer by their code
  SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = p_referral_code;

  -- If a referrer is found and it's not the user themselves
  IF v_referrer_id IS NOT NULL AND v_referrer_id <> p_referred_user_id THEN
    -- Update the new user's profile with the referrer's ID
    UPDATE public.profiles
    SET referred_by = v_referrer_id
    WHERE id = p_referred_user_id;

    -- Create a record of the referral
    INSERT INTO public.referrals (referrer_id, referred_user_id)
    VALUES (v_referrer_id, p_referred_user_id)
    ON CONFLICT (referrer_id, referred_user_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;
