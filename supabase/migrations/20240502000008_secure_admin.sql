-- Create a more secure roles system
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin', 'user'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Only Admins can manage roles
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Users can view their own role
CREATE POLICY "Users can view their own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);

-- Migrate existing admins
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM profiles WHERE is_admin = true
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Update previous policies to use the new roles table instead of profiles column
DROP POLICY IF EXISTS "Admins can do everything on categories" ON categories;
CREATE POLICY "Admins can do everything on categories" ON categories FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can do everything on products" ON products;
CREATE POLICY "Admins can do everything on products" ON products FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can do everything on news" ON news;
CREATE POLICY "Admins can do everything on news" ON news FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can do everything on store_settings" ON store_settings;
CREATE POLICY "Admins can do everything on store_settings" ON store_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Remove the vulnerable column (optional but recommended for security)
-- ALTER TABLE profiles DROP COLUMN is_admin;
