INSERT INTO public.store_settings (key, value)
VALUES 
  ('whatsapp', '"5521996509905"'),
  ('admin_whatsapp', '"5521996509905"'),
  ('external_notification_config', '{"whatsapp_enabled": true, "sms_enabled": false, "call_enabled": false}')
ON CONFLICT (key) DO NOTHING;
