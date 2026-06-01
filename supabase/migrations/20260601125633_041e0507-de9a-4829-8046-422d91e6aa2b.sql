-- 1. Adicionar tracking_status
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'pending';

-- 2. Remover FKs problemáticas para o restore
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_author_id_fkey;
