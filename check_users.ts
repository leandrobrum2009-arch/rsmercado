import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://woelvkuxkkhvausaoudk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Missing SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles);
  if (pError) console.error('Profiles error:', pError);

  const { data: roles, error: rError } = await supabase.from('user_roles').select('*');
  console.log('Roles:', roles);
  if (rError) console.error('Roles error:', rError);
}

check();
