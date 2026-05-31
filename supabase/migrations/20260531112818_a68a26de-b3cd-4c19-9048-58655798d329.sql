-- Adicionar coluna de permissões na tabela user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';

-- Adicionar coluna de email na tabela profiles para facilitar buscas administrativas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Criar um index para busca por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Sincronizar emails existentes de auth.users para profiles (opcional mas recomendado)
DO $$
BEGIN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND p.email IS NULL;
END $$;
