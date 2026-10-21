import { describe, it, expect } from 'vitest'
import { isValidCnpj, productTaxIssues } from './validation'

describe('fiscal validation', () => {
  it('accepts a CNPJ with correct check digits and rejects a wrong one', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false)
  })
  it('Simples Nacional (CRT 1) requires CSOSN, not CST', () => {
    const p = { ncm: '22021000', origin: '0', cfop: '5102' }
    expect(productTaxIssues(p, '1')).toEqual(['CSOSN ausente'])
  })
  it('regime normal (CRT 3) requires CST', () => {
    expect(productTaxIssues({ ncm: '22021000', origin: '0', cfop: '5102', cst: '00' }, '3')).toEqual([])
  })
  it('flags missing NCM', () => {
    expect(productTaxIssues({ origin: '0', cfop: '5102', csosn: '102' }, '1')).toContain('NCM ausente')
  })
})
