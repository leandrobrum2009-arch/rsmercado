 import { createClient } from '@supabase/supabase-js'
 
 const supabaseUrl = process.env.VITE_SUPABASE_URL
 const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
 
 if (!supabaseUrl || !supabaseKey) {
   console.error('Supabase credentials missing')
   process.exit(1)
 }
 
 const supabase = createClient(supabaseUrl, supabaseKey)
 
 async function check() {
   console.log('Checking is_admin RPC...')
   const { data, error } = await supabase.rpc('is_admin')
   if (error) {
     console.error('is_admin RPC error:', error.message)
   } else {
     console.log('is_admin RPC result:', data)
   }
 
   console.log('Checking tables...')
   const tables = ['profiles', 'user_roles', 'products', 'categories', 'orders', 'site_visits']
   for (const table of tables) {
     const { error } = await supabase.from(table).select('*').limit(1)
     if (error) {
       console.error(`Table ${table} error:`, error.message)
     } else {
       console.log(`Table ${table} exists`)
     }
   }
 }
 
 check()