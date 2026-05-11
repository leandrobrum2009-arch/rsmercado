import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://woelvkuxkkhvausaoudk.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MTI2ODA0OH0.1_0-0r8-k3-l3-r8-k3-l3-r8-k3-l3-r8-k3-l3-r8-k3-l3-r8-k3-l3-r8-k3-l3-r8-k3-l3-r8-k3-l3';
// We use the public key found in history if the env vars are missing or pointing to the wrong project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
   auth: {
     persistSession: true,
     autoRefreshToken: true,
     detectSessionInUrl: true,
     flowType: 'pkce'
   }
 });
