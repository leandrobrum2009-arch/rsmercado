import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase env vars missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.rpc('get_policies')
  // If RPC doesn't exist, we'll try to just select from the table
  const { data: nData, error: nError } = await supabase.from('delivery_neighborhoods').select('*').limit(1)
  console.log('Select from delivery_neighborhoods result:', { nData, nError })
}

check()
