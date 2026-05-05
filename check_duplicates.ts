import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function check() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  const counts = {}
  const duplicates = []
  
  for (const item of data || []) {
    const title = item.title.toLowerCase().trim()
    if (!counts[title]) {
      counts[title] = []
    }
    counts[title].push(item.id)
    if (counts[title].length > 1) {
      duplicates.push({ title, ids: counts[title] })
    }
  }
  
  console.log('Duplicates found:', JSON.stringify(duplicates, null, 2))
}

check()
