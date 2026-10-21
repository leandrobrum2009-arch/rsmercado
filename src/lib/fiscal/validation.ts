/** Format-only checks. Codes and rates themselves come from the accountant — never inferred. */
export const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '')

export function isValidCnpj(v: string) {
  const c = digits(v)
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const s = w.reduce((a, wi, i) => a + Number(c[i]) * wi, 0) % 11
    return s < 2 ? 0 : 11 - s
  }
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13])
}

export type ProductTax = { ncm?: string | null; cest?: string | null; origin?: string | null; cfop?: string; cst?: string; csosn?: string }

/** Returns the list of missing/invalid fiscal fields for a product given the CRT (1/2/4 = Simples → CSOSN; 3 = normal → CST). */
export function productTaxIssues(p: ProductTax, crt: string | null | undefined): string[] {
  const out: string[] = []
  const ncm = digits(p.ncm)
  if (!ncm) out.push('NCM ausente'); else if (ncm.length !== 8) out.push('NCM inválido')
  if (p.cest && digits(p.cest).length !== 7) out.push('CEST inválido')
  if (p.origin == null || p.origin === '') out.push('Origem ausente'); else if (!/^[0-8]$/.test(String(p.origin))) out.push('Origem inválida')
  if (!p.cfop) out.push('CFOP ausente'); else if (!/^[1-7]\d{3}$/.test(digits(p.cfop))) out.push('CFOP inválido')
  if (!crt) out.push('CRT da empresa não definido')
  else if (crt === '3') { if (!p.cst) out.push('CST ICMS ausente'); else if (!/^\d{2}$/.test(p.cst)) out.push('CST inválido') }
  else { if (!p.csosn) out.push('CSOSN ausente'); else if (!/^\d{3}$/.test(p.csosn)) out.push('CSOSN inválido') }
  return out
}
