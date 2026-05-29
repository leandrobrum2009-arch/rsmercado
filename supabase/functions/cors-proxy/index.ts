import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'No URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Proxying request for: ${url}`)

    const response = await fetch(url)
    const contentType = response.headers.get('content-type')
    const blob = await response.blob()

    return new Response(blob, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error(`Proxy error: ${error.message}`)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
