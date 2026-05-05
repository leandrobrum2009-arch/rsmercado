 import { createClient } from '@supabase/supabase-js'
 
 const supabaseUrl = process.env.VITE_SUPABASE_URL
 const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
 
 if (!supabaseUrl || !supabaseKey) {
   console.error('Missing Supabase credentials')
   process.exit(1)
 }
 
 const supabase = createClient(supabaseUrl, supabaseKey)
 
 async function cleanup() {
   console.log('Deleting all recipes...')
   const { error } = await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
   if (error) {
     console.error('Error deleting recipes:', error)
   } else {
     console.log('Successfully deleted all recipes.')
   }
 }
 
 cleanup()