-- 1. Colunas faltantes em orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- 2. Garantir email em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Atualizar gatilho para ser "Retroativo" (Recupera dados do backup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  old_profile_id UUID;
BEGIN
  -- Tenta encontrar um perfil antigo pelo e-mail
  SELECT id INTO old_profile_id FROM public.profiles WHERE email = NEW.email LIMIT 1;

  IF old_profile_id IS NOT NULL THEN
    -- Se encontrou, "transfere" os dados para o novo ID e remove o antigo (ou apenas atualiza o ID)
    -- Mas como ID é PK e referenciado, é melhor atualizar o ID do perfil existente
    UPDATE public.profiles 
    SET id = NEW.id,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url)
    WHERE id = old_profile_id;
  ELSE
    -- Se não encontrou, cria um novo
    INSERT INTO public.profiles (id, full_name, avatar_url, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.email
    );
  END IF;

  -- Lógica de administrador (Permanece igual)
  IF NEW.email = 'leandrobrum2009@gmail.com' THEN
    UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (NEW.id, 'admin', ARRAY['delivery_report', 'dashboard', 'orders', 'products', 'customers', 'loyalty', 'layout', 'categories', 'organizer', 'importer', 'offers', 'banners', 'flyers', 'recipes', 'notifications', 'alerts', 'settings', 'theme', 'whatsapp', 'webhooks', 'admin_roles', 'activity_logs', 'feedback'])
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions;
    UPDATE public.profiles SET is_admin = true WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
