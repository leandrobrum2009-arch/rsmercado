-- Atualizar políticas de banners para usar a função is_admin() robusta
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners" 
ON public.banners FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Atualizar políticas de flyers (encartes) para usar a função is_admin() robusta
DROP POLICY IF EXISTS "Admins can manage flyers" ON public.flyers;
CREATE POLICY "Admins can manage flyers" 
ON public.flyers FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Garantir que a tabela profiles também use is_admin() para visualização total
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.is_admin());
