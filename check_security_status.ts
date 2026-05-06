 import { createClient } from '@supabase/supabase-js'
 
 const supabaseUrl = process.env.VITE_SUPABASE_URL
 const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
 
 if (!supabaseUrl || !supabaseKey) {
   console.error('Supabase credentials missing')
   process.exit(1)
 }
 
 const supabase = createClient(supabaseUrl, supabaseKey)
 
 async function check() {
   console.log('--- Checking RLS status via queries ---')
   const tables = ['profiles', 'user_roles', 'products', 'categories', 'orders', 'order_items', 'user_addresses', 'store_settings']
   
   for (const table of tables) {
     const { data, error } = await supabase.from(table).select('*').limit(1)
     if (error) {
       console.log(`Table ${table}: Possible error or RLS blocking: ${error.message}`)
     } else {
       console.log(`Table ${table}: Accessible (Data count: ${data?.length || 0})`)
     }
   }
 
   console.log('\n--- Checking is_admin RPC ---')
   const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin')
   if (rpcError) {
     console.log(`is_admin RPC Error: ${rpcError.message}`)
   } else {
     console.log(`is_admin RPC Result: ${isAdmin}`)
   }
 }
 
 check()