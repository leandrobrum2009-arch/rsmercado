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
 
     if (orderId && (status === 2 || status === 1)) {
       // 2 = Confirmed, 1 = Authorized
       console.log(`Updating order ${orderId} to approved (Sipag Status: ${status})`)
       
       const { error: updateError } = await supabaseClient
         .from('orders')
         .update({ 
           status: 'approved',
           payment_id: paymentId?.toString(),
           payment_status: 'paid'
         })
         .eq('id', orderId)
 
       if (updateError) console.error('Error updating order:', updateError)
     }
 
     return new Response('OK', { status: 200 })
   } catch (error: any) {
     console.error('Webhook Error:', error.message)
     return new Response(error.message, { status: 500 })
   }
 })