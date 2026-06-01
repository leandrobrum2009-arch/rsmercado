
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug, icon_url, icon_name)')
    .eq('is_available', true)
    .eq('is_approved', true)
    .limit(5);
  
  console.log('Error:', error);
  console.log('Data length:', data?.length);
  console.log('First product categories:', data?.[0]?.categories);
}

test();
