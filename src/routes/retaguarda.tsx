import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { parseCsv, matchImportRows, type ImportRow } from '@/lib/pos-import'
import { InventoryTab } from '@/components/retaguarda/InventoryTab'
import { ReportsTab, AuditTab, TerminalsTab } from '@/components/retaguarda/ReportTabs'

export const Route = createFileRoute('/retaguarda')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Retaguarda do Caixa — RS Supermercado' },
      { name: 'description', content: 'Configurações de pagamento, produtos, estoque, devoluções, fiscal e obrigações tributárias.' },
      { property: 'og:title', content: 'Retaguarda do Caixa — RS Supermercado' },
      { property: 'og:description', content: 'Gestão de retaguarda do PDV do RS Supermercado.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: Retaguarda,
})

const db = supabase as any
const brl = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (s: any) => Number(String(s ?? '').replace(/\./g, '').replace(',', '.'))
const err = (e: any) => toast.error(e?.message || String(e))
const input = 'w-full rounded-md border border-input bg-background p-2 text-sm'
const btn = 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50'
const btn2 = 'rounded-md border border-border px-3 py-2 text-sm'
const download = (name: string, rows: any[][]) => {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = name; a.click()
}

type Perms = { admin: boolean; sup: boolean; fiscal: boolean; stock: boolean; audit: boolean }
const TABS: [string, string, (p: Perms) => boolean][] = [
  ['rel', 'Relatórios', (p) => p.audit],
  ['pag', 'Pagamentos', (p) => p.admin],
  ['prod', 'Produtos', (p) => p.admin],
  ['imp', 'Importar planilha', (p) => p.admin],
  ['est', 'Estoque', (p) => p.sup || p.stock],
  ['inv', 'Inventário', (p) => p.sup || p.stock],
  ['dev', 'Devoluções', (p) => p.sup],
  ['fis', 'Fiscal', (p) => p.fiscal],
  ['trib', 'Obrigações tributárias', (p) => p.fiscal],
  ['term', 'Terminais / Piloto', (p) => p.admin],
  ['aud', 'Auditoria', (p) => p.audit],
]

function Retaguarda() {
  const [state, setState] = useState<'loading' | 'out' | 'denied' | 'ok'>('loading')
  const [perms, setPerms] = useState<Perms>({ admin: false, sup: false, fiscal: false, stock: false, audit: false })
  const [tab, setTab] = useState<string>('')
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setState('out')
      const r = await Promise.all([db.rpc('is_admin'), db.rpc('pos_is_supervisor'), db.rpc('pos_can_fiscal'), db.rpc('pos_has', { p_perm: 'pos_stock' }), db.rpc('pos_can_audit')])
      const p: Perms = { admin: !!r[0].data, sup: !!r[1].data, fiscal: !!r[2].data, stock: !!r[3].data, audit: !!r[4].data }
      const first = TABS.find(([, , f]) => f(p))
      if (!first) return setState('denied')
      setPerms(p); setTab(first[0]); setState('ok')
      db.rpc('pos_log_access', { p_area: 'retaguarda' }).then(() => {})
    })()
  }, [])
  if (state !== 'ok') return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background p-6 text-center">{state === 'loading' ? 'Carregando…' : state === 'out' ? <Link to="/profile" className={btn}>Entrar</Link> : 'Acesso restrito a perfis autorizados da retaguarda.'}</div>
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2">
        <strong className="mr-4 text-primary">Retaguarda · RS Supermercado</strong>
        {TABS.filter(([, , f]) => f(perms)).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded px-3 py-1 text-sm ${tab === k ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{l}</button>)}
        <Link to="/pdv" className={`ml-auto ${btn2}`}>Voltar ao caixa</Link>
      </header>
      <main className="flex-1 overflow-auto p-4">
        {tab === 'rel' && <ReportsTab />}
        {tab === 'pag' && <PaymentsTab />}
        {tab === 'prod' && <ProductsTab />}
        {tab === 'imp' && <ImportTab />}
        {tab === 'est' && <StockTab />}
        {tab === 'inv' && <InventoryTab />}
        {tab === 'dev' && <ReturnsTab />}
        {tab === 'fis' && <FiscalTab />}
        {tab === 'trib' && <TaxTab />}
        {tab === 'term' && <TerminalsTab />}
        {tab === 'aud' && <AuditTab />}
      </main>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-4 rounded-xl border border-border bg-card p-4"><h2 className="mb-3 font-bold">{title}</h2>{children}</section>
}

