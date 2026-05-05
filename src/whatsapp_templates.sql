 -- Table for storing WhatsApp message templates
 CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     content TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 
 -- Enable RLS
 ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
 
 -- Policies
 CREATE POLICY "Admins can manage templates" ON public.whatsapp_templates
     FOR ALL USING (public.is_admin());