-- Adicionar colunas faltantes na tabela de perfis
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS household_status TEXT;

-- Adicionar restrições de validação (Segurança de Entrada)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS check_birth_date;

ALTER TABLE profiles
ADD CONSTRAINT check_birth_date CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE);

-- Proteção contra escalação de privilégios (PUBLIC_DATA_EXPOSURE / CLIENT_SIDE_AUTH)
CREATE OR REPLACE FUNCTION protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
        NEW.is_admin := OLD.is_admin;
        NEW.points_balance := OLD.points_balance;
        NEW.loyalty_tier := OLD.loyalty_tier;
        NEW.id := OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_protect_profile_sensitive_fields ON profiles;
CREATE TRIGGER trigger_protect_profile_sensitive_fields
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_profile_sensitive_fields();
