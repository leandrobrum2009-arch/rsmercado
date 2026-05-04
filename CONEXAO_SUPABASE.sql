-- INSTRUÇÕES DE CONEXÃO E CONFIGURAÇÃO DO BANCO DE DATAS SUPABASE
-- Copie todo o código abaixo e cole no "SQL Editor" do seu painel Supabase e clique em "Run".

-- 1. CRIAÇÃO DAS TABELAS BÁSICAS
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    old_price DECIMAL(10,2),
    category_id UUID REFERENCES public.categories(id),
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    points_value INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    points_balance INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT,
    total_attempted INTEGER,
    successful_count INTEGER,
    duplicate_count INTEGER,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. HABILITAR SEGURANÇA (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACESSO (PERMISSÕES)
-- Permite que qualquer pessoa veja categorias e produtos
CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read products" ON public.products FOR SELECT USING (true);

-- Helper para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permite que admins gerenciem tudo
CREATE POLICY "Admins manage everything on categories" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything on products" ON public.products FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything on profiles" ON public.profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything on import_logs" ON public.import_logs FOR ALL USING (public.is_admin());

-- Permite que usuários vejam e editem seus próprios perfis
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. FUNÇÃO DE PROMOÇÃO PARA ADMIN (Use a chave: ADMIN_RS_2024)
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF secret_key != 'ADMIN_RS_2024' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Chave secreta inválida');
  END IF;

  UPDATE public.profiles SET is_admin = true WHERE id = auth.uid();
  
  RETURN jsonb_build_object('success', true, 'message', 'Usuário promovido a administrador com sucesso');
END;
$$;

-- 5. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE NO CADASTRO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();