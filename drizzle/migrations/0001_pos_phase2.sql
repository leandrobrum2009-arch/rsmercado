
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock numeric NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alt_barcodes text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cest text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_data jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS products_alt_barcodes_idx ON public.products USING gin(alt_barcodes);

ALTER TABLE public.pos_settings ADD COLUMN IF NOT EXISTS enabled_methods text[] NOT NULL DEFAULT ARRAY['dinheiro','pix','debito','credito'];
ALTER TABLE public.pos_settings ADD COLUMN IF NOT EXISTS allow_negative_stock boolean NOT NULL DEFAULT false;
ALTER TABLE public.pos_settings ADD COLUMN IF NOT EXISTS payment_environment text NOT NULL DEFAULT 'manual';

ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS fiscal_status text NOT NULL DEFAULT 'nao_emitido';
CREATE UNIQUE INDEX IF NOT EXISTS pos_sales_client_id_uq ON public.pos_sales(client_id) WHERE client_id IS NOT NULL;

ALTER TABLE public.pos_payments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.pos_payments ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE public.pos_payments ADD COLUMN IF NOT EXISTS card_last4 text;
ALTER TABLE public.pos_payments ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual';

CREATE TABLE public.product_price_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL, old_price numeric, new_price numeric, old_promo numeric, new_promo numeric, old_cost numeric, new_cost numeric, changed_by uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.pos_returns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_id uuid NOT NULL REFERENCES public.pos_sales(id), reason text NOT NULL, refund_method text NOT NULL, refund_amount numeric NOT NULL, restock boolean NOT NULL DEFAULT true, items jsonb NOT NULL, user_id uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.fiscal_config (id int PRIMARY KEY DEFAULT 1 CHECK (id=1), cnpj text, ie text, uf text, regime text, environment text NOT NULL DEFAULT 'homologacao', nfce_series int, nfce_next_number int, provider text, notes text, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.fiscal_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_id uuid REFERENCES public.pos_sales(id), model text NOT NULL DEFAULT '65', series int, number int, environment text NOT NULL DEFAULT 'homologacao', status text NOT NULL DEFAULT 'pendente', access_key text, protocol text, xml_url text, rejection text, events jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.tax_obligations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), doc_type text NOT NULL, description text, period text, revenue_code text, due_date date NOT NULL, principal numeric NOT NULL DEFAULT 0, fine numeric NOT NULL DEFAULT 0, interest numeric NOT NULL DEFAULT 0, total numeric GENERATED ALWAYS AS (principal + fine + interest) STORED, status text NOT NULL DEFAULT 'pendente', paid_at date, attachment_url text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.tax_obligation_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), obligation_id uuid NOT NULL, changed_by uuid, old_data jsonb, new_data jsonb, created_at timestamptz NOT NULL DEFAULT now());

