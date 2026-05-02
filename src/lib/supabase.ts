import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

 if (!supabaseUrl || !supabaseKey || supabaseKey === 'your-anon-key' || supabaseUrl.includes('your-project')) {
   console.error('ERRO DE CONFIGURAÇÃO: As chaves do Supabase (URL e ANON KEY) não foram configuradas ou são inválidas. Verifique as configurações do projeto no Lovable.');
 }

 const safeUrl = supabaseUrl?.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
 const safeKey = supabaseKey || 'placeholder-key';
 
 export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
