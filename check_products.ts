import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function check() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Total Products:', data?.length || 0)
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]))
      console.log('Sample Status:', data.map(p => ({ id: p.id, name: p.name, is_approved: p.is_approved, is_available: p.is_available })))
    }
  }
}

check()
