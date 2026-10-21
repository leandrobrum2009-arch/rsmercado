
CREATE TABLE public.pos_terminals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.pos_settings (id int PRIMARY KEY DEFAULT 1 CHECK (id=1), supervisor_pin_hash text, blind_close boolean NOT NULL DEFAULT false, divergence_tolerance numeric NOT NULL DEFAULT 5, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.pos_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), terminal_id uuid NOT NULL REFERENCES public.pos_terminals(id), operator_id uuid NOT NULL, status text NOT NULL DEFAULT 'open', opening_amount numeric NOT NULL DEFAULT 0, opened_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz, expected_cash numeric, counted_cash numeric, difference numeric, justification text, summary jsonb);
CREATE UNIQUE INDEX pos_sessions_one_open_per_terminal ON public.pos_sessions(terminal_id) WHERE status='open';
CREATE TABLE public.pos_cash_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.pos_sessions(id), type text NOT NULL, amount numeric NOT NULL, reason text NOT NULL, operator_id uuid NOT NULL, authorized boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.pos_sales (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_number bigserial, session_id uuid NOT NULL REFERENCES public.pos_sessions(id), operator_id uuid NOT NULL, status text NOT NULL, subtotal numeric NOT NULL DEFAULT 0, discount numeric NOT NULL DEFAULT 0, total numeric NOT NULL DEFAULT 0, paid numeric NOT NULL DEFAULT 0, change_amount numeric NOT NULL DEFAULT 0, customer_doc text, draft jsonb, created_at timestamptz NOT NULL DEFAULT now(), finalized_at timestamptz);
CREATE TABLE public.pos_sale_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_id uuid NOT NULL REFERENCES public.pos_sales(id), product_id uuid, name text NOT NULL, code text, quantity numeric NOT NULL, unit_price numeric NOT NULL, discount numeric NOT NULL DEFAULT 0, total numeric NOT NULL);
CREATE TABLE public.pos_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_id uuid NOT NULL REFERENCES public.pos_sales(id), method text NOT NULL, amount numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.pos_audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid, sale_id uuid, user_id uuid, action text NOT NULL, details jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.stock_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL, quantity numeric NOT NULL, type text NOT NULL, ref_id uuid, user_id uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS products_barcode_idx ON public.products(barcode);
CREATE INDEX IF NOT EXISTS products_code_idx ON public.products(code);

GRANT SELECT ON public.pos_terminals, public.pos_sessions, public.pos_cash_movements, public.pos_sales, public.pos_sale_items, public.pos_payments, public.pos_audit_log, public.stock_movements TO authenticated;
GRANT INSERT, UPDATE ON public.pos_terminals TO authenticated;
GRANT ALL ON public.pos_terminals, public.pos_settings, public.pos_sessions, public.pos_cash_movements, public.pos_sales, public.pos_sale_items, public.pos_payments, public.pos_audit_log, public.stock_movements TO service_role;

CREATE OR REPLACE FUNCTION public.pos_can_operate() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_admin() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND ('pos' = ANY(permissions) OR 'pos_supervisor' = ANY(permissions)))
$$;
CREATE OR REPLACE FUNCTION public.pos_is_supervisor() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_admin() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND 'pos_supervisor' = ANY(permissions))
$$;

ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos read terminals" ON public.pos_terminals FOR SELECT TO authenticated USING (public.pos_can_operate());
CREATE POLICY "pos admin terminals ins" ON public.pos_terminals FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "pos admin terminals upd" ON public.pos_terminals FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pos read sessions" ON public.pos_sessions FOR SELECT TO authenticated USING (public.pos_is_supervisor() OR operator_id=auth.uid());
CREATE POLICY "pos read movements" ON public.pos_cash_movements FOR SELECT TO authenticated USING (public.pos_is_supervisor() OR operator_id=auth.uid());
CREATE POLICY "pos read sales" ON public.pos_sales FOR SELECT TO authenticated USING (public.pos_is_supervisor() OR operator_id=auth.uid());
CREATE POLICY "pos read items" ON public.pos_sale_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pos_sales s WHERE s.id=sale_id AND (public.pos_is_supervisor() OR s.operator_id=auth.uid())));
CREATE POLICY "pos read payments" ON public.pos_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pos_sales s WHERE s.id=sale_id AND (public.pos_is_supervisor() OR s.operator_id=auth.uid())));
CREATE POLICY "pos read audit" ON public.pos_audit_log FOR SELECT TO authenticated USING (public.pos_is_supervisor());
CREATE POLICY "pos read stock movements" ON public.stock_movements FOR SELECT TO authenticated USING (public.pos_can_operate());

