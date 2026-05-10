 import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
 
 serve(async (req) => {
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
     const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
     const supabaseClient = createClient(supabaseUrl, supabaseKey)
 
     const body = await req.json()
     console.log('Sipag Webhook received:', JSON.stringify(body))
 
     // Sipag standard notification format often includes MerchantOrderId and Payment.Status
     const orderId = body.MerchantOrderId
     const status = body.Payment?.Status
     const paymentId = body.Payment?.PaymentId
 
      if (orderId) {
        console.log(`Sipag Status for order ${orderId}: ${status}`)

        let orderStatus = 'pending'
        let paymentStatus = 'pending'

        // Sipag / Cielo standard status codes
        // 1: Authorized, 2: Confirmed/Captured, 3: Denied, 10: Voided, 11: Refunded, 12: Pending
        if (status === 2 || status === 1) {
          orderStatus = 'approved'
          paymentStatus = 'paid'
        } else if (status === 3 || status === 10) {
          orderStatus = 'cancelled'
          paymentStatus = 'failed'
        } else if (status === 11) {
          orderStatus = 'cancelled'
          paymentStatus = 'refunded'
        } else if (status === 12) {
          orderStatus = 'pending'
          paymentStatus = 'pending'
        }

        if (orderStatus !== 'pending' || status === 12) {
          console.log(`Updating order ${orderId} to ${orderStatus} (Sipag Status: ${status})`)
          
          const { error: updateError } = await supabaseClient
            .from('orders')
            .update({ 
              status: orderStatus,
              payment_id: paymentId?.toString(),
              payment_status: paymentStatus
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