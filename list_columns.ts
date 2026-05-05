import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
async function check() {
  const { data, error } = await supabase.from('orders').select('*').limit(1)
  if (data && data.length > 0) {
    console.log('Columns in orders table:', Object.keys(data[0]))
  } else {
    console.log('No data in orders table or error:', error)
  }
}
check()
