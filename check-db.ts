 import { createClient } from '@supabase/supabase-js'
 
 const supabaseUrl = 'https://woelvkuxkkhvausaoudk.supabase.co'
 const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo'
 
 if (!supabaseUrl || !supabaseKey) {
   console.error('Missing env vars')
   process.exit(1)
 }
 
 const supabase = createClient(supabaseUrl, supabaseKey)
 
  async function getColumns() {
    console.log('Getting columns of products table...')
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'products' })
    if (error) {
      console.log('RPC get_table_columns failed, trying alternative...')
      // Try a regular query to information_schema (might fail due to permissions)
      const { data: cols, error: colError } = await supabase.from('products').select('*').limit(0)
      console.log('Columns via select limit 0:', data, colError)
    } else {
      console.log('Columns:', data)
    }
  }
 
  async function testInsert() {
    const fields = ['name', 'price', 'description', 'category_id', 'image_url', 'stock', 'brand', 'is_approved', 'is_available', 'points_value']
    const product: any = { name: 'Test' }
    
    for (const field of fields) {
       const { error } = await supabase.from('products').insert({ ...product, [field]: (field === 'price' ? 10 : 'test') })
       if (error && error.message.includes('column')) {
         console.log(`Column ${field} is MISSING`)
       } else if (error) {
         console.log(`Column ${field} exists but failed with other error:`, error.message)
       } else {
         console.log(`Column ${field} EXISTS`)
       }
    }
  }

  async function run() {
    await getColumns()
    await testInsert()
  }

  run()