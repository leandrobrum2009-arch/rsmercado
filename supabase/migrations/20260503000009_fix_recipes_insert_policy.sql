-- Fix security vulnerability: ensure users can only insert recipes with their own ID
DROP POLICY IF EXISTS "Users can create their own recipes" ON public.recipes;

CREATE POLICY "Users can create their own recipes" 
ON public.recipes FOR INSERT 
TO authenticated 
WITH CHECK (
  (auth.uid() = author_id) OR 
  public.is_admin() OR 
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- Ensure profiles are also protected
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = id OR 
  public.is_admin() OR 
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);
