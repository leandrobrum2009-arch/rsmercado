-- Update user_addresses table for rural areas
ALTER TABLE public.user_addresses 
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS reference_point TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT;

-- Make zip_code optional
ALTER TABLE public.user_addresses ALTER COLUMN zip_code DROP NOT NULL;
