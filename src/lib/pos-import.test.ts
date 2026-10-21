import { describe, it, expect } from 'vitest'
import { parseCsv, matchImportRows } from './pos-import'

const products = [
  { id: 'a', name: 'Arroz 5kg', code: '100', barcode: '7891000000001' },
  { id: 'b', name: 'Feijão 1kg', code: '200', barcode: null },
]

describe('importação de produtos', () => {
  it('não cria produto quando não encontrado (evita duplicidade)', () => {
    const r = matchImportRows(parseCsv('codigo;preco\n999;10,00'), products)
    expect(r[0].productId).toBeNull()
    expect(r[0].errors).toContain('Produto não encontrado no cadastro')
  })
  it('bloqueia código de barras que já pertence a outro produto', () => {
    const r = matchImportRows(parseCsv('codigo;codigo_barras\n200;7891000000001'), products)
    expect(r[0].errors).toContain('Código de barras já pertence a outro produto')
  })
  it('recusa NCM que não tenha 8 dígitos', () => {
    const r = matchImportRows(parseCsv('codigo;ncm\n100;1006'), products)
    expect(r[0].errors).toContain('NCM deve ter 8 dígitos')
  })
  it('lê preço no formato brasileiro', () => {
    const r = matchImportRows(parseCsv('codigo;preco\n100;1.234,56'), products)
    expect(r[0].data.price).toBe(1234.56)
  })
})
