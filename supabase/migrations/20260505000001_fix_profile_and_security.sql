-- Adicionar colunas faltantes na tabela de perfis (unificando ProfileEditor e ProfileDetails)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS household_status TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Garantir que aliases de colunas do ProfileEditor também existam para evitar erros se usado
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS family_status TEXT;

-- Corrigir vulnerabilidade de SECURITY DEFINER (falta de search_path)
CREATE OR REPLACE FUNCTION protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
        NEW.is_admin := OLD.is_admin;
        NEW.points_balance := OLD.points_balance;
        NEW.loyalty_tier := OLD.loyalty_tier;
        NEW.id := OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Garantir que RLS esteja habilitado e as políticas de perfil estejam corretas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles 
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles 
FOR SELECT USING (is_admin() OR auth.uid() = id);
