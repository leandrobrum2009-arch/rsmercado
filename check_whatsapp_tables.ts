 import { createClient } from '@supabase/supabase-js'
 
 const supabaseUrl = process.env.VITE_SUPABASE_URL
 const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
 
 if (!supabaseUrl || !supabaseKey) {
   console.error('Supabase credentials missing')
   process.exit(1)
 }
 
 const supabase = createClient(supabaseUrl, supabaseKey)
 
 async function check() {
   const tables = ['whatsapp_campaigns', 'whatsapp_logs', 'whatsapp_templates']
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