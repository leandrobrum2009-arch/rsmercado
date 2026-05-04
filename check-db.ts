 import { createClient } from '@supabase/supabase-js'
 
 const supabaseUrl = 'https://woelvkuxkkhvausaoudk.supabase.co'
 const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo'
 
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
 
  async function testInsert() {
    console.log('Testing insert...')
    const { error: insertError } = await supabase.from('products').insert({
      name: 'Test Product',
      price: 10.0,
      is_available: true,
      is_approved: true,
      stock: 100
    })
    console.log('Insert error:', insertError)
  }

  async function run() {
    await check()
    await testInsert()
  }

  run()