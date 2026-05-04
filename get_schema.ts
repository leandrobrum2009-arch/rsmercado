import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function check() {
  const { data, error } = await supabase
    .rpc('get_table_schema', { table_name: 'products' })
  
  if (error) {
    // If RPC doesn't exist, try querying information_schema directly if possible (might not be allowed via anon key)
    console.error('RPC Error:', error)
    const { data: cols, error: colError } = await supabase
      .from('products')
      .select('*')
      .limit(0)
    
    if (colError) console.error('Col Error:', colError)
    else console.log('Columns via select:', Object.keys(cols[0] || {}))
  } else {
    console.log('Schema:', data)
  }
}

check()
