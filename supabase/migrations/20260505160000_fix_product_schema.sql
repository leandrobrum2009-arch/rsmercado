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

-- REFRESH POLICIES
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL 
TO authenticated
USING ( public.is_admin() OR (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' );
