import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
async function list() {
  const { data } = await supabase.from('recipes').select('id, title, created_at').order('created_at', { ascending: false })
  console.log(data)
}
list()
