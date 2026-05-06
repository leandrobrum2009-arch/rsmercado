 import { createClient } from '@supabase/supabase-js'
 import dotenv from 'dotenv'
 dotenv.config()
 
 const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
 
 async function check() {
   try {
     console.log('Listing all tables (by trying to query common ones)...');
     const tables = ['store_settings', 'store_alerts', 'banners', 'announcements', 'notifications'];
     for (const table of tables) {
       const { data, error } = await supabase.from(table).select('*').limit(5);
       if (error) {
         // Ignore table not found errors
         if (!error.message.includes('does not exist')) {
           console.log(`Table ${table} Error: ${error.message}`);
         }
       } else {
         console.log(`Table ${table} exists with ${data.length} records.`);
         data.forEach(row => {
           const str = JSON.stringify(row);
           if (str.includes('Não se trata')) {
             console.log(`FOUND IN ${table}:`, row);
           }
         });
       }
     }
   } catch (e) {
     console.log('Fatal Error:', e)
   }
 }
 check()