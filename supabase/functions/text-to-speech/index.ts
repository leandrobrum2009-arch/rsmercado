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
    console.log(`TTS Request: voice=${voice}, speed=${speed}, text="${text.substring(0, 50)}..."`)

    
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    
    // 1. Try OpenAI TTS (Direct or Gateway)
    if (apiKey) {
      console.log('Attempting OpenAI TTS...')
      try {
        // We try both direct and a possible gateway URL if the first fails
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
    }

    // 2. Fallback to Google Translate TTS
    console.log('Falling back to Google Translate TTS')
    const lang = 'pt-BR'
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`
    
    try {
      const googleResponse = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })
      
      if (googleResponse.ok) {
        console.log('Google Translate TTS successful')
        const arrayBuffer = await googleResponse.arrayBuffer()
        return new Response(arrayBuffer, {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=3600'
          },
        })
      }
      console.warn('Google Translate TTS failed with status:', googleResponse.status)
    } catch (e) {
      console.error('Error calling Google Translate:', e)
    }

    throw new Error('All TTS methods failed')

  } catch (error: any) {
    console.error('TTS Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
