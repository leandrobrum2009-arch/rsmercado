import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function check() {
  const { data: cats } = await supabase.from('categories').select('id').limit(1)
  if (!cats || cats.length === 0) {
     console.error('No categories found')
     return
  }
  
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: 'Test Product',
      price: 10.00,
      category_id: cats[0].id,
      is_available: true,
      is_approved: true,
      brand: 'Test Brand'
    })
  
  if (error) {
    console.error('Insert Error:', error)
  } else {
    console.log('Insert Success:', data)
  }
}

check()
