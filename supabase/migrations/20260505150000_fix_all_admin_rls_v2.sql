-- Fix Banners RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Banners are viewable by everyone" ON public.banners;
CREATE POLICY "Banners are viewable by everyone" ON public.banners FOR SELECT USING (true);

-- Fix Recipes RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all recipes" ON public.recipes;
CREATE POLICY "Admins can manage all recipes" ON public.recipes FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Users can create recipes" ON public.recipes;
CREATE POLICY "Users can create recipes" ON public.recipes FOR INSERT TO authenticated WITH CHECK (true);

-- Fix Products RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.is_admin());

-- Fix Categories RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

-- Ensure the user is admin in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'leandrobrum2009@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Ensure the user is admin in profiles
UPDATE public.profiles SET is_admin = true WHERE id IN (SELECT id FROM auth.users WHERE email = 'leandrobrum2009@gmail.com');