GRANT SELECT ON public.product_price_history, public.pos_returns, public.fiscal_documents, public.tax_obligation_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fiscal_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_obligations TO authenticated;
GRANT SELECT ON public.pos_settings TO authenticated;
GRANT ALL ON public.product_price_history, public.pos_returns, public.fiscal_config, public.fiscal_documents, public.tax_obligations, public.tax_obligation_history TO service_role;

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_obligation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup read price hist" ON public.product_price_history FOR SELECT TO authenticated USING (public.pos_is_supervisor());
CREATE POLICY "sup read returns" ON public.pos_returns FOR SELECT TO authenticated USING (public.pos_is_supervisor());
CREATE POLICY "admin fiscal cfg sel" ON public.fiscal_config FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin fiscal cfg ins" ON public.fiscal_config FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin fiscal cfg upd" ON public.fiscal_config FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "sup read fiscal docs" ON public.fiscal_documents FOR SELECT TO authenticated USING (public.pos_is_supervisor());
CREATE POLICY "admin tax sel" ON public.tax_obligations FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin tax ins" ON public.tax_obligations FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin tax upd" ON public.tax_obligations FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin tax del" ON public.tax_obligations FOR DELETE TO authenticated USING (public.is_admin() AND status = 'cancelado');
CREATE POLICY "admin tax hist" ON public.tax_obligation_history FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "pos read settings" ON public.pos_settings FOR SELECT TO authenticated USING (public.pos_can_operate());
REVOKE SELECT (supervisor_pin_hash) ON public.pos_settings FROM authenticated;
REVOKE SELECT ON public.pos_settings FROM authenticated;
GRANT SELECT (id, blind_close, divergence_tolerance, enabled_methods, allow_negative_stock, payment_environment, updated_at) ON public.pos_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.log_price_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price OR NEW.promo_price IS DISTINCT FROM OLD.promo_price OR NEW.cost IS DISTINCT FROM OLD.cost THEN
    INSERT INTO public.product_price_history(product_id, old_price, new_price, old_promo, new_promo, old_cost, new_cost, changed_by)
    VALUES (NEW.id, OLD.price, NEW.price, OLD.promo_price, NEW.promo_price, OLD.cost, NEW.cost, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_price_history AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_price_change();

CREATE OR REPLACE FUNCTION public.log_tax_obligation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  NEW.updated_at := now();
  INSERT INTO public.tax_obligation_history(obligation_id, changed_by, old_data, new_data) VALUES (NEW.id, auth.uid(), CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END, to_jsonb(NEW));
  RETURN NEW;
END $$;
CREATE TRIGGER tax_obligations_hist BEFORE INSERT OR UPDATE ON public.tax_obligations FOR EACH ROW EXECUTE FUNCTION public.log_tax_obligation();

CREATE OR REPLACE FUNCTION public.pos_update_settings(p_methods text[], p_allow_negative boolean, p_blind boolean, p_tolerance numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_methods IS NULL OR array_length(p_methods,1) IS NULL THEN RAISE EXCEPTION 'Habilite ao menos uma forma de pagamento'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_methods) m WHERE m NOT IN ('dinheiro','pix','debito','credito','voucher','convenio')) THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;
  INSERT INTO public.pos_settings(id, enabled_methods, allow_negative_stock, blind_close, divergence_tolerance) VALUES (1, p_methods, p_allow_negative, p_blind, greatest(coalesce(p_tolerance,0),0))
  ON CONFLICT (id) DO UPDATE SET enabled_methods=EXCLUDED.enabled_methods, allow_negative_stock=EXCLUDED.allow_negative_stock, blind_close=EXCLUDED.blind_close, divergence_tolerance=EXCLUDED.divergence_tolerance, updated_at=now();
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'config_caixa', jsonb_build_object('metodos', p_methods, 'estoque_negativo', p_allow_negative, 'cego', p_blind, 'tolerancia', p_tolerance));
END $$;

