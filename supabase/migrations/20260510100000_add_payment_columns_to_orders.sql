-- Add payment tracking columns to orders table
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_method_details JSONB;

COMMENT ON COLUMN public.orders.payment_id IS 'ID do pagamento no provedor externo (Mercado Pago, Sipag, etc)';
COMMENT ON COLUMN public.orders.payment_status IS 'Status detalhado do pagamento (paid, pending, rejected)';
