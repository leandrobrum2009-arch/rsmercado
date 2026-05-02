-- Function to securely promote the first admin
CREATE OR REPLACE FUNCTION promote_to_admin(secret_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_already_admin BOOLEAN;
    system_secret TEXT := 'SETUP_ADMIN_2024';
BEGIN
    -- 1. Check if the key is correct
    IF secret_key != system_secret THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chave de segurança inválida');
    END IF;

    -- 2. Check if the user is already an admin
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) INTO is_already_admin;

    IF is_already_admin THEN
        RETURN jsonb_build_object('success', true, 'message', 'Você já é um administrador');
    END IF;

    -- 3. Insert the user into user_roles
    INSERT INTO user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    RETURN jsonb_build_object('success', true, 'message', 'Promovido a administrador com sucesso');
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION promote_to_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_admin(TEXT) TO anon;

-- Tighten user_roles RLS: Only admins can manage, everyone authenticated can read their own
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);
