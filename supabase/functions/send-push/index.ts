 import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
 import webpush from "https://esm.sh/web-push"
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 }
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }
 
   try {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
     )
 
     const { notification_id } = await req.json()
 
     // Get notification details
     const { data: notification, error: nError } = await supabase
       .from('notifications')
       .select('*')
       .eq('id', notification_id)
       .single()
 
     if (nError || !notification) throw new Error('Notification not found')
 
     // Get user subscriptions
     const { data: subscriptions, error: sError } = await supabase
       .from('push_subscriptions')
       .select('*')
       .eq('user_id', notification.user_id)
 
     if (sError) throw sError
 
     // Configure web-push
     // NOTE: User must set these in Supabase Edge Function Secrets
     const vapidDetails = {
       publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
       privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
       subject: 'mailto:admin@example.com'
     }
 
     const results = []
     for (const sub of subscriptions) {
       try {
         const pushSubscription = {
           endpoint: sub.endpoint,
           keys: {
             p256dh: sub.p256dh,
             auth: sub.auth
           }
         }
 
         await webpush.sendNotification(
           pushSubscription,
           JSON.stringify({
             title: notification.title,
             body: notification.message,
             url: '/' // Can be customized based on type
           }),
           vapidDetails
         )
         results.push({ success: true, endpoint: sub.endpoint })
       } catch (err) {
         console.error('Error sending to endpoint:', sub.endpoint, err)
         results.push({ success: false, endpoint: sub.endpoint, error: err.message })
         
         // If subscription is expired/invalid, remove it
         if (err.statusCode === 410 || err.statusCode === 404) {
           await supabase.from('push_subscriptions').delete().eq('id', sub.id)
         }
       }
     }
 
     return new Response(
       JSON.stringify({ results }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     )
   } catch (error) {
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     )
   }
 })