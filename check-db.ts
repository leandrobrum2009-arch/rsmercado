 import { createClient } from '@supabase/supabase-js'
 
 const supabaseUrl = process.env.VITE_SUPABASE_URL
 const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
 
 if (!supabaseUrl || !supabaseKey) {
   console.error('Missing env vars')
   process.exit(1)
 }
 
 const supabase = createClient(supabaseUrl, supabaseKey)
 
 async function check() {
   console.log('Checking categories...')
   const { data: cats, error: catError } = await supabase.from('categories').select('*')
   console.log('Categories count:', cats?.length, catError || '')
 
   console.log('Checking products...')
   const { data: prods, error: prodError } = await supabase.from('products').select('*').limit(5)
   console.log('Products:', prods, prodError || '')
   
   const { data: countData } = await supabase.from('products').select('count', { count: 'exact', head: true })
   console.log('Total products count:', countData)
 }
 
 check()