import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { summarizeSales } from '@/lib/pos-reports'

const db = supabase as any
const brl = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const input = 'rounded-md border border-input bg-background p-2 text-sm'
const btn = 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50'
const today = () => new Date().toISOString().slice(0, 10)

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-4 rounded-xl border border-border bg-card p-4"><h2 className="mb-3 font-bold">{title}</h2>{children}</section>
}
function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground">{head.map((h) => <th key={h} className="p-1">{h}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map((r, i) => <tr key={i} className="border-b border-border/50">{r.map((c, j) => <td key={j} className="p-1">{c}</td>)}</tr>) : <tr><td className="p-2 text-muted-foreground" colSpan={head.length}>Sem registros no período.</td></tr>}</tbody></table></div>
  )
}

export function ReportsTab() {
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [tests, setTests] = useState(false)
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    const start = `${from}T00:00:00-03:00`, end = `${to}T23:59:59.999-03:00`
    try {
      let q = db.from('pos_sales').select('id,status,total,discount,operator_id,is_test,created_at,session_id,pos_sessions(terminal_id,pos_terminals(code)),pos_sale_items(name,quantity,total,product_id,products(cost,category_id,categories(name))),pos_payments(method,amount)').gte('created_at', start).lte('created_at', end).in('status', ['completed', 'cancelled', 'returned', 'partially_returned']).limit(5000)
      if (!tests) q = q.eq('is_test', false)
      const [sales, sess, mov, ret, fisc, tax] = await Promise.all([
        q,
        db.from('pos_sessions').select('id,status,opening_amount,expected_cash,counted_cash,difference,opened_at,closed_at,operator_id,pos_terminals(code,is_test)').gte('opened_at', start).lte('opened_at', end).limit(1000),
        db.from('pos_cash_movements').select('type,amount,reason,created_at').gte('created_at', start).lte('created_at', end).limit(2000),
        db.from('pos_returns').select('refund_amount,reason,created_at').gte('created_at', start).lte('created_at', end).limit(2000),
        db.from('fiscal_documents').select('status').gte('created_at', start).lte('created_at', end).limit(5000),
        db.from('tax_obligations').select('doc_type,due_date,total,status').gte('due_date', from).order('due_date').limit(50),
      ])
      if (sales.error) throw sales.error
      const sessions = (sess.data || []).filter((s: any) => tests || !s.pos_terminals?.is_test)
      setData({ sum: summarizeSales(sales.data || []), sessions, mov: mov.data || [], ret: ret.data || [], fisc: fisc.data || [], tax: tax.data || [] })
    } catch (e: any) { toast.error(e?.message || String(e)) } finally { setBusy(false) }
  }, [from, to, tests])
  useEffect(() => { load() }, [load])

  const fiscCount = useMemo(() => { const m: Record<string, number> = {}; (data?.fisc || []).forEach((f: any) => { m[f.status] = (m[f.status] || 0) + 1 }); return m }, [data])
  const s = data?.sum
  return (
    <div>
      <Card title="Filtros">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label>De<br /><input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>Até<br /><input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={tests} onChange={(e) => setTests(e.target.checked)} /> Incluir vendas do caixa piloto (testes)</label>
          <button className={btn} disabled={busy} onClick={load}>{busy ? 'Carregando…' : 'Atualizar'}</button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Totais calculados a partir das vendas concluídas gravadas no sistema. Por padrão, vendas de teste ficam de fora.</p>
      </Card>
      {s && <>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {[['Vendas concluídas', String(s.count)], ['Faturamento', brl(s.total)], ['Descontos', brl(s.discount)], ['Ticket médio', brl(s.count ? s.total / s.count : 0)], ['Canceladas', String(s.cancelled)], ['Devoluções', brl(data.ret.reduce((a: number, r: any) => a + Number(r.refund_amount), 0))], ['Margem estimada', s.marginReliable ? brl(s.margin) : 'custos incompletos'], ['Itens vendidos', s.units.toLocaleString('pt-BR')]].map(([l, v]) => <div key={l} className="rounded-xl border border-border bg-card p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-bold">{v}</div></div>)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Vendas por dia"><Table head={['Dia', 'Vendas', 'Total']} rows={s.byDay.map((r: any) => [r.key, r.count, brl(r.total)])} /></Card>
          <Card title="Formas de pagamento"><Table head={['Forma', 'Total']} rows={s.byMethod.map((r: any) => [r.key, brl(r.total)])} /></Card>
          <Card title="Vendas por terminal"><Table head={['Terminal', 'Vendas', 'Total']} rows={s.byTerminal.map((r: any) => [r.key, r.count, brl(r.total)])} /></Card>
          <Card title="Vendas por operador"><Table head={['Operador', 'Vendas', 'Total']} rows={s.byOperator.map((r: any) => [r.key.slice(0, 8), r.count, brl(r.total)])} /></Card>
          <Card title="Produtos mais vendidos"><Table head={['Produto', 'Qtd', 'Total']} rows={s.byProduct.slice(0, 20).map((r: any) => [r.key, r.count.toLocaleString('pt-BR'), brl(r.total)])} /></Card>
          <Card title="Vendas por categoria"><Table head={['Categoria', 'Total']} rows={s.byCategory.map((r: any) => [r.key, brl(r.total)])} /></Card>
          <Card title="Aberturas, fechamentos e diferenças"><Table head={['Terminal', 'Abertura', 'Fechamento', 'Esperado', 'Contado', 'Diferença']} rows={data.sessions.map((x: any) => [x.pos_terminals?.code || '', new Date(x.opened_at).toLocaleString('pt-BR'), x.closed_at ? new Date(x.closed_at).toLocaleString('pt-BR') : 'aberto', x.expected_cash != null ? brl(x.expected_cash) : '-', x.counted_cash != null ? brl(x.counted_cash) : '-', x.difference != null ? brl(x.difference) : '-'])} /></Card>
          <Card title="Sangrias e suprimentos"><Table head={['Data', 'Tipo', 'Valor', 'Motivo']} rows={data.mov.map((m: any) => [new Date(m.created_at).toLocaleString('pt-BR'), m.type, brl(m.amount), m.reason])} /></Card>
          <Card title="Documentos fiscais"><Table head={['Situação', 'Quantidade']} rows={Object.entries(fiscCount).map(([k, v]) => [k, v])} /></Card>
          <Card title="Obrigações tributárias a vencer"><Table head={['Tipo', 'Vencimento', 'Valor', 'Situação']} rows={data.tax.map((t: any) => [t.doc_type, new Date(t.due_date + 'T12:00').toLocaleDateString('pt-BR'), brl(t.total), t.status])} /></Card>
        </div>
      </>}
    </div>
  )
}

