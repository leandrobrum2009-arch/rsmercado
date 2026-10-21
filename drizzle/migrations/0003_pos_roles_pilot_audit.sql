CREATE OR REPLACE FUNCTION public.pos_has(p_perm text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_admin() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND p_perm = ANY(coalesce(permissions,'{}')))
$$;
CREATE OR REPLACE FUNCTION public.pos_can_audit() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.pos_is_supervisor() OR public.pos_has('pos_audit')
$$;
CREATE OR REPLACE FUNCTION public.pos_can_fiscal() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_admin() OR public.pos_has('pos_fiscal')
$$;
GRANT EXECUTE ON FUNCTION public.pos_has(text), public.pos_can_audit(), public.pos_can_fiscal() TO authenticated;

ALTER TABLE public.pos_terminals ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.pos_terminals ADD COLUMN IF NOT EXISTS production_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.pos_terminals ADD COLUMN IF NOT EXISTS activated_by uuid;
ALTER TABLE public.pos_terminals ADD COLUMN IF NOT EXISTS activated_at timestamptz;
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS pos_sales_created_test_idx ON public.pos_sales(created_at, is_test);

CREATE POLICY "audit read sessions" ON public.pos_sessions FOR SELECT TO authenticated USING (public.pos_can_audit());
CREATE POLICY "audit read movements" ON public.pos_cash_movements FOR SELECT TO authenticated USING (public.pos_can_audit());
CREATE POLICY "audit read sales" ON public.pos_sales FOR SELECT TO authenticated USING (public.pos_can_audit());
CREATE POLICY "audit read items" ON public.pos_sale_items FOR SELECT TO authenticated USING (public.pos_can_audit());
CREATE POLICY "audit read payments" ON public.pos_payments FOR SELECT TO authenticated USING (public.pos_can_audit());
CREATE POLICY "audit read log" ON public.pos_audit_log FOR SELECT TO authenticated USING (public.pos_can_audit());
CREATE POLICY "audit read returns" ON public.pos_returns FOR SELECT TO authenticated USING (public.pos_can_audit());
CREATE POLICY "audit read price hist" ON public.product_price_history FOR SELECT TO authenticated USING (public.pos_can_audit());
CREATE POLICY "audit read fiscal docs" ON public.fiscal_documents FOR SELECT TO authenticated USING (public.pos_can_audit() OR public.pos_can_fiscal());
CREATE POLICY "audit read terminals" ON public.pos_terminals FOR SELECT TO authenticated USING (public.pos_can_audit());
CREATE POLICY "stock read movements" ON public.stock_movements FOR SELECT TO authenticated USING (public.pos_has('pos_stock') OR public.pos_can_audit());
CREATE POLICY "fiscal cfg sel" ON public.fiscal_config FOR SELECT TO authenticated USING (public.pos_can_fiscal());
CREATE POLICY "fiscal cfg ins" ON public.fiscal_config FOR INSERT TO authenticated WITH CHECK (public.pos_can_fiscal());
CREATE POLICY "fiscal cfg upd" ON public.fiscal_config FOR UPDATE TO authenticated USING (public.pos_can_fiscal()) WITH CHECK (public.pos_can_fiscal());
CREATE POLICY "fiscal tax sel" ON public.tax_obligations FOR SELECT TO authenticated USING (public.pos_can_fiscal() OR public.pos_has('pos_audit'));
CREATE POLICY "fiscal tax ins" ON public.tax_obligations FOR INSERT TO authenticated WITH CHECK (public.pos_can_fiscal());
CREATE POLICY "fiscal tax upd" ON public.tax_obligations FOR UPDATE TO authenticated USING (public.pos_can_fiscal()) WITH CHECK (public.pos_can_fiscal());
CREATE POLICY "fiscal tax hist" ON public.tax_obligation_history FOR SELECT TO authenticated USING (public.pos_can_fiscal() OR public.pos_has('pos_audit'));
CREATE POLICY "fiscal tax docs read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tax-documents' AND public.pos_can_fiscal());
CREATE POLICY "fiscal tax docs insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tax-documents' AND public.pos_can_fiscal());

