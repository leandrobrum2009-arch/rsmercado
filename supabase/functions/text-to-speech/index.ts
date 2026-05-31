import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const json = await req.json()
    const { text, voice = 'alloy', speed = 1.0 } = json
    
    console.log(`[TTS] Request: "${text?.substring(0, 50)}..."`)

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Texto é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. OpenAI TTS
    const openAiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('LOVABLE_API_KEY')
    if (openAiKey && openAiKey.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: voice,
            speed: speed,
          }),
        })

        if (response.ok) {
          console.log('[TTS] OpenAI Success')
          return new Response(await response.arrayBuffer(), {
            headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
          })
        }
        console.warn(`[TTS] OpenAI Failed (${response.status})`)
      } catch (e) {
        console.error('[TTS] OpenAI Error:', e)
      }
    }

    // 2. Google Translate TTS Fallback
    console.log('[TTS] Falling back to Google')
    const lang = 'pt-BR'
    // Split text into chunks of 200 chars (safe limit for Google)
    // Use [\s\S] to include newlines
    const chunks = text.match(/[\s\S]{1,200}/g) || [text]
    const audioBuffers: ArrayBuffer[] = []

    for (const chunk of chunks) {
      try {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=${lang}&client=tw-ob`
        const gResp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
        
        if (gResp.ok) {
          audioBuffers.push(await gResp.arrayBuffer())
        }
      } catch (e) {
        console.error('[TTS] Google Chunk Error:', e)
      }
    }

    if (audioBuffers.length > 0) {
      const totalLen = audioBuffers.reduce((acc, buf) => acc + buf.byteLength, 0)
      const combined = new Uint8Array(totalLen)
      let offset = 0
      for (const buf of audioBuffers) {
        combined.set(new Uint8Array(buf), offset)
        offset += buf.byteLength
      }

      return new Response(combined.buffer, {
        headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
      })
    }

    throw new Error('Falha ao gerar áudio em todos os métodos')

  } catch (error: any) {
    console.error(`[TTS] Error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
