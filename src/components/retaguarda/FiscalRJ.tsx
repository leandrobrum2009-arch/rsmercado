import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { isValidCnpj, productTaxIssues, digits } from '@/lib/fiscal/validation'

const db = supabase as any
const input = 'w-full rounded-md border border-input bg-background p-2 text-sm'
const btn = 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50'
const btn2 = 'rounded-md border border-border px-3 py-2 text-sm'

const CHECK_LABEL: Record<string, string> = {
  dados_empresa: 'Dados da empresa completos (UF RJ)', credenciamento_nfce: 'Credenciamento NFC-e confirmado na SEFAZ-RJ', certificado: 'Certificado digital válido',
  csc: 'CSC cadastrado (ID aqui; token em segredo do servidor)', provedor: 'Provedor fiscal escolhido', serie_producao: 'Série/numeração de produção',
  contador_validou: 'Contador validou o cadastro', homologacao_testada: 'Testes em homologação aprovados', integracao_real: 'Integração real com o emissor instalada',
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-4 rounded-xl border border-border bg-card p-4"><h2 className="mb-3 font-bold">{title}</h2>{children}</section>
}

export function FiscalCompanyCard() {
  const [cfg, setCfg] = useState<any>(null)
  const [ck, setCk] = useState<Record<string, boolean>>({})
  const load = () => {
    db.from('fiscal_config').select('*').eq('id', 1).maybeSingle().then(({ data }: any) => setCfg(data || { id: 1, environment: 'homologacao', uf: 'RJ' }))
    db.rpc('fiscal_production_checklist').then(({ data }: any) => setCk(data || {}))
  }
  useEffect(load, [])
  if (!cfg) return null
  const set = (k: string, v: any) => setCfg({ ...cfg, [k]: v })
  const F = ({ k, l, ph }: { k: string; l: string; ph?: string }) => <label className="text-xs">{l}<input className={input} placeholder={ph} value={cfg[k] ?? ''} onChange={(e) => set(k, e.target.value)} /></label>
  const save = async () => {
    if (cfg.cnpj && !isValidCnpj(cfg.cnpj)) return toast.error('CNPJ inválido (dígitos verificadores)')
    const { id: _i, updated_at: _u, environment: _e, production_approved_by: _a, production_approved_at: _b, ...rest } = cfg
    for (const k of ['nfce_series', 'nfce_next_number', 'nfce_series_homolog', 'nfce_next_number_homolog', 'nfe_series', 'nfe_next_number']) rest[k] = rest[k] === '' || rest[k] == null ? null : Number(rest[k])
    for (const k of ['cnpj', 'cep', 'cod_municipio_ibge']) rest[k] = rest[k] ? digits(rest[k]) : null
    for (const k of Object.keys(rest)) if (rest[k] === '') rest[k] = null
    const { error } = await db.from('fiscal_config').upsert({ id: 1, ...rest, updated_at: new Date().toISOString() })
    error ? toast.error(error.message) : (toast.success('Cadastro fiscal salvo'), load())
  }
  const approve = async () => {
    if (!confirm('Ativar a emissão fiscal em PRODUÇÃO? Só confirme após aprovação do contador.')) return
    const { error } = await db.rpc('fiscal_approve_production'); error ? toast.error(error.message) : (toast.success('Produção fiscal aprovada'), load())
  }
  const allOk = Object.keys(CHECK_LABEL).every((k) => ck[k])
  return <>
    <Card title="Estabelecimento emitente — SEFAZ-RJ">
      <p className="mb-3 rounded bg-destructive/10 p-2 text-sm text-destructive"><b>Emissão NFC-e/NF-e não integrada.</b> Nada é transmitido à SEFAZ nem simulado. Preencha apenas dados reais, validados pelo contador.</p>
      <div className="grid grid-cols-2 gap-2">
        <F k="razao_social" l="Razão social" /><F k="nome_fantasia" l="Nome fantasia" />
        <F k="cnpj" l="CNPJ" /><F k="ie" l="Inscrição estadual (RJ)" />
        <F k="im" l="Inscrição municipal" /><F k="cnae" l="CNAE principal" />
        <label className="text-xs">Regime (CRT)<select className={input} value={cfg.crt ?? ''} onChange={(e) => set('crt', e.target.value)}><option value="">—</option><option value="1">1 · Simples Nacional</option><option value="2">2 · Simples — excesso de sublimite</option><option value="4">4 · MEI</option><option value="3">3 · Regime normal</option></select></label>
        <F k="regime" l="Observação do regime" />
        <F k="logradouro" l="Logradouro" /><F k="numero" l="Número" />
        <F k="complemento" l="Complemento" /><F k="bairro" l="Bairro" />
        <F k="municipio" l="Município" ph="Teresópolis" /><F k="cod_municipio_ibge" l="Código IBGE do município (7 dígitos)" />
        <F k="uf" l="UF" ph="RJ" /><F k="cep" l="CEP" />
        <F k="telefone" l="Telefone" />
      </div>
      <h3 className="mb-1 mt-4 text-sm font-bold">Numeração</h3>
      <div className="grid grid-cols-2 gap-2">
        <F k="nfce_series_homolog" l="Série NFC-e (homologação)" /><F k="nfce_next_number_homolog" l="Próximo nº (homologação)" />
        <F k="nfce_series" l="Série NFC-e (produção)" /><F k="nfce_next_number" l="Próximo nº (produção)" />
        <F k="nfe_series" l="Série NF-e mod. 55" /><F k="nfe_next_number" l="Próximo nº NF-e" />
      </div>
      <h3 className="mb-1 mt-4 text-sm font-bold">Credenciais e provedor</h3>
      <div className="grid grid-cols-2 gap-2">
        <F k="csc_id" l="ID do CSC (o token CSC não é salvo aqui)" />
        <label className="text-xs">Certificado digital<select className={input} value={cfg.certificate_type ?? ''} onChange={(e) => set('certificate_type', e.target.value)}><option value="">Não informado</option><option value="A1">A1 (arquivo)</option><option value="A3">A3 (token/cartão)</option></select></label>
        <label className="text-xs">Validade do certificado<input type="date" className={input} value={cfg.certificate_expires_at ?? ''} onChange={(e) => set('certificate_expires_at', e.target.value)} /></label>
        <F k="provider" l="Provedor fiscal contratado" />
        <label className="text-xs">Credenciamento NFC-e (SEFAZ-RJ)<select className={input} value={cfg.credenciamento_nfce} onChange={(e) => set('credenciamento_nfce', e.target.value)}><option value="nao_verificado">Não verificado</option><option value="credenciado">Credenciado</option><option value="nao_credenciado">Não credenciado</option></select></label>
        <label className="text-xs">Credenciamento NF-e<select className={input} value={cfg.credenciamento_nfe} onChange={(e) => set('credenciamento_nfe', e.target.value)}><option value="nao_verificado">Não verificado</option><option value="credenciado">Credenciado</option><option value="nao_credenciado">Não credenciado</option></select></label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Consulte o credenciamento em <a className="underline" target="_blank" rel="noreferrer" href="https://www4.fazenda.rj.gov.br/sefaz-dfe-consulta-credenciamento/paginas/consultaCnpj.faces">SEFAZ-RJ · consulta de credenciamento</a>. Arquivo do certificado, senha, token CSC e chaves do provedor ficam somente em segredos do servidor — nunca neste formulário.</p>
      <label className="mt-2 block text-xs">Observações do contador<textarea className={input} value={cfg.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></label>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!cfg.accountant_validated_at} onChange={(e) => set('accountant_validated_at', e.target.checked ? new Date().toISOString() : null)} /> Contador validou os dados</label>
      </div>
      <p className="mt-2 text-xs">Ambiente atual: <b>{cfg.environment === 'producao' ? 'PRODUÇÃO' : 'Homologação'}</b></p>
      <button className={`${btn} mt-2`} onClick={save}>Salvar cadastro fiscal</button>
    </Card>
    <Card title="Liberação para produção fiscal">
      <ul className="mb-3 space-y-1 text-sm">{Object.entries(CHECK_LABEL).map(([k, l]) => <li key={k} className={ck[k] ? 'text-primary' : 'text-destructive'}>{ck[k] ? '✓' : '✗'} {l}</li>)}</ul>
      <button className={btn2} disabled={!allOk} onClick={approve}>Aprovar emissão em produção (administrador)</button>
      {!allOk && <p className="mt-2 text-xs text-muted-foreground">Bloqueado até todos os requisitos estarem atendidos.</p>}
    </Card>
  </>
}

