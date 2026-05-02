import { createClient } from '@supabase/supabase-js'

const url = 'https://woelvkuxkkhvausaoudk.supabase.co'
const key = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(url, key)

async function test() {
  const { data, error } = await supabase.from('recipes').select('*').limit(1)
  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }
  console.log('Success:', data)
}

test()
