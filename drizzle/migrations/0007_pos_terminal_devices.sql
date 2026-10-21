ALTER TABLE public.pos_terminals
  ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'Matriz — Teresópolis/RJ',
  ADD COLUMN IF NOT EXISTS authorized_operators uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS device_hash text,
  ADD COLUMN IF NOT EXISTS device_bound_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS setup_checks jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS pos_terminals_code_key ON public.pos_terminals(upper(code));
COMMENT ON COLUMN public.pos_terminals.device_hash IS 'SHA-256 do token aleatório guardado no computador do caixa; o token em si nunca é salvo no banco.';

-- Criação de terminal: sempre desativado para produção
CREATE OR REPLACE FUNCTION public.pos_create_terminal(p_code text, p_name text, p_branch text, p_is_test boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v uuid; c text := upper(trim(coalesce(p_code,'')));
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF c !~ '^[A-Z0-9-]{2,20}$' THEN RAISE EXCEPTION 'Código inválido (use letras, números e hífen, ex.: CX01)'; END IF;
  IF length(trim(coalesce(p_name,''))) < 2 THEN RAISE EXCEPTION 'Informe o nome do terminal'; END IF;
  IF EXISTS (SELECT 1 FROM public.pos_terminals WHERE upper(code)=c) THEN RAISE EXCEPTION 'Já existe um terminal com o código %', c; END IF;
  INSERT INTO public.pos_terminals(code, name, branch, active, is_test, production_enabled) VALUES (c, trim(p_name), coalesce(nullif(trim(p_branch),''),'Matriz — Teresópolis/RJ'), true, coalesce(p_is_test,false), false) RETURNING id INTO v;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'terminal_criado', jsonb_build_object('terminal', v, 'codigo', c, 'teste', p_is_test));
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.pos_update_terminal(p_terminal uuid, p_name text, p_branch text, p_active boolean, p_operators uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF NOT p_active AND EXISTS (SELECT 1 FROM public.pos_sessions WHERE terminal_id=p_terminal AND status='open') THEN RAISE EXCEPTION 'Feche o caixa aberto antes de desativar o terminal'; END IF;
  UPDATE public.pos_terminals SET name=coalesce(nullif(trim(p_name),''),name), branch=coalesce(nullif(trim(p_branch),''),branch), active=p_active,
    authorized_operators=coalesce(p_operators,'{}'), production_enabled = CASE WHEN p_active THEN production_enabled ELSE false END WHERE id=p_terminal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Terminal não encontrado'; END IF;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'terminal_alterado', jsonb_build_object('terminal', p_terminal, 'ativo', p_active, 'operadores', p_operators));
END $$;

-- Vincular o computador físico (token gerado no navegador; só o hash chega aqui)
CREATE OR REPLACE FUNCTION public.pos_bind_device(p_terminal uuid, p_device_hash text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem vincular um computador'; END IF;
  IF p_device_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Identificador do computador inválido'; END IF;
  IF EXISTS (SELECT 1 FROM public.pos_terminals WHERE device_hash=p_device_hash AND id<>p_terminal) THEN RAISE EXCEPTION 'Este computador já está vinculado a outro terminal'; END IF;
  IF EXISTS (SELECT 1 FROM public.pos_sessions WHERE terminal_id=p_terminal AND status='open') THEN RAISE EXCEPTION 'Feche o caixa aberto antes de trocar o computador'; END IF;
  UPDATE public.pos_terminals SET device_hash=p_device_hash, device_bound_at=now(), production_enabled=false WHERE id=p_terminal;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'terminal_computador_vinculado', jsonb_build_object('terminal', p_terminal));
END $$;

-- Qual terminal é este computador?
CREATE OR REPLACE FUNCTION public.pos_whoami_device(p_device_hash text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN public.pos_can_operate() THEN (SELECT jsonb_build_object('id', id, 'code', code, 'name', name, 'is_test', is_test, 'production_enabled', production_enabled, 'active', active) FROM public.pos_terminals WHERE device_hash = p_device_hash) END
$$;

CREATE OR REPLACE FUNCTION public.pos_record_setup_check(p_terminal uuid, p_key text, p_ok boolean, p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT (public.is_admin() OR public.pos_is_supervisor()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_key NOT IN ('leitor','impressao','gaveta','balanca','tela_cheia','venda_teste','fechamento_teste') THEN RAISE EXCEPTION 'Verificação inválida'; END IF;
  UPDATE public.pos_terminals SET setup_checks = setup_checks || jsonb_build_object(p_key, jsonb_build_object('ok', p_ok, 'nota', left(coalesce(p_note,''),200), 'por', auth.uid(), 'em', now())) WHERE id=p_terminal;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), 'terminal_verificacao', jsonb_build_object('terminal', p_terminal, 'item', p_key, 'ok', p_ok));
END $$;

-- Ativação exige computador vinculado, operador autorizado e testes manuais aprovados
CREATE OR REPLACE FUNCTION public.pos_set_terminal_production(p_terminal uuid, p_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t record; k text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem ativar produção'; END IF;
  SELECT * INTO t FROM public.pos_terminals WHERE id=p_terminal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Terminal não encontrado'; END IF;
  IF p_enabled THEN
    IF t.is_test THEN RAISE EXCEPTION 'Terminal piloto não pode ser ativado em produção; cadastre um terminal real'; END IF;
    IF NOT t.active THEN RAISE EXCEPTION 'Terminal inativo'; END IF;
    IF t.device_hash IS NULL THEN RAISE EXCEPTION 'Vincule o computador do caixa antes de ativar'; END IF;
    IF coalesce(array_length(t.authorized_operators,1),0) = 0 THEN RAISE EXCEPTION 'Autorize ao menos um operador'; END IF;
    FOREACH k IN ARRAY ARRAY['leitor','impressao','venda_teste','fechamento_teste'] LOOP
      IF coalesce((t.setup_checks->k->>'ok')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Verificação manual pendente: %', k; END IF;
    END LOOP;
  END IF;
  UPDATE public.pos_terminals SET production_enabled=p_enabled, activated_by=auth.uid(), activated_at=now() WHERE id=p_terminal;
  INSERT INTO public.pos_audit_log(user_id, action, details) VALUES (auth.uid(), CASE WHEN p_enabled THEN 'terminal_ativado' ELSE 'terminal_desativado' END, jsonb_build_object('terminal', p_terminal));
END $$;

-- Abertura: terminal real exige este computador e operador autorizado
DROP FUNCTION IF EXISTS public.pos_open_session_device(uuid, numeric, text);
CREATE OR REPLACE FUNCTION public.pos_open_session_device(p_terminal uuid, p_amount numeric, p_device_hash text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t record; sid uuid;
BEGIN
  IF NOT public.pos_can_operate() THEN RAISE EXCEPTION 'Sem permissão para operar caixa'; END IF;
  SELECT * INTO t FROM public.pos_terminals WHERE id=p_terminal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Terminal inválido'; END IF;
  IF NOT t.is_test THEN
    IF t.device_hash IS NULL OR t.device_hash IS DISTINCT FROM p_device_hash THEN RAISE EXCEPTION 'Este computador não está cadastrado como %. Peça ao administrador para vincular em Preparação do Caixa.', t.code; END IF;
    IF NOT (auth.uid() = ANY(t.authorized_operators) OR public.is_admin()) THEN RAISE EXCEPTION 'Operador não autorizado neste terminal'; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.pos_sessions WHERE operator_id=auth.uid() AND status='open') THEN RAISE EXCEPTION 'Você já possui um caixa aberto em outro terminal'; END IF;
  sid := public.pos_open_session(p_terminal, p_amount);
  UPDATE public.pos_terminals SET last_activity_at=now() WHERE id=p_terminal;
  RETURN sid;
END $$;
-- Abertura antiga continua só para o terminal piloto
CREATE OR REPLACE FUNCTION public.pos_guard_legacy_open() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_setting('app.pos_device_ok', true) IS DISTINCT FROM 'on' AND NOT EXISTS (SELECT 1 FROM public.pos_terminals WHERE id=NEW.terminal_id AND is_test) THEN
    RAISE EXCEPTION 'Abra o caixa pelo PDV atualizado (verificação do computador obrigatória)';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_pos_guard_legacy_open ON public.pos_sessions;
CREATE TRIGGER trg_pos_guard_legacy_open BEFORE INSERT ON public.pos_sessions FOR EACH ROW EXECUTE FUNCTION public.pos_guard_legacy_open();

CREATE OR REPLACE FUNCTION public.pos_open_session_device(p_terminal uuid, p_amount numeric, p_device_hash text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t record; sid uuid;
BEGIN
  IF NOT public.pos_can_operate() THEN RAISE EXCEPTION 'Sem permissão para operar caixa'; END IF;
  SELECT * INTO t FROM public.pos_terminals WHERE id=p_terminal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Terminal inválido'; END IF;
  IF NOT t.is_test THEN
    IF t.device_hash IS NULL OR t.device_hash IS DISTINCT FROM p_device_hash THEN RAISE EXCEPTION 'Este computador não está cadastrado como %. Peça ao administrador para vincular em Preparação do Caixa.', t.code; END IF;
    IF NOT (auth.uid() = ANY(t.authorized_operators) OR public.is_admin()) THEN RAISE EXCEPTION 'Operador não autorizado neste terminal'; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.pos_sessions WHERE operator_id=auth.uid() AND status='open') THEN RAISE EXCEPTION 'Você já possui um caixa aberto em outro terminal'; END IF;
  PERFORM set_config('app.pos_device_ok', 'on', true);
  sid := public.pos_open_session(p_terminal, p_amount);
  PERFORM set_config('app.pos_device_ok', 'off', true);
  UPDATE public.pos_terminals SET last_activity_at=now() WHERE id=p_terminal;
  RETURN sid;
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['pos_create_terminal(text,text,text,boolean)','pos_update_terminal(uuid,text,text,boolean,uuid[])','pos_bind_device(uuid,text)','pos_whoami_device(text)','pos_record_setup_check(uuid,text,boolean,text)','pos_open_session_device(uuid,numeric,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM public, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- Atualiza última atividade nas vendas
CREATE OR REPLACE FUNCTION public.pos_touch_terminal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.pos_terminals t SET last_activity_at=now() FROM public.pos_sessions s WHERE s.id=NEW.session_id AND t.id=s.terminal_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_pos_touch_terminal ON public.pos_sales;
CREATE TRIGGER trg_pos_touch_terminal AFTER INSERT ON public.pos_sales FOR EACH ROW EXECUTE FUNCTION public.pos_touch_terminal();