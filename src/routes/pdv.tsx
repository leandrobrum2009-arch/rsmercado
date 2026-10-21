import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export const Route = createFileRoute('/pdv')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Frente de Caixa (PDV) — RS Supermercado' },
      { name: 'description', content: 'Frente de caixa do RS Supermercado: vendas, pagamentos, abertura e fechamento de caixa.' },
      { property: 'og:title', content: 'Frente de Caixa (PDV) — RS Supermercado' },
      { property: 'og:description', content: 'Operação de caixa do RS Supermercado.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: PdvPage,
})

const db = supabase as any
const brl = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const parseNum = (s: string) => Number(String(s).replace(/\./g, '').replace(',', '.'))
const errMsg = (e: any) => e?.message || String(e)

type Product = { id: string; name: string; price: number; promo_price: number | null; barcode: string | null; code: string | null; sku: string | null; stock: number; is_weight_based: boolean | null; active: boolean; is_available: boolean; unit: string | null }
type Item = { key: string; product_id: string; name: string; code: string; unit_price: number; quantity: number; discount: number; weight: boolean }
type Method = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'voucher' | 'convenio'
type Pay = { method: Method; amount: number; transaction_id?: string; card_last4?: string }
const METHOD_LABEL: Record<Method, string> = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito', voucher: 'Voucher/VA', convenio: 'Convênio' }
type Modal = null | 'help' | 'search' | 'suspended' | 'customer' | 'price' | 'qty' | 'discount' | 'payment' | 'cancelItem' | 'movement' | 'close' | 'barcode' | 'settings' | 'receipt'

const unitPrice = (p: Product) => (p.promo_price && p.promo_price > 0 && p.promo_price < p.price ? Number(p.promo_price) : Number(p.price))
const PRODUCT_COLS = 'id,name,price,promo_price,barcode,code,sku,stock,is_weight_based,active,is_available,unit'

function PdvPage() {
  const [state, setState] = useState<'loading' | 'signedout' | 'denied' | 'ready'>('loading')
  const [user, setUser] = useState<any>(null)
  const [supervisor, setSupervisor] = useState(false)
  const [terminals, setTerminals] = useState<any[]>([])
  const [session, setSession] = useState<any>(null)

  const loadSession = useCallback(async (uid: string) => {
    const { data } = await db.from('pos_sessions').select('*, pos_terminals(code,name)').eq('status', 'open').eq('operator_id', uid).maybeSingle()
    setSession(data || null)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setState('signedout')
      setUser(user)
      const [{ data: can }, { data: sup }] = await Promise.all([db.rpc('pos_can_operate'), db.rpc('pos_is_supervisor')])
      if (!can) return setState('denied')
      setSupervisor(!!sup)
      const { data: t } = await db.from('pos_terminals').select('*').eq('active', true).order('code')
      setTerminals(t || [])
      await loadSession(user.id)
      setState('ready')
    })()
  }, [loadSession])

  if (state === 'loading') return <Center>Carregando caixa…</Center>
  if (state === 'signedout') return <Center><p className="mb-4">Entre com sua conta de operador para usar o caixa.</p><Link to="/profile" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Entrar</Link></Center>
  if (state === 'denied') return <Center><p>Sua conta não tem permissão de operador de caixa.</p><p className="mt-2 text-sm text-muted-foreground">Peça a um administrador para liberar a permissão “pos” (ou “pos_supervisor”).</p></Center>
  if (!session) return <OpenScreen terminals={terminals} onOpened={() => loadSession(user.id)} supervisor={supervisor} />
  return <SaleScreen session={session} user={user} supervisor={supervisor} onClosed={() => loadSession(user.id)} />
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-auto bg-background p-6 text-center text-foreground">{children}</div>
}