CREATE OR REPLACE FUNCTION public.pos_audit_fiscal_cfg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'alteracao_fiscal', jsonb_build_object('antes', CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END, 'depois', to_jsonb(NEW)));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.pos_audit_fiscal_cfg() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS trg_pos_audit_fiscal_cfg ON public.fiscal_config;
CREATE TRIGGER trg_pos_audit_fiscal_cfg AFTER INSERT OR UPDATE ON public.fiscal_config FOR EACH ROW EXECUTE FUNCTION public.pos_audit_fiscal_cfg();

CREATE OR REPLACE FUNCTION public.pos_audit_price_hist() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (coalesce(NEW.changed_by, auth.uid()), 'alteracao_preco', jsonb_build_object('produto', NEW.product_id, 'preco_antigo', NEW.old_price, 'preco_novo', NEW.new_price, 'promo_antiga', NEW.old_promo, 'promo_nova', NEW.new_promo));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.pos_audit_price_hist() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS trg_pos_audit_price_hist ON public.product_price_history;
CREATE TRIGGER trg_pos_audit_price_hist AFTER INSERT ON public.product_price_history FOR EACH ROW EXECUTE FUNCTION public.pos_audit_price_hist();

CREATE OR REPLACE FUNCTION public.pos_log_access(p_area text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF NOT (public.pos_can_operate() OR public.pos_can_audit() OR public.pos_can_fiscal() OR public.pos_has('pos_stock')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'acesso_admin', jsonb_build_object('area', left(coalesce(p_area,''), 60)));
END $$;
REVOKE ALL ON FUNCTION public.pos_log_access(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pos_log_access(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pos_set_terminal_production(p_terminal uuid, p_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem ativar produção'; END IF;
  IF p_enabled AND EXISTS (SELECT 1 FROM public.pos_terminals WHERE id=p_terminal AND is_test) THEN RAISE EXCEPTION 'Terminal piloto não pode ser ativado em produção; cadastre um terminal real'; END IF;
  UPDATE public.pos_terminals SET production_enabled=p_enabled, activated_by=auth.uid(), activated_at=now() WHERE id=p_terminal;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), CASE WHEN p_enabled THEN 'terminal_ativado' ELSE 'terminal_desativado' END, jsonb_build_object('terminal', p_terminal));
END $$;
REVOKE ALL ON FUNCTION public.pos_set_terminal_production(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pos_set_terminal_production(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.pos_open_session(p_terminal uuid, p_amount numeric) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; t record;
BEGIN
  IF NOT public.pos_can_operate() THEN RAISE EXCEPTION 'Sem permissão para operar caixa'; END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN RAISE EXCEPTION 'Fundo de troco inválido'; END IF;
  SELECT * INTO t FROM public.pos_terminals WHERE id=p_terminal AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Terminal inválido ou inativo'; END IF;
  IF NOT t.is_test AND NOT t.production_enabled THEN RAISE EXCEPTION 'Terminal ainda não autorizado para produção. Peça ao administrador para ativá-lo na retaguarda.'; END IF;
  IF EXISTS (SELECT 1 FROM public.pos_sessions WHERE terminal_id=p_terminal AND status='open') THEN RAISE EXCEPTION 'Este terminal já possui um caixa aberto'; END IF;
  INSERT INTO public.pos_sessions(terminal_id, operator_id, opening_amount) VALUES (p_terminal, auth.uid(), round(p_amount,2)) RETURNING id INTO sid;
  INSERT INTO public.pos_audit_log(session_id, user_id, action, details) VALUES (sid, auth.uid(), 'abertura', jsonb_build_object('fundo', p_amount, 'piloto', t.is_test));
  RETURN sid;
END $$;

CREATE OR REPLACE FUNCTION public.pos_stock_adjust(p_product uuid, p_type text, p_quantity numeric, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE delta numeric; st record; cur numeric;
BEGIN
  IF NOT (public.pos_is_supervisor() OR public.pos_has('pos_stock')) THEN RAISE EXCEPTION 'Apenas estoquista, gerente ou administrador'; END IF;
  IF p_type NOT IN ('entrada','ajuste_mais','ajuste_menos','perda','avaria','transferencia_saida','transferencia_entrada') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantidade deve ser maior que zero'; END IF;
  IF length(trim(coalesce(p_reason,''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  delta := CASE WHEN p_type IN ('entrada','ajuste_mais','transferencia_entrada') THEN p_quantity ELSE -p_quantity END;
  SELECT stock INTO cur FROM public.products WHERE id=p_product FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  SELECT * INTO st FROM public.pos_settings WHERE id=1;
  IF cur + delta < 0 AND NOT coalesce(st.allow_negative_stock,false) THEN RAISE EXCEPTION 'Estoque ficaria negativo'; END IF;
  UPDATE public.products SET stock = stock + delta WHERE id=p_product;
  INSERT INTO public.stock_movements(product_id, quantity, type, user_id) VALUES (p_product, delta, p_type, auth.uid());
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'estoque_'||p_type, jsonb_build_object('produto', p_product, 'qtd', delta, 'motivo', p_reason));
END $$;

CREATE OR REPLACE FUNCTION public.pos_finalize_sale_v2(p_session uuid, p_client_id uuid, p_items jsonb, p_sale_discount numeric, p_payments jsonb, p_customer_doc text, p_pin text, p_suspended_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE it jsonb; pr public.products; v_sale uuid; v_num bigint; q numeric; d numeric; up numeric; line numeric; ex record; st record; v_test boolean;
  v_sub numeric := 0; v_itemdisc numeric := 0; v_total numeric; v_paid numeric := 0; v_cash numeric := 0; v_change numeric; pay jsonb; m text; tx text;
BEGIN
  PERFORM public.pos_assert_session(p_session);
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'Identificador da operação ausente'; END IF;
  SELECT * INTO ex FROM public.pos_sales WHERE client_id=p_client_id;
  IF FOUND THEN
    IF ex.status='completed' THEN RETURN jsonb_build_object('sale_id', ex.id, 'sale_number', ex.sale_number, 'subtotal', ex.subtotal, 'discount', ex.discount, 'total', ex.total, 'paid', ex.paid, 'change', ex.change_amount, 'duplicate', true, 'is_test', ex.is_test); END IF;
    RAISE EXCEPTION 'Operação já registrada';
  END IF;
  SELECT * INTO st FROM public.pos_settings WHERE id=1;
  SELECT t.is_test INTO v_test FROM public.pos_sessions se JOIN public.pos_terminals t ON t.id=se.terminal_id WHERE se.id=p_session;
  v_test := coalesce(v_test,false);
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Venda sem itens'; END IF;
  p_sale_discount := coalesce(p_sale_discount,0);
  IF p_sale_discount < 0 THEN RAISE EXCEPTION 'Desconto inválido'; END IF;
  INSERT INTO public.pos_sales(session_id, operator_id, status, customer_doc, client_id, is_test) VALUES (p_session, auth.uid(), 'processing', nullif(trim(p_customer_doc),''), p_client_id, v_test) RETURNING id, sale_number INTO v_sale, v_num;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO pr FROM public.products WHERE id=(it->>'product_id')::uuid AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    IF NOT coalesce(pr.active,true) OR NOT coalesce(pr.is_available,true) THEN RAISE EXCEPTION 'Produto indisponível: %', pr.name; END IF;
    q := (it->>'quantity')::numeric; d := coalesce((it->>'discount')::numeric,0);
    IF q IS NULL OR q <= 0 THEN RAISE EXCEPTION 'Quantidade inválida para %', pr.name; END IF;
    IF NOT coalesce(pr.is_weight_based,false) AND q <> trunc(q) THEN RAISE EXCEPTION '% não aceita quantidade fracionada', pr.name; END IF;
    IF NOT v_test AND NOT coalesce(st.allow_negative_stock,false) AND pr.stock - q < 0 THEN RAISE EXCEPTION 'Estoque insuficiente para % (disponível: %)', pr.name, pr.stock; END IF;
    up := public.pos_unit_price(pr); line := round(up*q,2);
    IF d < 0 OR d > line THEN RAISE EXCEPTION 'Desconto inválido em %', pr.name; END IF;
    INSERT INTO public.pos_sale_items(sale_id, product_id, name, code, quantity, unit_price, discount, total) VALUES (v_sale, pr.id, pr.name, coalesce(pr.barcode, pr.code, pr.sku), q, up, round(d,2), line-round(d,2));
    IF NOT v_test THEN
      UPDATE public.products SET stock = stock - q WHERE id=pr.id;
      INSERT INTO public.stock_movements(product_id, quantity, type, ref_id, user_id) VALUES (pr.id, -q, 'venda_pdv', v_sale, auth.uid());
    END IF;
    v_sub := v_sub + line; v_itemdisc := v_itemdisc + round(d,2);
  END LOOP;
  IF (v_itemdisc + p_sale_discount) > 0 AND NOT public.pos_check_pin(p_pin) THEN RAISE EXCEPTION 'Desconto exige autorização do supervisor'; END IF;
  v_total := round(v_sub - v_itemdisc - p_sale_discount, 2);
  IF v_total < 0 THEN RAISE EXCEPTION 'Desconto maior que o total'; END IF;
  FOR pay IN SELECT * FROM jsonb_array_elements(coalesce(p_payments,'[]'::jsonb)) LOOP
    m := pay->>'method'; tx := nullif(trim(pay->>'transaction_id'),'');
    IF NOT (m = ANY(coalesce(st.enabled_methods, ARRAY['dinheiro']))) THEN RAISE EXCEPTION 'Forma de pagamento não habilitada: %', m; END IF;
    IF (pay->>'amount')::numeric <= 0 THEN RAISE EXCEPTION 'Valor de pagamento inválido'; END IF;
    IF m <> 'dinheiro' AND (tx IS NULL OR length(tx) < 4) THEN RAISE EXCEPTION 'Informe o código de autorização/NSU do pagamento %', m; END IF;
    IF tx IS NOT NULL AND EXISTS (SELECT 1 FROM public.pos_payments p JOIN public.pos_sales s ON s.id=p.sale_id WHERE p.transaction_id=tx AND p.method=m AND s.status='completed' AND s.is_test = v_test) THEN RAISE EXCEPTION 'Código de autorização % já utilizado em outra venda', tx; END IF;
    v_paid := v_paid + round((pay->>'amount')::numeric,2);
    IF m='dinheiro' THEN v_cash := v_cash + round((pay->>'amount')::numeric,2); END IF;
    INSERT INTO public.pos_payments(sale_id, method, amount, status, transaction_id, card_last4, provider)
    VALUES (v_sale, m, round((pay->>'amount')::numeric,2), CASE WHEN m='dinheiro' THEN 'approved' ELSE 'confirmed_manual' END, tx,
      CASE WHEN (pay->>'card_last4') ~ '^\d{4}$' THEN pay->>'card_last4' END, 'manual');
  END LOOP;
  IF v_paid < v_total THEN RAISE EXCEPTION 'Pagamento insuficiente (faltam R$ %)', v_total - v_paid; END IF;
  v_change := v_paid - v_total;
  IF v_change > v_cash THEN RAISE EXCEPTION 'Troco só pode ser dado sobre pagamento em dinheiro'; END IF;
  UPDATE public.pos_sales SET status='completed', subtotal=v_sub, discount=v_itemdisc+p_sale_discount, total=v_total, paid=v_paid, change_amount=v_change, finalized_at=now() WHERE id=v_sale;
  IF p_suspended_id IS NOT NULL THEN UPDATE public.pos_sales SET status='recovered' WHERE id=p_suspended_id AND status='suspended'; END IF;
  INSERT INTO public.pos_audit_log(session_id, sale_id, user_id, action, details) VALUES (p_session, v_sale, auth.uid(), 'venda_finalizada', jsonb_build_object('total', v_total, 'piloto', v_test));
  RETURN jsonb_build_object('sale_id', v_sale, 'sale_number', v_num, 'subtotal', v_sub, 'discount', v_itemdisc+p_sale_discount, 'total', v_total, 'paid', v_paid, 'change', v_change, 'duplicate', false, 'is_test', v_test);
END $$;