const ALL_METHODS = [['dinheiro', 'Dinheiro'], ['pix', 'PIX'], ['debito', 'Cartão de débito'], ['credito', 'Cartão de crédito'], ['voucher', 'Voucher / vale-alimentação'], ['convenio', 'Convênio / crediário']]

function PaymentsTab() {
  const [s, setS] = useState<any>(null)
  useEffect(() => { db.from('pos_settings').select('enabled_methods,allow_negative_stock,blind_close,divergence_tolerance').eq('id', 1).maybeSingle().then(({ data }: any) => setS(data || { enabled_methods: ['dinheiro'], allow_negative_stock: false, blind_close: false, divergence_tolerance: 5 })) }, [])
  if (!s) return null
  const toggle = (m: string) => setS({ ...s, enabled_methods: s.enabled_methods.includes(m) ? s.enabled_methods.filter((x: string) => x !== m) : [...s.enabled_methods, m] })
  const save = async () => { const { error } = await db.rpc('pos_update_settings', { p_methods: s.enabled_methods, p_allow_negative: s.allow_negative_stock, p_blind: s.blind_close, p_tolerance: num(s.divergence_tolerance) }); error ? err(error) : toast.success('Configurações salvas') }
  return <div className="max-w-xl">
    <Card title="Formas de pagamento aceitas no caixa">
      {ALL_METHODS.map(([k, l]) => <label key={k} className="mb-2 flex items-center gap-2"><input type="checkbox" checked={s.enabled_methods.includes(k)} onChange={() => toggle(k)} /> {l}</label>)}
      <p className="mt-2 rounded bg-accent p-2 text-xs text-accent-foreground">Sem TEF/PIX integrados: todo pagamento eletrônico exige o código de autorização (NSU) da maquininha, e o mesmo código não pode ser usado em duas vendas. Nenhuma aprovação é simulada.</p>
    </Card>
    <Card title="Regras do caixa">
      <label className="mb-2 flex items-center gap-2"><input type="checkbox" checked={s.blind_close} onChange={(e) => setS({ ...s, blind_close: e.target.checked })} /> Fechamento cego (operador não vê o valor esperado)</label>
      <label className="mb-2 flex items-center gap-2"><input type="checkbox" checked={s.allow_negative_stock} onChange={(e) => setS({ ...s, allow_negative_stock: e.target.checked })} /> Permitir vender com estoque negativo (não recomendado)</label>
      <label className="block text-sm">Diferença aceita no fechamento sem justificativa (R$)<input className={input} value={s.divergence_tolerance} onChange={(e) => setS({ ...s, divergence_tolerance: e.target.value })} /></label>
    </Card>
    <button onClick={save} className={btn}>Salvar</button>
  </div>
}

const PCOLS = 'id,name,code,barcode,alt_barcodes,price,promo_price,cost,stock,min_stock,unit,brand,subcategory,supplier_id,is_weight_based,active,ncm,cest,origin,category_id'

