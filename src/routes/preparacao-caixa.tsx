import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { getDeviceHash } from '@/lib/pos-device'

export const Route = createFileRoute('/preparacao-caixa')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Preparação do Caixa — RS Supermercado' },
      { name: 'description', content: 'Checklist de instalação e ativação dos computadores de caixa do RS Supermercado.' },
      { property: 'og:title', content: 'Preparação do Caixa — RS Supermercado' },
      { property: 'og:description', content: 'Checklist de instalação dos caixas.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: Prep,
})

const db = supabase as any
const PROD_URL = 'https://rssupermercado.com.br/pdv'
const btn = 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50'
const btn2 = 'rounded-md border border-border px-3 py-2 text-sm'
type Res = { ok: boolean | null; msg: string }

function Row({ label, kind, r, children }: { label: string; kind: 'auto' | 'manual'; r?: Res; children?: React.ReactNode }) {
  const color = r?.ok === true ? 'text-primary' : r?.ok === false ? 'text-destructive' : 'text-muted-foreground'
  return <div className="flex flex-wrap items-center gap-3 border-b border-border py-2">
    <span className={`w-6 text-lg ${color}`}>{r?.ok === true ? '✓' : r?.ok === false ? '✗' : '•'}</span>
    <span className="min-w-56 flex-1"><b>{label}</b> <span className="rounded bg-muted px-1 text-xs">{kind === 'auto' ? 'automático' : 'manual'}</span><br /><span className={`text-sm ${color}`}>{r?.msg || 'Não verificado'}</span></span>
    {children}
  </div>
}

