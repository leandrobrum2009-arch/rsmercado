export type ImportRow = { line: number; productId: string | null; productName: string | null; data: Record<string, any>; errors: string[] }

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []
  const sep = (lines[0].match(/;/g)?.length || 0) >= (lines[0].match(/,/g)?.length || 0) ? ';' : ','
  const split = (l: string) => {
    const out: string[] = []; let cur = ''; let q = false
    for (let i = 0; i < l.length; i++) {
      const c = l[i]
      if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++ } else q = !q }
      else if (c === sep && !q) { out.push(cur); cur = '' } else cur += c
    }
    out.push(cur); return out.map((s) => s.trim())
  }
  const head = split(lines[0]).map((h) => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_'))
  return lines.slice(1).map((l) => { const v = split(l); return Object.fromEntries(head.map((h, i) => [h, v[i] ?? ''])) })
}

const toNum = (s: string) => Number(String(s).replace(/[R$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))

export function matchImportRows(rows: Record<string, string>[], products: { id: string; name: string; code: string | null; barcode: string | null }[]): ImportRow[] {
  const byCode = new Map(products.filter((p) => p.code).map((p) => [p.code!.trim(), p]))
  const byBar = new Map(products.filter((p) => p.barcode).map((p) => [p.barcode!.trim(), p]))
  const byName = new Map<string, typeof products>()
  products.forEach((p) => { const k = p.name.trim().toLowerCase(); byName.set(k, [...(byName.get(k) || []), p]) })
  const seenCode = new Map<string, number>(); const seenBar = new Map<string, number>(); const seenProd = new Map<string, number>()
  return rows.map((r, i) => {
    const line = i + 2; const errors: string[] = []; const data: Record<string, any> = {}
    const code = r.codigo?.trim(); const bar = (r.codigo_barras || r.ean || '').trim(); const name = (r.nome || r.descricao || '').trim().toLowerCase()
    let p = (code && byCode.get(code)) || (bar && byBar.get(bar)) || null
    if (!p && name) { const c = byName.get(name) || []; if (c.length === 1) p = c[0]; else if (c.length > 1) errors.push('Nome corresponde a mais de um produto') }
    if (!p && !errors.length) errors.push('Produto não encontrado no cadastro')
    if (code) { if (seenCode.has(code)) errors.push(`Código interno repetido na linha ${seenCode.get(code)}`); seenCode.set(code, line); data.code = code
      const other = byCode.get(code); if (p && other && other.id !== p.id) errors.push('Código interno já pertence a outro produto') }
    if (bar) { if (!/^\d{8,14}$/.test(bar)) errors.push('Código de barras deve ter 8 a 14 dígitos'); if (seenBar.has(bar)) errors.push(`Código de barras repetido na linha ${seenBar.get(bar)}`); seenBar.set(bar, line); data.barcode = bar
      const other = byBar.get(bar); if (p && other && other.id !== p.id) errors.push('Código de barras já pertence a outro produto') }
    if (p) { if (seenProd.has(p.id)) errors.push(`Mesmo produto da linha ${seenProd.get(p.id)}`); seenProd.set(p.id, line) }
    for (const [k, field, min] of [['preco', 'price', 0.01], ['custo', 'cost', 0], ['estoque_minimo', 'min_stock', 0]] as const) {
      if (r[k] !== undefined && r[k] !== '') { const n = toNum(r[k]); if (isNaN(n) || n < min) errors.push(`${k} inválido`); else data[field] = n }
    }
    if (r.ncm) { const n = r.ncm.replace(/\D/g, ''); if (n.length !== 8) errors.push('NCM deve ter 8 dígitos'); else data.ncm = n }
    if (r.cest) { const c = r.cest.replace(/\D/g, ''); if (c.length !== 7) errors.push('CEST deve ter 7 dígitos'); else data.cest = c }
    if (r.origem) { if (!/^[0-8]$/.test(r.origem.trim())) errors.push('Origem deve ser 0 a 8'); else data.origin = r.origem.trim() }
    if (r.unidade) data.unit = r.unidade.trim().toUpperCase()
    if (r.marca) data.brand = r.marca.trim()
    if (!Object.keys(data).length && !errors.length) errors.push('Nenhuma alteração na linha')
    return { line, productId: p?.id || null, productName: p?.name || null, data, errors }
  })
}
