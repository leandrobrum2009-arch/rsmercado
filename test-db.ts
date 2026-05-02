import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://woelvkuxkkhvausaoudk.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('Testing connection to:', supabaseUrl)
console.log('Key length:', supabaseKey?.length || 0)

const supabase = createClient(supabaseUrl, supabaseKey || '')

async function test() {
  const { data, error } = await supabase.from('store_settings').select('key').limit(1)
  if (error) {
    console.error('Connection failed:', error.message)
    if (error.message.includes('API key')) {
        console.log('RESULT: INVALID_API_KEY')
    }
  } else {
    console.log('Connection successful!')
  }
}

test()