function ProductsTab() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [hist, setHist] = useState<any[]>([])
  useEffect(() => { db.from('suppliers').select('id,name').order('name').then(({ data }: any) => setSuppliers(data || [])) }, [])
  useEffect(() => { const t = setTimeout(async () => { const s = q.trim().replace(/[,%()]/g, ' '); let r = db.from('products').select(PCOLS).is('deleted_at', null).order('name').limit(50); if (s) r = r.or(`name.ilike.%${s}%,code.eq.${s},barcode.eq.${s}`); const { data } = await r; setRows(data || []) }, 250); return () => clearTimeout(t) }, [q])
  const open = async (p: any) => { setEdit({ ...p, alt: (p.alt_barcodes || []).join(', ') }); const { data } = await db.from('product_price_history').select('*').eq('product_id', p.id).order('created_at', { ascending: false }).limit(10); setHist(data || []) }
  const save = async () => {
    const e = edit
    const { error } = await db.rpc('pos_update_product_admin', { p_product: e.id, p_data: { code: e.code ?? '', barcode: e.barcode ?? '', price: num(e.price), cost: e.cost === '' || e.cost == null ? '' : num(e.cost), min_stock: num(e.min_stock || 0), ncm: e.ncm ?? '', cest: e.cest ?? '', origin: e.origin ?? '', unit: e.unit ?? '', brand: e.brand ?? '', subcategory: e.subcategory ?? '', supplier_id: e.supplier_id ?? '', is_weight_based: !!e.is_weight_based, active: !!e.active, alt_barcodes: String(e.alt || '').split(',').map((x: string) => x.trim()).filter(Boolean) } })
    if (error) return err(error)
    toast.success('Produto salvo'); setEdit(null); setQ((x) => x + '')
  }
  const margin = (p: any) => (p.cost > 0 && p.price > 0 ? `${(((p.price - p.cost) / p.price) * 100).toFixed(1)}%` : '—')
  const F = ({ k, l, w }: { k: string; l: string; w?: string }) => <label className={`text-xs ${w || ''}`}>{l}<input className={input} value={edit[k] ?? ''} onChange={(ev) => setEdit({ ...edit, [k]: ev.target.value })} /></label>
  return <div>
    <input className={`${input} mb-3 max-w-md`} placeholder="Buscar por nome, código interno ou código de barras" value={q} onChange={(e) => setQ(e.target.value)} />
    <table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="p-2">Produto</th><th>Cód.</th><th>Barras</th><th className="text-right">Preço</th><th className="text-right">Custo</th><th className="text-right">Margem</th><th className="text-right">Estoque</th><th>NCM</th><th></th></tr></thead>
      <tbody>{rows.map((p) => <tr key={p.id} className="border-b border-border"><td className="p-2">{p.name}{!p.active && <span className="ml-1 text-xs text-destructive">inativo</span>}</td><td>{p.code}</td><td className="font-mono text-xs">{p.barcode}</td><td className="text-right">{brl(p.price)}</td><td className="text-right">{p.cost ? brl(p.cost) : '—'}</td><td className="text-right">{margin(p)}</td><td className={`text-right ${Number(p.stock) <= Number(p.min_stock) ? 'font-bold text-destructive' : ''}`}>{Number(p.stock)}</td><td>{p.ncm || <span className="text-xs text-muted-foreground">pendente</span>}</td><td><button className="text-primary underline" onClick={() => open(p)}>Editar</button></td></tr>)}</tbody></table>
    {edit && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/50 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-card p-5">
      <h3 className="mb-3 font-bold">{edit.name}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <F k="code" l="Código interno" /><F k="barcode" l="Código de barras" /><F k="alt" l="Códigos alternativos (vírgula)" w="col-span-2" />
        <F k="price" l="Preço de venda" /><F k="cost" l="Custo" /><F k="min_stock" l="Estoque mínimo" /><F k="unit" l="Unidade (UN, KG…)" />
        <F k="brand" l="Marca" /><F k="subcategory" l="Subcategoria" />
        <label className="col-span-2 text-xs">Fornecedor<select className={input} value={edit.supplier_id || ''} onChange={(e) => setEdit({ ...edit, supplier_id: e.target.value })}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <F k="ncm" l="NCM" /><F k="cest" l="CEST" /><F k="origin" l="Origem (0–8)" />
        <label className="flex items-end gap-2 text-sm"><input type="checkbox" checked={!!edit.is_weight_based} onChange={(e) => setEdit({ ...edit, is_weight_based: e.target.checked })} /> Pesável</label>
        <label className="flex items-end gap-2 text-sm"><input type="checkbox" checked={!!edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Ativo</label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Margem: {margin({ price: num(edit.price), cost: num(edit.cost) })}. NCM, CEST, origem e dados tributários devem ser informados ou validados pelo contador — o sistema não preenche automaticamente.</p>
      {!!hist.length && <div className="mt-3 text-xs"><b>Histórico de preço</b>{hist.map((h) => <div key={h.id}>{new Date(h.created_at).toLocaleString('pt-BR')}: {brl(h.old_price)} → {brl(h.new_price)}{h.new_cost !== h.old_cost ? ` · custo ${brl(h.old_cost)} → ${brl(h.new_cost)}` : ''}</div>)}</div>}
      <div className="mt-4 flex gap-2"><button className={btn} onClick={save}>Salvar</button><button className={btn2} onClick={() => setEdit(null)}>Cancelar</button></div>
    </div></div>}
  </div>
}

