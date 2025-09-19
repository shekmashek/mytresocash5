/*
          # [Feature] Referral System
          Adds the necessary tables and logic to support a user referral system.

          ## Query Description: This migration adds a `referrals` table to track invitations, and updates the `profiles` table with columns for referral codes and rewards. It also updates the `handle_new_user` function to generate a unique referral code for new users and to link them to their referrer if a code was used during sign-up. This is a structural and safe change.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Adds `referral_code`, `referred_by`, `referral_rewards_available` columns to `public.profiles`.
          - Creates new table `public.referrals`.
          - Creates new function `generate_referral_code()`.
          - Updates function `public.handle_new_user()`.
          
          ## Security Implications:
          - RLS Status: Enabled on `referrals`.
          - Policy Changes: Yes, new policies for `referrals`.
          - Auth Requirements: User must be authenticated to interact with their referrals.
          
          ## Performance Impact:
          - Indexes: Adds unique constraints which create indexes.
          - Triggers: Updates the `on_auth_user_created` trigger.
          - Estimated Impact: Negligible impact on performance.
          */

-- Add referral columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_rewards_available INT DEFAULT 0;

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referee_email TEXT NOT NULL,
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent', -- sent, registered, subscribed, reward_claimed
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(referrer_id, referee_email)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies for referrals table
DROP POLICY IF EXISTS "Users can view their own referrals." ON public.referrals;
CREATE POLICY "Users can view their own referrals." ON public.referrals
FOR SELECT USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users can insert their own referrals." ON public.referrals;
CREATE POLICY "Users can insert their own referrals." ON public.referrals
FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- Function to generate a random referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT[] := '{A,B,C,D,E,F,G,H,I,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z,2,3,4,5,6,7,8,9}';
    code TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        code := code || chars[1 + floor(random() * array_length(chars, 1))];
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Update the handle_new_user function to generate a referral code
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code TEXT;
BEGIN
    -- Generate a unique referral code
    LOOP
        new_referral_code := generate_referral_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code);
    END LOOP;

    INSERT INTO public.profiles (id, full_name, email, referral_code)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, new_referral_code);
    
    -- Check if a referral code was used during sign up
    IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
        UPDATE public.profiles
        SET referred_by = (SELECT id FROM public.profiles WHERE referral_code = new.raw_user_meta_data->>'referral_code' LIMIT 1)
        WHERE id = new.id;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
