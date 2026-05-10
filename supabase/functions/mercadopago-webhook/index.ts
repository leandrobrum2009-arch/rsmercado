import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

     // Mercado Pago sends the type and data.id in the query params or body
     const url = new URL(req.url)
     let type = url.searchParams.get('type')
     let id = url.searchParams.get('data.id')
 
     if (!type || !id) {
       try {
         const body = await req.json()
         type = type || body.type || body.topic
         id = id || body.data?.id || body.resource?.split('/').pop()
       } catch (e) {
         // Not JSON or empty body
       }
     }
 
     console.log(`Webhook received: type=${type}, id=${id}`)
 
      if ((type === 'payment' || type === 'payment.updated') && id) {
        // 1. Fetch payment details from MP
        const { data: configData } = await supabaseClient
          .from('store_settings')
          .select('value')
          .eq('key', 'mercadopago_config')
          .single()

        const accessToken = configData?.value?.access_token
        if (!accessToken) {
          throw new Error('Mercado Pago access token not found')
        }
        
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch payment details: ${response.statusText}`)
        }

        const payment = await response.json()
        const orderId = payment.external_reference

        if (!orderId) {
          console.log('No order ID (external_reference) found in payment')
          return new Response('OK', { status: 200 })
        }

        console.log(`Payment status for order ${orderId}: ${payment.status}`)

        let orderStatus = 'pending'
        let paymentStatus = 'pending'

        switch (payment.status) {
          case 'approved':
            orderStatus = 'approved'
            paymentStatus = 'paid'
            break
          case 'authorized':
            orderStatus = 'pending' // Still waiting for capture maybe?
            paymentStatus = 'authorized'
            break
          case 'in_process':
          case 'pending':
            orderStatus = 'pending'
            paymentStatus = 'pending'
            break
          case 'rejected':
            orderStatus = 'cancelled'
            paymentStatus = 'failed'
            break
          case 'cancelled':
            orderStatus = 'cancelled'
            paymentStatus = 'cancelled'
            break
          case 'refunded':
            orderStatus = 'cancelled'
            paymentStatus = 'refunded'
            break
          case 'charged_back':
            orderStatus = 'cancelled'
            paymentStatus = 'charged_back'
            break
        }

        // 2. Update Order Status
        const { error: updateError } = await supabaseClient
          .from('orders')
          .update({ 
            status: orderStatus,
            payment_id: payment.id.toString(),
            payment_status: paymentStatus
          })
          .eq('id', orderId)

        if (updateError) {
          console.error('Error updating order:', updateError)
        } else {
          console.log(`Order ${orderId} updated to ${orderStatus}/${paymentStatus}`)
        }
      }

    return new Response('OK', { status: 200 })
  } catch (error: any) {
    console.error('Webhook Error:', error.message)
    return new Response(error.message, { status: 500 })
  }
})
