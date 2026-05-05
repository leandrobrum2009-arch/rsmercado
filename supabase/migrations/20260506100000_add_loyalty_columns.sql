-- Adicionar coluna de pontos de fidelidade na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Remover gatilho de proteção se ele existir (conforme solicitado para retirar essa parte)
DROP TRIGGER IF EXISTS trigger_protect_profile_sensitive_fields ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_sensitive_fields();

-- Notificar recarregamento do schema para o PostgREST
NOTIFY pgrst, 'reload schema';
