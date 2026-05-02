-- Add author_id to recipes to track who created them
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Update RLS for recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view recipes (SELECT)
DROP POLICY IF EXISTS "Public recipes are viewable by everyone" ON public.recipes;
CREATE POLICY "Public recipes are viewable by everyone" 
ON public.recipes FOR SELECT 
USING (true);

-- Allow authenticated users to create recipes (INSERT)
DROP POLICY IF EXISTS "Users can create their own recipes" ON public.recipes;
CREATE POLICY "Users can create their own recipes" 
ON public.recipes FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to update/delete their own recipes, and admins to manage all
DROP POLICY IF EXISTS "Users can manage their own recipes" ON public.recipes;
CREATE POLICY "Users can manage their own recipes" 
ON public.recipes FOR ALL 
TO authenticated 
USING (
  auth.uid() = author_id OR 
  public.is_admin() OR 
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
)
WITH CHECK (
  auth.uid() = author_id OR 
  public.is_admin() OR 
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- Clean up any loose ends in migrations
-- Ensure user_recipes is correctly protected
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own saved recipes" ON public.user_recipes;
CREATE POLICY "Users can manage their own saved recipes" 
ON public.user_recipes FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
