export type Group = { key: string; count: number; total: number }

const add = (m: Map<string, Group>, key: string, count: number, total: number) => {
  const g = m.get(key) || { key, count: 0, total: 0 }
  g.count += count; g.total = Math.round((g.total + total) * 100) / 100
  m.set(key, g)
}
const sorted = (m: Map<string, Group>) => [...m.values()].sort((a, b) => b.total - a.total)

/** Summarizes persisted POS sales. Only `completed` sales count toward revenue. */
export function summarizeSales(sales: any[]) {
  const done = sales.filter((s) => s.status === 'completed')
  const byDay = new Map<string, Group>(), byMethod = new Map<string, Group>(), byTerminal = new Map<string, Group>(), byOperator = new Map<string, Group>(), byProduct = new Map<string, Group>(), byCategory = new Map<string, Group>()
  let total = 0, discount = 0, units = 0, cost = 0, marginReliable = true
  for (const s of done) {
    const t = Number(s.total) || 0
    total += t; discount += Number(s.discount) || 0
    add(byDay, String(s.created_at).slice(0, 10), 1, t)
    add(byTerminal, s.pos_sessions?.pos_terminals?.code || '—', 1, t)
    add(byOperator, String(s.operator_id || '—'), 1, t)
    let paid = 0
    for (const p of s.pos_payments || []) { add(byMethod, p.method, 1, Number(p.amount) || 0); paid += Number(p.amount) || 0 }
    // change is returned in cash: subtract it from the cash line
    const change = Math.round((paid - t) * 100) / 100
    if (change > 0) add(byMethod, 'dinheiro', 0, -change)
    for (const it of s.pos_sale_items || []) {
      const q = Number(it.quantity) || 0
      units += q
      add(byProduct, it.name, q, Number(it.total) || 0)
      add(byCategory, it.products?.categories?.name || 'Sem categoria', q, Number(it.total) || 0)
      const c = it.products?.cost
      if (c == null || Number(c) <= 0) marginReliable = false
      else cost += Number(c) * q
    }
  }
  const r = (n: number) => Math.round(n * 100) / 100
  return {
    count: done.length, cancelled: sales.filter((s) => s.status === 'cancelled').length,
    total: r(total), discount: r(discount), units, margin: r(total - cost), marginReliable: done.length > 0 && marginReliable,
    byDay: [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key)), byMethod: sorted(byMethod), byTerminal: sorted(byTerminal),
    byOperator: sorted(byOperator), byProduct: sorted(byProduct), byCategory: sorted(byCategory),
  }
}
