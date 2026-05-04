 import { createClient } from '@supabase/supabase-js'
 
 const supabase = createClient(
   process.env.VITE_SUPABASE_URL!,
   process.env.VITE_SUPABASE_ANON_KEY!
 )
 
 async function test() {
   console.log('Testing insert...')
   const { data, error } = await supabase
     .from('products')
     .insert([
       { 
         name: 'Produto Teste Supabase', 
         price: 10.50, 
         is_approved: true, 
         is_available: true,
         description: 'Teste de conexão'
       }
     ])
     .select()
   
   if (error) {
     console.error('Insert Error:', error)
   } else {
     console.log('Insert Success:', data)
   }
 }
 
 test()