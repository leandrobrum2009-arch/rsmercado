-- Update Flyers RLS to use the standard is_admin() function
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Flyers are viewable by everyone" ON public.flyers;
CREATE POLICY "Flyers are viewable by everyone" 
ON public.flyers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage flyers" ON public.flyers;
CREATE POLICY "Admins can manage flyers" 
ON public.flyers FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Ensure correct permissions
GRANT ALL ON public.flyers TO authenticated;
GRANT SELECT ON public.flyers TO anon;
