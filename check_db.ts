import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  console.log('--- PRODUCTS TABLE ---')
  const { data: products, error: pError } = await supabase.from('products').select('*').limit(1)
  if (pError) console.error('Products error:', pError)
  else console.log('Products columns:', Object.keys(products[0] || {}))

  console.log('\n--- STORE_SETTINGS TABLE ---')
  const { data: settings, error: sError } = await supabase.from('store_settings').select('*').limit(1)
  if (sError) console.error('Store Settings error:', sError)
  else console.log('Store Settings columns:', Object.keys(settings[0] || {}))

  console.log('\n--- BANNERS TABLE ---')
  const { data: banners, error: bError } = await supabase.from('banners').select('*').limit(1)
  if (bError) console.error('Banners error:', bError)
  else console.log('Banners columns:', Object.keys(banners[0] || {}))

  console.log('\n--- TESTING RPC is_admin ---')
  const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin')
  console.log('is_admin RPC result:', isAdmin, 'Error:', rpcError)
}

check()
