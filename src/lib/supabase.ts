import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

 if (!supabaseUrl || !supabaseKey || supabaseKey === 'your-anon-key' || supabaseUrl.includes('your-project')) {
   // Use a placeholder only to avoid immediate crash, but log a clear error
   console.error('ERRO: Conexão com Supabase não configurada. Por favor, clique no ícone do Supabase na barra lateral do Lovable e clique em "Connect".');
 }

 // Use the real values or empty strings to let Supabase SDK throw a more descriptive error if needed
 // but avoid using a fake URL that causes confusing "Failed to fetch" on a non-existent domain.
 export const supabase = createClient(
   supabaseUrl || 'https://missing-supabase-url.supabase.co',
   supabaseKey || 'missing-supabase-key',
   {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
