-- 1. Ensure Banners table exists and has correct RLS
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    category_id UUID REFERENCES public.categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Banners are viewable by everyone" ON public.banners;
CREATE POLICY "Banners are viewable by everyone" ON public.banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL USING (
  public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- 2. Ensure Recipes table exists and has correct RLS
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    category TEXT,
    difficulty TEXT,
    image_url TEXT,
    ingredients JSONB DEFAULT '[]',
    author_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public recipes are viewable by everyone" ON public.recipes;
CREATE POLICY "Public recipes are viewable by everyone" ON public.recipes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins can manage recipes" ON public.recipes FOR ALL USING (
  public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- 3. Fix Profiles privacy - Don't leak sensitive data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
-- Only allow viewing own profile or if admin
CREATE POLICY "Profiles are viewable by owner or admin" ON public.profiles FOR SELECT USING (
  auth.uid() = id OR public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- 4. Grant permissions
GRANT ALL ON public.banners TO authenticated;
GRANT ALL ON public.recipes TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
