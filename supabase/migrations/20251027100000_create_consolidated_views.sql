/*
# [FEATURE] Create Consolidated Views Table
This migration creates the `consolidated_views` table to store user-defined groupings of projects.

## Query Description:
This script adds a new table `consolidated_views` to your database. It will not affect any existing data. It also sets up Row Level Security (RLS) policies to ensure that users can only access their own consolidated views.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (The table can be dropped)

## Structure Details:
- **Table:** `public.consolidated_views`
  - `id`: UUID, Primary Key
  - `user_id`: UUID, Foreign Key to `auth.users`
  - `name`: TEXT, Not Null
  - `description`: TEXT
  - `project_ids`: UUID Array
  - `created_at`: TIMESTAMPTZ

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes. Adds SELECT, INSERT, UPDATE, DELETE policies to ensure data privacy.
- Auth Requirements: Users must be authenticated to interact with this table.

## Performance Impact:
- Indexes: Primary key index on `id` and a foreign key index on `user_id` will be created.
- Triggers: None.
- Estimated Impact: Negligible on existing operations.
*/

-- Create the consolidated_views table
CREATE TABLE IF NOT EXISTS public.consolidated_views (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    project_ids uuid[],
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT consolidated_views_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE public.consolidated_views ENABLE ROW LEVEL SECURITY;

-- Create policies for consolidated_views
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
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own consolidated views." ON public.consolidated_views;
CREATE POLICY "Users can delete their own consolidated views."
ON public.consolidated_views FOR DELETE
USING (auth.uid() = user_id);