function OpenScreen({ terminals, onOpened, supervisor }: { terminals: any[]; onOpened: () => void; supervisor: boolean }) {
  const [terminal, setTerminal] = useState(terminals[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState(false)
  const open = async () => {
    const v = parseNum(amount || '0')
    if (!terminal) return toast.error('Selecione o terminal')
    if (isNaN(v) || v < 0) return toast.error('Fundo de troco inválido')
    setBusy(true)
    const { error } = await db.rpc('pos_open_session', { p_terminal: terminal, p_amount: v })
    setBusy(false)
    if (error) return toast.error(errMsg(error))
    toast.success('Caixa aberto')
    onOpened()
  }
  return (
    <Center>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-left shadow">
        <h1 className="mb-1 text-2xl font-bold">Abertura de caixa</h1>
        <p className="mb-6 text-sm text-muted-foreground">RS Supermercado — Matriz</p>
        <label className="mb-1 block text-sm font-medium">Terminal</label>
        <select className="mb-4 w-full rounded-md border border-input bg-background p-2" value={terminal} onChange={(e) => setTerminal(e.target.value)}>
          {terminals.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
        </select>
        <label className="mb-1 block text-sm font-medium">Fundo de troco (R$)</label>
        <input autoFocus className="mb-6 w-full rounded-md border border-input bg-background p-2 text-lg" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && open()} placeholder="0,00" />
        <button disabled={busy} onClick={open} className="w-full rounded-md bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">Abrir caixa</button>
        {supervisor && <button onClick={() => setSettings(true)} className="mt-3 w-full rounded-md border border-border py-2 text-sm">Configurações do caixa</button>}
        <Link to="/" className="mt-3 block text-center text-sm text-muted-foreground underline">Voltar ao site</Link>
      </div>
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </Center>
  )
}

function ModalShell({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`max-h-[90vh] w-full overflow-auto rounded-xl border border-border bg-card p-5 text-left text-card-foreground shadow-xl ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} className="text-sm text-muted-foreground">ESC ✕</button></div>
        {children}
      </div>
    </div>
  )
}

function SaleScreen({ session, user, supervisor, onClosed }: { session: any; user: any; supervisor: boolean; onClosed: () => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [saleDiscount, setSaleDiscount] = useState(0)
  const [customer, setCustomer] = useState('')
  const [pin, setPin] = useState<string | null>(null)
  const [suspendedId, setSuspendedId] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [code, setCode] = useState('')
  const [now, setNow] = useState(new Date())
  const [online, setOnline] = useState(true)
  const [pinAsk, setPinAsk] = useState<null | { resolve: (p: string | null) => void }>(null)
  const [receipt, setReceipt] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const busy = useRef(false)
  const clientId = useRef<string>(crypto.randomUUID())
  const [methods, setMethods] = useState<Method[]>(['dinheiro'])
  useEffect(() => { db.from('pos_settings').select('enabled_methods').eq('id', 1).maybeSingle().then(({ data }: any) => data?.enabled_methods && setMethods(data.enabled_methods)) }, [])

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => {
    const up = () => setOnline(navigator.onLine)
    window.addEventListener('online', up); window.addEventListener('offline', up)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', up) }
  }, [])
  useEffect(() => { if (!modal && !pinAsk) setTimeout(() => inputRef.current?.focus(), 0) }, [modal, pinAsk, items])

  const subtotal = useMemo(() => items.reduce((s, i) => s + Math.round(i.unit_price * i.quantity * 100) / 100, 0), [items])
  const itemDisc = useMemo(() => items.reduce((s, i) => s + i.discount, 0), [items])
  const total = Math.max(0, Math.round((subtotal - itemDisc - saleDiscount) * 100) / 100)
  const current = items.find((i) => i.key === selected) || items[items.length - 1]

  const log = (action: string, details: any = {}) => db.rpc('pos_log', { p_session: session.id, p_sale: null, p_action: action, p_details: details })

  const requirePin = (): Promise<string | null> => {
    if (supervisor) return Promise.resolve('supervisor')
    if (pin) return Promise.resolve(pin)
    return new Promise((resolve) => setPinAsk({ resolve }))
  }

  const addProduct = (p: Product, qty: number) => {
    if (!p.active || !p.is_available) return toast.error(`Produto indisponível: ${p.name}`)
    if (!p.is_weight_based && qty !== Math.trunc(qty)) return toast.error('Este produto não aceita quantidade fracionada')
    if (!(qty > 0)) return toast.error('Quantidade inválida')
    setItems((prev) => {
      const ex = prev.find((i) => i.product_id === p.id && i.discount === 0 && !p.is_weight_based)
      if (ex) { setSelected(ex.key); return prev.map((i) => (i === ex ? { ...i, quantity: i.quantity + qty } : i)) }
      const key = crypto.randomUUID(); setSelected(key)
      return [...prev, { key, product_id: p.id, name: p.name, code: p.barcode || p.code || p.sku || '', unit_price: unitPrice(p), quantity: qty, discount: 0, weight: !!p.is_weight_based }]
    })
    if (p.stock <= 0) toast.warning(`Estoque do sistema zerado: ${p.name}`)
  }

  const findByCode = async (c: string): Promise<Product | null> => {
    const v = c.trim()
    const { data } = await db.from('products').select(PRODUCT_COLS).is('deleted_at', null).or(`barcode.eq.${v},code.eq.${v},sku.eq.${v},alt_barcodes.cs.{${v}}`).limit(1)
    return data?.[0] || null
  }

  const submitCode = async () => {
    let raw = code.trim()
    if (!raw) return
    let qty = 1
    const m = raw.match(/^(\d+(?:[.,]\d+)?)\*(.+)$/)
    if (m) { qty = parseNum(m[1]); raw = m[2].trim() }
    setCode('')
    if (!/^[\w-]+$/.test(raw)) { setModal('search'); return }
    try {
      const p = await findByCode(raw)
      if (!p) { toast.error(`Código não encontrado: ${raw}`); return }
      addProduct(p, qty)
    } catch (e) { toast.error('Falha de conexão ao buscar produto') }
  }

  const resetSale = () => { setItems([]); setSaleDiscount(0); setCustomer(''); setSuspendedId(null); setSelected(null) }

  const suspend = async () => {
    if (!items.length) { setModal('suspended'); return }
    if (busy.current) return
    busy.current = true
    const { error } = await db.rpc('pos_suspend_sale', { p_session: session.id, p_draft: { items, saleDiscount, customer } })
    busy.current = false
    if (error) return toast.error(errMsg(error))
    if (suspendedId) await db.rpc('pos_discard_suspended', { p_sale: suspendedId })
    toast.success('Venda suspensa'); resetSale()
  }

  const cancelSale = async () => {
    if (!items.length) return
    if (!confirm('Cancelar a venda atual?')) return
    await log('venda_cancelada', { itens: items.length, total })
    resetSale(); toast('Venda cancelada')
  }

  const finalize = async (payments: Pay[]) => {
    if (busy.current) return
    busy.current = true
    try {
      const needPin = itemDisc + saleDiscount > 0
      const { data, error } = await db.rpc('pos_finalize_sale_v2', {
        p_session: session.id, p_client_id: clientId.current,
        p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, discount: i.discount })),
        p_sale_discount: saleDiscount, p_payments: payments, p_customer_doc: customer || null,
        p_pin: needPin && !supervisor ? pin : null, p_suspended_id: suspendedId,
      })
      if (error) { toast.error(errMsg(error)); return }
      setReceipt({ ...data, items: [...items], payments, customer, operator: user.email, terminal: session.pos_terminals?.code, at: new Date() })
      clientId.current = crypto.randomUUID()
      resetSale(); setPin(null); setModal('receipt')
    } finally { busy.current = false }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pinAsk) return
      if (e.key === 'Escape') { e.preventDefault(); if (modal !== 'receipt') setModal(null); else setModal(null); return }
      if (modal) return
      const map: Record<string, () => void> = {
        F1: () => setModal('help'), F2: () => setModal('search'), F3: suspend, F4: () => setModal('customer'), F5: () => setModal('price'),
        F6: () => items.length && setModal('qty'), F7: () => items.length && setModal('discount'), F8: () => items.length && setModal('payment'),
        F9: () => items.length && setModal('cancelItem'), F10: () => items.length && setModal('payment'),
      }
      if (map[e.key]) { e.preventDefault(); if (!e.repeat) map[e.key]() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border bg-card px-4 py-2 text-sm">
        <strong className="text-base text-primary">RS Supermercado · Matriz</strong>
        <span>Terminal <b>{session.pos_terminals?.code}</b></span>
        <span>Operador <b>{user.email}</b></span>
        <span>{now.toLocaleString('pt-BR')}</span>
        <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">{items.length ? 'EM OPERAÇÃO' : 'ABERTO'}</span>
        <span className={online ? 'text-primary' : 'text-destructive'}>● {online ? 'Conectado' : 'Sem conexão'}</span>
        <span className="text-muted-foreground">Fiscal: não configurado (cupom não fiscal)</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setModal('movement')} className="rounded border border-border px-2 py-1">Sangria / Suprimento</button>
          {supervisor && <button onClick={() => setModal('barcode')} className="rounded border border-border px-2 py-1">Vincular código</button>}
          {supervisor && <Link to="/retaguarda" className="rounded border border-border px-2 py-1">Retaguarda</Link>}
          {supervisor && <button onClick={() => setModal('settings')} className="rounded border border-border px-2 py-1">Config.</button>}
          <button onClick={() => (items.length ? toast.error('Finalize ou suspenda a venda antes de fechar') : setModal('close'))} className="rounded bg-destructive px-2 py-1 text-destructive-foreground">Fechar caixa</button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_380px]">
        <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-3">
            <input ref={inputRef} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCode()}
              onBlur={() => !modal && !pinAsk && setTimeout(() => { if (!document.activeElement || document.activeElement === document.body) inputRef.current?.focus() }, 50)}
              placeholder="Leia o código de barras ou digite (ex.: 3*7891234567890). F2 pesquisa por nome"
              className="w-full rounded-md border-2 border-primary bg-background p-3 text-xl outline-none" autoComplete="off" />
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-muted-foreground"><tr><th className="p-2">#</th><th>Código</th><th>Descrição</th><th className="text-right">Qtd</th><th className="text-right">Unit.</th><th className="text-right">Desc.</th><th className="p-2 text-right">Subtotal</th></tr></thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={i.key} onClick={() => setSelected(i.key)} className={`cursor-pointer border-b border-border ${current?.key === i.key ? 'bg-primary/10' : ''}`}>
                    <td className="p-2">{idx + 1}</td><td className="font-mono text-xs">{i.code || '—'}</td><td className="font-medium">{i.name}</td>
                    <td className="text-right">{i.weight ? i.quantity.toFixed(3) : i.quantity}</td><td className="text-right">{brl(i.unit_price)}</td>
                    <td className="text-right">{i.discount ? brl(i.discount) : ''}</td><td className="p-2 text-right font-semibold">{brl(i.unit_price * i.quantity - i.discount)}</td>
                  </tr>
                ))}
                {!items.length && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Caixa livre — aguardando leitura do primeiro produto</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            {current ? (<><p className="text-xs text-muted-foreground">Último item</p><p className="truncate text-lg font-bold">{current.name}</p><p>{current.quantity} × {brl(current.unit_price)}</p></>) : <p className="text-muted-foreground">Nenhum item</p>}
          </div>
          <div className="space-y-1 rounded-xl border border-border bg-card p-4 text-sm">
            <Row l="Itens" r={String(items.length)} />
            <Row l="Volumes" r={items.reduce((s, i) => s + (i.weight ? 1 : i.quantity), 0).toString()} />
            <Row l="Subtotal" r={brl(subtotal)} />
            <Row l="Descontos" r={brl(itemDisc + saleDiscount)} />
            {customer && <Row l="Cliente (CPF/CNPJ)" r={customer} />}
            {suspendedId && <p className="text-xs text-primary">Venda recuperada da suspensão</p>}
          </div>
          <div className="rounded-xl bg-primary p-5 text-primary-foreground">
            <p className="text-sm opacity-80">TOTAL</p><p className="text-5xl font-black tracking-tight">{brl(total)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['F1', 'Ajuda', () => setModal('help')], ['F2', 'Pesquisar', () => setModal('search')], ['F3', 'Suspender', suspend], ['F4', 'Cliente', () => setModal('customer')], ['F5', 'Consulta preço', () => setModal('price')], ['F6', 'Quantidade', () => items.length && setModal('qty')], ['F7', 'Desconto', () => items.length && setModal('discount')], ['F8', 'Pagamento', () => items.length && setModal('payment')], ['F9', 'Cancelar item', () => items.length && setModal('cancelItem')], ['F10', 'Finalizar', () => items.length && setModal('payment')]].map(([k, l, fn]: any) => (
              <button key={k} onClick={fn} className="rounded-md border border-border bg-card p-2 text-left hover:bg-muted"><b className="text-primary">{k}</b> {l}</button>
            ))}
            <button onClick={cancelSale} className="col-span-2 rounded-md border border-destructive p-2 text-destructive">Cancelar venda</button>
          </div>
        </aside>
      </div>

      {modal === 'help' && <ModalShell title="Atalhos do teclado" onClose={() => setModal(null)}>
        <ul className="space-y-1 text-sm">{['F1 Ajuda', 'F2 Pesquisar produto', 'F3 Suspender / recuperar venda', 'F4 Informar cliente', 'F5 Consultar preço', 'F6 Alterar quantidade', 'F7 Desconto (supervisor)', 'F8 Pagamento', 'F9 Cancelar item (supervisor)', 'F10 Finalizar', 'ESC Fechar janela', 'Qtd*código para multiplicar (ex.: 6*789...)'].map((s) => <li key={s}>{s}</li>)}</ul>
      </ModalShell>}
      {modal === 'search' && <SearchModal title="Pesquisar produto" onClose={() => setModal(null)} onPick={(p) => { setModal(null); if (p.is_weight_based) { const w = parseNum(prompt(`Peso em kg para ${p.name}`) || ''); if (w > 0) addProduct(p, Math.round(w * 1000) / 1000) } else addProduct(p, 1) }} />}
      {modal === 'price' && <SearchModal title="Consulta de preço" onClose={() => setModal(null)} />}
      {modal === 'customer' && <InputModal title="CPF/CNPJ do cliente" initial={customer} onClose={() => setModal(null)} onOk={(v) => { const d = v.replace(/\D/g, ''); if (d && d.length !== 11 && d.length !== 14) return toast.error('CPF/CNPJ inválido'); setCustomer(d); setModal(null) }} />}
      {modal === 'qty' && current && <InputModal title={`Quantidade — ${current.name}`} initial={String(current.quantity).replace('.', ',')} onClose={() => setModal(null)} onOk={async (v) => {
        const q = parseNum(v)
        if (!(q > 0) || (!current.weight && q !== Math.trunc(q))) return toast.error('Quantidade inválida')
        if (q < current.quantity) { const p = await requirePin(); if (!p) return; await log('quantidade_reduzida', { item: current.name, de: current.quantity, para: q }) }
        setItems((prev) => prev.map((i) => (i.key === current.key ? { ...i, quantity: q, discount: Math.min(i.discount, i.unit_price * q) } : i))); setModal(null)
      }} />}
      {modal === 'discount' && <DiscountModal current={current} subtotal={subtotal - itemDisc} onClose={() => setModal(null)} onApply={async (scope, value) => {
        const p = await requirePin(); if (!p) return
        if (scope === 'item' && current) { if (value > current.unit_price * current.quantity) return toast.error('Desconto maior que o item'); setItems((prev) => prev.map((i) => (i.key === current.key ? { ...i, discount: Math.round(value * 100) / 100 } : i))) }
        else { if (value > subtotal - itemDisc) return toast.error('Desconto maior que o total'); setSaleDiscount(Math.round(value * 100) / 100) }
        await log('desconto', { escopo: scope, valor: value }); setModal(null)
      }} />}
      {modal === 'cancelItem' && current && <ModalShell title="Cancelar item" onClose={() => setModal(null)}>
        <p className="mb-4">Remover <b>{current.name}</b> ({current.quantity} × {brl(current.unit_price)})?</p>
        <button className="w-full rounded-md bg-destructive py-2 text-destructive-foreground" onClick={async () => {
          const p = await requirePin(); if (!p) return
          await log('item_cancelado', { item: current.name, qtd: current.quantity, valor: current.unit_price * current.quantity })
          setItems((prev) => prev.filter((i) => i.key !== current.key)); setSelected(null); setModal(null)
        }}>Confirmar cancelamento</button>
      </ModalShell>}
      {modal === 'payment' && <PaymentModal methods={methods} total={total} onClose={() => setModal(null)} onFinish={finalize} />}
      {modal === 'suspended' && <SuspendedModal session={session} onClose={() => setModal(null)} onPick={(s) => {
        const d = s.draft || {}; setItems(d.items || []); setSaleDiscount(d.saleDiscount || 0); setCustomer(d.customer || ''); setSuspendedId(s.id); setModal(null); toast.success('Venda recuperada')
      }} />}
      {modal === 'movement' && <MovementModal session={session} requirePin={requirePin} onClose={() => setModal(null)} />}
      {modal === 'close' && <CloseModal session={session} onClose={() => setModal(null)} onClosed={onClosed} />}
      {modal === 'barcode' && <BarcodeModal onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
      {modal === 'receipt' && receipt && <ReceiptModal r={receipt} onClose={() => setModal(null)} />}
      {pinAsk && <PinModal onDone={(p) => { if (p) setPin(p); pinAsk.resolve(p); setPinAsk(null) }} />}
    </div>
  )
}

function Row({ l, r }: { l: string; r: string }) { return <div className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="font-medium">{r}</span></div> }

function InputModal({ title, initial = '', onClose, onOk }: { title: string; initial?: string; onClose: () => void; onOk: (v: string) => void }) {
  const [v, setV] = useState(initial)
  return <ModalShell title={title} onClose={onClose}>
    <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onOk(v)} className="mb-3 w-full rounded-md border border-input bg-background p-2 text-lg" />
    <button onClick={() => onOk(v)} className="w-full rounded-md bg-primary py-2 text-primary-foreground">Confirmar (Enter)</button>
  </ModalShell>
}

function PinModal({ onDone }: { onDone: (p: string | null) => void }) {
  const [v, setV] = useState('')
  const [busy, setBusy] = useState(false)
  const check = async () => {
    setBusy(true)
    const { data, error } = await db.rpc('pos_check_pin', { p_pin: v })
    setBusy(false)
    if (error || !data) { toast.error('PIN do supervisor inválido'); setV(''); return }
    onDone(v)
  }
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onDone(null); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onDone])
  return <ModalShell title="Autorização do supervisor" onClose={() => onDone(null)}>
    <input autoFocus type="password" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && check()} className="mb-3 w-full rounded-md border border-input bg-background p-2 text-lg" placeholder="PIN" />
    <button disabled={busy} onClick={check} className="w-full rounded-md bg-primary py-2 text-primary-foreground">Autorizar</button>
  </ModalShell>
}

function SearchModal({ title, onClose, onPick }: { title: string; onClose: () => void; onPick?: (p: Product) => void }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Product[]>([])
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setTimeout(async () => {
      const s = q.trim().replace(/[,%()]/g, ' ')
      if (s.length < 2) return setRows([])
      const { data } = await db.from('products').select(PRODUCT_COLS).is('deleted_at', null).or(`name.ilike.%${s}%,barcode.eq.${s},code.eq.${s},sku.eq.${s}`).order('name').limit(30)
      setRows(data || []); setIdx(0)
    }, 200)
    return () => clearTimeout(t)
  }, [q])
  return <ModalShell title={title} onClose={onClose} wide>
    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, código interno ou código de barras"
      onKeyDown={(e) => { if (e.key === 'ArrowDown') setIdx((i) => Math.min(i + 1, rows.length - 1)); if (e.key === 'ArrowUp') setIdx((i) => Math.max(i - 1, 0)); if (e.key === 'Enter' && rows[idx] && onPick) onPick(rows[idx]) }}
      className="mb-3 w-full rounded-md border border-input bg-background p-2 text-lg" />
    <div className="divide-y divide-border">
      {rows.map((p, i) => (
        <button key={p.id} onClick={() => onPick?.(p)} className={`flex w-full items-center justify-between p-2 text-left ${i === idx ? 'bg-primary/10' : ''} ${!p.active || !p.is_available ? 'opacity-50' : ''}`}>
          <span><b>{p.name}</b><span className="ml-2 text-xs text-muted-foreground">{p.barcode || p.code || 'sem código'} · estoque {Number(p.stock)}{p.is_weight_based ? ' kg' : ''}{!p.active || !p.is_available ? ' · INDISPONÍVEL' : ''}</span></span>
          <span className="font-bold">{brl(unitPrice(p))}{p.is_weight_based ? '/kg' : ''}</span>
        </button>
      ))}
      {q.length >= 2 && !rows.length && <p className="p-3 text-muted-foreground">Nenhum produto encontrado.</p>}
    </div>
  </ModalShell>
}

function DiscountModal({ current, subtotal, onClose, onApply }: { current?: Item; subtotal: number; onClose: () => void; onApply: (scope: 'item' | 'sale', v: number) => void }) {
  const [scope, setScope] = useState<'item' | 'sale'>('item')
  const [mode, setMode] = useState<'valor' | 'pct'>('valor')
  const [v, setV] = useState('')
  const base = scope === 'item' && current ? current.unit_price * current.quantity : subtotal
  const apply = () => { const n = parseNum(v); if (!(n >= 0)) return toast.error('Valor inválido'); onApply(scope, mode === 'pct' ? Math.round(base * n) / 100 : n) }
  return <ModalShell title="Desconto autorizado" onClose={onClose}>
    <div className="mb-3 flex gap-2">{(['item', 'sale'] as const).map((s) => <button key={s} onClick={() => setScope(s)} className={`flex-1 rounded border p-2 ${scope === s ? 'border-primary bg-primary/10' : 'border-border'}`}>{s === 'item' ? `Item: ${current?.name ?? ''}` : 'Venda inteira'}</button>)}</div>
    <div className="mb-3 flex gap-2">{(['valor', 'pct'] as const).map((s) => <button key={s} onClick={() => setMode(s)} className={`flex-1 rounded border p-2 ${mode === s ? 'border-primary bg-primary/10' : 'border-border'}`}>{s === 'valor' ? 'R$' : '%'}</button>)}</div>
    <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} className="mb-3 w-full rounded-md border border-input bg-background p-2 text-lg" placeholder="0" />
    <p className="mb-3 text-sm text-muted-foreground">Base: {brl(base)}</p>
    <button onClick={apply} className="w-full rounded-md bg-primary py-2 text-primary-foreground">Aplicar</button>
  </ModalShell>
}

function PaymentModal({ methods, total, onClose, onFinish }: { methods: Method[]; total: number; onClose: () => void; onFinish: (p: Pay[]) => void }) {
  const [pays, setPays] = useState<Pay[]>([])
  const [method, setMethod] = useState<Method>(methods[0] || 'dinheiro')
  const [tx, setTx] = useState('')
  const [last4, setLast4] = useState('')
  const paid = pays.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100)
  const [v, setV] = useState(remaining.toFixed(2).replace('.', ','))
  const [busy, setBusy] = useState(false)
  useEffect(() => setV(remaining.toFixed(2).replace('.', ',')), [remaining])
  const cash = pays.filter((p) => p.method === 'dinheiro').reduce((s, p) => s + p.amount, 0)
  const change = Math.max(0, Math.round((paid - total) * 100) / 100)
  const add = () => {
    const n = parseNum(v)
    if (!(n > 0)) return toast.error('Valor inválido')
    if (method !== 'dinheiro' && n > remaining + 0.001) return toast.error('Somente dinheiro pode exceder o valor (troco)')
    if (method !== 'dinheiro' && tx.trim().length < 4) return toast.error('Informe o código de autorização/NSU impresso pela maquininha ou app do PIX')
    if (last4 && !/^\d{4}$/.test(last4)) return toast.error('Informe apenas os 4 últimos dígitos do cartão')
    if (method !== 'dinheiro' && pays.some((p) => p.transaction_id === tx.trim())) return toast.error('Este código de autorização já foi lançado')
    setPays((p) => [...p, { method, amount: Math.round(n * 100) / 100, ...(method !== 'dinheiro' ? { transaction_id: tx.trim(), card_last4: last4 || undefined } : {}) }]); setTx(''); setLast4('')
  }
  const done = paid + 0.001 >= total && change <= cash + 0.001
  const finish = async () => { if (!done || busy) return; setBusy(true); await onFinish(pays); setBusy(false) }
  return <ModalShell title={`Pagamento — total ${brl(total)}`} onClose={onClose}>
    <p className="mb-3 rounded bg-accent px-2 py-1 text-xs text-accent-foreground">AMBIENTE SEM INTEGRAÇÃO (TEF/PIX não conectados): pagamentos eletrônicos só são aceitos com o código de autorização/NSU da maquininha.</p>
    <div className="mb-3 grid grid-cols-3 gap-2">{methods.map((m) => <button key={m} onClick={() => setMethod(m)} className={`rounded border p-2 text-sm ${method === m ? 'border-primary bg-primary/10' : 'border-border'}`}>{METHOD_LABEL[m]}</button>)}</div>
    {method !== 'dinheiro' && <div className="mb-2 flex gap-2"><input value={tx} onChange={(e) => setTx(e.target.value)} placeholder="Código de autorização / NSU" className="flex-1 rounded-md border border-input bg-background p-2" />{(method === 'debito' || method === 'credito' || method === 'voucher') && <input value={last4} maxLength={4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))} placeholder="4 últ. díg." className="w-24 rounded-md border border-input bg-background p-2" />}</div>}
    <div className="mb-3 flex gap-2"><input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (done) finish(); else add() } }} className="flex-1 rounded-md border border-input bg-background p-2 text-lg" /><button onClick={add} className="rounded-md border border-border px-3">Adicionar</button></div>
    <ul className="mb-3 space-y-1 text-sm">{pays.map((p, i) => <li key={i} className="flex justify-between"><span>{METHOD_LABEL[p.method]}{p.transaction_id ? ` · NSU ${p.transaction_id}` : ''}</span><span>{brl(p.amount)} <button className="ml-2 text-destructive" onClick={() => setPays((x) => x.filter((_, j) => j !== i))}>✕</button></span></li>)}</ul>
    <Row l="Pago" r={brl(paid)} /><Row l="Falta" r={brl(remaining)} /><Row l="Troco" r={brl(change)} />
    
    <button disabled={!done || busy} onClick={finish} className="mt-4 w-full rounded-md bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40">{busy ? 'Finalizando…' : 'Finalizar venda (Enter)'}</button>
  </ModalShell>
}

function SuspendedModal({ session, onClose, onPick }: { session: any; onClose: () => void; onPick: (s: any) => void }) {
  const [rows, setRows] = useState<any[]>([])
  const load = useCallback(async () => { const { data } = await db.from('pos_sales').select('id,created_at,draft').eq('session_id', session.id).eq('status', 'suspended').order('created_at'); setRows(data || []) }, [session.id])
  useEffect(() => { load() }, [load])
  return <ModalShell title="Vendas suspensas" onClose={onClose}>
    {!rows.length && <p className="text-muted-foreground">Nenhuma venda suspensa.</p>}
    {rows.map((s) => { const its = s.draft?.items || []; const t = its.reduce((a: number, i: Item) => a + i.unit_price * i.quantity - i.discount, 0)
      return <div key={s.id} className="mb-2 flex items-center justify-between rounded border border-border p-2 text-sm">
        <span>{new Date(s.created_at).toLocaleTimeString('pt-BR')} · {its.length} itens · {brl(t)}</span>
        <span className="flex gap-2"><button className="rounded bg-primary px-2 py-1 text-primary-foreground" onClick={() => onPick(s)}>Recuperar</button><button className="text-destructive" onClick={async () => { const { error } = await db.rpc('pos_discard_suspended', { p_sale: s.id }); if (error) toast.error(errMsg(error)); load() }}>Descartar</button></span>
      </div> })}
  </ModalShell>
}

function MovementModal({ session, requirePin, onClose }: { session: any; requirePin: () => Promise<string | null>; onClose: () => void }) {
  const [type, setType] = useState('sangria')
  const [v, setV] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    const n = parseNum(v)
    if (!(n > 0)) return toast.error('Valor inválido')
    if (reason.trim().length < 3) return toast.error('Informe o motivo')
    let p: string | null = null
    if (type === 'sangria' || type === 'retirada') { p = await requirePin(); if (!p) return }
    setBusy(true)
    const { error } = await db.rpc('pos_add_movement', { p_session: session.id, p_type: type, p_amount: n, p_reason: reason, p_pin: p === 'supervisor' ? null : p })
    setBusy(false)
    if (error) return toast.error(errMsg(error))
    toast.success('Movimentação registrada'); onClose()
  }
  return <ModalShell title="Movimentação de caixa" onClose={onClose}>
    <div className="mb-3 grid grid-cols-2 gap-2">{[['sangria', 'Sangria'], ['suprimento', 'Suprimento'], ['retirada', 'Retirada autorizada'], ['reforco', 'Reforço de troco']].map(([k, l]) => <button key={k} onClick={() => setType(k)} className={`rounded border p-2 text-sm ${type === k ? 'border-primary bg-primary/10' : 'border-border'}`}>{l}</button>)}</div>
    <input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="Valor (R$)" className="mb-2 w-full rounded-md border border-input bg-background p-2" />
    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" className="mb-3 w-full rounded-md border border-input bg-background p-2" />
    <button disabled={busy} onClick={save} className="w-full rounded-md bg-primary py-2 text-primary-foreground">Registrar</button>
  </ModalShell>
}

function CloseModal({ session, onClose, onClosed }: { session: any; onClose: () => void; onClosed: () => void }) {
  const [sum, setSum] = useState<any>(null)
  const [counted, setCounted] = useState('')
  const [just, setJust] = useState('')
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { db.rpc('pos_session_summary', { p_session: session.id }).then(({ data, error }: any) => (error ? toast.error(errMsg(error)) : setSum(data))) }, [session.id])
  const close = async () => {
    const n = parseNum(counted)
    if (!(n >= 0)) return toast.error('Informe o dinheiro contado')
    setBusy(true)
    const { data, error } = await db.rpc('pos_close_session', { p_session: session.id, p_counted: n, p_justification: just })
    setBusy(false)
    if (error) return toast.error(errMsg(error))
    setResult(data)
  }
  const s = result || sum
  return <ModalShell title={result ? 'Caixa fechado' : 'Fechamento de caixa'} onClose={result ? onClosed : onClose}>
    {s && <div className="mb-4 space-y-1 text-sm">
      <Row l="Fundo de troco" r={brl(s.fundo)} /><Row l={`Vendas (${s.qtd_vendas})`} r={brl(s.vendas)} />
      {Object.entries(s.por_pagamento || {}).map(([k, v]: any) => <Row key={k} l={`  ${k}`} r={brl(v)} />)}
      <Row l="Suprimentos" r={brl(s.suprimentos)} /><Row l="Sangrias/retiradas" r={brl(s.sangrias)} /><Row l="Cancelamentos" r={String(s.cancelamentos)} />
      {s.dinheiro_esperado !== undefined ? <Row l="Dinheiro esperado" r={brl(s.dinheiro_esperado)} /> : <p className="text-muted-foreground">Fechamento cego: conte o dinheiro sem ver o esperado.</p>}
      {result && <><Row l="Contado" r={brl(result.contado)} /><Row l="Diferença" r={brl(result.diferenca)} /></>}
    </div>}
    {!result ? <>
      <input autoFocus value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="Dinheiro contado na gaveta (R$)" className="mb-2 w-full rounded-md border border-input bg-background p-2" />
      <textarea value={just} onChange={(e) => setJust(e.target.value)} placeholder="Justificativa (obrigatória se houver divergência)" className="mb-3 w-full rounded-md border border-input bg-background p-2" />
      <button disabled={busy} onClick={close} className="w-full rounded-md bg-destructive py-2 text-destructive-foreground">Confirmar fechamento</button>
    </> : <div className="flex gap-2"><button onClick={() => window.print()} className="flex-1 rounded-md border border-border py-2">Imprimir relatório</button><button onClick={onClosed} className="flex-1 rounded-md bg-primary py-2 text-primary-foreground">Concluir</button></div>}
  </ModalShell>
}

function BarcodeModal({ onClose }: { onClose: () => void }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [code, setCode] = useState('')
  if (!product) return <SearchModal title="Vincular código de barras — escolha o produto" onClose={onClose} onPick={setProduct} />
  const save = async () => {
    const { error } = await db.rpc('pos_set_barcode', { p_product: product.id, p_barcode: code })
    if (error) return toast.error(errMsg(error))
    toast.success(`Código vinculado a ${product.name}`); setProduct(null); setCode('')
  }
  return <ModalShell title={`Código de barras — ${product.name}`} onClose={onClose}>
    <p className="mb-2 text-sm text-muted-foreground">Atual: {product.barcode || 'nenhum'}. Bipe o produto agora.</p>
    <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} className="mb-3 w-full rounded-md border border-input bg-background p-2 font-mono text-lg" />
    <button onClick={save} className="w-full rounded-md bg-primary py-2 text-primary-foreground">Salvar e vincular próximo</button>
  </ModalShell>
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [pin, setPinV] = useState('')
  const save = async () => { const { error } = await db.rpc('pos_set_supervisor_pin', { p_pin: pin }); if (error) return toast.error(errMsg(error)); toast.success('PIN do supervisor salvo'); setPinV('') }
  return <ModalShell title="Configurações do caixa" onClose={onClose}>
    <label className="mb-1 block text-sm font-medium">Novo PIN de supervisor (mín. 4 dígitos)</label>
    <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPinV(e.target.value)} className="mb-3 w-full rounded-md border border-input bg-background p-2" />
    <button onClick={save} className="w-full rounded-md bg-primary py-2 text-primary-foreground">Salvar PIN</button>
    <p className="mt-3 text-xs text-muted-foreground">Usado para autorizar descontos, cancelamento de itens, redução de quantidade e sangrias por operadores comuns. Administradores são autorizados automaticamente.</p>
  </ModalShell>
}

function ReceiptModal({ r, onClose }: { r: any; onClose: () => void }) {
  const print = () => {
    const w = window.open('', '_blank', 'width=360,height=640'); if (!w) return
    const lines = r.items.map((i: Item) => `<tr><td colspan=2>${i.name.replace(/</g, '')}</td></tr><tr><td>${i.quantity} x ${brl(i.unit_price)}${i.discount ? ' -' + brl(i.discount) : ''}</td><td style="text-align:right">${brl(i.unit_price * i.quantity - i.discount)}</td></tr>`).join('')
    w.document.write(`<html><body style="font-family:monospace;width:72mm;font-size:12px"><center><b>RS SUPERMERCADO</b><br/>CUPOM NÃO FISCAL<br/>Venda nº ${r.sale_number} · ${r.terminal}<br/>${r.at.toLocaleString('pt-BR')}</center><hr/><table style="width:100%">${lines}</table><hr/><table style="width:100%"><tr><td>Subtotal</td><td align=right>${brl(r.subtotal)}</td></tr><tr><td>Descontos</td><td align=right>${brl(r.discount)}</td></tr><tr><td><b>TOTAL</b></td><td align=right><b>${brl(r.total)}</b></td></tr>${r.payments.map((p: Pay) => `<tr><td>${METHOD_LABEL[p.method]}${p.transaction_id ? ' NSU ' + p.transaction_id : ''}</td><td align=right>${brl(p.amount)}</td></tr>`).join('')}<tr><td>Troco</td><td align=right>${brl(r.change)}</td></tr></table>${r.customer ? `<p>CPF/CNPJ: ${r.customer}</p>` : ''}<hr/><center><b>DOCUMENTO SEM VALOR FISCAL</b><br/>NFC-e não emitida</center><hr/><center>Operador: ${r.operator}<br/>Obrigado pela preferência!</center><script>window.print();setTimeout(()=>window.close(),500)</script></body></html>`)
    w.document.close()
  }
  return <ModalShell title={`Venda nº ${r.sale_number} finalizada`} onClose={onClose}>
    <p className="mb-1 text-3xl font-black">{brl(r.total)}</p>
    <p className="mb-1 text-lg">Troco: <b>{brl(r.change)}</b></p>
    <p className="mb-4 text-xs text-muted-foreground">Documento fiscal: não emitido (cupom não fiscal).{r.duplicate ? ' Esta venda já havia sido registrada — nada foi cobrado em dobro.' : ''}</p>
    <div className="flex gap-2"><button onClick={print} className="flex-1 rounded-md border border-border py-2">Imprimir cupom</button><button autoFocus onClick={onClose} className="flex-1 rounded-md bg-primary py-2 text-primary-foreground">Próxima venda (Enter)</button></div>
  </ModalShell>
}
