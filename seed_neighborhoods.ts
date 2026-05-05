import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase env vars missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const neighborhoods = [
  { name: 'Acampamento', fee: 15.00, active: true },
  { name: 'Àgua Quente', fee: 10.00, active: true },
  { name: 'Barra da Tijuca', fee: 25.00, active: true },
  { name: 'Batume', fee: 10.00, active: true },
  { name: 'Canjiquinha', fee: 10.00, active: true },
  { name: 'Morro agudo', fee: 10.00, active: true },
  { name: 'Mottas', fee: 15.00, active: true },
  { name: 'Rua dos mudos', fee: 10.00, active: true },
  { name: 'Santa rosa', fee: 20.00, active: true },
  { name: 'São Lourenço', fee: 25.00, active: true },
  { name: 'Serra do capim', fee: 20.00, active: true },
  { name: 'Soledade', fee: 10.00, active: true }
]

async function seed() {
  console.log('Seeding neighborhoods...')
  const { error } = await supabase.from('delivery_neighborhoods').upsert(neighborhoods, { onConflict: 'name' })
  if (error) {
    console.error('Error seeding neighborhoods:', error)
  } else {
    console.log('Neighborhoods seeded successfully!')
  }
}

seed()
