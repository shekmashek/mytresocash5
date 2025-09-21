/*
          # [Structural] Création du Système de Parrainage
          Ce script met en place la structure de base de données nécessaire pour le système de parrainage.

          ## Query Description: 
          1. Ajoute les colonnes `referral_code` et `referred_by` à la table des profils.
          2. Crée une nouvelle table `referrals` pour suivre les invitations.
          3. Met à jour la fonction `handle_new_user` pour générer des codes de parrainage et enregistrer les parrainages lors de l'inscription.
          Cette opération est sûre et n'affecte pas les données existantes.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Table 'profiles': Ajout des colonnes 'referral_code', 'referred_by'.
          - Nouvelle table: 'referrals'.
          - Fonction modifiée: 'handle_new_user'.
          - Nouvelle fonction: 'generate_referral_code'.
          
          ## Security Implications:
          - RLS Status: Activé sur la nouvelle table 'referrals'.
          - Policy Changes: Ajout de politiques pour la table 'referrals'.
          - Auth Requirements: Aucune modification directe sur l'authentification.
          
          ## Performance Impact:
          - Indexes: Ajout d'index sur les nouvelles colonnes et clés étrangères.
          - Triggers: Modification du trigger 'on_auth_user_created'.
          - Estimated Impact: Faible.
          */

-- Add referral columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create a function to generate a random string for referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  is_unique BOOLEAN := false;
BEGIN
  WHILE NOT is_unique LOOP
    code := upper(substr(md5(random()::text), 0, 9)); -- 8-char uppercase code
    PERFORM 1 FROM public.profiles WHERE referral_code = code;
    IF NOT FOUND THEN
      is_unique := true;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create the referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_user_id, referred_user_id)
);

-- Enable RLS for referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies for referrals table
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Modify the handle_new_user function to handle referrals
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
  referral_code_from_meta TEXT;
BEGIN
  -- Extract referral code from metadata if it exists
  referral_code_from_meta := new.raw_user_meta_data->>'referral_code';
  
  -- Find the referrer's user ID if a valid referral code was provided
  IF referral_code_from_meta IS NOT NULL THEN
    SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = referral_code_from_meta;
  END IF;

  -- Insert new profile
  INSERT INTO public.profiles (id, full_name, email, referred_by, referral_code)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    referrer_id, -- This will be NULL if no valid referrer was found
    generate_referral_code() -- Generate a new code for the new user
  );

  -- If a referrer was found, create a record in the referrals table
  IF referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_user_id, referred_user_id)
    VALUES (referrer_id, new.id);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
