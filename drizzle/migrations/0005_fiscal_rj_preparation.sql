ALTER TABLE public.fiscal_config
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS im text,
  ADD COLUMN IF NOT EXISTS cnae text,
  ADD COLUMN IF NOT EXISTS crt text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS cod_municipio_ibge text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS nfce_series_homolog integer,
  ADD COLUMN IF NOT EXISTS nfce_next_number_homolog integer,
  ADD COLUMN IF NOT EXISTS nfe_series integer,
  ADD COLUMN IF NOT EXISTS nfe_next_number integer,
  ADD COLUMN IF NOT EXISTS csc_id text,
  ADD COLUMN IF NOT EXISTS certificate_type text,
  ADD COLUMN IF NOT EXISTS certificate_expires_at date,
  ADD COLUMN IF NOT EXISTS provider_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credenciamento_nfce text NOT NULL DEFAULT 'nao_verificado',
  ADD COLUMN IF NOT EXISTS credenciamento_nfe text NOT NULL DEFAULT 'nao_verificado',
  ADD COLUMN IF NOT EXISTS credenciamento_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS accountant_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS homolog_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS production_approved_by uuid,
  ADD COLUMN IF NOT EXISTS production_approved_at timestamptz;
COMMENT ON COLUMN public.fiscal_config.csc_id IS 'Identificador do CSC (não secreto). O token CSC, a senha do certificado e credenciais do provedor ficam apenas em segredos do servidor.';

