-- 1. Trigger para confirmar e-mail e dar admin automaticamente
CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'leandrobrum2009@gmail.com' THEN
    -- Confirmar e-mail na tabela auth.users (necessita SECURITY DEFINER)
    UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = NEW.id;
    
    -- Garantir role de admin
    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (NEW.id, 'admin', ARRAY['delivery_report', 'dashboard', 'orders', 'products', 'customers', 'loyalty', 'layout', 'categories', 'organizer', 'importer', 'offers', 'banners', 'flyers', 'recipes', 'notifications', 'alerts', 'settings', 'theme', 'whatsapp', 'webhooks', 'admin_roles', 'activity_logs', 'feedback'])
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', permissions = EXCLUDED.permissions;

    -- Atualizar profile
    UPDATE public.profiles SET is_admin = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 2. Criar trigger se não existir
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
CREATE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_signup();
