-- Adicionar colunas de fidelidade e perfil na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS household_status TEXT;

-- Notificar recarregamento do schema para o PostgREST
NOTIFY pgrst, 'reload schema';

-- Proteção de Campos Sensíveis (Segurança)
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_admin() THEN
        NEW.is_admin := OLD.is_admin;
        NEW.loyalty_points := OLD.loyalty_points;
        NEW.points_balance := OLD.points_balance;
        NEW.loyalty_tier := OLD.loyalty_tier;
        NEW.id := OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trigger_protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- Notificar recarregamento do schema para o PostgREST
NOTIFY pgrst, 'reload schema';
