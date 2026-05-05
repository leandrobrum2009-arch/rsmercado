-- Add permissions column to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';

-- Update Leandro Brum to have all permissions by default
UPDATE user_roles 
SET permissions = '["delivery_report", "dashboard", "orders", "products", "customers", "loyalty", "layout", "categories", "importer", "offers", "banners", "flyers", "recipes", "notifications", "alerts", "settings", "whatsapp", "webhooks"]'
WHERE user_id IN (SELECT id FROM profiles WHERE email = 'leandrobrum2009@gmail.com');

-- Also ensure any other admin has at least dashboard access if none defined
UPDATE user_roles 
SET permissions = '["dashboard"]'
WHERE role = 'admin' AND (permissions IS NULL OR permissions::text = '[]');
