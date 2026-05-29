// Sanitiza cores modernas (oklch / oklab / lab / lch / color-mix) que o html2canvas
// nao consegue parsear (Tailwind v4 usa oklch). Converte tudo para rgb/hex via canvas,
// tanto nas folhas de estilo (inclui <link> same-origin, cobrindo pseudo-elementos)
// quanto inline em cada elemento do documento clonado.
//
// Uso: dentro do callback onclone do html2canvas -> sanitizeClonedDocColors(clonedDoc)

const MODERN_RE = /oklch|oklab|color-mix|\blab\(|\blch\(/i

const COLOR_PROPS = [
  'color',
  'background',
  'background-color',
  'background-image',
  'border',
  'border-color',
  'border-top',
  'border-top-color',
  'border-right',
  'border-right-color',
  'border-bottom',
  'border-bottom-color',
  'border-left',
  'border-left-color',
  'outline',
  'outline-color',
  'text-decoration',
  'text-decoration-color',
  'text-shadow',
  'box-shadow',
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
  'column-rule',
  'column-rule-color',
  'text-emphasis',
  'text-emphasis-color',
  'caret-color'
]

function makeSanitizer(doc: Document) {
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = doc.createElement('canvas').getContext('2d')
  } catch {
    ctx = null
  }

  const toSafe = (color: string): string => {
    if (!color) return color
    const c = ctx
    if (!c) return '#000000'
    try {
      c.fillStyle = '#000000'
      c.fillStyle = color
      const out = c.fillStyle as string
      return out && out.indexOf('oklch') === -1 && out.indexOf('oklab') === -1
        ? out
        : '#000000'
    } catch {
      return '#000000'
    }
  }

  // Substitui cada funcao de cor moderna dentro de um valor CSS, respeitando
  // parenteses balanceados (ex.: color-mix(in oklch, ...), gradientes, box-shadow).
  const sanitizeValue = (value: string): string => {
    if (!value || !MODERN_RE.test(value)) return value
    const fnRe = /(oklch|oklab|color-mix|lab|lch)\(/i
    let out = ''
    let i = 0
    while (i < value.length) {
      const rest = value.slice(i)
      const m = rest.match(fnRe)
      if (!m || m.index === undefined) {
        out += rest
        break
      }
      out += rest.slice(0, m.index)
      let j = i + m.index + m[0].length
      let depth = 1
      while (j < value.length && depth > 0) {
        const ch = value[j]
        if (ch === '(') depth++
        else if (ch === ')') depth--
        j++
      }
      out += toSafe(value.slice(i + m.index, j))
      i = j
    }
    return out
  }

  return { sanitizeValue }
}

export function sanitizeClonedDocColors(clonedDoc: Document): void {
  const { sanitizeValue } = makeSanitizer(clonedDoc)

  // 1) Folhas de estilo (inclui a CSS linkada de producao). Reescreve as regras
  //    sem oklch -> cobre tambem pseudo-elementos (::before/::after).
  try {
    Array.prototype.slice.call(clonedDoc.styleSheets).forEach((sheet: any) => {
      let rules: any
      try {
        rules = sheet.cssRules
      } catch {
        return // folha cross-origin: ignora
      }
      if (!rules) return
      let cssText = ''
      for (let r = 0; r < rules.length; r++) cssText += rules[r].cssText + '\n'
      if (!MODERN_RE.test(cssText)) return
      const styleEl = clonedDoc.createElement('style')
      styleEl.textContent = sanitizeValue(cssText)
      const owner: Node | null = sheet.ownerNode
      if (owner && owner.parentNode) owner.parentNode.replaceChild(styleEl, owner)
    })
  } catch {
    /* ignora falhas de sanitizacao de folhas */
  }

  // 2) Tags <style> remanescentes
  const styleTags = clonedDoc.getElementsByTagName('style')
  for (let i = 0; i < styleTags.length; i++) {
    const css = styleTags[i].innerHTML
    if (MODERN_RE.test(css)) styleTags[i].innerHTML = sanitizeValue(css)
  }

  // 3) Estilos inline por elemento (longhands de cor)
  const all = clonedDoc.querySelectorAll('*')
  all.forEach((el: any) => {
    // 3) Sanitize individual properties
    let cs: CSSStyleDeclaration | null = null
    try {
      cs = window.getComputedStyle(el)
    } catch {
      cs = null
    }
    
    if (cs) {
      for (let p = 0; p < COLOR_PROPS.length; p++) {
        const prop = COLOR_PROPS[p]
        const val = cs.getPropertyValue(prop)
        if (val && MODERN_RE.test(val)) {
          try {
            el.style.setProperty(prop, sanitizeValue(val), 'important')
          } catch { /* ignore */ }
        }
      }
    }

    // 4) Sanitize Attributes (especially for SVG or specific data attributes)
    const attrs = el.attributes;
    if (attrs) {
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        if (MODERN_RE.test(attr.value)) {
          attr.value = sanitizeValue(attr.value);
        }
      }
    }

    // 5) Sanitize CSS Variables in inline style
    const style = el.style;
    if (style && style.length > 0) {
      for (let i = 0; i < style.length; i++) {
        const name = style[i];
        if (name.startsWith('--')) {
          const val = style.getPropertyValue(name);
          if (val && MODERN_RE.test(val)) {
            style.setProperty(name, sanitizeValue(val), 'important');
          }
        }
      }
    }
  })
}
