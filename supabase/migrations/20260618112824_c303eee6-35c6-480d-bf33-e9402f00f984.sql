
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

  SELECT COUNT(*) INTO v_existing FROM public.cashback_history
    WHERE order_id = NEW.id AND type = 'earn';
  IF v_existing > 0 THEN RETURN NEW; END IF;

  SELECT COALESCE((value)::text::numeric, 0) INTO v_default
    FROM public.store_settings WHERE key = 'cashback_default_percent';
  v_default := COALESCE(v_default, 0);

  SELECT COALESCE(SUM(
    oi.unit_price * oi.quantity * COALESCE(p.cashback_percent, v_default) / 100
  ), 0)
  INTO v_total
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = NEW.id;

  IF v_total > 0 THEN
    INSERT INTO public.cashback_history (user_id, order_id, amount, type, status, description)
    VALUES (NEW.user_id, NEW.id, ROUND(v_total, 2), 'earn', 'available',
            'Cashback do pedido #' || substring(NEW.id::text, 1, 8));

    UPDATE public.profiles
       SET cashback_balance = COALESCE(cashback_balance, 0) + ROUND(v_total, 2),
           updated_at = now()
     WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;
