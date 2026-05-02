import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://woelvkuxkkhvausaoudk.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