function ImportTab() {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ ok: number; fail: string[] } | null>(null)
  const onFile = async (f: File) => {
    setDone(null)
    const parsed = parseCsv(await f.text())
    const { data } = await db.from('products').select('id,name,code,barcode').is('deleted_at', null).range(0, 9999)
    setRows(matchImportRows(parsed, data || []))
  }
  const valid = rows.filter((r) => r.productId && !r.errors.length)
  const apply = async () => {
    setBusy(true); const fail: string[] = []; let ok = 0
    for (const r of valid) { const { error } = await db.rpc('pos_update_product_admin', { p_product: r.productId, p_data: r.data }); if (error) fail.push(`Linha ${r.line}: ${error.message}`); else ok++ }
    setBusy(false); setDone({ ok, fail })
  }
  return <div className="max-w-5xl">
    <Card title="Importar planilha (CSV)">
      <p className="mb-2 text-sm text-muted-foreground">Colunas aceitas (cabeçalho): <code>codigo; codigo_barras; nome; preco; custo; estoque_minimo; unidade; marca; ncm; cest; origem</code>. O produto é encontrado pelo código interno, código de barras ou nome exato. Produtos não encontrados não são criados, para evitar duplicidade.</p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </Card>
    {!!rows.length && <Card title={`Pré-visualização — ${valid.length} prontas, ${rows.length - valid.length} com problema`}>
      <div className="max-h-96 overflow-auto"><table className="w-full text-xs"><thead className="bg-muted text-left"><tr><th className="p-1">Linha</th><th>Produto encontrado</th><th>Alterações</th><th>Problemas</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.line} className="border-b border-border"><td className="p-1">{r.line}</td><td>{r.productName || '—'}</td><td>{Object.entries(r.data).map(([k, v]) => `${k}=${v}`).join(', ')}</td><td className="text-destructive">{r.errors.join('; ')}</td></tr>)}</tbody></table></div>
      <button disabled={busy || !valid.length} onClick={apply} className={`${btn} mt-3`}>{busy ? 'Importando…' : `Aplicar ${valid.length} linhas`}</button>
      <button className={`${btn2} ml-2`} onClick={() => download('erros-importacao.csv', [['linha', 'erros'], ...rows.filter((r) => r.errors.length).map((r) => [r.line, r.errors.join('; ')])])}>Baixar relatório de erros</button>
      {done && <p className="mt-2 text-sm">{done.ok} produtos atualizados. {done.fail.length ? `Falhas: ${done.fail.join(' | ')}` : ''}</p>}
    </Card>}
  </div>
}

const MOV_LABEL: Record<string, string> = { venda_pdv: 'Venda PDV', devolucao: 'Devolução', entrada: 'Entrada', ajuste_mais: 'Ajuste +', ajuste_menos: 'Ajuste −', perda: 'Perda', avaria: 'Avaria', transferencia_saida: 'Transferência saída', transferencia_entrada: 'Transferência entrada' }

