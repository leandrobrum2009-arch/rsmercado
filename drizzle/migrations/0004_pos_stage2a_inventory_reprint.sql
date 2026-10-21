CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  system_qty numeric NOT NULL,
  counted_qty numeric NOT NULL,
  adjustment numeric NOT NULL,
  unit_cost numeric,
  reason text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_counts_product_idx ON public.inventory_counts(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_counts_batch_idx ON public.inventory_counts(batch_id);
GRANT SELECT ON public.inventory_counts TO authenticated;
GRANT ALL ON public.inventory_counts TO service_role;
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory read" ON public.inventory_counts FOR SELECT TO authenticated USING (public.pos_is_supervisor() OR public.pos_has('pos_stock') OR public.pos_can_audit());

-- Inventário: aplica contagens físicas; exige confirmação explícita
CREATE OR REPLACE FUNCTION public.pos_apply_inventory(p_items jsonb, p_reason text, p_confirm text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE it jsonb; cur numeric; cnt numeric; adj numeric; cst numeric; v_batch uuid := gen_random_uuid(); n int := 0; changed int := 0;
BEGIN
  IF NOT (public.is_admin() OR public.pos_is_supervisor() OR public.pos_has('pos_stock')) THEN RAISE EXCEPTION 'Sem permissão para inventário'; END IF;
  IF coalesce(p_confirm,'') <> 'CONFIRMO' THEN RAISE EXCEPTION 'Digite CONFIRMO para aplicar o inventário'; END IF;
  IF length(trim(coalesce(p_reason,''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Nenhum item'; END IF;
  IF jsonb_array_length(p_items) > 2000 THEN RAISE EXCEPTION 'Máximo de 2000 itens por lote'; END IF;
  IF jsonb_array_length(p_items) > 50 AND NOT public.is_admin() THEN RAISE EXCEPTION 'Lotes com mais de 50 itens exigem administrador'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    cnt := (it->>'counted')::numeric;
    IF cnt IS NULL OR cnt < 0 THEN RAISE EXCEPTION 'Quantidade contada inválida'; END IF;
    cst := nullif(it->>'cost','')::numeric;
    IF cst IS NOT NULL AND cst < 0 THEN RAISE EXCEPTION 'Custo inválido'; END IF;
    SELECT stock INTO cur FROM public.products WHERE id=(it->>'product_id')::uuid AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado: %', it->>'product_id'; END IF;
    adj := cnt - cur; n := n + 1;
    INSERT INTO public.inventory_counts(batch_id, product_id, system_qty, counted_qty, adjustment, unit_cost, reason, user_id) VALUES (v_batch, (it->>'product_id')::uuid, cur, cnt, adj, cst, p_reason, auth.uid());
    IF adj <> 0 THEN
      UPDATE public.products SET stock = cnt WHERE id=(it->>'product_id')::uuid;
      INSERT INTO public.stock_movements(product_id, quantity, type, ref_id, user_id) VALUES ((it->>'product_id')::uuid, adj, 'inventario', v_batch, auth.uid());
      changed := changed + 1;
    END IF;
    IF cst IS NOT NULL AND public.is_admin() THEN UPDATE public.products SET cost = cst WHERE id=(it->>'product_id')::uuid; END IF;
  END LOOP;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'inventario', jsonb_build_object('lote', v_batch, 'itens', n, 'ajustados', changed, 'motivo', p_reason));
  RETURN jsonb_build_object('batch_id', v_batch, 'items', n, 'changed', changed);
END $$;
REVOKE ALL ON FUNCTION public.pos_apply_inventory(jsonb, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pos_apply_inventory(jsonb, text, text) TO authenticated;

-- Reimpressão identificada
CREATE OR REPLACE FUNCTION public.pos_log_reprint(p_sale uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record; n int;
BEGIN
  SELECT * INTO s FROM public.pos_sales WHERE id=p_sale;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF NOT (s.operator_id = auth.uid() OR public.pos_is_supervisor()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT count(*) INTO n FROM public.pos_audit_log WHERE sale_id=p_sale AND action='reimpressao';
  INSERT INTO public.pos_audit_log(session_id, sale_id, user_id, action, details) VALUES (s.session_id, p_sale, auth.uid(), 'reimpressao', jsonb_build_object('via', n + 2));
  RETURN n + 2;
END $$;
REVOKE ALL ON FUNCTION public.pos_log_reprint(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pos_log_reprint(uuid) TO authenticated;

-- Um operador só pode ter uma sessão aberta
CREATE UNIQUE INDEX IF NOT EXISTS pos_sessions_one_open_per_operator ON public.pos_sessions(operator_id) WHERE status='open';
CREATE UNIQUE INDEX IF NOT EXISTS pos_sessions_one_open_per_terminal ON public.pos_sessions(terminal_id) WHERE status='open';

-- Devolução de venda piloto não altera estoque real
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
    IF p_restock AND NOT s.is_test AND si.product_id IS NOT NULL THEN
      UPDATE public.products SET stock = stock + q WHERE id=si.product_id;
      INSERT INTO public.stock_movements(product_id, quantity, type, ref_id, user_id) VALUES (si.product_id, q, 'devolucao', p_sale, auth.uid());
    END IF;
  END LOOP;
  INSERT INTO public.pos_returns(sale_id, reason, refund_method, refund_amount, restock, items, user_id) VALUES (p_sale, p_reason, p_refund_method, amount, p_restock AND NOT s.is_test, p_items, auth.uid()) RETURNING id INTO rid;
  INSERT INTO public.pos_audit_log(session_id, sale_id, user_id, action, details) VALUES (s.session_id, p_sale, auth.uid(), 'devolucao', jsonb_build_object('valor', amount, 'motivo', p_reason, 'reembolso', p_refund_method, 'piloto', s.is_test));
  RETURN jsonb_build_object('return_id', rid, 'amount', amount);
END $$;

-- Histórico imutável de sessões fechadas
CREATE OR REPLACE FUNCTION public.pos_block_closed_session_update() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.status = 'closed' THEN RAISE EXCEPTION 'Sessão de caixa fechada não pode ser alterada; registre um lançamento de compensação'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_pos_block_closed_session ON public.pos_sessions;
CREATE TRIGGER trg_pos_block_closed_session BEFORE UPDATE OR DELETE ON public.pos_sessions FOR EACH ROW EXECUTE FUNCTION public.pos_block_closed_session_update();