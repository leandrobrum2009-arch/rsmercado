-- Fix RLS for recipes to allow owner access even if not in user_roles
DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins and owner can manage recipes" 
ON public.recipes 
FOR ALL 
TO authenticated
USING (
  public.is_admin() OR 
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
)
WITH CHECK (
  public.is_admin() OR 
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- Ensure user_recipes is also accessible
DROP POLICY IF EXISTS "Users can manage their own saved recipes" ON public.user_recipes;
CREATE POLICY "Users can manage their own saved recipes" 
ON public.user_recipes 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
