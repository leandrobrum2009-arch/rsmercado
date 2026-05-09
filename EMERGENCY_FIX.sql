 -- EMERGENCY ADMIN AND RLS FIX
 -- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
 
 -- 1. Robust is_admin function
 CREATE OR REPLACE FUNCTION public.is_admin() 
 RETURNS BOOLEAN 
 LANGUAGE plpgsql 
 SECURITY DEFINER
 SET search_path = public, auth
 AS $$
 DECLARE
   user_email TEXT;
 BEGIN
   -- Get email from JWT
   user_email := auth.jwt() ->> 'email';
   
   -- Master bypass
   IF user_email = 'leandrobrum2009@gmail.com' THEN
     RETURN TRUE;
   END IF;
 
   -- Check user_roles table
   IF EXISTS (
     SELECT 1 FROM public.user_roles 
     WHERE user_id = auth.uid() 
     AND role = 'admin'
   ) THEN
     RETURN TRUE;
   END IF;
 
   -- Check profiles table (legacy support)
   IF EXISTS (
     SELECT 1 FROM public.profiles
     WHERE id = auth.uid()
     AND is_admin = true
   ) THEN
     RETURN TRUE;
   END IF;
 
   RETURN FALSE;
 END;
 $$;
 
 -- 2. Restore promote_to_admin with secret key for recovery
 CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT DEFAULT NULL)
 RETURNS JSONB
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
 AS $$
 DECLARE
     curr_user_id UUID;
 BEGIN
     curr_user_id := auth.uid();
 
     IF curr_user_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada.');
     END IF;
 
     IF (secret_key != 'ADMIN_RS_2024') AND NOT public.is_admin() THEN
         RETURN jsonb_build_object('success', false, 'message', 'Chave secreta inválida ou acesso negado.');
     END IF;
 
     INSERT INTO public.user_roles (user_id, role)
     VALUES (curr_user_id, 'admin')
     ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
 
     UPDATE public.profiles SET is_admin = true WHERE id = curr_user_id;
 
     RETURN jsonb_build_object('success', true, 'message', 'ACESSO ADMIN CONCEDIDO COM SUCESSO!');
 END;
 $$;
 
 -- 3. Ensure products are visible to admins
 DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
 CREATE POLICY "Admins can manage products" 
 ON public.products FOR ALL 
 TO authenticated
 USING ( public.is_admin() )
 WITH CHECK ( public.is_admin() );
 
 -- Ensure public can see only approved/available
 DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
 CREATE POLICY "Public products are viewable by everyone" 
 ON public.products FOR SELECT 
 USING (is_approved = true AND is_available = true);
 
 -- 4. Categories policies
 DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
 CREATE POLICY "Admins can manage categories" 
 ON public.categories FOR ALL 
 TO authenticated
 USING ( public.is_admin() )
 WITH CHECK ( public.is_admin() );
 
 -- Grant execute permissions
  GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
  GRANT EXECUTE ON FUNCTION public.promote_to_admin(TEXT) TO authenticated;

  -- 5. REPARAR TABELA DE RECEITAS (ADICIONAR SOURCE_URL)
  CREATE TABLE IF NOT EXISTS public.recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      category TEXT,
      difficulty TEXT DEFAULT 'Média',
      image_url TEXT,
      ingredients JSONB DEFAULT '[]',
      source_url TEXT UNIQUE,
      author_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Adicionar coluna source_url se não existir
  ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS source_url TEXT;

  -- Tentar adicionar constraint UNIQUE se não houver duplicatas de URL
  DO $$ 
  BEGIN 
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipes_source_url_key') THEN
          ALTER TABLE public.recipes ADD CONSTRAINT recipes_source_url_key UNIQUE (source_url);
      END IF;
  END $$;

  -- Políticas de Receitas
  ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Anyone can view recipes" ON public.recipes;
  CREATE POLICY "Anyone can view recipes" ON public.recipes FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Anyone can insert recipes" ON public.recipes;
  CREATE POLICY "Anyone can insert recipes" ON public.recipes FOR INSERT WITH CHECK (true);
  DROP POLICY IF EXISTS "Admin manage recipes" ON public.recipes;
  CREATE POLICY "Admin manage recipes" ON public.recipes FOR ALL USING (public.is_admin());