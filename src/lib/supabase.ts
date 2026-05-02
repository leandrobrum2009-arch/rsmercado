import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

 if (!supabaseUrl || !supabaseKey || supabaseKey === 'your-anon-key' || supabaseUrl.includes('your-project')) {
   // Use a placeholder only to avoid immediate crash, but log a clear error
   console.error('ERRO: Conexão com Supabase não configurada. Por favor, clique no ícone do Supabase na barra lateral do Lovable e clique em "Connect".');
 }

 // Use the real values or placeholder that won't cause "Failed to fetch" immediately
 // We check for these in the UI to show a better error message
  // Using the credentials provided to restore connection
   const fallbackUrl = 'https://woelvkuxkkhvausaoudk.supabase.co';
  const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo';
 
  const finalUrl = supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co' ? supabaseUrl : fallbackUrl;
  const finalKey = supabaseKey && supabaseKey !== 'placeholder' ? supabaseKey : fallbackKey;

 export const supabase = createClient(finalUrl, finalKey, {
   auth: {
     persistSession: true,
     autoRefreshToken: true,
     detectSessionInUrl: true,
     flowType: 'pkce'
   }
 });
