 import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
 import QRCode from "https://esm.sh/qrcode@1.5.3"
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 }
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders })
   }
 
   try {
     const { payload } = await req.json()
     
     if (!payload) {
       throw new Error('Payload is required')
     }
 
     // Generate QR Code as Data URL
     const qrCodeDataUrl = await QRCode.toDataURL(payload, {
       width: 400,
       margin: 2,
       color: {
         dark: '#000000',
         light: '#ffffff',
       },
     })
 
     return new Response(
       JSON.stringify({ qr_code: qrCodeDataUrl }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     )
   } catch (error) {
     return new Response(
       JSON.stringify({ error: error.message }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
     )
   }
 })