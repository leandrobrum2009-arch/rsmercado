import { describe, it, expect } from 'vitest'
import { summarizeSales } from './pos-reports'

const sale = (o: any) => ({ status: 'completed', total: 10, discount: 0, created_at: '2026-10-21T10:00:00Z', pos_payments: [{ method: 'dinheiro', amount: 10 }], pos_sale_items: [], ...o })

describe('summarizeSales', () => {
  it('only completed sales count toward revenue', () => {
    const s = summarizeSales([sale({}), sale({ status: 'cancelled', total: 50 })])
    expect(s.total).toBe(10)
    expect(s.count).toBe(1)
    expect(s.cancelled).toBe(1)
  })
  it('cash change is subtracted from the cash payment total', () => {
    const s = summarizeSales([sale({ total: 7, pos_payments: [{ method: 'dinheiro', amount: 10 }] })])
    expect(s.byMethod.find((m) => m.key === 'dinheiro')?.total).toBe(7)
  })
  it('margin is flagged unreliable when any item lacks cost', () => {
    const s = summarizeSales([sale({ pos_sale_items: [{ name: 'A', quantity: 1, total: 10, products: { cost: null } }] })])
    expect(s.marginReliable).toBe(false)
  })
})