function StockTab() {
  const [movs, setMovs] = useState<any[]>([])
  const [low, setLow] = useState<any[]>([])
  const [form, setForm] = useState({ q: '', product: null as any, type: 'entrada', qty: '', reason: '' })
  const [found, setFound] = useState<any[]>([])
  const load = useCallback(async () => {
    const { data } = await db.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(200)
    const ids = [...new Set((data || []).map((m: any) => m.product_id))]
    const { data: ps } = ids.length ? await db.from('products').select('id,name').in('id', ids) : { data: [] }
    const nm = Object.fromEntries((ps || []).map((p: any) => [p.id, p.name]))
    setMovs((data || []).map((m: any) => ({ ...m, name: nm[m.product_id] })))
    const { data: all } = await db.from('products').select('id,name,stock,min_stock').is('deleted_at', null).eq('active', true).range(0, 9999)
    setLow((all || []).filter((p: any) => Number(p.stock) <= Number(p.min_stock || 0)).sort((a: any, b: any) => a.stock - b.stock))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { const s = form.q.trim(); if (s.length < 2 || form.product) return setFound([]); const t = setTimeout(async () => { const { data } = await db.from('products').select('id,name,stock').is('deleted_at', null).ilike('name', `%${s.replace(/[%,()]/g, ' ')}%`).limit(10); setFound(data || []) }, 250); return () => clearTimeout(t) }, [form.q, form.product])
  const save = async () => {
    if (!form.product) return toast.error('Escolha o produto')
    const { error } = await db.rpc('pos_stock_adjust', { p_product: form.product.id, p_type: form.type, p_quantity: num(form.qty), p_reason: form.reason })
    if (error) return err(error)
    toast.success('Movimentação registrada'); setForm({ q: '', product: null, type: 'entrada', qty: '', reason: '' }); load()
  }
  const giro = useMemo(() => { const m: Record<string, { name: string; q: number }> = {}; movs.filter((x) => x.type === 'venda_pdv').forEach((x) => { m[x.product_id] = { name: x.name, q: (m[x.product_id]?.q || 0) - Number(x.quantity) } }); return Object.values(m).sort((a, b) => b.q - a.q).slice(0, 10) }, [movs])
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="Nova movimentação">
      {form.product ? <p className="mb-2 text-sm">Produto: <b>{form.product.name}</b> (estoque {Number(form.product.stock)}) <button className="text-primary underline" onClick={() => setForm({ ...form, product: null })}>trocar</button></p>
        : <><input className={input} placeholder="Buscar produto" value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} />{found.map((p) => <button key={p.id} className="block w-full p-1 text-left text-sm hover:bg-muted" onClick={() => setForm({ ...form, product: p })}>{p.name} · {Number(p.stock)}</button>)}</>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['entrada', 'ajuste_mais', 'ajuste_menos', 'perda', 'avaria', 'transferencia_saida', 'transferencia_entrada'].map((t) => <option key={t} value={t}>{MOV_LABEL[t]}</option>)}</select>
        <input className={input} placeholder="Quantidade" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
      </div>
      <input className={`${input} mt-2`} placeholder="Motivo / documento" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      <button className={`${btn} mt-2`} onClick={save}>Registrar</button>
    </Card>
    <Card title={`Abaixo do mínimo ou sem estoque (${low.length})`}><div className="max-h-64 overflow-auto text-sm">{low.slice(0, 100).map((p) => <div key={p.id} className="flex justify-between border-b border-border py-1"><span>{p.name}</span><span className={Number(p.stock) <= 0 ? 'text-destructive' : ''}>{Number(p.stock)} / mín {Number(p.min_stock || 0)}</span></div>)}</div></Card>
    <Card title="Giro — mais vendidos no PDV (últimas movimentações)">{giro.length ? giro.map((g) => <div key={g.name} className="flex justify-between text-sm"><span>{g.name}</span><b>{g.q}</b></div>) : <p className="text-sm text-muted-foreground">Sem vendas ainda.</p>}</Card>
    <Card title="Histórico de movimentações">
      <button className={`${btn2} mb-2`} onClick={() => download('movimentacoes-estoque.csv', [['data', 'produto', 'tipo', 'quantidade'], ...movs.map((m) => [new Date(m.created_at).toLocaleString('pt-BR'), m.name, MOV_LABEL[m.type] || m.type, m.quantity])])}>Exportar CSV</button>
      <div className="max-h-64 overflow-auto text-xs">{movs.map((m) => <div key={m.id} className="flex justify-between border-b border-border py-1"><span>{new Date(m.created_at).toLocaleString('pt-BR')} · {m.name}</span><span>{MOV_LABEL[m.type] || m.type} <b className={m.quantity < 0 ? 'text-destructive' : 'text-primary'}>{m.quantity > 0 ? '+' : ''}{Number(m.quantity)}</b></span></div>)}</div>
    </Card>
  </div>
}

