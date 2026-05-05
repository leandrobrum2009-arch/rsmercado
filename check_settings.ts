import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
async function check() {
  const { data } = await supabase.from('store_settings').select('*')
  console.log('Settings:', data)
}
check()
