 -- SCRIPT PARA REPARAR COLUNAS FALTANTES NO SUPABASE
 -- Copie e cole no SQL Editor do Supabase
 
 -- 1. Garantir que as colunas essenciais existam na tabela products
 ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
 ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
 ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
 ALTER TABLE public.products ADD COLUMN IF NOT EXISTS points_value INTEGER DEFAULT 0;
 ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
 
 -- 2. Garantir que as colunas essenciais existam na tabela profiles
 ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
 ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
 ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS household_status TEXT;
 ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
 
 -- 3. Habilitar RLS se ainda não estiver
 ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 
 -- 4. Criar políticas básicas se não existirem
 DO $$ 
 BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read products') THEN
         CREATE POLICY "Allow public read products" ON public.products FOR SELECT USING (true);
     END IF;
 END $$;
 
 -- 5. Atualizar função is_admin para ser mais segura
 CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS BOOLEAN AS $$
 BEGIN
   SET search_path = public;
   RETURN EXISTS (
     SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND is_admin = true
   );
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;