-- Produção fiscal só via função de aprovação
CREATE OR REPLACE FUNCTION public.fiscal_guard_environment() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.environment = 'producao' AND (TG_OP='INSERT' OR OLD.environment <> 'producao') AND current_setting('app.fiscal_approval', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Ambiente de produção fiscal só pode ser ativado pela aprovação do administrador';
  END IF;
  IF TG_OP='UPDATE' AND current_setting('app.fiscal_approval', true) IS DISTINCT FROM 'on' THEN
    NEW.production_approved_by := OLD.production_approved_by; NEW.production_approved_at := OLD.production_approved_at;
  END IF;
  IF NEW.environment NOT IN ('homologacao','producao') THEN RAISE EXCEPTION 'Ambiente inválido'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_fiscal_guard_environment ON public.fiscal_config;
CREATE TRIGGER trg_fiscal_guard_environment BEFORE INSERT OR UPDATE ON public.fiscal_config FOR EACH ROW EXECUTE FUNCTION public.fiscal_guard_environment();

CREATE OR REPLACE FUNCTION public.fiscal_production_checklist() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c record;
BEGIN
  IF NOT (public.pos_can_fiscal() OR public.pos_can_audit()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO c FROM public.fiscal_config WHERE id=1;
  RETURN jsonb_build_object(
    'dados_empresa', c.razao_social IS NOT NULL AND c.cnpj ~ '^\d{14}$' AND c.ie IS NOT NULL AND c.crt IS NOT NULL AND c.logradouro IS NOT NULL AND c.cod_municipio_ibge ~ '^\d{7}$' AND c.cep ~ '^\d{8}$' AND c.uf = 'RJ',
    'credenciamento_nfce', coalesce(c.credenciamento_nfce,'') = 'credenciado',
    'certificado', c.certificate_type IS NOT NULL AND c.certificate_expires_at > current_date,
    'csc', c.csc_id IS NOT NULL,
    'provedor', c.provider IS NOT NULL,
    'serie_producao', c.nfce_series IS NOT NULL AND c.nfce_next_number IS NOT NULL,
    'contador_validou', c.accountant_validated_at IS NOT NULL,
    'homologacao_testada', c.homolog_tested_at IS NOT NULL,
    'integracao_real', false
  );
END $$;
GRANT EXECUTE ON FUNCTION public.fiscal_production_checklist() TO authenticated;

CREATE OR REPLACE FUNCTION public.fiscal_approve_production() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ck jsonb; k text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  ck := public.fiscal_production_checklist();
  FOR k IN SELECT key FROM jsonb_each(ck) WHERE value = 'false'::jsonb LOOP
    RAISE EXCEPTION 'Requisito pendente para produção fiscal: %', k;
  END LOOP;
  PERFORM set_config('app.fiscal_approval', 'on', true);
  UPDATE public.fiscal_config SET environment='producao', production_approved_by=auth.uid(), production_approved_at=now() WHERE id=1;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'fiscal_producao_aprovada', ck);
END $$;
REVOKE ALL ON FUNCTION public.fiscal_approve_production() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fiscal_approve_production() TO authenticated;

-- Documentos fiscais: idempotência e rastreio de comunicação
ALTER TABLE public.fiscal_documents
  ADD COLUMN IF NOT EXISTS request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_ref text,
  ADD COLUMN IF NOT EXISTS danfe_url text,
  ADD COLUMN IF NOT EXISTS rejection_code text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS authorized_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS fiscal_documents_request_id_key ON public.fiscal_documents(request_id);
CREATE UNIQUE INDEX IF NOT EXISTS fiscal_documents_one_active_per_sale ON public.fiscal_documents(sale_id, model) WHERE status NOT IN ('rejeitada','denegada','erro');
CREATE UNIQUE INDEX IF NOT EXISTS fiscal_documents_access_key_key ON public.fiscal_documents(access_key) WHERE access_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.fiscal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.fiscal_documents(id),
  event_type text NOT NULL,
  status text NOT NULL,
  code text,
  message text,
  protocol text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fiscal_events_doc_idx ON public.fiscal_events(document_id, created_at);
GRANT SELECT ON public.fiscal_events TO authenticated;
GRANT ALL ON public.fiscal_events TO service_role;
ALTER TABLE public.fiscal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal events read" ON public.fiscal_events FOR SELECT TO authenticated USING (public.pos_can_fiscal() OR public.pos_can_audit());

-- Cadastro tributário do produto (formato validado; valores definidos pelo contador)
CREATE OR REPLACE FUNCTION public.pos_update_product_tax(p_product uuid, p_tax jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ncm text; cest text; orig text; cfop text; cst text; csosn text; old jsonb;
BEGIN
  IF NOT public.pos_can_fiscal() THEN RAISE EXCEPTION 'Apenas fiscal ou administrador'; END IF;
  ncm := nullif(regexp_replace(coalesce(p_tax->>'ncm',''),'\D','','g'),'');
  cest := nullif(regexp_replace(coalesce(p_tax->>'cest',''),'\D','','g'),'');
  orig := nullif(trim(coalesce(p_tax->>'origin','')),'');
  cfop := nullif(regexp_replace(coalesce(p_tax->>'cfop',''),'\D','','g'),'');
  cst := nullif(trim(coalesce(p_tax->>'cst','')),'');
  csosn := nullif(trim(coalesce(p_tax->>'csosn','')),'');
  IF ncm IS NOT NULL AND ncm !~ '^\d{8}$' THEN RAISE EXCEPTION 'NCM deve ter 8 dígitos'; END IF;
  IF cest IS NOT NULL AND cest !~ '^\d{7}$' THEN RAISE EXCEPTION 'CEST deve ter 7 dígitos'; END IF;
  IF orig IS NOT NULL AND orig !~ '^[0-8]$' THEN RAISE EXCEPTION 'Origem deve ser de 0 a 8'; END IF;
  IF cfop IS NOT NULL AND cfop !~ '^[1-7]\d{3}$' THEN RAISE EXCEPTION 'CFOP deve ter 4 dígitos'; END IF;
  IF cst IS NOT NULL AND cst !~ '^\d{2}$' THEN RAISE EXCEPTION 'CST ICMS deve ter 2 dígitos'; END IF;
  IF csosn IS NOT NULL AND csosn !~ '^\d{3}$' THEN RAISE EXCEPTION 'CSOSN deve ter 3 dígitos'; END IF;
  SELECT tax_data INTO old FROM public.products WHERE id=p_product AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  UPDATE public.products SET ncm=ncm, cest=cest, origin=orig,
    tax_data = coalesce(tax_data,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('cfop', cfop, 'cst', cst, 'csosn', csosn,
      'aliquota_icms', nullif(p_tax->>'aliquota_icms',''), 'cst_pis', nullif(p_tax->>'cst_pis',''), 'cst_cofins', nullif(p_tax->>'cst_cofins',''),
      'cclass_trib', nullif(p_tax->>'cclass_trib',''), 'cst_ibs_cbs', nullif(p_tax->>'cst_ibs_cbs',''), 'observacao', nullif(p_tax->>'observacao',''),
      'validado_em', now()))
  WHERE id=p_product;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'alteracao_fiscal', jsonb_build_object('produto', p_product, 'antes', old, 'novo', p_tax));
END $$;
REVOKE ALL ON FUNCTION public.pos_update_product_tax(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pos_update_product_tax(uuid, jsonb) TO authenticated;