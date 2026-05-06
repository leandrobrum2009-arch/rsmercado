import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

async function search() {
  const { data: tables, error } = await supabase.rpc('get_tables_with_columns');
  // If rpc doesn't exist, we'll try to get all tables from pg_catalog if we can, 
  // but we usually can't via supabase-js without an rpc.
  
  // Let's try to query the information_schema if possible.
  // Most Supabase setups allow reading information_schema.
  
  const query = "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'";
  // We can't run raw SQL via supabase-js easily.
  
  // Let's try a lot of possible table names.
  const commonTables = [
    'store_settings', 'store_alerts', 'banners', 'products', 'categories', 
    'orders', 'user_roles', 'profiles', 'notifications', 'site_visits',
    'whatsapp_campaigns', 'loyalty_points', 'neighborhoods', 'delivery_rules',
    'coupons', 'app_config', 'translations', 'cms_content', 'pages'
  ];
  
  for (const table of commonTables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (data) {
        data.forEach(row => {
          const s = JSON.stringify(row);
          if (s.toLowerCase().includes('não se trata')) {
            console.log(`FOUND in ${table}:`, row);
          }
        });
      }
    } catch (e) {}
  }
}
search();
