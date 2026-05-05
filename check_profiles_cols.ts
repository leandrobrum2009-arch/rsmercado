import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
async function check() {
  const { data } = await supabase.from('profiles').select('*').limit(1)
  if (data && data.length > 0) {
    console.log('Profiles columns:', Object.keys(data[0]))
  }
}
check()
