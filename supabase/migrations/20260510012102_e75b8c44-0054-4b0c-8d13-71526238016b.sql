CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  icon_name TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  old_price NUMERIC(10,2),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  points_value INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  brand TEXT,
  size TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_visible ON public.products(is_available, is_approved, deleted_at);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  link_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  category TEXT,
  difficulty TEXT DEFAULT 'Média',
  image_url TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_url TEXT UNIQUE,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  path TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Public categories are viewable by everyone"
ON public.categories
FOR SELECT
USING (true);
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Public products are viewable by everyone"
ON public.products
FOR SELECT
USING (is_available = true AND is_approved = true AND deleted_at IS NULL);
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public safe store settings are viewable by everyone" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can manage store settings" ON public.store_settings;
CREATE POLICY "Public safe store settings are viewable by everyone"
ON public.store_settings
FOR SELECT
USING (
  key IN (
    'site_name',
    'logo_url',
    'color_palette',
    'theme_settings',
    'home_layout',
    'points_multiplier',
    'whatsapp',
    'opening_hours',
    'address',
    'instagram_url',
    'facebook_url',
    'store_description',
    'instagram_post_count',
    'instagram_items',
    'social_proof_settings'
  )
);
CREATE POLICY "Admins can manage store settings"
ON public.store_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public active banners are viewable by everyone" ON public.banners;
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Public active banners are viewable by everyone"
ON public.banners
FOR SELECT
USING (is_active = true);
CREATE POLICY "Admins can manage banners"
ON public.banners
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Everyone can see active alerts" ON public.store_alerts;
DROP POLICY IF EXISTS "Admins can manage alerts" ON public.store_alerts;
CREATE POLICY "Everyone can see active alerts"
ON public.store_alerts
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Admins can manage alerts"
ON public.store_alerts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Recipes are viewable by everyone" ON public.recipes;
DROP POLICY IF EXISTS "Authenticated users can insert recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Admins can manage all recipes" ON public.recipes;
CREATE POLICY "Recipes are viewable by everyone"
ON public.recipes
FOR SELECT
USING (true);
CREATE POLICY "Authenticated users can insert recipes"
ON public.recipes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own recipes"
ON public.recipes
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Admins can manage all recipes"
ON public.recipes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public neighborhoods are viewable by everyone" ON public.delivery_neighborhoods;
DROP POLICY IF EXISTS "Admins can manage neighborhoods" ON public.delivery_neighborhoods;
CREATE POLICY "Public neighborhoods are viewable by everyone"
ON public.delivery_neighborhoods
FOR SELECT
USING (true);
CREATE POLICY "Admins can manage neighborhoods"
ON public.delivery_neighborhoods
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone can register site visits" ON public.site_visits;
DROP POLICY IF EXISTS "Admins can review site visits" ON public.site_visits;
CREATE POLICY "Anyone can register site visits"
ON public.site_visits
FOR INSERT
WITH CHECK (true);
CREATE POLICY "Admins can review site visits"
ON public.site_visits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.categories (name, slug, icon_url, icon_name, banner_url)
VALUES
  ('Hortifruti', 'hortifruti', 'https://cdn-icons-png.flaticon.com/512/2329/2329865.png', 'Apple', 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=1200'),
  ('Mercearia', 'mercearia', 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png', 'Package', 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200'),
  ('Padaria', 'padaria', 'https://cdn-icons-png.flaticon.com/512/992/992743.png', 'Croissant', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1200'),
  ('Bebidas', 'bebidas', 'https://cdn-icons-png.flaticon.com/512/3122/3122040.png', 'Wine', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?q=80&w=1200'),
  ('Limpeza', 'limpeza', 'https://cdn-icons-png.flaticon.com/512/995/995016.png', 'SprayCan', 'https://images.unsplash.com/photo-1584622781564-1d9876a13d00?q=80&w=1200'),
  ('Laticínios', 'laticinios', 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png', 'Milk', 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?q=80&w=1200')
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  icon_url = EXCLUDED.icon_url,
  icon_name = EXCLUDED.icon_name,
  banner_url = COALESCE(public.categories.banner_url, EXCLUDED.banner_url);

DO $$
DECLARE
  cat_mercearia UUID;
  cat_horti UUID;
  cat_bebidas UUID;
  cat_limpeza UUID;
BEGIN
  SELECT id INTO cat_mercearia FROM public.categories WHERE slug = 'mercearia';
  SELECT id INTO cat_horti FROM public.categories WHERE slug = 'hortifruti';
  SELECT id INTO cat_bebidas FROM public.categories WHERE slug = 'bebidas';
  SELECT id INTO cat_limpeza FROM public.categories WHERE slug = 'limpeza';

  IF NOT EXISTS (SELECT 1 FROM public.products) THEN
    INSERT INTO public.products (name, description, price, old_price, category_id, image_url, stock, points_value, brand, size, tags, is_available, is_approved)
    VALUES
      ('Arroz Tio João Tipo 1 5kg', 'Arroz agulhinha tipo 1, grãos selecionados e soltinhos.', 29.90, 32.50, cat_mercearia, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=900', 100, 29, 'Tio João', '5kg', ARRAY['OFERTA','DESTAQUE'], true, true),
      ('Feijão Carioca Camil 1kg', 'Feijão carioca novo, caldo grosso e cozimento rápido.', 8.50, 9.90, cat_mercearia, 'https://images.unsplash.com/photo-1551462147-37885acc3c41?auto=format&fit=crop&q=80&w=900', 150, 8, 'Camil', '1kg', ARRAY['OFERTA'], true, true),
      ('Banana Prata 1kg', 'Banana selecionada, ideal para o café da manhã.', 6.99, NULL, cat_horti, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=900', 80, 6, 'Selecionada', '1kg', ARRAY['NOVO'], true, true),
      ('Coca-Cola 2L', 'Refrigerante geladinho para acompanhar suas refeições.', 11.90, 13.49, cat_bebidas, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=900', 90, 11, 'Coca-Cola', '2L', ARRAY['DESTAQUE'], true, true),
      ('Detergente Ypê Neutro 500ml', 'Lava-louças com alto rendimento e brilho.', 2.45, NULL, cat_limpeza, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=900', 120, 2, 'Ypê', '500ml', ARRAY[]::TEXT[], true, true);
  END IF;
END $$;

INSERT INTO public.store_settings (key, value)
VALUES
  ('site_name', '"RS SUPERMERCADO"'::jsonb),
  ('logo_url', '""'::jsonb),
  ('color_palette', '{"primary":"#16a34a","secondary":"#facc15"}'::jsonb),
  ('theme_settings', '{"colors":{"primary":"#16a34a","secondary":"#facc15"}}'::jsonb),
  ('points_multiplier', '{"points_per_real":1}'::jsonb),
  ('home_layout', '[
    {"id":"search","visible":true},
    {"id":"delivery_check","visible":true},
    {"id":"prod_destaque","visible":true,"title":"Destaques para Você","tag":"DESTAQUE"},
    {"id":"offers_btn","visible":true},
    {"id":"flyer","visible":true},
    {"id":"banner_carousel","visible":true},
    {"id":"home_banners","visible":true},
    {"id":"category_bar","visible":true},
    {"id":"category_banners","visible":true},
    {"id":"prod_horti","visible":true,"title":"Hortifruti Fresquinho","category":"Hortifruti"},
    {"id":"pwa","visible":true},
    {"id":"prod_mercearia","visible":true,"title":"Destaques da Mercearia","category":"Mercearia"},
    {"id":"digital_flyers","visible":true},
    {"id":"prod_bebidas","visible":true,"title":"Bebidas Mais Vendidas","category":"Bebidas"},
    {"id":"recipes","visible":true},
    {"id":"ai_recipes","visible":true},
    {"id":"instagram","visible":true},
    {"id":"coupon","visible":true},
    {"id":"prod_limpeza","visible":true,"title":"Ofertas de Limpeza","category":"Limpeza"}
  ]'::jsonb),
  ('social_proof_settings', '{"enabled":true,"interval":15000,"max_per_minute":4,"max_per_session":20}'::jsonb),
  ('store_description', '"Ofertas fresquinhas e compras rápidas para o dia a dia."'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.delivery_neighborhoods (name, fee, active)
VALUES
  ('Centro', 4.99, true),
  ('Casa Amarela', 6.99, true),
  ('Asilo', 7.99, true),
  ('Varjão', 8.99, true)
ON CONFLICT (name) DO UPDATE
SET fee = EXCLUDED.fee,
    active = EXCLUDED.active;

INSERT INTO public.recipes (title, description, instructions, category, difficulty, image_url, ingredients, source_url)
VALUES
  (
    'Macarrão Cremoso de Queijo',
    'Receita rápida e prática para o almoço da semana.',
    'Cozinhe o macarrão, prepare o molho com creme e queijo e finalize com cheiro-verde.',
    'Massas',
    'Fácil',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80&w=1200',
    '[{"name":"Macarrão"},{"name":"Creme de leite"},{"name":"Queijo ralado"}]'::jsonb,
    'seed-macarrao-cremoso'
  ),
  (
    'Vitamina de Banana',
    'Bebida simples e energética para começar o dia.',
    'Bata banana, leite e aveia no liquidificador até ficar homogêneo.',
    'Bebidas',
    'Fácil',
    'https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?auto=format&fit=crop&q=80&w=1200',
    '[{"name":"Banana"},{"name":"Leite"},{"name":"Aveia"}]'::jsonb,
    'seed-vitamina-banana'
  )
ON CONFLICT (source_url) DO NOTHING;

INSERT INTO public.banners (image_url, link_url, category_id, is_active)
SELECT
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1600',
  '/search?category=mercearia',
  c.id,
  true
FROM public.categories c
WHERE c.slug = 'mercearia'
  AND NOT EXISTS (SELECT 1 FROM public.banners);