export function ProductTaxCard() {
  const [crt, setCrt] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [onlyIssues, setOnlyIssues] = useState(true)
  const [stats, setStats] = useState({ total: 0, issues: 0 })
  useEffect(() => { db.from('fiscal_config').select('crt').eq('id', 1).maybeSingle().then(({ data }: any) => setCrt(data?.crt ?? null)) }, [])
  const tax = (p: any) => ({ ncm: p.ncm, cest: p.cest, origin: p.origin, cfop: p.tax_data?.cfop, cst: p.tax_data?.cst, csosn: p.tax_data?.csosn })
  useEffect(() => {
    const t = setTimeout(async () => {
      const s = q.trim().replace(/[,%()]/g, ' ')
      let r = db.from('products').select('id,name,barcode,code,ncm,cest,origin,unit,tax_data').is('deleted_at', null).order('name').range(0, 4999)
      if (s) r = r.or(`name.ilike.%${s}%,code.eq.${s},barcode.eq.${s}`)
      const { data } = await r
      const all = (data || []).map((p: any) => ({ ...p, issues: productTaxIssues(tax(p), crt) }))
      setStats({ total: all.length, issues: all.filter((p: any) => p.issues.length).length })
      setRows(all.filter((p: any) => !onlyIssues || p.issues.length).slice(0, 100))
    }, 250)
    return () => clearTimeout(t)
  }, [q, crt, onlyIssues, edit])
  const save = async () => {
    const { error } = await db.rpc('pos_update_product_tax', { p_product: edit.id, p_tax: edit.t })
    error ? toast.error(error.message) : (toast.success('Tributação do produto salva'), setEdit(null))
  }
  const E = ({ k, l }: { k: string; l: string }) => <label className="text-xs">{l}<input className={input} value={edit.t[k] ?? ''} onChange={(e) => setEdit({ ...edit, t: { ...edit.t, [k]: e.target.value } })} /></label>
  return <Card title="Cadastro tributário dos produtos">
    <p className="mb-2 text-sm">{stats.issues} de {stats.total} produtos com dados fiscais incompletos{!crt && ' (defina o CRT da empresa para validar CST/CSOSN)'}. Os códigos e alíquotas devem vir do contador — nada é preenchido automaticamente.</p>
    <div className="mb-2 flex gap-2"><input className={input} placeholder="Buscar produto, código ou EAN" value={q} onChange={(e) => setQ(e.target.value)} /><label className="flex items-center gap-1 whitespace-nowrap text-xs"><input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> Só pendentes</label></div>
    {edit ? <div className="rounded border border-border p-3">
      <b className="text-sm">{edit.name}</b>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <E k="ncm" l="NCM (8 dígitos)" /><E k="cest" l="CEST (7, se aplicável)" /><E k="origin" l="Origem (0-8)" />
        <E k="cfop" l="CFOP" />{crt === '3' ? <E k="cst" l="CST ICMS" /> : <E k="csosn" l="CSOSN" />}<E k="aliquota_icms" l="Alíquota ICMS %" />
        <E k="cst_pis" l="CST PIS" /><E k="cst_cofins" l="CST COFINS" /><E k="observacao" l="Observação" />
        <E k="cst_ibs_cbs" l="CST IBS/CBS (reforma)" /><E k="cclass_trib" l="cClassTrib (reforma)" />
      </div>
      <div className="mt-2 flex gap-2"><button className={btn} onClick={save}>Salvar</button><button className={btn2} onClick={() => setEdit(null)}>Cancelar</button></div>
    </div> :
    <div className="max-h-96 overflow-auto text-sm">{rows.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 border-b border-border py-1"><span>{p.name} <span className="text-xs text-muted-foreground">{p.barcode || p.code}</span><br /><span className="text-xs text-destructive">{p.issues.join(' · ')}</span></span><button className={btn2} onClick={() => setEdit({ id: p.id, name: p.name, t: { ...p.tax_data, ...tax(p) } })}>Editar</button></div>)}</div>}
  </Card>
}
