import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: este cliente aponta para um projeto Supabase ANTIGO
// (woelvkuxkkhvausaoudk), não para o Lovable Cloud atual
// (yymtipgsskvepufugfub). Foi mantido assim porque todo o código legado
// (feedback, alerts, loyalty, RPCs admin) depende do schema antigo.
// Para migrar tudo para o Cloud novo é necessário recriar tabelas/funcoes
// e refatorar dezenas de arquivos.
const OLD_PROJECT_URL = 'https://woelvkuxkkhvausaoudk.supabase.co';
const OLD_PROJECT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo';

export const supabase = createClient(OLD_PROJECT_URL, OLD_PROJECT_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
