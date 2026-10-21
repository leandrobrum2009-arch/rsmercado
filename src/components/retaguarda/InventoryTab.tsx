import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { parseInventoryCsv } from '@/lib/pos-inventory'

const db = supabase as any
const input = 'rounded-md border border-input bg-background p-2 text-sm'
const btn = 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50'

type Row = { line: number; code: string; counted: number; cost: number | null; error?: string; product?: any }

export function InventoryTab() {
  const [rows, setRows] = useState<Row[]>([])
  const [reason, setReason] = useState('Inventário inicial')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [hist, setHist] = useState<any[]>([])
  const [stats, setStats] = useState<{ zero: number; total: number } | null>(null)

  const loadHist = () => db.from('inventory_counts').select('created_at,system_qty,counted_qty,adjustment,unit_cost,reason,user_id,products(name)').order('created_at', { ascending: false }).limit(100).then(({ data }: any) => setHist(data || []))
  useEffect(() => {
    loadHist()
    Promise.all([db.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null).lte('stock', 0), db.from('products').select('id', { count: 'exact', head: true }).is('deleted_at', null)])
      .then(([z, t]: any) => setStats({ zero: z.count || 0, total: t.count || 0 }))
  }, [])

  const onFile = async (f: File) => {
    const parsed: Row[] = parseInventoryCsv(await f.text())
    const codes = [...new Set(parsed.filter((r) => !r.error).map((r) => r.code))]
    const found: any[] = []
    for (let i = 0; i < codes.length; i += 150) {
      const c = codes.slice(i, i + 150)
      const [a, b] = await Promise.all([
        db.from('products').select('id,name,stock,cost,barcode,code').is('deleted_at', null).in('barcode', c),
        db.from('products').select('id,name,stock,cost,barcode,code').is('deleted_at', null).in('code', c),
      ])
      found.push(...(a.data || []), ...(b.data || []))
    }
    parsed.forEach((r) => {
      if (r.error) return
      const p = found.find((x) => x.barcode === r.code) || found.find((x) => x.code === r.code)
      if (!p) r.error = 'Produto não encontrado'
      else r.product = p
    })
    setRows(parsed); setConfirm('')
  }

  const valid = rows.filter((r) => !r.error)
  const apply = async () => {
    setBusy(true)
    const { data, error } = await db.rpc('pos_apply_inventory', { p_items: valid.map((r) => ({ product_id: r.product.id, counted: r.counted, cost: r.cost ?? '' })), p_reason: reason, p_confirm: confirm })
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success(`Inventário aplicado: ${data.items} itens conferidos, ${data.changed} saldos ajustados`)
    setRows([]); setConfirm(''); loadHist()
  }

  return (
    <div>
      <section className="mb-4 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-bold">Inventário físico (contagem)</h2>
        {stats && <p className="mb-3 text-sm">Situação atual: <b>{stats.zero}</b> de {stats.total} produtos com estoque zero ou negativo. Nada é alterado automaticamente — os saldos só mudam depois que você conferir a prévia e confirmar.</p>}
        <p className="mb-2 text-xs text-muted-foreground">Planilha CSV com colunas: <b>codigo</b> (código de barras ou interno); <b>quantidade</b> contada; <b>custo</b> unitário (opcional, aplicado só por administrador).</p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </section>
      {rows.length > 0 && (
        <section className="mb-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-bold">Prévia — {valid.length} válidos, {rows.length - valid.length} com erro</h2>
          <div className="max-h-96 overflow-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Linha</th><th>Código</th><th>Produto</th><th>Sistema</th><th>Contado</th><th>Ajuste</th><th>Custo</th><th>Situação</th></tr></thead>
            <tbody>{rows.map((r) => { const adj = r.product ? r.counted - Number(r.product.stock) : 0; return (
              <tr key={r.line} className={`border-b border-border/50 ${r.error ? 'text-destructive' : ''}`}><td>{r.line}</td><td>{r.code}</td><td>{r.product?.name || '—'}</td><td>{r.product ? Number(r.product.stock) : '—'}</td><td>{isNaN(r.counted) ? '—' : r.counted}</td><td className={adj > 0 ? 'text-primary' : adj < 0 ? 'text-destructive' : ''}>{r.product ? (adj > 0 ? '+' : '') + adj : '—'}</td><td>{r.cost ?? ''}</td><td>{r.error || 'OK'}</td></tr>) })}</tbody></table></div>
          <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
            <label>Motivo<br /><input className={input} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            <label>Digite <b>CONFIRMO</b> para aplicar<br /><input className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
            <button className={btn} disabled={busy || !valid.length || confirm !== 'CONFIRMO'} onClick={apply}>{busy ? 'Aplicando…' : `Aplicar ${valid.length} contagens`}</button>
            <button className="rounded-md border border-border px-3 py-2" onClick={() => setRows([])}>Descartar</button>
          </div>
        </section>
      )}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-bold">Histórico de contagens</h2>
        <div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Data</th><th>Produto</th><th>Sistema</th><th>Contado</th><th>Ajuste</th><th>Custo</th><th>Motivo</th><th>Responsável</th></tr></thead>
          <tbody>{hist.length ? hist.map((h, i) => <tr key={i} className="border-b border-border/50"><td>{new Date(h.created_at).toLocaleString('pt-BR')}</td><td>{h.products?.name}</td><td>{Number(h.system_qty)}</td><td>{Number(h.counted_qty)}</td><td>{Number(h.adjustment)}</td><td>{h.unit_cost ?? ''}</td><td>{h.reason}</td><td>{String(h.user_id).slice(0, 8)}</td></tr>) : <tr><td colSpan={8} className="p-2 text-muted-foreground">Nenhuma contagem registrada.</td></tr>}</tbody></table></div>
      </section>
    </div>
  )
}
