import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
async function check() {
  const { error } = await supabase.from('notifications').select('*').limit(1)
  console.log('Notifications check error:', error)
}
check()
