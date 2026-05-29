-- 1. Ensure column exists
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;

-- 2. Force a schema reload by creating and dropping a dummy view
CREATE OR REPLACE VIEW public.dummy_refresh_view AS SELECT 1;
DROP VIEW public.dummy_refresh_view;

-- 3. Touch the table and column to trigger schema change events with static strings
COMMENT ON COLUMN public.products.sku IS 'Código de barras ou identificador único do produto';
COMMENT ON TABLE public.products IS 'Produtos do catálogo do mercado';

-- 4. Notify PostgREST
NOTIFY pgrst, 'reload schema';
