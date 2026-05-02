 import { createClient } from '@supabase/supabase-js';
 
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '') || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '') || '';
 
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Some features may not work until you connect Supabase in the Lovable editor.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);