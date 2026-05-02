-- COMPREHENSIVE SECURITY AND FUNCTIONALITY FIX

-- 1. ROBUST IS_ADMIN FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email TEXT;
  user_uid UUID;
BEGIN
  user_uid := auth.uid();
  user_email := auth.jwt() ->> 'email';
  
  -- Master bypass (Hardcoded email)
  IF user_email = 'leandrobrum2009@gmail.com' THEN
    RETURN TRUE;
  END IF;

  IF user_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Fallback email check
  IF user_email IS NULL THEN
      SELECT email INTO user_email FROM auth.users WHERE id = user_uid;
      IF user_email = 'leandrobrum2009@gmail.com' THEN
          RETURN TRUE;
      END IF;
  END IF;

  -- Check user_roles table
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uid 
    AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. RECIPE POLICIES
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public recipes are viewable by everyone" ON public.recipes;
CREATE POLICY "Public recipes are viewable by everyone" ON public.recipes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins can manage recipes" 
ON public.recipes 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. USER_RECIPES POLICIES
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own saved recipes" ON public.user_recipes;
CREATE POLICY "Users can manage their own saved recipes" 
ON public.user_recipes 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. ENSURE OWNER PRIVILEGES
DO $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' 
  FROM auth.users 
  WHERE email = 'leandrobrum2009@gmail.com'
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  UPDATE public.profiles 
  SET is_admin = true 
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'leandrobrum2009@gmail.com'
  );
END $$;

-- 5. INITIAL SEED DATA
INSERT INTO public.recipes (title, description, instructions, category, difficulty, image_url, ingredients)
SELECT 'Brigadeiro Gourmet', 'O doce brasileiro mais icônico em sua melhor versão.', '1. Misture 1 lata de leite condensado com 3 colheres de chocolate.\n2. Adicione 1 colher de manteiga.\n3. Cozinhe mexendo sempre até desgrudar.\n4. Deixe esfriar e enrole.', 'Sobremesa', 'Fácil', 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=800', '[{"name": "Leite Condensado", "quantity": "1 lata"}, {"name": "Chocolate", "quantity": "3 colheres"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Brigadeiro Gourmet');

INSERT INTO public.recipes (title, description, instructions, category, difficulty, image_url, ingredients)
SELECT 'Feijoada Completa', 'O prato nacional brasileiro rico em sabor e história.', '1. Deixe o feijão de molho.\n2. Cozinhe com as carnes defumadas.\n3. Refogue temperos e adicione ao caldo.\n4. Sirva com arroz, couve e farofa.', 'Brasileira', 'Difícil', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800', '[{"name": "Feijão Preto", "quantity": "1kg"}, {"name": "Carnes Defumadas", "quantity": "500g"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Feijoada Completa');
