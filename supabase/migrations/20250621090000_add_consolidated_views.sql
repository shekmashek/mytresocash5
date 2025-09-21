/*
          # [Structural] Add Consolidated Views Table
          [This operation creates a new table to store custom consolidated views, allowing users to group multiple projects.]

          ## Query Description: [This script adds the `consolidated_views` table and its associated security policies. It will not affect any existing data. This change is safe and reversible by dropping the new table and policies.]
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Adds table: `public.consolidated_views`
          - Adds columns: `id`, `user_id`, `name`, `description`, `project_ids`, `created_at`
          
          ## Security Implications:
          - RLS Status: Enabled
          - Policy Changes: Yes, new policies are created for the `consolidated_views` table.
          - Auth Requirements: Users can only manage their own consolidated views.
          
          ## Performance Impact:
          - Indexes: Adds primary key index on `id` and a foreign key index on `user_id`.
          - Triggers: None
          - Estimated Impact: Negligible performance impact.
          */

-- Create the consolidated_views table
CREATE TABLE IF NOT EXISTS public.consolidated_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    project_ids uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own consolidated views." ON public.consolidated_views;
CREATE POLICY "Users can view their own consolidated views."
ON public.consolidated_views FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own consolidated views." ON public.consolidated_views;
CREATE POLICY "Users can insert their own consolidated views."
ON public.consolidated_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own consolidated views." ON public.consolidated_views;
CREATE POLICY "Users can update their own consolidated views."
ON public.consolidated_views FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own consolidated views." ON public.consolidated_views;
CREATE POLICY "Users can delete their own consolidated views."
ON public.consolidated_views FOR DELETE
USING (auth.uid() = user_id);
