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

    const { orderId, cardData } = await req.json()

    if (!orderId || !cardData) {
      throw new Error('Missing orderId or cardData')
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

    // 2. Fetch Sipag Config
    const { data: configData, error: configError } = await supabaseClient
      .from('store_settings')
      .select('value')
      .eq('key', 'sipag_config')
      .single()

    if (configError || !configData?.value) {
      throw new Error('Sipag configuration not found')
    }

    const config = configData.value
    if (!config.enabled) {
      throw new Error('Sipag payment is disabled')
    }

    const merchantId = config.merchant_id
    const merchantKey = config.security_key
    const isSandbox = config.environment === 'sandbox'

    // Base URLs based on common Sipag v4 / Cielo v3 patterns
    const baseUrl = isSandbox 
      ? 'https://apisandbox.sipag.com.br' 
      : 'https://api.sipag.com.br'

    // 3. Prepare Webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/sipag-webhook`

    // 4. Prepare Sipag Payload
    const amountInCents = Math.round(order.total_amount * 100)
    
    const cardNumber = cardData.number.replace(/\s/g, '')
    const expiryParts = cardData.expiry.split('/')
    const expiryMonth = expiryParts[0]
    const expiryYear = '20' + expiryParts[1]

    const sipagPayload = {
      "MerchantOrderId": order.id,
      "Customer": {
        "Name": order.customer_name || "Cliente"
      },
      "Payment": {
        "Type": "CreditCard",
        "Amount": amountInCents,
        "Installments": 1,
        "NotificationUrl": webhookUrl,
        "CreditCard": {
          "CardNumber": cardNumber,
          "Holder": cardData.name,
          "ExpirationDate": `${expiryMonth}/${expiryYear}`,
          "SecurityCode": cardData.cvv,
          "Brand": "Visa" 
        }
      }
    }

    console.log(`Sending payment request to Sipag (${config.environment}):`, {
      orderId: order.id,
      amount: amountInCents
    })

    // 4. Send Request to Sipag
    const response = await fetch(`${baseUrl}/v1/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MerchantId': merchantId,
        'MerchantKey': merchantKey
      },
      body: JSON.stringify(sipagPayload)
    })

    const result = await response.json()
    console.log('Sipag Response:', JSON.stringify(result))

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.Message || result[0]?.Message || 'Erro na comunicação com Sipag' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Status codes: 1 = Authorized, 2 = Confirmed
    if (result.Payment?.Status === 1 || result.Payment?.Status === 2) {
      // 5. Update Order Status
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({ 
          status: 'approved',
          payment_id: result.Payment.PaymentId,
          payment_status: 'paid'
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('Error updating order status:', updateError)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Pagamento aprovado!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Pagamento não aprovado. Status: ${result.Payment?.ReturnMessage || result.Payment?.Status || 'Desconhecido'}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})