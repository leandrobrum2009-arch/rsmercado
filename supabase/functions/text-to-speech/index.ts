import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const json = await req.json()
    const { text, voice = 'alloy', speed = 1.0 } = json
    
    console.log(`[TTS] Request received for: "${text?.substring(0, 50)}..."`)

    if (!text || text.trim().length === 0) {
      console.error('[TTS] Missing text')
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Attempt OpenAI TTS if key is available
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (openAiKey && openAiKey.startsWith('sk-')) {
      console.log('[TTS] Attempting OpenAI TTS...')
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
          console.log('[TTS] OpenAI TTS Success')
          const arrayBuffer = await response.arrayBuffer()
          return new Response(arrayBuffer, {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'public, max-age=3600'
            },
          })
        }
        const err = await response.text()
        console.warn(`[TTS] OpenAI TTS Failed: ${response.status} - ${err}`)
      } catch (e) {
        console.error('[TTS] OpenAI Fetch Error:', e)
      }
    }

    // Fallback to Google Translate TTS
    console.log('[TTS] Using Google Translate Fallback')
    const lang = 'pt-BR'
    // Split text into 200-char chunks for Google TTS
    const chunks = text.match(/.{1,200}/g) || [text]
    const audioBuffers: ArrayBuffer[] = []

    for (const chunk of chunks) {
      try {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`
        const gResp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
        
        if (gResp.ok) {
          audioBuffers.push(await gResp.arrayBuffer())
        } else {
          console.warn(`[TTS] Google Chunk Failed: ${gResp.status}`)
        }
      } catch (e) {
        console.error('[TTS] Google Fetch Error:', e)
      }
    }

    if (audioBuffers.length > 0) {
      console.log(`[TTS] Success with Google (${audioBuffers.length} chunks)`)
      
      // Concatenate all chunks
      const totalLen = audioBuffers.reduce((acc, buf) => acc + buf.byteLength, 0)
      const combined = new Uint8Array(totalLen)
      let offset = 0
      for (const buf of audioBuffers) {
        combined.set(new Uint8Array(buf), offset)
        offset += buf.byteLength
      }

      return new Response(combined.buffer, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=3600'
        },
      })
    }

    throw new Error('Could not generate audio using any method')

  } catch (error: any) {
    console.error(`[TTS] Global Error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
