// Sanitiza cores modernas (oklch / oklab / lab / lch / color-mix) que o html2canvas
// nao consegue parsear (Tailwind v4 usa oklch). Converte tudo para rgb/hex via canvas,
// tanto nas folhas de estilo quanto inline em cada elemento do documento clonado.

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
  'caret-color',
  'box-decoration-break',
  'border-image',
  'border-image-source',
  'mask',
  'mask-image',
  'clip-path'
]

function makeSanitizer(doc: Document) {
  let ctx: CanvasRenderingContext2D | null = null
  try {
    const canvas = doc.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    ctx = canvas.getContext('2d', { willReadFrequently: true })
  } catch {
    ctx = null
  }

  const toSafe = (color: string): string => {
    if (!color) return color
    if (!MODERN_RE.test(color)) return color
    
    if (!ctx) return '#000000'
    
    try {
      ctx.fillStyle = '#000000' // reset
      ctx.fillStyle = color
      const out = ctx.fillStyle as string
      
      if (out && (out.includes('oklch') || out.includes('oklab') || out.includes('color-mix'))) {
        return '#000000'
      }
      return out || '#000000'
    } catch {
      return '#000000'
    }
  }

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

  // 1) Folhas de estilo
  try {
    const sheets = Array.from(clonedDoc.styleSheets)
    sheets.forEach((sheet: any) => {
      let rules: CSSRuleList | null = null
      try {
        rules = sheet.cssRules
      } catch {
        return
      }
      if (!rules) return
      
      let cssText = ''
      for (let r = 0; r < rules.length; r++) {
        cssText += rules[r].cssText + '\n'
      }
      
      if (MODERN_RE.test(cssText)) {
        const styleEl = clonedDoc.createElement('style')
        styleEl.textContent = sanitizeValue(cssText)
        const owner = sheet.ownerNode
        if (owner && owner.parentNode) {
          owner.parentNode.replaceChild(styleEl, owner)
        }
      }
    })
  } catch (e) {
    console.warn('Error sanitizing stylesheets:', e)
  }

  // 2) Tags <style>
  const styleTags = clonedDoc.getElementsByTagName('style')
  for (let i = 0; i < styleTags.length; i++) {
    const css = styleTags[i].innerHTML
    if (MODERN_RE.test(css)) {
      styleTags[i].innerHTML = sanitizeValue(css)
    }
  }

  // 3) Elementos individuais
  const win = clonedDoc.defaultView || window
  const all = clonedDoc.querySelectorAll('*')
  
  all.forEach((el: any) => {
    let cs: CSSStyleDeclaration | null = null
    try {
      cs = win.getComputedStyle(el)
    } catch {
      cs = null
    }

    if (cs) {
      COLOR_PROPS.forEach(prop => {
        const val = cs!.getPropertyValue(prop)
        if (val && MODERN_RE.test(val)) {
          try {
            el.style.setProperty(prop, sanitizeValue(val), 'important')
          } catch {}
        }
      })
    }

    // CSS Variables in inline style
    const style = el.style
    if (style && style.length > 0) {
      for (let i = 0; i < style.length; i++) {
        const name = style[i]
        if (name.startsWith('--')) {
          const val = style.getPropertyValue(name)
          if (val && MODERN_RE.test(val)) {
            style.setProperty(name, sanitizeValue(val), 'important')
          }
        }
      }
    }
    
    // Attributes (SVG)
    const attrs = el.attributes
    if (attrs) {
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i]
        if (MODERN_RE.test(attr.value)) {
          attr.value = sanitizeValue(attr.value)
        }
      }
    }
  })
}
