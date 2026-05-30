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
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=pt-BR&client=tw-ob`
    const googleResponse = await fetch(googleTtsUrl)
    
    if (googleResponse.ok) {
      const arrayBuffer = await googleResponse.arrayBuffer()
      return new Response(arrayBuffer, {
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
