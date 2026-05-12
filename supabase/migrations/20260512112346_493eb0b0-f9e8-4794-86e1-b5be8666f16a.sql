ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'un',
ADD COLUMN IF NOT EXISTS is_weight_based BOOLEAN DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN public.products.unit IS 'Unidade de medida do produto (un, kg, pct, etc)';
COMMENT ON COLUMN public.products.is_weight_based IS 'Indica se o produto é vendido por peso (ex: carnes, frutas)';
