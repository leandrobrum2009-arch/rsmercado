 import { createClient } from '@supabase/supabase-js'
 import dotenv from 'dotenv'
 dotenv.config()
 
 const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
 
 async function check() {
   try {
     console.log('Listing all tables (by trying to query common ones)...');
     const tables = ['store_settings', 'store_alerts', 'banners', 'announcements', 'notifications'];
     const { data: banners } = await supabase.from('banners').select('*');
     console.log('First banner row keys:', banners && banners[0] ? Object.keys(banners[0]) : 'none');
     console.log('All banners:', JSON.stringify(banners, null, 2));
   } catch (e) {
     console.log('Fatal Error:', e)
   }
 }
 check()