export type InvLine = { line: number; code: string; counted: number; cost: number | null; error?: string }

const toNum = (s: string) => {
  const t = String(s ?? '').trim()
  if (!t) return NaN
  return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
}

/** Parses inventory CSV: codigo;quantidade[;custo]. Header row optional. */
export function parseInventoryCsv(text: string): InvLine[] {
  const rows = text.replace(/^\ufeff/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out: InvLine[] = []
  const seen = new Set<string>()
  rows.forEach((raw, i) => {
    const cols = raw.split(raw.includes(';') ? ';' : ',').map((c) => c.trim().replace(/^"|"$/g, ''))
    if (i === 0 && /c[oó]d/i.test(cols[0]) && isNaN(toNum(cols[1]))) return
    const code = cols[0] || ''
    const counted = toNum(cols[1])
    const costN = cols[2] ? toNum(cols[2]) : null
    const l: InvLine = { line: i + 1, code, counted, cost: costN === null || isNaN(costN as number) ? null : costN }
    if (!code) l.error = 'Código vazio'
    else if (isNaN(counted)) l.error = 'Quantidade inválida'
    else if (counted < 0) l.error = 'Quantidade negativa'
    else if (cols[2] && (costN === null || isNaN(costN) || costN < 0)) l.error = 'Custo inválido'
    else if (seen.has(code)) l.error = 'Código repetido no arquivo'
    seen.add(code)
    out.push(l)
  })
  return out
}
