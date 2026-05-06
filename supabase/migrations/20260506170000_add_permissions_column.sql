-- Add permissions column to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Sync permissions: give all permissions to existing admins for backward compatibility
UPDATE public.user_roles 
SET permissions = '["dashboard", "delivery_report", "orders", "products", "offers", "customers", "categories", "loyalty", "layout", "importer", "banners", "flyers", "recipes", "notifications", "alerts", "settings", "whatsapp", "webhooks"]'::jsonb
WHERE role = 'admin' AND (permissions IS NULL OR permissions = '[]'::jsonb);

-- Reload schema
NOTIFY pgrst, 'reload schema';
