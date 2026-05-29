-- Force a schema reload for PostgREST
NOTIFY pgrst, 'reload schema';

-- Also, let's "touch" the products table to be absolutely sure
COMMENT ON TABLE public.products IS 'Produtos do catálogo do mercado';
