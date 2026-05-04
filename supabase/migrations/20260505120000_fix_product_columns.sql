-- FIX MISSING COLUMNS IN PRODUCTS
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

-- SEED DATA
INSERT INTO public.products (name, brand, price, category_id, is_available, is_approved, image_url, stock)
SELECT 'Arroz Agulhinha 5kg', 'Tio João', 29.90, id, true, true, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=300', 100
FROM public.categories WHERE slug = 'hortifruti'
LIMIT 1;

INSERT INTO public.products (name, brand, price, category_id, is_available, is_approved, image_url, stock)
SELECT 'Feijão Carioca 1kg', 'Camil', 8.50, id, true, true, 'https://images.unsplash.com/photo-1551462147-37885acc3c41?q=80&w=300', 100
FROM public.categories WHERE slug = 'hortifruti'
LIMIT 1;

-- POLICIES
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
CREATE POLICY "Public products are viewable by everyone" 
ON public.products FOR SELECT 
USING (is_approved = true AND is_available = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL 
TO authenticated
USING ( public.is_admin() OR (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' );

-- FIX MISSING COLUMNS IN ORDERS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