export function AuditTab() {
  const [rows, setRows] = useState<any[]>([])
  const [action, setAction] = useState('')
  useEffect(() => {
    let q = db.from('pos_audit_log').select('created_at,action,user_id,details').order('created_at', { ascending: false }).limit(300)
    if (action) q = q.eq('action', action)
    q.then(({ data, error }: any) => error ? toast.error(error.message) : setRows(data || []))
  }, [action])
  return (
    <Card title="Registro de auditoria (somente leitura)">
      <select className={`${input} mb-3`} value={action} onChange={(e) => setAction(e.target.value)}>
        <option value="">Todas as ações</option>
        {['abertura', 'fechamento', 'venda_finalizada', 'cancelamento', 'devolucao', 'desconto', 'sangria', 'suprimento', 'alteracao_preco', 'alteracao_fiscal', 'acesso_admin', 'terminal_ativado', 'terminal_desativado'].map((a) => <option key={a}>{a}</option>)}
      </select>
      <Table head={['Data', 'Ação', 'Usuário', 'Detalhes']} rows={rows.map((r) => [new Date(r.created_at).toLocaleString('pt-BR'), r.action, String(r.user_id || '').slice(0, 8), JSON.stringify(r.details || {}).slice(0, 160)])} />
    </Card>
  )
}

export function TerminalsTab() {
  const [rows, setRows] = useState<any[]>([])
  const load = useCallback(() => db.from('pos_terminals').select('*').order('code').then(({ data }: any) => setRows(data || [])), [])
  useEffect(() => { load() }, [load])
  const toggle = async (t: any) => {
    if (!t.production_enabled && !confirm(`Autorizar o terminal ${t.code} para vendas REAIS em produção?`)) return
    const { error } = await db.rpc('pos_set_terminal_production', { p_terminal: t.id, p_enabled: !t.production_enabled })
    error ? toast.error(error.message) : (toast.success('Terminal atualizado'), load())
  }
  return (
    <Card title="Terminais de caixa e ambiente piloto">
      <p className="mb-3 text-sm text-muted-foreground">O terminal piloto serve para testes: as vendas ficam marcadas como teste, não baixam estoque e não entram nos relatórios. Terminais reais só abrem caixa depois da autorização expressa de um administrador.</p>
      <Table head={['Código', 'Nome', 'Tipo', 'Produção', '']} rows={rows.map((t) => [t.code, t.name, t.is_test ? 'PILOTO / TESTES' : 'Real', t.is_test ? '—' : t.production_enabled ? 'Autorizado' : 'Aguardando autorização',
        (t.is_test ? '' : <button key={t.id} className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => toggle(t)}>{t.production_enabled ? 'Suspender' : 'Autorizar produção'}</button>) as any])} />
    </Card>
  )
}
