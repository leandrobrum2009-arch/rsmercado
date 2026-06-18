
-- 1. Coluna de cashback nos produtos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cashback_percent NUMERIC(5,2);

-- 2. Saldo de cashback no perfil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cashback_balance NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 3. Padrão global em store_settings
INSERT INTO public.store_settings (key, value)
VALUES ('cashback_default_percent', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Tabela de histórico
CREATE TABLE IF NOT EXISTS public.cashback_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'earn', -- earn | redeem | adjust
  status TEXT NOT NULL DEFAULT 'available', -- available | pending | reversed
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cashback_history TO authenticated;
GRANT ALL ON public.cashback_history TO service_role;

ALTER TABLE public.cashback_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own cashback" ON public.cashback_history;
CREATE POLICY "Users view own cashback" ON public.cashback_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage cashback" ON public.cashback_history;
CREATE POLICY "Admins manage cashback" ON public.cashback_history
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS cashback_history_user_idx ON public.cashback_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cashback_history_order_idx ON public.cashback_history(order_id);

-- 5. Função: credita cashback ao entregar o pedido
CREATE OR REPLACE FUNCTION public.award_cashback_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default NUMERIC;
  v_total NUMERIC := 0;
  v_existing INT;
BEGIN
  IF NEW.status <> 'delivered' THEN RETURN NEW; END IF;
  IF OLD.status = 'delivered' THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- evita duplicar crédito
  SELECT COUNT(*) INTO v_existing FROM public.cashback_history
    WHERE order_id = NEW.id AND type = 'earn';
  IF v_existing > 0 THEN RETURN NEW; END IF;

  SELECT COALESCE((value)::text::numeric, 0) INTO v_default
    FROM public.store_settings WHERE key = 'cashback_default_percent';
  v_default := COALESCE(v_default, 0);

  SELECT COALESCE(SUM(
    oi.price * oi.quantity * COALESCE(p.cashback_percent, v_default) / 100
  ), 0)
  INTO v_total
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = NEW.id;

  IF v_total > 0 THEN
    INSERT INTO public.cashback_history (user_id, order_id, amount, type, status, description)
    VALUES (NEW.user_id, NEW.id, v_total, 'earn', 'available',
            'Cashback do pedido #' || substring(NEW.id::text, 1, 8));

    UPDATE public.profiles
       SET cashback_balance = COALESCE(cashback_balance, 0) + v_total,
           updated_at = now()
     WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_cashback ON public.orders;
CREATE TRIGGER trg_award_cashback
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.award_cashback_on_delivery();
