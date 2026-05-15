ALTER TABLE public.products ADD COLUMN sku TEXT;
CREATE INDEX idx_products_sku ON public.products (sku);