import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://woelvkuxkkhvausaoudk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: settings, error: sError } = await supabase.from('store_settings').select('key, value').eq('key', 'logo_url').single();
  const { count, error: pError } = await supabase.from('products').select('*', { count: 'exact', head: true });
  
  console.log('Logo setting:', settings);
  console.log('Product count:', count);
}

check();
