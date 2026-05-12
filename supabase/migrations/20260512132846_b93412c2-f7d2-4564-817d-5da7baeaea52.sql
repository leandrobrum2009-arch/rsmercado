-- 1. Ensure profiles table has is_admin column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create WhatsApp tables if they don't exist
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    message_text TEXT,
    message_hash TEXT,
    campaign_id UUID,
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    method TEXT DEFAULT 'api',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist in whatsapp_logs if it already existed
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'api';

-- 3. Ensure notifications table is correct
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- 4. Robust is_admin function
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth 
AS $$
BEGIN
  -- 1. Master bypass
  IF (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- 2. Check roles table
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Check profiles table (legacy/alternative)
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END; $$;

-- 5. notify_all_users with support for both sets of parameter names
-- We use positional arguments to handle both p_title and title
CREATE OR REPLACE FUNCTION public.notify_all_users(
  p_title TEXT DEFAULT NULL, 
  p_message TEXT DEFAULT NULL, 
  p_type TEXT DEFAULT 'info', 
  p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  title TEXT DEFAULT NULL,
  message TEXT DEFAULT NULL,
  type TEXT DEFAULT NULL
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_scheduled_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Security check
  IF NOT public.is_admin() AND (auth.jwt() ->> 'email' != 'leandrobrum2009@gmail.com') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem enviar notificações para todos.';
  END IF;

  -- Pick parameters
  v_title := COALESCE(p_title, title);
  v_message := COALESCE(p_message, message);
  v_type := COALESCE(p_type, type, 'info');
  v_scheduled_at := p_scheduled_at;

  IF v_title IS NULL OR v_message IS NULL THEN
    RAISE EXCEPTION 'Título e mensagem são obrigatórios.';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, scheduled_at, created_at)
  SELECT id, v_title, v_message, v_type, v_scheduled_at, NOW() FROM auth.users;
END; $$;

-- 6. Enable RLS and set policies for new tables
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage templates" ON public.whatsapp_templates;
CREATE POLICY "Admin manage templates" ON public.whatsapp_templates FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins view whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Admins view whatsapp logs" ON public.whatsapp_logs FOR SELECT USING (public.is_admin());
