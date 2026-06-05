import { createClient } from '@supabase/supabase-js';

// Agora utilizando o projeto Lovable Cloud atual (yymtipgsskvepufugfub)
// Isso garante que novas funcionalidades como Fornecedores e Pedidos de Compra funcionem.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase URL or Anon Key is missing from environment variables.');
}

export const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-application-name': 'rs-supermercado' },
    },
  }
);

// Monitoramento global de erros do Supabase
if (typeof window !== 'undefined') {
  const originalFrom = supabase.from.bind(supabase);
  // @ts-ignore - Interceptador simples para logs de erro em tabelas críticas
  supabase.from = (table: string) => {
    const queryBuilder = originalFrom(table);
    const originalSelect = queryBuilder.select.bind(queryBuilder);
    
    queryBuilder.select = (...args: any[]) => {
      const result = originalSelect(...args);
      // Aqui poderíamos interceptar a Promise e logar erros automáticos
      return result;
    };
    
    return queryBuilder;
  };
}
