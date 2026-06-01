-- 1. Limpar e restaurar store_settings com os dados do projeto original
DELETE FROM public.store_settings;

INSERT INTO public.store_settings (key, value) VALUES 
('site_name', '"Família RS Supermercados"'),
('logo_url', '"https://woelvkuxkkhvausaoudk.supabase.co/storage/v1/object/public/banners/store/dj44tyykf8v.png"'),
('color_palette', '{"primary": "#218014", "secondary": "#fff70a"}'),
('store_description', '" Família RS Supermercados"'),
('address', '"Av. Principal, 500 - Centro -Água Quente"'),
('whatsapp', '"5521976643152"'),
('admin_whatsapp', '"5521976643152"'),
('opening_hours', '"De seg a sáb das 8h às 21h e dom das 8h às 14h"'),
('instagram_url', '"https://www.instagram.com/familiarssupermercado/"'),
('logo_height_mobile', '"53"'),
('logo_height_desktop', '"132"'),
('logo_offset_y', '"11"'),
('points_multiplier', '{"points_per_real": 1}'),
('instagram_post_count', '"6"'),
('pix_config', '{"key": "21996509905", "enabled": true, "merchant_city": "Niterói", "merchant_name": "LEANDRO BRUM"}'),
('social_proof_settings', '{"enabled": true, "interval": 40000, "schedule": [{"day": "todos", "end": "22:00", "start": "08:00", "intensity": 1}], "show_carts": true, "show_stock": true, "frequencies": {"cart": 2, "level": 3, "share": 2, "stock": 3, "coupon": 2, "payment": 3, "viewers": 5, "purchase": 5, "wishlist": 2, "delivered": 3, "registration": 2}, "show_levels": true, "show_shares": true, "realistic_ai": true, "show_coupons": true, "show_viewers": true, "show_payments": true, "time_template": "agora mesmo", "level_template": "{name} subiu para o nível {level}!", "max_per_minute": 2, "show_delivered": true, "show_purchases": true, "show_wishlists": true, "stock_template": "Este produto \"{product}\" está acabando! Restam apenas {stock} unidades.", "max_per_session": 3, "payment_template": "Pagamento confirmado para o pedido de {name}!", "viewers_template": "{count} pessoas visualizando produtos no site agora", "purchase_template": "{name} acabou de fazer uma compra no bairro {neighborhood}", "delivered_template": "{name} já recebeu suas compras em casa!", "show_registrations": true}'),
('external_notification_config', '{"sms_from": "", "sms_api_key": "", "sms_enabled": false, "call_api_key": "", "call_enabled": false, "sms_provider": "twilio", "call_provider": "totalvoice", "sms_api_secret": "", "call_admin_phone": "", "call_tts_message": "Você recebeu um novo pedido no Supermercado!", "whatsapp_enabled": true}');

-- 2. Garantir permissões de administrador no banco para o e-mail do usuário
-- (Mesmo que o usuário ainda não tenha cadastrado no novo Auth, os triggers e políticas cuidam disso)
DO $$ 
BEGIN
    -- Atualizar função is_admin para ser resiliente
    CREATE OR REPLACE FUNCTION public.is_admin() 
    RETURNS BOOLEAN 
    LANGUAGE plpgsql 
    SECURITY DEFINER 
    SET search_path = public, auth 
    AS $body$
    BEGIN
      -- Master bypass pelo e-mail (JWT)
      IF (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') THEN
        RETURN TRUE;
      END IF;
  
      -- Verificação na tabela de roles
      RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      );
    END; $body$;

    -- Conceder permissão de execução
    GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
END $$;
