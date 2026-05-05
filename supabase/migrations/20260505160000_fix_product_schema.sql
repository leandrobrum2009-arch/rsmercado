-- ADD MISSING COLUMNS TO PRODUCTS
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Ensure categories exist
INSERT INTO public.categories (name, slug)
VALUES 
('Bebidas', 'bebidas'),
('Mercearia', 'mercearia'),
('Hortifruti', 'hortifruti'),
('Limpeza', 'limpeza'),
('Higiene', 'higiene'),
('Padaria', 'padaria'),
('Açougue', 'acougue'),
('Laticínios', 'laticinios'),
('Frios', 'frios'),
('Pet Shop', 'pet-shop'),
('Congelados', 'congelados'),
('Enlatados', 'enlatados'),
('Doces e Biscoitos', 'doces-e-biscoitos'),
('Massas e Grãos', 'massas-e-graos'),
('Café e Matinais', 'cafe-e-matinais'),
('Temperos', 'temperos'),
('Utilidades Domésticas', 'utilidades-domesticas'),
('Beleza', 'beleza')
ON CONFLICT (slug) DO NOTHING;

-- FIX PROFILES POLICY (Admin needs to update profiles)
DROP POLICY IF EXISTS "Profiles are viewable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles are manageable by owner or admin" 
ON public.profiles FOR ALL 
USING (
  auth.uid() = id OR public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
)
WITH CHECK (
  auth.uid() = id OR public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- FIX STORE SETTINGS (Ensure admins can manage)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;
CREATE POLICY "Anyone can view store settings" ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage store settings" ON public.store_settings;
CREATE POLICY "Admins can manage store settings" ON public.store_settings FOR ALL USING (
  public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- FIX STORAGE POLICIES
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
CREATE POLICY "Admin full access" ON storage.objects FOR ALL USING (
    bucket_id IN ('products', 'avatars') AND 
    (public.is_admin() OR (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com')
);

-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- FIX RECIPES (Ensure author_id is handled)
DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins can manage recipes" ON public.recipes FOR ALL USING (
  public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
) WITH CHECK (
  public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- REFRESH PRODUCTS POLICIES
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL 
TO authenticated
USING ( public.is_admin() OR (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' )
WITH CHECK ( public.is_admin() OR (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' );

-- FIX PROFILES COLUMNS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ensure RLS is enabled on all critical tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant all to authenticated for standard tables
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.banners TO authenticated;
GRANT ALL ON public.recipes TO authenticated;
GRANT ALL ON public.store_settings TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Ensure sequences are granted if any (usually serial/id)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- IMPROVE IS_ADMIN FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR 
    (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROMOTE TO ADMIN RPC
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Simple check for secret key (should be rotated in production)
  IF secret_key = 'RSMERCADO_ADMIN_2024' OR secret_key = 'CHAVE_MESTRE' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    
    UPDATE public.profiles SET is_admin = true WHERE id = auth.uid();
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ENSURE USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can see all roles" ON public.user_roles;
CREATE POLICY "Admins can see all roles" ON public.user_roles FOR SELECT USING (public.is_admin());
