 -- 🛠️ Migration: Criar Histórico de Alertas
 CREATE TABLE IF NOT EXISTS public.alert_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     message TEXT NOT NULL,
     type TEXT NOT NULL,
     target_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     created_by UUID REFERENCES auth.users(id)
 );
 
 ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;
 
 DROP POLICY IF EXISTS "Admins manage alert logs" ON public.alert_logs;
 CREATE POLICY "Admins manage alert logs" ON public.alert_logs 
 FOR ALL USING (
     EXISTS (
         SELECT 1 FROM public.user_roles 
         WHERE user_id = auth.uid() AND role = 'admin'
     ) OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
 );