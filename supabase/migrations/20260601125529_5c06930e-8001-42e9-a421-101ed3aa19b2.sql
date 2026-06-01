-- Adicionar colunas faltantes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id UUID;
