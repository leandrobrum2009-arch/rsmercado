-- 1. Create user_addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT DEFAULT 'Casa',
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    recipient_name TEXT,
    contact_phone TEXT,
    reference_point TEXT,
    observations TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_addresses
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_addresses' AND policyname='Users can manage their own addresses') THEN
    CREATE POLICY "Users can manage their own addresses" ON public.user_addresses FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Security Hardening: Remove hardcoded secrets from RPCs
-- Re-create promote_to_admin without hardcoded secret
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_secret TEXT;
BEGIN
  -- Get secret from store_settings instead of hardcoded
  SELECT (value->>'secret')::TEXT INTO stored_secret 
  FROM public.store_settings 
  WHERE key = 'admin_setup_secret';

  -- If no secret is configured, deny by default
  IF stored_secret IS NULL OR stored_secret = '' THEN
    RAISE EXCEPTION 'Admin setup secret not configured in store_settings';
  END IF;

  IF secret_key != stored_secret THEN
    RAISE EXCEPTION 'Invalid secret key';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  -- Sync profiles
  UPDATE public.profiles SET is_admin = true WHERE id = auth.uid();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create confirm_user_email without hardcoded secret
CREATE OR REPLACE FUNCTION public.confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_secret TEXT;
BEGIN
  SELECT (value->>'secret')::TEXT INTO stored_secret 
  FROM public.store_settings 
  WHERE key = 'admin_setup_secret';

  IF stored_secret IS NULL OR stored_secret = '' THEN
    RAISE EXCEPTION 'Admin setup secret not configured in store_settings';
  END IF;

  IF secret_key != stored_secret THEN
    RAISE EXCEPTION 'Invalid secret key';
  END IF;

  UPDATE auth.users 
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW()
  WHERE email = email_to_confirm;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

-- 3. Ensure RLS on all sensitive tables
ALTER TABLE IF EXISTS public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policies for WhatsApp logs/templates if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='whatsapp_logs' AND policyname='Admins can view logs') THEN
      CREATE POLICY "Admins can view logs" ON public.whatsapp_logs FOR SELECT USING (public.is_admin());
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_templates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='whatsapp_templates' AND policyname='Admins manage templates') THEN
      CREATE POLICY "Admins manage templates" ON public.whatsapp_templates FOR ALL USING (public.is_admin());
    END IF;
  END IF;
END $$;
