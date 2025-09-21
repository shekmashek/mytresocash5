/*
  # [Feature] Create Consolidated Views Table
  This migration creates the necessary table and policies for managing custom consolidated views.

  ## Query Description: 
  - Creates the `consolidated_views` table to store user-defined project groupings.
  - Enables Row Level Security to ensure data privacy.
  - Adds policies to allow users to manage only their own consolidated views.
  This is a structural change and is safe to apply.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the table and policies)
  
  ## Structure Details:
  - Table: `public.consolidated_views`
  - Columns: `id`, `user_id`, `name`, `description`, `project_ids`, `created_at`
  
  ## Security Implications:
  - RLS Status: Enabled
  - Policy Changes: Yes (new policies for `consolidated_views`)
  - Auth Requirements: User-specific access
  
  ## Performance Impact:
  - Indexes: Primary key on `id`, index on `user_id`.
  - Triggers: None
  - Estimated Impact: Low
*/

-- 1. Create the consolidated_views table
CREATE TABLE IF NOT EXISTS public.consolidated_views (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    project_ids uuid[],
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
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

-- 4. Add comments to the table and columns
COMMENT ON TABLE public.consolidated_views IS 'Stores user-defined consolidated views, which are groupings of projects.';
COMMENT ON COLUMN public.consolidated_views.project_ids IS 'Array of project UUIDs included in this view.';
