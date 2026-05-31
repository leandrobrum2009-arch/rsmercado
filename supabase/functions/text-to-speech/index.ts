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
    const { text, voice = 'alloy', speed = 1.0 } = await req.json()
    console.log(`TTS Request: voice=${voice}, speed=${speed}, text="${text?.substring(0, 50)}..."`)

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use OPENAI_API_KEY for real OpenAI TTS
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (apiKey && apiKey.startsWith('sk-')) {
      console.log('Attempting OpenAI TTS with OPENAI_API_KEY...')
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
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
          console.log('OpenAI TTS successful')
          const arrayBuffer = await response.arrayBuffer()
          return new Response(arrayBuffer, {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'public, max-age=3600'
            },
          })
        }
        
        const errorText = await response.text()
        console.warn('OpenAI TTS failed with status:', response.status, errorText)
      } catch (e) {
        console.error('Error calling OpenAI:', e)
      }
    } else {
      console.log('No valid OPENAI_API_KEY found, skipping OpenAI...')
    }

    // Fallback to Google Translate TTS
    console.log('Falling back to Google Translate TTS')
    // We try to split text into chunks if it's too long for Google (max 200 chars)
    const lang = 'pt-BR'
    const chunks = text.match(/.{1,200}/g) || [text];
    const audioChunks: ArrayBuffer[] = [];

    for (const chunk of chunks) {
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`
      const googleResponse = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })
      
      if (googleResponse.ok) {
        audioChunks.push(await googleResponse.arrayBuffer());
      } else {
        console.warn('Google Translate TTS chunk failed:', googleResponse.status);
      }
    }
    
    if (audioChunks.length > 0) {
      console.log(`Google Translate TTS successful with ${audioChunks.length} chunks`)
      // Concatenate chunks if there are multiple
      let totalLength = 0;
      for (const chunk of audioChunks) totalLength += chunk.byteLength;
      
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      return new Response(combined.buffer, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=3600'
        },
      })
    }

    throw new Error('All TTS methods failed')

  } catch (error: any) {
    console.error('TTS Function Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
