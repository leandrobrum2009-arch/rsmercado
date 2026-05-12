-- 1. Tabelas de Fidelidade
CREATE TABLE IF NOT EXISTS public.points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'earn', 'redeem', 'admin_adjustment'
    description TEXT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.loyalty_rewards(id),
    status TEXT DEFAULT 'pending',
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
DROP POLICY IF EXISTS "Users view own points history" ON public.points_history;
CREATE POLICY "Users view own points history" ON public.points_history 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all points history" ON public.points_history;
CREATE POLICY "Admins view all points history" ON public.points_history 
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Users view own redemptions" ON public.loyalty_redemptions;
CREATE POLICY "Users view own redemptions" ON public.loyalty_redemptions 
FOR SELECT USING (auth.uid() = user_id);

-- 4. Função para creditar pontos
CREATE OR REPLACE FUNCTION public.handle_order_delivered_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $BODY$
BEGIN
  -- Se o status mudou para 'delivered' e há pontos para ganhar
  IF (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered')) THEN
    IF (NEW.points_earned IS NOT NULL AND NEW.points_earned > 0 AND NEW.user_id IS NOT NULL) THEN
      -- Atualiza o saldo no perfil
      UPDATE public.profiles 
      SET points_balance = COALESCE(points_balance, 0) + NEW.points_earned,
          updated_at = NOW()
      WHERE id = NEW.user_id;
      
      -- Registra no histórico
      INSERT INTO public.points_history (user_id, points, type, description, order_id)
      VALUES (NEW.user_id, NEW.points_earned, 'earn', 'Pontos do pedido #' || substring(NEW.id::text, 1, 8), NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $BODY$;

-- 5. Vincular Gatilho de Pontos
DROP TRIGGER IF EXISTS on_order_delivered_points ON public.orders;
CREATE TRIGGER on_order_delivered_points
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_delivered_points();

-- 6. Garantir colunas extras em perfis se necessário
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