function Prep() {
  const [state, setState] = useState<'loading' | 'out' | 'denied' | 'ok'>('loading')
  const [admin, setAdmin] = useState(false)
  const [terms, setTerms] = useState<any[]>([])
  const [me, setMe] = useState<any>(null)
  const [pick, setPick] = useState('')
  const [auto, setAuto] = useState<Record<string, Res>>({})
  const [scan, setScan] = useState<{ code: string; ms: number; product?: string } | null>(null)
  const [fiscal, setFiscal] = useState<any>(null)
  const [methods, setMethods] = useState<string[]>([])
  const keyTimes = useRef<number[]>([])
  const [scanVal, setScanVal] = useState('')

  const term = terms.find((t) => t.id === me?.id)

  const runAuto = useCallback(async () => {
    const r: Record<string, Res> = {}
    const t0 = performance.now()
    const ping = await db.from('pos_settings').select('id').limit(1)
    r.backend = ping.error ? { ok: false, msg: ping.error.message } : { ok: true, msg: `Conectado (${Math.round(performance.now() - t0)} ms)` }
    const { data: { user } } = await supabase.auth.getUser()
    r.auth = user ? { ok: true, msg: `Conectado como ${user.email}` } : { ok: false, msg: 'Sem login' }
    const pr = await db.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null)
    r.products = pr.error ? { ok: false, msg: pr.error.message } : { ok: (pr.count || 0) > 0, msg: `${pr.count} produtos acessíveis` }
    const op = await db.rpc('pos_can_operate')
    r.perm = { ok: !!op.data, msg: op.data ? 'Usuário pode operar caixa' : 'Usuário sem permissão de caixa' }
    const fn = await db.rpc('pos_whoami_device', { p_device_hash: await getDeviceHash() })
    r.functions = fn.error ? { ok: false, msg: fn.error.message } : { ok: true, msg: 'Funções do caixa respondendo' }
    setMe(fn.data || null)
    r.device = fn.data ? { ok: true, msg: `Este computador é o ${fn.data.code} — ${fn.data.name}` } : { ok: false, msg: 'Este computador não está vinculado a nenhum terminal' }
    r.online = navigator.onLine ? { ok: true, msg: 'Navegador online' } : { ok: false, msg: 'Navegador sem internet' }
    r.browser = { ok: !!(window.crypto?.subtle && document.documentElement.requestFullscreen), msg: navigator.userAgent.match(/(Edg|Chrome|Firefox)\/[\d.]+/)?.[0] || navigator.userAgent.slice(0, 60) }
    setAuto(r)
  }, [])

  const loadTerms = useCallback(async () => { const { data } = await db.from('pos_terminals').select('*').order('code'); setTerms(data || []) }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setState('out')
      const [{ data: a }, { data: s }] = await Promise.all([db.rpc('is_admin'), db.rpc('pos_is_supervisor')])
      if (!a && !s) return setState('denied')
      setAdmin(!!a); setState('ok')
      await loadTerms(); await runAuto()
      db.rpc('fiscal_production_checklist').then(({ data }: any) => setFiscal(data))
      db.from('pos_settings').select('enabled_methods').eq('id', 1).maybeSingle().then(({ data }: any) => setMethods(data?.enabled_methods || []))
    })()
  }, [loadTerms, runAuto])

  const bind = async () => {
    if (!pick) return toast.error('Escolha o terminal')
    const t = terms.find((x) => x.id === pick)
    if (!confirm(`Vincular ESTE computador como ${t.code}? Se outro computador estava vinculado, ele deixará de abrir este caixa e o terminal volta a "aguardando autorização".`)) return
    const { error } = await db.rpc('pos_bind_device', { p_terminal: pick, p_device_hash: await getDeviceHash() })
    error ? toast.error(error.message) : (toast.success(`Computador vinculado como ${t.code}`), await loadTerms(), runAuto())
  }
  const record = async (key: string, ok: boolean, note = '') => {
    if (!me) return toast.error('Vincule este computador a um terminal primeiro')
    const { error } = await db.rpc('pos_record_setup_check', { p_terminal: me.id, p_key: key, p_ok: ok, p_note: note })
    error ? toast.error(error.message) : (toast.success('Verificação registrada'), loadTerms())
  }
  const manual = (k: string): Res | undefined => { const c = term?.setup_checks?.[k]; return c ? { ok: c.ok, msg: `${c.ok ? 'Aprovado' : 'Reprovado'} em ${new Date(c.em).toLocaleString('pt-BR')}${c.nota ? ' — ' + c.nota : ''}` } : undefined }
  const OkNo = ({ k, note }: { k: string; note?: string }) => <span className="flex gap-1"><button className={btn2} onClick={() => record(k, true, note)}>Funcionou</button><button className={btn2} onClick={() => record(k, false, note)}>Não funcionou</button></span>

  const onScanKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    keyTimes.current.push(performance.now())
    if (e.key !== 'Enter') return
    const ts = keyTimes.current; keyTimes.current = []
    const code = scanVal.trim(); setScanVal('')
    if (!code) return
    const ms = ts.length > 2 ? Math.round((ts[ts.length - 1] - ts[0]) / (ts.length - 1)) : 999
    db.from('products').select('name').or(`barcode.eq.${code},code.eq.${code},alt_barcodes.cs.{${code}}`).is('deleted_at', null).limit(1).then(({ data }: any) => setScan({ code, ms, product: data?.[0]?.name }))
  }
  const printTest = () => {
    const w = window.open('', '_blank', 'width=360,height=640'); if (!w) return toast.error('Permita pop-ups para este site')
    w.document.write(`<html><body style="font-family:monospace;width:72mm;font-size:12px"><center><b>RS SUPERMERCADO</b><br/>TESTE DE IMPRESSÃO<br/>Terminal ${me?.code || '—'}<br/>${new Date().toLocaleString('pt-BR')}</center><hr/>1234567890123456789012345678901234567890<br/>ÁÉÍÓÚ ÇÃÕ àê R$ 1.234,56<hr/><center>DOCUMENTO SEM VALOR FISCAL</center><br/><br/>.<script>window.print();setTimeout(()=>window.close(),500)</script></body></html>`)
    w.document.close()
  }

  if (state !== 'ok') return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background p-6 text-center">{state === 'loading' ? 'Carregando…' : state === 'out' ? <Link to="/profile" className={btn}>Entrar</Link> : 'Acesso restrito a administradores e supervisores.'}</div>

  const pend: string[] = []
  if (!me) pend.push('Vincular este computador a um terminal')
  if (term && !term.authorized_operators?.length) pend.push('Autorizar ao menos um operador no terminal')
  for (const [k, l] of [['leitor', 'Teste do leitor'], ['impressao', 'Teste de impressão'], ['venda_teste', 'Venda de teste'], ['fechamento_teste', 'Fechamento de teste']]) if (term && !term.setup_checks?.[k]?.ok) pend.push(l)
  if (term && !term.is_test && !term.production_enabled) pend.push('Autorização de produção pelo administrador (Retaguarda → Terminais)')
  if (fiscal && !fiscal.integracao_real) pend.push('Integração fiscal (NFC-e) não instalada — só cupom não fiscal')
  pend.push('Pagamentos eletrônicos: NSU digitado manualmente (sem TEF/PIX integrado)')

  return (
    <div className="fixed inset-0 z-[60] overflow-auto bg-background p-4 text-foreground">
      <div className="mx-auto max-w-4xl">
        <header className="mb-4 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-primary">Preparação do Caixa</h1><Link to="/retaguarda" className={`ml-auto ${btn2}`}>Retaguarda</Link><Link to="/pdv" className={btn2}>Abrir PDV</Link></header>
        <section className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm">Endereço de produção do caixa: <b>{PROD_URL}</b></p>
          <p className="text-sm">Endereço aberto agora: <b>{window.location.origin}</b>{!window.location.origin.includes('rssupermercado.com.br') && <span className="text-destructive"> — não é o endereço de produção</span>}</p>
          <p className="mt-2 text-sm">Identificação deste computador: {me ? <b>{me.code} — {me.name} ({me.is_test ? 'testes' : me.production_enabled ? 'produção' : 'aguardando autorização'})</b> : <b className="text-destructive">não vinculado</b>}</p>
          {admin && <div className="mt-2 flex flex-wrap items-center gap-2"><select className="rounded-md border border-input bg-background p-2 text-sm" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Escolha o terminal…</option>{terms.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}{t.device_hash ? ' (já vinculado)' : ''}</option>)}</select><button className={btn} onClick={bind}>Vincular este computador</button></div>}
        </section>
        <section className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center"><h2 className="font-bold">Verificações automáticas</h2><button className={`ml-auto ${btn2}`} onClick={runAuto}>Repetir</button></div>
          <Row label="Conexão com o servidor" kind="auto" r={auto.backend} />
          <Row label="Autenticação" kind="auto" r={auto.auth} />
          <Row label="Consulta de produtos" kind="auto" r={auto.products} />
          <Row label="Permissão de operação" kind="auto" r={auto.perm} />
          <Row label="Funções essenciais do caixa" kind="auto" r={auto.functions} />
          <Row label="Terminal deste computador" kind="auto" r={auto.device} />
          <Row label="Internet do navegador" kind="auto" r={auto.online} />
          <Row label="Navegador compatível" kind="auto" r={auto.browser} />
          <p className="mt-2 text-xs text-muted-foreground">Estar conectado não aprova nenhum equipamento. Leitor, impressora e gaveta só são aprovados nos testes manuais abaixo.</p>
        </section>
        <section className="mb-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-bold">Verificações manuais (no equipamento real)</h2>
          <Row label="Leitor de código de barras" kind="manual" r={manual('leitor')}>
            <span className="w-full"><input autoFocus className="w-full rounded-md border border-input bg-background p-2" placeholder="Clique aqui e passe um produto no leitor" value={scanVal} onChange={(e) => setScanVal(e.target.value)} onKeyDown={onScanKey} />
              {scan && <span className="mt-1 block text-sm">Lido: <b>{scan.code}</b> · {scan.product ? <span className="text-primary">{scan.product}</span> : <span className="text-destructive">produto não cadastrado</span>} · {scan.ms < 50 ? 'velocidade de leitor ✓' : 'parece digitação manual'}</span>}
              <span className="mt-1 flex"><OkNo k="leitor" note={scan ? `código ${scan.code}` : ''} /></span></span>
          </Row>
          <Row label="Impressora térmica" kind="manual" r={manual('impressao')}><button className={btn2} onClick={printTest}>Imprimir página de teste</button><OkNo k="impressao" /></Row>
          <Row label="Gaveta de dinheiro (opcional)" kind="manual" r={manual('gaveta')}><span className="text-xs text-muted-foreground">Abre pela impressora se o driver estiver configurado.</span><OkNo k="gaveta" /></Row>
          <Row label="Balança (opcional)" kind="manual" r={manual('balanca')}><span className="text-xs text-muted-foreground">Peso digitado no PDV (F6).</span><OkNo k="balanca" /></Row>
          <Row label="Tela cheia" kind="manual" r={manual('tela_cheia')}><button className={btn2} onClick={() => document.documentElement.requestFullscreen().catch(() => toast.error('Tela cheia bloqueada'))}>Testar</button><OkNo k="tela_cheia" /></Row>
          <Row label="Abertura de sessão e venda de teste" kind="manual" r={manual('venda_teste')}><Link to="/pdv" className={btn2}>Abrir PDV</Link><OkNo k="venda_teste" /></Row>
          <Row label="Fechamento de caixa de teste" kind="manual" r={manual('fechamento_teste')}><OkNo k="fechamento_teste" /></Row>
        </section>
        <section className="mb-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-bold">Integrações</h2>
          <Row label="Pagamentos" kind="auto" r={{ ok: null, msg: `Formas habilitadas: ${methods.join(', ') || '—'}. Cartão/PIX confirmados por NSU digitado (sem integração automática).` }} />
          <Row label="Fiscal (NFC-e)" kind="auto" r={{ ok: false, msg: fiscal ? 'Emissor fiscal não integrado — apenas cupom não fiscal' : 'Sem acesso aos dados fiscais' }} />
        </section>
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-bold">Pendências</h2>
          <ul className="list-disc pl-5 text-sm">{pend.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      </div>
    </div>
  )
}
