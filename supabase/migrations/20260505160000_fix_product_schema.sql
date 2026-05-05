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
