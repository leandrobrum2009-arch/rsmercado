-- Adicionar colunas de fidelidade e perfil na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS household_status TEXT;

-- Notificar recarregamento do schema para o PostgREST
NOTIFY pgrst, 'reload schema';
