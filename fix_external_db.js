import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://woelvkuxkkhvausaoudk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo';

// We need a SERVICE ROLE KEY to run SQL or change functions if RLS is tight, 
// but the anon key might not be enough to run RPCs that modify things.
// Actually, I don't have the service role key for the external project.
// I can only try to call existing RPCs or run queries allowed by anon/authenticated roles.

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Try to see if we can update something basic
  const { data, error } = await supabase.from('products').select('id').limit(1);
  console.log('Test query result:', { data, error });
}

run();
