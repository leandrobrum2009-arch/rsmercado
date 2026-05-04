 import { createClient } from '@supabase/supabase-js'
 
 const supabaseUrl = 'https://woelvkuxkkhvausaoudk.supabase.co'
 const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo'
 const supabase = createClient(supabaseUrl, supabaseKey)
 
 async function test() {
   console.log('--- Database Discovery ---')
   
   // Check if leandrobrum2009@gmail.com is an admin in profiles
   const { data: profiles, error: profErr } = await supabase.from('profiles').select('*').limit(10)
   console.log('Profiles Sample:', JSON.stringify(profiles, null, 2))
 
   // 2. Check categories
   const { data: categories, error: catErr } = await supabase.from('categories').select('*').limit(5)
   if (catErr) {
     console.error('Error fetching categories:', catErr)
   } else {
     console.log('Categories:', JSON.stringify(categories, null, 2))
   }
 
   // 3. Try to insert a test product
   console.log('\n--- Attempting to insert test product ---')
   const testProduct = {
     name: 'Produto Teste ' + new Date().toISOString(),
     price: 10.50,
     is_approved: true,
     is_available: true
   }
   
   const { data: inserted, error: insertErr } = await supabase.from('products').insert([testProduct]).select()
   if (insertErr) {
     console.error('Insert Error:', insertErr)
   } else {
     console.log('Successfully inserted product:', inserted)
     
     // 4. Delete the test product
     const { error: delErr } = await supabase.from('products').delete().eq('id', inserted[0].id)
     if (delErr) console.error('Delete Error:', delErr)
     else console.log('Successfully deleted test product.')
   }
 }
 
 test()