function ReturnsTab() {
  const [num_, setNum] = useState('')
  const [sale, setSale] = useState<any>(null)
  const [qty, setQty] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [method, setMethod] = useState('dinheiro')
  const [restock, setRestock] = useState(true)
  const [list, setList] = useState<any[]>([])
  const loadList = useCallback(async () => { const { data } = await db.from('pos_returns').select('*').order('created_at', { ascending: false }).limit(50); setList(data || []) }, [])
  useEffect(() => { loadList() }, [loadList])
  const find = async () => {
    const { data, error } = await db.from('pos_sales').select('*, pos_sale_items(*), pos_payments(*)').eq('sale_number', Number(num_)).eq('status', 'completed').maybeSingle()
    if (error || !data) { setSale(null); return toast.error('Venda concluída não encontrada') }
    setSale(data); setQty({})
  }
  const submit = async () => {
    const items = Object.entries(qty).filter(([, v]) => num(v) > 0).map(([id, v]) => ({ sale_item_id: id, quantity: num(v) }))
    const { data, error } = await db.rpc('pos_return_sale', { p_sale: sale.id, p_items: items, p_reason: reason, p_refund_method: method, p_restock: restock })
    if (error) return err(error)
    toast.success(`Devolução registrada: ${brl(data.amount)} a reembolsar`); setSale(null); setReason(''); loadList()
  }
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="Registrar devolução">
      <div className="flex gap-2"><input className={input} placeholder="Nº da venda (cupom)" value={num_} onChange={(e) => setNum(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && find()} /><button className={btn} onClick={find}>Buscar</button></div>
      {sale && <div className="mt-3 text-sm">
        <p className="mb-2">Venda {sale.sale_number} · {new Date(sale.finalized_at).toLocaleString('pt-BR')} · {brl(sale.total)} · pago com {sale.pos_payments.map((p: any) => p.method).join(', ')}{sale.customer_doc ? ` · CPF/CNPJ ${sale.customer_doc}` : ''}</p>
        {sale.pos_sale_items.map((i: any) => <div key={i.id} className="mb-1 flex items-center justify-between gap-2"><span>{i.name} ({Number(i.quantity)} × {brl(i.unit_price)})</span><input className="w-20 rounded border border-input bg-background p-1" placeholder="qtd" value={qty[i.id] || ''} onChange={(e) => setQty({ ...qty, [i.id]: e.target.value })} /></div>)}
        <input className={`${input} mt-2`} placeholder="Motivo da devolução" value={reason} onChange={(e) => setReason(e.target.value)} />
        <select className={`${input} mt-2`} value={method} onChange={(e) => setMethod(e.target.value)}><option value="dinheiro">Reembolso em dinheiro</option><option value="pix">Reembolso via PIX</option><option value="estorno_cartao">Estorno no cartão (fazer na maquininha)</option><option value="vale_troca">Vale-troca</option></select>
        <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Mercadoria volta ao estoque</label>
        <button className={`${btn} mt-2`} onClick={submit}>Confirmar devolução</button>
      </div>}
    </Card>
    <Card title="Devoluções registradas">{list.map((r) => <div key={r.id} className="border-b border-border py-1 text-sm">{new Date(r.created_at).toLocaleString('pt-BR')} · {brl(r.refund_amount)} · {r.refund_method} · {r.reason}</div>)}{!list.length && <p className="text-sm text-muted-foreground">Nenhuma devolução.</p>}</Card>
  </div>
}

function FiscalTab() {
  const [cfg, setCfg] = useState<any>({})
  const [docs, setDocs] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  useEffect(() => {
    db.from('fiscal_config').select('*').eq('id', 1).maybeSingle().then(({ data }: any) => setCfg(data || { id: 1, environment: 'homologacao' }))
    db.from('fiscal_documents').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }: any) => setDocs(data || []))
    db.from('pos_sales').select('id,sale_number,total,finalized_at,fiscal_status').eq('status', 'completed').eq('fiscal_status', 'nao_emitido').order('finalized_at', { ascending: false }).limit(100).then(({ data }: any) => setPending(data || []))
  }, [])
  const save = async () => { const { id: _i, updated_at: _u, ...rest } = cfg; const { error } = await db.from('fiscal_config').upsert({ id: 1, ...rest, environment: 'homologacao', updated_at: new Date().toISOString() }); error ? err(error) : toast.success('Dados fiscais salvos') }
  const F = ({ k, l }: { k: string; l: string }) => <label className="text-xs">{l}<input className={input} value={cfg[k] ?? ''} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} /></label>
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="Fiscal e Documentos Fiscais">
      <p className="mb-3 rounded bg-destructive/10 p-2 text-sm text-destructive"><b>Emissão NFC-e/NF-e NÃO integrada.</b> Nenhum documento fiscal é emitido ou simulado. As vendas do caixa geram apenas cupom não fiscal até a contratação do emissor e o envio do certificado A1 e do CSC.</p>
      <div className="grid grid-cols-2 gap-2"><F k="cnpj" l="CNPJ" /><F k="ie" l="Inscrição estadual" /><F k="uf" l="UF" /><F k="regime" l="Regime tributário" /><F k="nfce_series" l="Série NFC-e" /><F k="nfce_next_number" l="Próximo número" /><F k="provider" l="Emissor escolhido" /></div>
      <label className="mt-2 block text-xs">Observações do contador<textarea className={input} value={cfg.notes ?? ''} onChange={(e) => setCfg({ ...cfg, notes: e.target.value })} /></label>
      <p className="mt-2 text-xs">Ambiente: <b>Homologação</b> (produção só após configuração e autorização expressa).</p>
      <button className={`${btn} mt-2`} onClick={save}>Salvar</button>
    </Card>
    <Card title={`Vendas sem documento fiscal (${pending.length})`}>
      <button className={`${btn2} mb-2`} onClick={() => download('vendas-sem-nfce.csv', [['venda', 'data', 'total'], ...pending.map((s) => [s.sale_number, new Date(s.finalized_at).toLocaleString('pt-BR'), s.total])])}>Exportar para contabilidade</button>
      <div className="max-h-64 overflow-auto text-sm">{pending.map((s) => <div key={s.id} className="flex justify-between border-b border-border py-1"><span>Venda {s.sale_number} · {new Date(s.finalized_at).toLocaleString('pt-BR')}</span><span>{brl(s.total)} · <span className="text-muted-foreground">não emitido</span></span></div>)}</div>
    </Card>
    <Card title="Documentos fiscais emitidos">{docs.length ? docs.map((d) => <div key={d.id} className="text-sm">Mod. {d.model} · série {d.series} nº {d.number} · {d.status} {d.protocol ? `· prot. ${d.protocol}` : ''}</div>) : <p className="text-sm text-muted-foreground">Nenhum documento emitido.</p>}</Card>
  </div>
}