CREATE OR REPLACE FUNCTION public.pos_check_pin(p_pin text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public, extensions AS $$
DECLARE h text;
BEGIN
  IF NOT public.pos_can_operate() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF public.pos_is_supervisor() THEN RETURN true; END IF;
  SELECT supervisor_pin_hash INTO h FROM public.pos_settings WHERE id=1;
  RETURN h IS NOT NULL AND p_pin IS NOT NULL AND extensions.crypt(p_pin, h) = h;
END $$;

CREATE OR REPLACE FUNCTION public.pos_set_supervisor_pin(p_pin text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, extensions AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF length(coalesce(p_pin,'')) < 4 THEN RAISE EXCEPTION 'PIN deve ter ao menos 4 dígitos'; END IF;
  INSERT INTO public.pos_settings(id, supervisor_pin_hash) VALUES (1, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  ON CONFLICT (id) DO UPDATE SET supervisor_pin_hash=EXCLUDED.supervisor_pin_hash, updated_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.pos_log(p_session uuid, p_sale uuid, p_action text, p_details jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pos_can_operate() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  INSERT INTO public.pos_audit_log(session_id, sale_id, user_id, action, details) VALUES (p_session, p_sale, auth.uid(), left(p_action,60), p_details);
END $$;

CREATE OR REPLACE FUNCTION public.pos_open_session(p_terminal uuid, p_amount numeric) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid;
BEGIN
  IF NOT public.pos_can_operate() THEN RAISE EXCEPTION 'Sem permissão para operar caixa'; END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN RAISE EXCEPTION 'Fundo de troco inválido'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pos_terminals WHERE id=p_terminal AND active) THEN RAISE EXCEPTION 'Terminal inválido ou inativo'; END IF;
  IF EXISTS (SELECT 1 FROM public.pos_sessions WHERE terminal_id=p_terminal AND status='open') THEN RAISE EXCEPTION 'Este terminal já possui um caixa aberto'; END IF;
  INSERT INTO public.pos_sessions(terminal_id, operator_id, opening_amount) VALUES (p_terminal, auth.uid(), round(p_amount,2)) RETURNING id INTO sid;
  INSERT INTO public.pos_audit_log(session_id, user_id, action, details) VALUES (sid, auth.uid(), 'abertura', jsonb_build_object('fundo', p_amount));
  RETURN sid;
END $$;

CREATE OR REPLACE FUNCTION public.pos_assert_session(p_session uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pos_can_operate() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pos_sessions WHERE id=p_session AND status='open' AND (operator_id=auth.uid() OR public.pos_is_supervisor())) THEN
    RAISE EXCEPTION 'Sessão de caixa não está aberta para este operador';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.pos_add_movement(p_session uuid, p_type text, p_amount numeric, p_reason text, p_pin text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE needs_auth boolean;
BEGIN
  PERFORM public.pos_assert_session(p_session);
  IF p_type NOT IN ('suprimento','sangria','retirada','reforco') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Valor deve ser maior que zero'; END IF;
  IF length(trim(coalesce(p_reason,''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  needs_auth := p_type IN ('sangria','retirada');
  IF needs_auth AND NOT public.pos_check_pin(p_pin) THEN RAISE EXCEPTION 'Autorização do supervisor inválida'; END IF;
  INSERT INTO public.pos_cash_movements(session_id, type, amount, reason, operator_id, authorized) VALUES (p_session, p_type, round(p_amount,2), p_reason, auth.uid(), needs_auth);
  INSERT INTO public.pos_audit_log(session_id, user_id, action, details) VALUES (p_session, auth.uid(), 'movimento_'||p_type, jsonb_build_object('valor', p_amount, 'motivo', p_reason));
END $$;

CREATE OR REPLACE FUNCTION public.pos_unit_price(p public.products) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p.promo_price IS NOT NULL AND p.promo_price > 0 AND p.promo_price < p.price THEN p.promo_price ELSE p.price END
$$;

CREATE OR REPLACE FUNCTION public.pos_finalize_sale(p_session uuid, p_items jsonb, p_sale_discount numeric, p_payments jsonb, p_customer_doc text, p_pin text, p_suspended_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE it jsonb; pr public.products; v_sale uuid; v_num bigint; q numeric; d numeric; up numeric; line numeric;
  v_sub numeric := 0; v_itemdisc numeric := 0; v_total numeric; v_paid numeric := 0; v_cash numeric := 0; v_change numeric; pay jsonb;
BEGIN
  PERFORM public.pos_assert_session(p_session);
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Venda sem itens'; END IF;
  p_sale_discount := coalesce(p_sale_discount,0);
  IF p_sale_discount < 0 THEN RAISE EXCEPTION 'Desconto inválido'; END IF;
  INSERT INTO public.pos_sales(session_id, operator_id, status, customer_doc) VALUES (p_session, auth.uid(), 'processing', nullif(trim(p_customer_doc),'')) RETURNING id, sale_number INTO v_sale, v_num;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO pr FROM public.products WHERE id=(it->>'product_id')::uuid AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    IF NOT coalesce(pr.active,true) OR NOT coalesce(pr.is_available,true) THEN RAISE EXCEPTION 'Produto indisponível: %', pr.name; END IF;
    q := (it->>'quantity')::numeric; d := coalesce((it->>'discount')::numeric,0);
    IF q IS NULL OR q <= 0 THEN RAISE EXCEPTION 'Quantidade inválida para %', pr.name; END IF;
    IF NOT coalesce(pr.is_weight_based,false) AND q <> trunc(q) THEN RAISE EXCEPTION '% não aceita quantidade fracionada', pr.name; END IF;
    up := public.pos_unit_price(pr); line := round(up*q,2);
    IF d < 0 OR d > line THEN RAISE EXCEPTION 'Desconto inválido em %', pr.name; END IF;
    INSERT INTO public.pos_sale_items(sale_id, product_id, name, code, quantity, unit_price, discount, total) VALUES (v_sale, pr.id, pr.name, coalesce(pr.barcode, pr.code, pr.sku), q, up, round(d,2), line-round(d,2));
    UPDATE public.products SET stock = stock - q WHERE id=pr.id;
    INSERT INTO public.stock_movements(product_id, quantity, type, ref_id, user_id) VALUES (pr.id, -q, 'venda_pdv', v_sale, auth.uid());
    v_sub := v_sub + line; v_itemdisc := v_itemdisc + round(d,2);
  END LOOP;
  IF (v_itemdisc + p_sale_discount) > 0 AND NOT public.pos_check_pin(p_pin) THEN RAISE EXCEPTION 'Desconto exige autorização do supervisor'; END IF;
  v_total := round(v_sub - v_itemdisc - p_sale_discount, 2);
  IF v_total < 0 THEN RAISE EXCEPTION 'Desconto maior que o total'; END IF;
  FOR pay IN SELECT * FROM jsonb_array_elements(coalesce(p_payments,'[]'::jsonb)) LOOP
    IF pay->>'method' NOT IN ('dinheiro','pix','debito','credito') THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;
    IF (pay->>'amount')::numeric <= 0 THEN RAISE EXCEPTION 'Valor de pagamento inválido'; END IF;
    v_paid := v_paid + round((pay->>'amount')::numeric,2);
    IF pay->>'method'='dinheiro' THEN v_cash := v_cash + round((pay->>'amount')::numeric,2); END IF;
    INSERT INTO public.pos_payments(sale_id, method, amount) VALUES (v_sale, pay->>'method', round((pay->>'amount')::numeric,2));
  END LOOP;
  IF v_paid < v_total THEN RAISE EXCEPTION 'Pagamento insuficiente (faltam R$ %)', v_total - v_paid; END IF;
  v_change := v_paid - v_total;
  IF v_change > v_cash THEN RAISE EXCEPTION 'Troco só pode ser dado sobre pagamento em dinheiro'; END IF;
  UPDATE public.pos_sales SET status='completed', subtotal=v_sub, discount=v_itemdisc+p_sale_discount, total=v_total, paid=v_paid, change_amount=v_change, finalized_at=now() WHERE id=v_sale;
  IF p_suspended_id IS NOT NULL THEN UPDATE public.pos_sales SET status='recovered' WHERE id=p_suspended_id AND status='suspended'; END IF;
  INSERT INTO public.pos_audit_log(session_id, sale_id, user_id, action, details) VALUES (p_session, v_sale, auth.uid(), 'venda_finalizada', jsonb_build_object('total', v_total));
  RETURN jsonb_build_object('sale_id', v_sale, 'sale_number', v_num, 'subtotal', v_sub, 'discount', v_itemdisc+p_sale_discount, 'total', v_total, 'paid', v_paid, 'change', v_change);
END $$;

CREATE OR REPLACE FUNCTION public.pos_suspend_sale(p_session uuid, p_draft jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v uuid;
BEGIN
  PERFORM public.pos_assert_session(p_session);
  INSERT INTO public.pos_sales(session_id, operator_id, status, draft) VALUES (p_session, auth.uid(), 'suspended', p_draft) RETURNING id INTO v;
  INSERT INTO public.pos_audit_log(session_id, sale_id, user_id, action) VALUES (p_session, v, auth.uid(), 'venda_suspensa');
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.pos_discard_suspended(p_sale uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s uuid;
BEGIN
  SELECT session_id INTO s FROM public.pos_sales WHERE id=p_sale AND status='suspended';
  IF s IS NULL THEN RAISE EXCEPTION 'Venda suspensa não encontrada'; END IF;
  PERFORM public.pos_assert_session(s);
  UPDATE public.pos_sales SET status='cancelled' WHERE id=p_sale;
  INSERT INTO public.pos_audit_log(session_id, sale_id, user_id, action) VALUES (s, p_sale, auth.uid(), 'suspensa_cancelada');
END $$;

CREATE OR REPLACE FUNCTION public.pos_session_totals(p_session uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; open_amt numeric; sales_total numeric; sales_count int; cash_in numeric; mv jsonb; bypay jsonb; sup numeric; out_ numeric;
BEGIN
  SELECT opening_amount INTO open_amt FROM public.pos_sessions WHERE id=p_session;
  SELECT coalesce(sum(total),0), count(*) INTO sales_total, sales_count FROM public.pos_sales WHERE session_id=p_session AND status='completed';
  SELECT coalesce(jsonb_object_agg(method, amt),'{}'::jsonb) INTO bypay FROM (SELECT p.method, sum(p.amount) amt FROM public.pos_payments p JOIN public.pos_sales s ON s.id=p.sale_id WHERE s.session_id=p_session AND s.status='completed' GROUP BY p.method) x;
  SELECT coalesce(sum(p.amount),0) - coalesce((SELECT sum(change_amount) FROM public.pos_sales WHERE session_id=p_session AND status='completed'),0) INTO cash_in FROM public.pos_payments p JOIN public.pos_sales s ON s.id=p.sale_id WHERE s.session_id=p_session AND s.status='completed' AND p.method='dinheiro';
  SELECT coalesce(sum(amount) FILTER (WHERE type IN ('suprimento','reforco')),0), coalesce(sum(amount) FILTER (WHERE type IN ('sangria','retirada')),0) INTO sup, out_ FROM public.pos_cash_movements WHERE session_id=p_session;
  RETURN jsonb_build_object('fundo', open_amt, 'vendas', sales_total, 'qtd_vendas', sales_count, 'por_pagamento', bypay, 'suprimentos', sup, 'sangrias', out_,
    'cancelamentos', (SELECT count(*) FROM public.pos_audit_log WHERE session_id=p_session AND action IN ('item_cancelado','venda_cancelada')),
    'dinheiro_esperado', round(open_amt + cash_in + sup - out_, 2));
END $$;

CREATE OR REPLACE FUNCTION public.pos_session_summary(p_session uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE st text; blind boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pos_sessions WHERE id=p_session AND (operator_id=auth.uid() OR public.pos_is_supervisor())) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT status INTO st FROM public.pos_sessions WHERE id=p_session;
  SELECT coalesce(blind_close,false) INTO blind FROM public.pos_settings WHERE id=1;
  IF st='open' AND coalesce(blind,false) AND NOT public.pos_is_supervisor() THEN
    RETURN public.pos_session_totals(p_session) - 'dinheiro_esperado' || jsonb_build_object('cego', true);
  END IF;
  RETURN public.pos_session_totals(p_session);
END $$;

CREATE OR REPLACE FUNCTION public.pos_close_session(p_session uuid, p_counted numeric, p_justification text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t jsonb; exp numeric; diff numeric; tol numeric;
BEGIN
  PERFORM public.pos_assert_session(p_session);
  IF p_counted IS NULL OR p_counted < 0 THEN RAISE EXCEPTION 'Valor contado inválido'; END IF;
  IF EXISTS (SELECT 1 FROM public.pos_sales WHERE session_id=p_session AND status='suspended') THEN RAISE EXCEPTION 'Existem vendas suspensas. Recupere ou cancele antes de fechar'; END IF;
  t := public.pos_session_totals(p_session); exp := (t->>'dinheiro_esperado')::numeric; diff := round(p_counted - exp, 2);
  SELECT coalesce(divergence_tolerance,5) INTO tol FROM public.pos_settings WHERE id=1; tol := coalesce(tol,5);
  IF abs(diff) > tol AND length(trim(coalesce(p_justification,''))) < 5 THEN RAISE EXCEPTION 'Divergência de R$ % exige justificativa', diff; END IF;
  UPDATE public.pos_sessions SET status='closed', closed_at=now(), expected_cash=exp, counted_cash=round(p_counted,2), difference=diff, justification=nullif(trim(p_justification),''), summary=t WHERE id=p_session;
  INSERT INTO public.pos_audit_log(session_id, user_id, action, details) VALUES (p_session, auth.uid(), 'fechamento', jsonb_build_object('esperado', exp, 'contado', p_counted, 'diferenca', diff));
  RETURN t || jsonb_build_object('contado', p_counted, 'diferenca', diff);
END $$;

CREATE OR REPLACE FUNCTION public.pos_set_barcode(p_product uuid, p_barcode text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pos_is_supervisor() THEN RAISE EXCEPTION 'Apenas supervisor/administrador'; END IF;
  IF length(trim(coalesce(p_barcode,''))) < 4 THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF EXISTS (SELECT 1 FROM public.products WHERE barcode=trim(p_barcode) AND id<>p_product AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Código já vinculado a outro produto'; END IF;
  UPDATE public.products SET barcode=trim(p_barcode) WHERE id=p_product;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'vinculo_codigo', jsonb_build_object('produto', p_product, 'codigo', p_barcode));
END $$;

REVOKE ALL ON FUNCTION public.pos_session_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pos_unit_price(public.products) FROM anon;
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['pos_can_operate()','pos_is_supervisor()','pos_check_pin(text)','pos_set_supervisor_pin(text)','pos_log(uuid,uuid,text,jsonb)','pos_open_session(uuid,numeric)','pos_assert_session(uuid)','pos_add_movement(uuid,text,numeric,text,text)','pos_finalize_sale(uuid,jsonb,numeric,jsonb,text,text,uuid)','pos_suspend_sale(uuid,jsonb)','pos_discard_suspended(uuid)','pos_session_summary(uuid)','pos_close_session(uuid,numeric,text)','pos_set_barcode(uuid,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
