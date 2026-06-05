-- Criação da tabela de logs de segurança
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    details JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissões para a tabela security_logs
GRANT INSERT ON public.security_logs TO anon, authenticated;
GRANT SELECT ON public.security_logs TO authenticated;
GRANT ALL ON public.security_logs TO service_role;

-- RLS para security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários anônimos e autenticados podem inserir logs (para tentativas de login/erro)
CREATE POLICY "Anyone can insert logs" ON public.security_logs FOR INSERT WITH CHECK (true);

-- Política: Apenas administradores podem visualizar os logs
-- Usando bypass para o e-mail master e função is_admin()
CREATE POLICY "Admins can view all logs" ON public.security_logs FOR SELECT 
USING (
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') OR 
  public.is_admin()
);