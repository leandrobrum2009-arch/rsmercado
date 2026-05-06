import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

async function check() {
  try {
    const tablesToTry = ['store_settings', 'store_alerts', 'banners', 'products', 'categories', 'orders', 'user_roles', 'site_visits', 'notifications', 'whatsapp_campaigns', 'loyalty_points'];
    
    console.log('Searching for "Não se trata" in tables...');
    for (const table of tablesToTry) {
      const { data, error } = await supabase.from(table).select('*');
      if (!error && data) {
        data.forEach(row => {
          const str = JSON.stringify(row);
          if (str.toLowerCase().includes('não se trata')) {
            console.log(`FOUND IN TABLE "${table}":`, JSON.stringify(row, null, 2));
          }
        });
      }
    }
    console.log('Search finished.');
  } catch (e) {
    console.log('Fatal Error:', e)
  }
}
check()
