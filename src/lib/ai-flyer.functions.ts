import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const ALLOWED_MODELS = [
  'google/gemini-2.5-flash-image-preview',
  'google/gemini-3-pro-image-preview',
] as const

const schema = z.object({
  prompt: z.string().min(10).max(8000),
  model: z.enum(ALLOWED_MODELS).optional(),
  /** Logotipo da loja (URL http/https) enviado como imagem de referência. */
  logoUrl: z.string().url().optional(),
  /** Encarte gerado anteriormente (data URL ou http) para aplicar correções. */
  baseImage: z.string().min(20).max(12_000_000).optional(),
})

async function toDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) return url
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get('content-type') || 'image/png'
    if (!type.startsWith('image/')) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > 8_000_000) return null
    // @ts-ignore Buffer available in worker runtime
    const b64 = Buffer.from(buf).toString('base64')
    return `data:${type};base64,${b64}`
  } catch {
    return null
  }
}

/**
 * Gera (ou corrige) a imagem do encarte A4 pelo Lovable AI Gateway.
 * Aceita escolha de modelo, logotipo como imagem de referência e
 * a imagem anterior para aplicar correções.
 */
export const generateFlyerImage = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!apiKey) throw new Error('AI_KEY_MISSING')

    const content: any[] = [{ type: 'text', text: data.prompt }]

    if (data.baseImage) {
      const base = await toDataUrl(data.baseImage)
      if (base) {
        content.push({ type: 'text', text: 'IMAGEM BASE (aplique as correções pedidas sobre este encarte, mantendo o restante igual):' })
        content.push({ type: 'image_url', image_url: { url: base } })
      }
    }

    if (data.logoUrl) {
      const logo = await toDataUrl(data.logoUrl)
      if (logo) {
        content.push({ type: 'text', text: 'LOGOTIPO OFICIAL DA LOJA (reproduza exatamente esta marca no cabeçalho, nítida e grande, sem redesenhar nem alterar cores/texto):' })
        content.push({ type: 'image_url', image_url: { url: logo } })
      }
    }

    const models = [data.model || ALLOWED_MODELS[0], ALLOWED_MODELS[0]].filter(
      (m, i, a) => a.indexOf(m) === i,
    )

    let lastError = ''
    for (const model of models) {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          modalities: ['image', 'text'],
          messages: [{ role: 'user', content }],
        }),
      })

      if (res.status === 429) throw new Error('AI_RATE_LIMIT')
      if (res.status === 402) throw new Error('AI_NO_CREDITS')

      if (!res.ok) {
        lastError = `${res.status}:${(await res.text()).slice(0, 300)}`
        continue
      }

      const json: any = await res.json()
      const url: string | undefined =
        json?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
        json?.choices?.[0]?.message?.image_url?.url

      if (url) return { imageUrl: url as string, model }
      lastError = 'no-image'
    }

    if (lastError === 'no-image') throw new Error('AI_NO_IMAGE')
    throw new Error(`AI_ERROR:${lastError}`)
  })
