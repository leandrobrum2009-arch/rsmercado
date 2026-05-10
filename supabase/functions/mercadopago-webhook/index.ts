import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Mercado Pago sends the type and data.id in the query params or body
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || (await req.json()).type
    const id = url.searchParams.get('data.id') || (await req.json()).data?.id

    if (type === 'payment' && id) {
      // 1. Fetch payment details from MP
      const { data: configData } = await supabaseClient
        .from('store_settings')
        .select('value')
        .eq('key', 'mercadopago_config')
        .single()

      const accessToken = configData?.value?.access_token
      
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      const payment = await response.json()

      if (payment.status === 'approved') {
        const orderId = payment.external_reference

        // 2. Update Order Status
        const { error: updateError } = await supabaseClient
          .from('orders')
          .update({ 
            status: 'approved',
            payment_id: payment.id.toString(),
            payment_status: 'paid'
          })
          .eq('id', orderId)

        if (updateError) console.error('Error updating order:', updateError)
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error: any) {
    console.error('Webhook Error:', error.message)
    return new Response(error.message, { status: 500 })
  }
})
