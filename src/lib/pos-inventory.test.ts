import { describe, it, expect } from 'vitest'
import { parseInventoryCsv } from './pos-inventory'

describe('parseInventoryCsv', () => {
  it('reads code, counted quantity and cost with Brazilian decimals', () => {
    const r = parseInventoryCsv('codigo;quantidade;custo\n789123;12,5;3,40')
    expect(r).toEqual([{ line: 2, code: '789123', counted: 12.5, cost: 3.4 }])
  })
  it('rejects negative quantities', () => {
    expect(parseInventoryCsv('789;-1')[0].error).toBe('Quantidade negativa')
  })
  it('rejects repeated codes in the same file', () => {
    expect(parseInventoryCsv('789;1\n789;2')[1].error).toBe('Código repetido no arquivo')
  })
})
