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
    console.log('Testing insert...')
    const { error: insertError } = await supabase.from('products').insert({
      name: 'Test Product',
      price: 10.0,
      is_available: true,
      stock: 100
    })
    console.log('Insert error:', insertError)
  }

  async function run() {
    await getColumns()
    await testInsert()
  }

  run()