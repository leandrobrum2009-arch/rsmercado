 import { createClient } from '@supabase/supabase-js'
 import dotenv from 'dotenv'
 dotenv.config()
 
 const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
 
 async function check() {
   try {
     console.log('Checking database...');
     const { data: settings, error: settingsError } = await supabase.from('store_settings').select('*')
     if (settingsError) console.log('Settings Error:', settingsError.message)
     else {
       settings?.forEach(s => console.log(`Key: ${s.key}, Value: ${JSON.stringify(s.value)}`));
     }
 
     const { data: alerts, error: alertsError } = await supabase.from('store_alerts').select('*')
     if (alertsError) console.log('Alerts Error:', alertsError.message)
     else {
       console.log('Active Alerts:');
       alerts?.forEach(a => console.log(`- [${a.is_active ? 'ACTIVE' : 'INACTIVE'}] ${a.message}`));
     }
   } catch (e) {
     console.log('Fatal Error:', e)
   }
 }
 check()