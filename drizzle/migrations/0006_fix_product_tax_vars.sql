CREATE OR REPLACE FUNCTION public.pos_update_product_tax(p_product uuid, p_tax jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ncm text; v_cest text; v_orig text; v_cfop text; v_cst text; v_csosn text; v_old jsonb;
BEGIN
  IF NOT public.pos_can_fiscal() THEN RAISE EXCEPTION 'Apenas fiscal ou administrador'; END IF;
  v_ncm := nullif(regexp_replace(coalesce(p_tax->>'ncm',''),'\D','','g'),'');
  v_cest := nullif(regexp_replace(coalesce(p_tax->>'cest',''),'\D','','g'),'');
  v_orig := nullif(trim(coalesce(p_tax->>'origin','')),'');
  v_cfop := nullif(regexp_replace(coalesce(p_tax->>'cfop',''),'\D','','g'),'');
  v_cst := nullif(trim(coalesce(p_tax->>'cst','')),'');
  v_csosn := nullif(trim(coalesce(p_tax->>'csosn','')),'');
  IF v_ncm IS NOT NULL AND v_ncm !~ '^\d{8}$' THEN RAISE EXCEPTION 'NCM deve ter 8 dígitos'; END IF;
  IF v_cest IS NOT NULL AND v_cest !~ '^\d{7}$' THEN RAISE EXCEPTION 'CEST deve ter 7 dígitos'; END IF;
  IF v_orig IS NOT NULL AND v_orig !~ '^[0-8]$' THEN RAISE EXCEPTION 'Origem deve ser de 0 a 8'; END IF;
  IF v_cfop IS NOT NULL AND v_cfop !~ '^[1-7]\d{3}$' THEN RAISE EXCEPTION 'CFOP deve ter 4 dígitos'; END IF;
  IF v_cst IS NOT NULL AND v_cst !~ '^\d{2}$' THEN RAISE EXCEPTION 'CST ICMS deve ter 2 dígitos'; END IF;
  IF v_csosn IS NOT NULL AND v_csosn !~ '^\d{3}$' THEN RAISE EXCEPTION 'CSOSN deve ter 3 dígitos'; END IF;
  SELECT p.tax_data INTO v_old FROM public.products p WHERE p.id=p_product AND p.deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  UPDATE public.products p SET ncm=v_ncm, cest=v_cest, origin=v_orig,
    tax_data = coalesce(p.tax_data,'{}'::jsonb) - 'cfop' - 'cst' - 'csosn' || jsonb_strip_nulls(jsonb_build_object('cfop', v_cfop, 'cst', v_cst, 'csosn', v_csosn,
      'aliquota_icms', nullif(p_tax->>'aliquota_icms',''), 'cst_pis', nullif(p_tax->>'cst_pis',''), 'cst_cofins', nullif(p_tax->>'cst_cofins',''),
      'cclass_trib', nullif(p_tax->>'cclass_trib',''), 'cst_ibs_cbs', nullif(p_tax->>'cst_ibs_cbs',''), 'observacao', nullif(p_tax->>'observacao',''),
      'validado_em', now()))
  WHERE p.id=p_product;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'alteracao_fiscal', jsonb_build_object('produto', p_product, 'antes', v_old, 'novo', p_tax));
END $$;