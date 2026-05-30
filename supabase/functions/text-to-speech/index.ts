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
    if (!apiKey) {
      // Fallback to Google if no API key (safety)
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=pt-BR&client=tw-ob`
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      return new Response(arrayBuffer, {
        headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
      })
    }

    // Use OpenAI via AI Gateway
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
    
    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI TTS Error:', error)
      throw new Error(`Failed to fetch TTS: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    
    return new Response(arrayBuffer, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      },
    })
  } catch (error: any) {
    console.error('TTS Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
