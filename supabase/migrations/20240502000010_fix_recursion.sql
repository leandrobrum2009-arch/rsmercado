-- Fix infinite recursion in user_roles policy
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);
-- Note: Even the above can recurse in some PG versions. 
-- Best practice is a function or using a separate table/check.

-- Safer approach:
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (
    role = 'admin' AND user_id = auth.uid()
);
-- Wait, the above only lets admin manage THEIR OWN role.

-- Correct Admin Policy:
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (is_admin());
