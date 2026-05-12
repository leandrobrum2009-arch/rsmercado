-- Add missing columns to flyers table
ALTER TABLE public.flyers ADD COLUMN IF NOT EXISTS layout_type TEXT;
ALTER TABLE public.flyers ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE public.flyers ADD COLUMN IF NOT EXISTS secondary_color TEXT;
ALTER TABLE public.flyers ADD COLUMN IF NOT EXISTS products_data JSONB DEFAULT '[]';
ALTER TABLE public.flyers ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Fix any potentially missing columns on products mentioned in the previous messages
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'un';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_weight_based BOOLEAN DEFAULT FALSE;
