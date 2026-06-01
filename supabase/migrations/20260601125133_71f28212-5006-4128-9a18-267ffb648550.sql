-- 1. Limpar gatilhos antigos
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Garantir restrição de unicidade na tabela user_roles
-- Primeiro removemos a constraint antiga se existir (que era composta)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
-- Adicionamos uma nova constraint única apenas para user_id
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- 3. Função robusta para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil na tabela public.profiles
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  -- Lógica especial para o administrador mestre
  IF NEW.email = 'leandrobrum2009@gmail.com' THEN
    -- Confirmar e-mail
    UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = NEW.id;
    
    -- Atribuir papel de admin
    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (NEW.id, 'admin', ARRAY['delivery_report', 'dashboard', 'orders', 'products', 'customers', 'loyalty', 'layout', 'categories', 'organizer', 'importer', 'offers', 'banners', 'flyers', 'recipes', 'notifications', 'alerts', 'settings', 'theme', 'whatsapp', 'webhooks', 'admin_roles', 'activity_logs', 'feedback'])
    ON CONFLICT (user_id) DO UPDATE SET 
      role = EXCLUDED.role, 
      permissions = EXCLUDED.permissions;

    -- Marcar como admin no perfil
    UPDATE public.profiles SET is_admin = true WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 4. Reativar o gatilho
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
