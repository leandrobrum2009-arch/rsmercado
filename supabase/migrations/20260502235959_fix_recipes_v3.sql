-- FINAL FIX FOR RECIPES
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins can manage recipes" 
ON public.recipes FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.recipes (title, description, instructions, category, difficulty, image_url, ingredients)
SELECT 'Brigadeiro Tradicional', 'O doce mais amado do Brasil.', '1. Misture tudo.\n2. Cozinhe.\n3. Enrole.', 'Sobremesa', 'Fácil', 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=800', '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.recipes LIMIT 1);
