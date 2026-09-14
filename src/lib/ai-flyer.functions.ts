import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const schema = z.object({
  prompt: z.string().min(10).max(8000),
})

/**
 * Gera a imagem do encarte A4 diretamente pelo Lovable AI Gateway,
 * sem precisar abrir ChatGPT ou outra IA externa.
 */
export const generateFlyerImage = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!apiKey) {
      throw new Error('AI_KEY_MISSING')
    }

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: data.prompt }],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      if (res.status === 429) throw new Error('AI_RATE_LIMIT')
      if (res.status === 402) throw new Error('AI_NO_CREDITS')
      throw new Error(`AI_ERROR:${res.status}:${detail.slice(0, 300)}`)
    }

    const json: any = await res.json()
    const url: string | undefined =
      json?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
      json?.choices?.[0]?.message?.image_url?.url

    if (!url) throw new Error('AI_NO_IMAGE')

    return { imageUrl: url as string }
  })
