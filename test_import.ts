 import { createClient } from '@supabase/supabase-js'
 
 const supabaseUrl = 'https://woelvkuxkkhvausaoudk.supabase.co'
 const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo'
 const supabase = createClient(supabaseUrl, supabaseKey)
 
 async function test() {
   console.log('--- Testing Product Import ---')
   
   // 1. Check current products
   const { data: products, error: prodErr } = await supabase.from('products').select('*').limit(5)
   if (prodErr) {
     console.error('Error fetching products:', prodErr)
   } else {
     console.log('Current products count (limited to 5):', products?.length)
     console.log('Products:', JSON.stringify(products, null, 2))
   }
 
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