CREATE OR REPLACE FUNCTION public.pos_finalize_sale_v2(p_session uuid, p_client_id uuid, p_items jsonb, p_sale_discount numeric, p_payments jsonb, p_customer_doc text, p_pin text, p_suspended_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE it jsonb; pr public.products; v_sale uuid; v_num bigint; q numeric; d numeric; up numeric; line numeric; ex record; st record;
  v_sub numeric := 0; v_itemdisc numeric := 0; v_total numeric; v_paid numeric := 0; v_cash numeric := 0; v_change numeric; pay jsonb; m text; tx text;
BEGIN
  PERFORM public.pos_assert_session(p_session);
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'Identificador da operação ausente'; END IF;
  SELECT * INTO ex FROM public.pos_sales WHERE client_id=p_client_id;
  IF FOUND THEN
    IF ex.status='completed' THEN RETURN jsonb_build_object('sale_id', ex.id, 'sale_number', ex.sale_number, 'subtotal', ex.subtotal, 'discount', ex.discount, 'total', ex.total, 'paid', ex.paid, 'change', ex.change_amount, 'duplicate', true); END IF;
    RAISE EXCEPTION 'Operação já registrada';
  END IF;
  SELECT * INTO st FROM public.pos_settings WHERE id=1;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Venda sem itens'; END IF;
  p_sale_discount := coalesce(p_sale_discount,0);
  IF p_sale_discount < 0 THEN RAISE EXCEPTION 'Desconto inválido'; END IF;
  INSERT INTO public.pos_sales(session_id, operator_id, status, customer_doc, client_id) VALUES (p_session, auth.uid(), 'processing', nullif(trim(p_customer_doc),''), p_client_id) RETURNING id, sale_number INTO v_sale, v_num;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO pr FROM public.products WHERE id=(it->>'product_id')::uuid AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    IF NOT coalesce(pr.active,true) OR NOT coalesce(pr.is_available,true) THEN RAISE EXCEPTION 'Produto indisponível: %', pr.name; END IF;
    q := (it->>'quantity')::numeric; d := coalesce((it->>'discount')::numeric,0);
    IF q IS NULL OR q <= 0 THEN RAISE EXCEPTION 'Quantidade inválida para %', pr.name; END IF;
    IF NOT coalesce(pr.is_weight_based,false) AND q <> trunc(q) THEN RAISE EXCEPTION '% não aceita quantidade fracionada', pr.name; END IF;
    IF NOT coalesce(st.allow_negative_stock,false) AND pr.stock - q < 0 THEN RAISE EXCEPTION 'Estoque insuficiente para % (disponível: %)', pr.name, pr.stock; END IF;
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
    m := pay->>'method'; tx := nullif(trim(pay->>'transaction_id'),'');
    IF NOT (m = ANY(coalesce(st.enabled_methods, ARRAY['dinheiro']))) THEN RAISE EXCEPTION 'Forma de pagamento não habilitada: %', m; END IF;
    IF (pay->>'amount')::numeric <= 0 THEN RAISE EXCEPTION 'Valor de pagamento inválido'; END IF;
    IF m <> 'dinheiro' AND (tx IS NULL OR length(tx) < 4) THEN RAISE EXCEPTION 'Informe o código de autorização/NSU do pagamento %', m; END IF;
    IF tx IS NOT NULL AND EXISTS (SELECT 1 FROM public.pos_payments p JOIN public.pos_sales s ON s.id=p.sale_id WHERE p.transaction_id=tx AND p.method=m AND s.status='completed') THEN RAISE EXCEPTION 'Código de autorização % já utilizado em outra venda', tx; END IF;
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
  INSERT INTO public.pos_audit_log(session_id, sale_id, user_id, action, details) VALUES (p_session, v_sale, auth.uid(), 'venda_finalizada', jsonb_build_object('total', v_total));
  RETURN jsonb_build_object('sale_id', v_sale, 'sale_number', v_num, 'subtotal', v_sub, 'discount', v_itemdisc+p_sale_discount, 'total', v_total, 'paid', v_paid, 'change', v_change, 'duplicate', false);
END $$;

CREATE OR REPLACE FUNCTION public.pos_stock_adjust(p_product uuid, p_type text, p_quantity numeric, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE delta numeric; st record; cur numeric;
BEGIN
  IF NOT public.pos_is_supervisor() THEN RAISE EXCEPTION 'Apenas supervisor/administrador'; END IF;
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

CREATE OR REPLACE FUNCTION public.pos_return_sale(p_sale uuid, p_items jsonb, p_reason text, p_refund_method text, p_restock boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record; it jsonb; si record; q numeric; already numeric; amount numeric := 0; rid uuid;
BEGIN
  IF NOT public.pos_is_supervisor() THEN RAISE EXCEPTION 'Devolução exige supervisor'; END IF;
  SELECT * INTO s FROM public.pos_sales WHERE id=p_sale AND status='completed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada ou não concluída'; END IF;
  IF length(trim(coalesce(p_reason,''))) < 5 THEN RAISE EXCEPTION 'Informe o motivo da devolução'; END IF;
  IF p_refund_method NOT IN ('dinheiro','pix','estorno_cartao','vale_troca') THEN RAISE EXCEPTION 'Forma de reembolso inválida'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Selecione os itens'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO si FROM public.pos_sale_items WHERE id=(it->>'sale_item_id')::uuid AND sale_id=p_sale;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item não pertence à venda'; END IF;
    q := (it->>'quantity')::numeric;
    SELECT coalesce(sum((x->>'quantity')::numeric),0) INTO already FROM public.pos_returns r, jsonb_array_elements(r.items) x WHERE r.sale_id=p_sale AND x->>'sale_item_id' = si.id::text;
    IF q IS NULL OR q <= 0 OR q + already > si.quantity THEN RAISE EXCEPTION 'Quantidade de devolução inválida para %', si.name; END IF;
    amount := amount + round(si.total * q / si.quantity, 2);
    IF p_restock AND si.product_id IS NOT NULL THEN
      UPDATE public.products SET stock = stock + q WHERE id=si.product_id;
      INSERT INTO public.stock_movements(product_id, quantity, type, ref_id, user_id) VALUES (si.product_id, q, 'devolucao', p_sale, auth.uid());
    END IF;
  END LOOP;
  INSERT INTO public.pos_returns(sale_id, reason, refund_method, refund_amount, restock, items, user_id) VALUES (p_sale, p_reason, p_refund_method, amount, p_restock, p_items, auth.uid()) RETURNING id INTO rid;
  INSERT INTO public.pos_audit_log(session_id, sale_id, user_id, action, details) VALUES (s.session_id, p_sale, auth.uid(), 'devolucao', jsonb_build_object('valor', amount, 'motivo', p_reason, 'reembolso', p_refund_method));
  RETURN jsonb_build_object('return_id', rid, 'amount', amount);
END $$;

CREATE OR REPLACE FUNCTION public.pos_update_product_admin(p_product uuid, p_data jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_data ? 'code' AND nullif(trim(p_data->>'code'),'') IS NOT NULL AND EXISTS (SELECT 1 FROM public.products WHERE code=trim(p_data->>'code') AND id<>p_product AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Código interno % já existe', p_data->>'code'; END IF;
  IF p_data ? 'barcode' AND nullif(trim(p_data->>'barcode'),'') IS NOT NULL AND EXISTS (SELECT 1 FROM public.products WHERE barcode=trim(p_data->>'barcode') AND id<>p_product AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Código de barras % já existe', p_data->>'barcode'; END IF;
  UPDATE public.products SET
    code = CASE WHEN p_data ? 'code' THEN nullif(trim(p_data->>'code'),'') ELSE code END,
    barcode = CASE WHEN p_data ? 'barcode' THEN nullif(trim(p_data->>'barcode'),'') ELSE barcode END,
    price = CASE WHEN p_data ? 'price' AND (p_data->>'price')::numeric > 0 THEN (p_data->>'price')::numeric ELSE price END,
    cost = CASE WHEN p_data ? 'cost' THEN nullif(p_data->>'cost','')::numeric ELSE cost END,
    min_stock = CASE WHEN p_data ? 'min_stock' THEN coalesce(nullif(p_data->>'min_stock','')::numeric,0) ELSE min_stock END,
    ncm = CASE WHEN p_data ? 'ncm' THEN nullif(trim(p_data->>'ncm'),'') ELSE ncm END,
    cest = CASE WHEN p_data ? 'cest' THEN nullif(trim(p_data->>'cest'),'') ELSE cest END,
    origin = CASE WHEN p_data ? 'origin' THEN nullif(trim(p_data->>'origin'),'') ELSE origin END,
    unit = CASE WHEN p_data ? 'unit' THEN nullif(trim(p_data->>'unit'),'') ELSE unit END,
    brand = CASE WHEN p_data ? 'brand' THEN nullif(trim(p_data->>'brand'),'') ELSE brand END,
    subcategory = CASE WHEN p_data ? 'subcategory' THEN nullif(trim(p_data->>'subcategory'),'') ELSE subcategory END,
    supplier_id = CASE WHEN p_data ? 'supplier_id' THEN nullif(p_data->>'supplier_id','')::uuid ELSE supplier_id END,
    is_weight_based = CASE WHEN p_data ? 'is_weight_based' THEN (p_data->>'is_weight_based')::boolean ELSE is_weight_based END,
    active = CASE WHEN p_data ? 'active' THEN (p_data->>'active')::boolean ELSE active END,
    alt_barcodes = CASE WHEN p_data ? 'alt_barcodes' THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'alt_barcodes')) ELSE alt_barcodes END,
    updated_at = now()
  WHERE id=p_product AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['pos_update_settings(text[],boolean,boolean,numeric)','pos_finalize_sale_v2(uuid,uuid,jsonb,numeric,jsonb,text,text,uuid)','pos_stock_adjust(uuid,text,numeric,text)','pos_return_sale(uuid,jsonb,text,text,boolean)','pos_update_product_admin(uuid,jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.pos_finalize_sale(uuid,jsonb,numeric,jsonb,text,text,uuid) FROM authenticated;
COMMENT ON FUNCTION public.pos_finalize_sale(uuid,jsonb,numeric,jsonb,text,text,uuid) IS 'DEPRECATED: replaced by pos_finalize_sale_v2';