const TAX_TYPES = ['DARF', 'DAS', 'GARE / ICMS', 'GPS / INSS', 'FGTS', 'ISS', 'Outro']
const emptyTax = { doc_type: 'DARF', description: '', period: '', revenue_code: '', due_date: '', principal: '', fine: '', interest: '', status: 'pendente', paid_at: '' }

function TaxTab() {
  const [rows, setRows] = useState<any[]>([])
  const [f, setF] = useState<any>(emptyTax)
  const [filter, setFilter] = useState({ status: '', from: '', to: '' })
  const [file, setFile] = useState<File | null>(null)
  const load = useCallback(async () => {
    let q = db.from('tax_obligations').select('*').order('due_date')
    if (filter.status) q = q.eq('status', filter.status)
    if (filter.from) q = q.gte('due_date', filter.from)
    if (filter.to) q = q.lte('due_date', filter.to)
    const { data } = await q; setRows(data || [])
  }, [filter])
  useEffect(() => { load() }, [load])
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const statusOf = (r: any) => (r.status === 'pendente' && r.due_date < today ? 'vencido' : r.status)
  const save = async () => {
    if (!f.due_date) return toast.error('Informe o vencimento')
    let attachment_url = f.attachment_url || null
    if (file) { const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`; const { error } = await supabase.storage.from('tax-documents').upload(path, file); if (error) return err(error); attachment_url = path }
    const payload = { doc_type: f.doc_type, description: f.description || null, period: f.period || null, revenue_code: f.revenue_code || null, due_date: f.due_date, principal: num(f.principal || 0), fine: num(f.fine || 0), interest: num(f.interest || 0), status: f.status, paid_at: f.paid_at || null, attachment_url }
    const { error } = f.id ? await db.from('tax_obligations').update(payload).eq('id', f.id) : await db.from('tax_obligations').insert(payload)
    if (error) return err(error)
    toast.success('Obrigação salva'); setF(emptyTax); setFile(null); load()
  }
  const openFile = async (path: string) => { const { data, error } = await supabase.storage.from('tax-documents').createSignedUrl(path, 300); if (error) return err(error); window.open(data.signedUrl, '_blank') }
  const F = ({ k, l, t }: { k: string; l: string; t?: string }) => <label className="text-xs">{l}<input type={t || 'text'} className={input} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  const alerts = rows.filter((r) => r.status === 'pendente' && r.due_date <= soon)
  return <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
    <Card title={f.id ? 'Editar obrigação' : 'Nova obrigação'}>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Tipo<select className={input} value={f.doc_type} onChange={(e) => setF({ ...f, doc_type: e.target.value })}>{TAX_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <F k="period" l="Período de apuração" /><F k="revenue_code" l="Código da receita" /><F k="due_date" l="Vencimento" t="date" />
        <F k="principal" l="Principal (R$)" /><F k="fine" l="Multa (R$)" /><F k="interest" l="Juros (R$)" />
        <label className="text-xs">Situação<select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{['pendente', 'pago', 'cancelado'].map((s) => <option key={s}>{s}</option>)}</select></label>
        {f.status === 'pago' && <F k="paid_at" l="Data do pagamento" t="date" />}
      </div>
      <F k="description" l="Descrição" />
      <label className="mt-2 block text-xs">Anexo (PDF/comprovante)<input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
      <p className="mt-2 text-xs text-muted-foreground">Total: {brl(num(f.principal || 0) + num(f.fine || 0) + num(f.interest || 0))}. Os valores são lançados conforme a guia oficial — o sistema não calcula tributos.</p>
      <div className="mt-2 flex gap-2"><button className={btn} onClick={save}>Salvar</button>{f.id && <button className={btn2} onClick={() => setF(emptyTax)}>Novo</button>}</div>
    </Card>
    <div>
      {!!alerts.length && <div className="mb-3 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm text-destructive"><b>Atenção:</b> {alerts.length} obrigação(ões) vencida(s) ou vencendo em até 7 dias: {alerts.map((a) => `${a.doc_type} ${new Date(a.due_date + 'T12:00').toLocaleDateString('pt-BR')}`).join(', ')}</div>}
      <div className="mb-3 flex flex-wrap gap-2">
        <select className="rounded border border-input bg-background p-2 text-sm" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}><option value="">Todas</option>{['pendente', 'pago', 'cancelado'].map((s) => <option key={s}>{s}</option>)}</select>
        <input type="date" className="rounded border border-input bg-background p-2 text-sm" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
        <input type="date" className="rounded border border-input bg-background p-2 text-sm" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
        <button className={btn2} onClick={() => download('obrigacoes-tributarias.csv', [['tipo', 'periodo', 'codigo', 'vencimento', 'principal', 'multa', 'juros', 'total', 'situacao', 'pago_em'], ...rows.map((r) => [r.doc_type, r.period, r.revenue_code, r.due_date, r.principal, r.fine, r.interest, r.total, statusOf(r), r.paid_at])])}>Exportar CSV</button>
      </div>
      <table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="p-2">Tipo</th><th>Período</th><th>Vencimento</th><th className="text-right">Total</th><th>Situação</th><th></th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-border"><td className="p-2">{r.doc_type}{r.revenue_code ? ` · ${r.revenue_code}` : ''}</td><td>{r.period}</td><td>{new Date(r.due_date + 'T12:00').toLocaleDateString('pt-BR')}</td><td className="text-right">{brl(r.total)}</td><td className={statusOf(r) === 'vencido' ? 'font-bold text-destructive' : ''}>{statusOf(r)}</td><td className="space-x-2">{r.attachment_url && <button className="text-primary underline" onClick={() => openFile(r.attachment_url)}>Anexo</button>}<button className="text-primary underline" onClick={() => setF({ ...emptyTax, ...r, paid_at: r.paid_at || '' })}>Editar</button></td></tr>)}</tbody></table>
      {!rows.length && <p className="p-4 text-sm text-muted-foreground">Nenhuma obrigação cadastrada.</p>}
    </div>
  </div>
}
