import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    const { orderId } = await req.json()

    if (!orderId) {
      throw new Error('Missing orderId')
    }

    // 1. Fetch Order Details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // 2. Fetch Mercado Pago Config
    const { data: configData, error: configError } = await supabaseClient
      .from('store_settings')
      .select('value')
      .eq('key', 'mercadopago_config')
      .single()

    if (configError || !configData?.value) {
      throw new Error('Mercado Pago configuration not found')
    }

    const config = configData.value
    if (!config.enabled) {
      throw new Error('Mercado Pago payment is disabled')
    }

    const accessToken = config.access_token

    // 3. Prepare Mercado Pago Preference
    // Note: We'll use order.id as external_reference
    const preference = {
      items: [
        {
          id: order.id,
          title: `Pedido #${order.id.split('-')[0].toUpperCase()}`,
          quantity: 1,
          unit_price: order.total_amount,
          currency_id: 'BRL'
        }
      ],
      external_reference: order.id,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      back_urls: {
        success: `${req.headers.get('origin')}/track/${order.id}?status=success`,
        failure: `${req.headers.get('origin')}/track/${order.id}?status=failure`,
        pending: `${req.headers.get('origin')}/track/${order.id}?status=pending`
      },
      auto_return: 'approved'
    }

    // 4. Create Preference in Mercado Pago
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('MP Error:', result)
      throw new Error(result.message || 'Erro ao criar preferência no Mercado Pago')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        init_point: result.init_point, // For production redirect
        sandbox_init_point: result.sandbox_init_point // For sandbox test
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
