-- FINAL RECIPE POLICIES AND SEED
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "Public recipes are viewable by everyone" ON public.recipes;
CREATE POLICY "Public recipes are viewable by everyone" ON public.recipes FOR SELECT USING (true);

-- Admin policy
DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins can manage recipes" 
ON public.recipes 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Profile policy fix for is_admin flag
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Ensure the master user has everything set
DO $$
BEGIN
  -- Insert into user_roles if not exists
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' 
  FROM auth.users 
  WHERE email = 'leandrobrum2009@gmail.com'
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  -- Update profiles
  UPDATE public.profiles 
  SET is_admin = true 
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'leandrobrum2009@gmail.com'
  );
END $$;

-- Seed 5 real recipes if empty
INSERT INTO public.recipes (title, description, instructions, category, difficulty, image_url, ingredients)
SELECT 'Strogonoff de Frango', 'O clássico preferido dos brasileiros.', '1. Corte o frango em cubos.\n2. Refogue com temperos.\n3. Adicione champignon e ketchup.\n4. Finalize com creme de leite.', 'Almoço', 'Médio', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800', '[{"name": "Frango", "quantity": "500g"}, {"name": "Creme de Leite", "quantity": "1 caixa"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Strogonoff de Frango');

INSERT INTO public.recipes (title, description, instructions, category, difficulty, image_url, ingredients)
SELECT 'Pão de Queijo', 'O lanche mineiro que conquistou o mundo.', '1. Ferva leite, óleo e sal.\n2. Escalde o polvilho.\n3. Adicione ovos e queijo ralado.\n4. Asse até dourar.', 'Lanche', 'Médio', 'https://images.unsplash.com/photo-1598143153002-f88a21731ad8?w=800', '[{"name": "Polvilho Doce", "quantity": "500g"}, {"name": "Queijo Minas", "quantity": "300g"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Pão de Queijo');
