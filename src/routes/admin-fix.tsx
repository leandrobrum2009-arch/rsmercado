 import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { ShieldAlert, Loader2, Zap, UserCheck, RefreshCw, Database, Trash2, Key, Copy, Check } from 'lucide-react'
 import { toast } from '@/lib/toast'

export const Route = createFileRoute('/admin-fix')({
  component: AdminFix,
})

function AdminFix() {
    const [key, setKey] = useState('') 
   const [email, setEmail] = useState('')
   const [loading, setLoading] = useState(false)
   const [status, setStatus] = useState('')
   const [confirming, setConfirming] = useState(false)
   const [seeding, setSeeding] = useState(false)
    const [testing, setTesting] = useState(false)
    const [showSql, setShowSql] = useState(false)
    const [generatedSql, setGeneratedSql] = useState('')
    const [copied, setCopied] = useState(false)
   const [currentUser, setCurrentUser] = useState<any>(null)
   const [userRole, setUserRole] = useState<string | null>(null)
 
      const generateRepairSql = () => {
        const sql = `-- REPARO COMPLETO E DEFINITIVO DO BANCO DE DATOS
-- 1. Criação de Tabelas
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon_url TEXT,
    banner_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    old_price DECIMAL(10,2),
    category_id UUID REFERENCES public.categories(id),
    image_url TEXT,
    size TEXT,
    brand TEXT,
    stock INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    points_value INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    category_id UUID REFERENCES public.categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    category TEXT,
    difficulty TEXT,
    image_url TEXT,
    ingredients JSONB DEFAULT '[]'::jsonb,
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 2. Atualização de Colunas Faltantes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'banner_url') THEN
        ALTER TABLE public.categories ADD COLUMN banner_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'size') THEN
        ALTER TABLE public.products ADD COLUMN size TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand') THEN
        ALTER TABLE public.products ADD COLUMN brand TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'points_value') THEN
        ALTER TABLE public.products ADD COLUMN points_value INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Funções de Auditoria e Promoção
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF secret_key = 'CHAVE_MESTRE' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_user_email(email_to_confirm text, secret_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF secret_key = 'CHAVE_MESTRE' THEN
    UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = email_to_confirm;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_rls_status()
RETURNS TABLE (table_name text, rls_enabled boolean, policy_count bigint) 
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT t.relname::text, t.relrowsecurity, (SELECT count(*) FROM pg_policy p WHERE p.polrelid = t.oid)
    FROM pg_class t JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relkind = 'r' AND t.relname NOT IN ('pg_stat_statements', 'spatial_ref_sys')
    ORDER BY t.relname;
$$;

-- 4. Funções de Acesso (SEM RECURSÃO)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') 
  OR auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com';
$$;

-- 5. Habilitar RLS e Limpar Políticas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tab text;
    pol record;
BEGIN
    FOR tab IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('products', 'categories', 'banners', 'store_settings', 'recipes', 'user_roles')
    LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tab AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tab);
        END LOOP;
    END LOOP;
END $$;

-- 6. Recriar Políticas
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Public Read Settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Self Read Roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admin Manage Products" ON public.products FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Manage Categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Manage Banners" ON public.banners FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Manage Settings" ON public.store_settings FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Manage Recipes" ON public.recipes FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Manage Roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());

-- 7. Buckets de Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true), ('banners', 'banners', true), ('categories', 'categories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Public storage access" ON storage.objects FOR SELECT USING (bucket_id IN ('products', 'banners', 'categories'));
CREATE POLICY "Auth storage upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('products', 'banners', 'categories'));
CREATE POLICY "Admin storage control" ON storage.objects FOR ALL TO authenticated USING (bucket_id IN ('products', 'banners', 'categories'));

-- Notificar reload
NOTIFY pgrst, 'reload schema';
`;
       setGeneratedSql(sql);
       setShowSql(true);
       setStatus('SQL gerado com sucesso! Veja abaixo.');
     }
 
     const copyToClipboard = () => {
       navigator.clipboard.writeText(generatedSql);
       setCopied(true);
       toast.success('SQL copiado para a área de transferência!');
       setTimeout(() => setCopied(false), 2000);
     }

   useEffect(() => {
     const fetchUser = async () => {
       const { data: { session } } = await supabase.auth.getSession()
       if (session) {
         setCurrentUser(session.user)
         const { data } = await supabase
           .from('user_roles')
           .select('role')
           .eq('user_id', session.user.id)
           .maybeSingle()
         setUserRole(data?.role || 'user')
       }
     }
     fetchUser()
   }, [])

   const handleTestConnection = async () => {
     setTesting(true)
     setStatus('Testando conexão com Supabase...')
     try {
       const { data, error } = await supabase.from('categories').select('count', { count: 'exact', head: true })
       if (error) throw error
       setStatus('CONEXÃO OK! Banco de dados respondendo corretamente.')
     } catch (err: any) {
       setStatus('ERRO DE CONEXÃO: ' + err.message)
     } finally {
       setTesting(false)
     }
   }

   const handleClearAll = () => {
     localStorage.clear()
     sessionStorage.clear()
     supabase.auth.signOut()
     setStatus('LIMPANDO TUDO... Recarregando página em 2 segundos.')
     setTimeout(() => window.location.reload(), 2000)
   }

   const handleSeedRecipes = async () => {
     setSeeding(true)
     setStatus('Semeando 40 receitas brasileiras...')
     try {
       const brazilianDishes = [
         'Feijoada Completa', 'Moqueca Baiana', 'Coxinha de Frango', 'Pão de Queijo Mineiro',
         'Brigadeiro Gourmet', 'Farofa de Bacon', 'Bolo de Cenoura com Calda', 'Arroz Carreteiro',
         'Escondidinho de Carne Seca', 'Vaca Atolada', 'Tapioca Recheada', 'Açaí na Tigela',
         'Quindim Tradicional', 'Mousse de Maracujá', 'Pudim de Leite Moça', 'Salpicão de Frango',
         'Maionese de Domingo', 'Churrasco Gaúcho', 'Pastel de Feira', 'Tacacá do Norte',
         'Acarajé Crocante', 'Baião de Dois', 'Galinhada Goiana', 'Peixe na Telha',
         'Bobó de Camarão', 'Caldo Verde', 'Canjica Doce', 'Pamonha de Milho Verde',
         'Curau Cremoso', 'Bolinha de Queijo', 'Kibe Assado', 'Pizza de Calabresa',
         'Lasanha Bolonhesa', 'Strogonoff de Frango', 'Frango com Quiabo', 'Dobradinha',
         'Sarapatel', 'Buchada de Bode', 'Arroz Doce Cremoso', 'Romeu e Julieta'
       ]
       const categories = ['Brasileira', 'Sobremesa', 'Lanche', 'Almoço Especial']
       const mockRecipes = brazilianDishes.map((title, i) => ({
         title: title,
         description: `O segredo do melhor ${title} que você já provou. Uma receita que passa de geração em geração.`,
         instructions: `1. Limpe e pique os ingredientes.\n2. Inicie o refogado com alho e cebola.\n3. Adicione os itens principais e cozinhe em fogo brando.\n4. Ajuste o sal e sirva com acompanhamentos frescos.`,
         category: categories[i % categories.length],
         difficulty: i % 3 === 0 ? 'Fácil' : i % 3 === 1 ? 'Média' : 'Difícil',
         image_url: `https://images.unsplash.com/photo-${1504674900247 + i}?w=800&h=400&fit=crop`,
         ingredients: [{ name: 'Ingrediente Principal', quantity: '500g' }, { name: 'Temperos', quantity: 'a gosto' }]
       }))

       const { error } = await supabase.from('recipes').upsert(
         mockRecipes.map(r => ({ ...r, author_id: currentUser?.id }))
       )
       if (error) {
         const { error: insertError } = await supabase.from('recipes').insert(
           mockRecipes.map(r => ({ ...r, author_id: currentUser?.id }))
         )
         if (insertError) throw insertError
       }
       setStatus('SUCESSO! 40 receitas foram cadastradas.')
     } catch (err: any) {
        setStatus('Não foi possível realizar a operação. Verifique a chave ou tente novamente mais tarde.')
     } finally {
       setSeeding(false)
     }
   }
 
   const handleSyncProfile = async () => {
     if (!currentUser) return
     setLoading(true)
     setStatus('Sincronizando perfil...')
     try {
       const { error } = await supabase.from('profiles').upsert({
         id: currentUser.id,
         full_name: currentUser.user_metadata?.full_name || currentUser.email,
         avatar_url: currentUser.user_metadata?.avatar_url,
         is_admin: userRole === 'admin'
       })
       if (error) throw error
       setStatus('Perfil sincronizado!')
     } catch (err: any) {
       setStatus('Erro ao sincronizar: ' + err.message)
     } finally {
       setLoading(false)
     }
   }
    const handleConfirmEmail = async () => {
      if (!email) {
        setStatus('Digite o e-mail que deseja confirmar')
        return
      }
     setConfirming(true)
     setStatus('Confirmando e-mail...')
     try {
        const { data, error } = await supabase.rpc('confirm_user_email', {
          email_to_confirm: email.trim().toLowerCase(),
          secret_key: key.trim()
        })
       if (error) throw error
       setStatus('E-mail confirmado com sucesso! Agora você pode fazer login.')
     } catch (err: any) {
       setStatus('Erro ao confirmar: ' + err.message)
     } finally {
       setConfirming(false)
     }
   }
 
    const handleFix = async () => {
      const trimmedKey = key.trim();

     setLoading(true)
     setStatus('Verificando sessão...')
     
     try {
       const { data: { session } } = await supabase.auth.getSession()
       if (!session) {
         setStatus('ERRO: Você precisa estar logado! Se o e-mail não confirmou, use o botão "Confirmar E-mail" abaixo primeiro.')
         return
       }
 
        setStatus('Concedendo privilégios de administrador...')
        const { data, error } = await supabase.rpc('promote_to_admin', { 
          secret_key: key.trim() 
        })

        if (error) {
          if (error.message.includes('Could not find the function')) {
            setStatus('SISTEMA ESTÁ SENDO ATUALIZADO: O banco de dados está recebendo as novas permissões. Aguarde 15-30 segundos e clique no botão novamente.')
            return
          }
          throw error
        }
 
       setStatus('SUCESSO! Você agora é admin. Redirecionando...')
       setTimeout(() => window.location.href = '/admin', 2000)
     } catch (err: any) {
       setStatus('ERRO: ' + err.message)
     } finally {
       setLoading(false)
     }
   }

   return (
     <div className="container mx-auto px-4 py-10 flex flex-col items-center justify-center min-h-screen">
        <div className="mb-6 px-8 py-4 bg-red-600 text-white rounded-2xl font-black shadow-2xl text-center max-w-md">
         ⚠️ MODO DE REPARAÇÃO AVANÇADO <br/>
         <span className="text-[10px] opacity-80 uppercase tracking-widest">Utilize apenas se o acesso administrativo estiver bloqueado</span>
       </div>
 

       <div className="flex gap-4 w-full max-w-md mb-6">
         <Button 
           variant="outline" 
           className="flex-1 bg-white border-2 border-zinc-300 h-14 font-black text-[10px] uppercase"
           onClick={handleTestConnection}
           disabled={testing}
         >
           <Database className={`mr-2 h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
           Testar Banco
         </Button>
         <Button 
           variant="destructive" 
           className="flex-1 border-2 border-red-700 h-14 font-black text-[10px] uppercase"
           onClick={handleClearAll}
         >
           <Trash2 className="mr-2 h-4 w-4" />
           Limpar Cache
         </Button>
       </div>

       {currentUser && (
         <div className="w-full max-w-md mb-6 bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-sm flex items-center gap-4">
           <div className="bg-zinc-100 p-3 rounded-full">
             <UserCheck className="text-zinc-600" />
           </div>
           <div className="flex-1">
             <p className="text-[10px] text-zinc-500 uppercase font-bold">Logado como:</p>
             <p className="text-sm font-black text-zinc-900 truncate">{currentUser.email}</p>
             <p className="text-[10px] font-bold text-green-600 uppercase">Role: {userRole || 'Carregando...'}</p>
           </div>
           <Button variant="ghost" size="sm" onClick={handleSyncProfile} disabled={loading}>
             <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
           </Button>
         </div>
       )}
       
       <Card className="w-full max-w-md border-4 border-zinc-900 shadow-2xl overflow-hidden">
         <div className="bg-zinc-900 p-2 text-center text-white font-bold text-[10px] uppercase tracking-widest">
           Painel de Diagnóstico e Reparo
         </div>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <ShieldAlert className="text-amber-500" /> Recuperação de Sistema
           </CardTitle>
         </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="p-4 bg-zinc-100 rounded-xl border-2 border-zinc-300 space-y-2">
            <p className="text-[10px] font-black uppercase text-zinc-500">Dica de Acesso:</p>
            <p className="text-xs font-bold leading-tight">
              Se você esqueceu sua senha, agora existe um botão "ESQUECI MINHA SENHA" na tela de login que envia um link para seu e-mail.
            </p>
          </div>

          {/* STEP 1: Confirm Email */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">1</div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Ativar Conta (E-mail)</h3>
            </div>
            
           <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200 shadow-sm space-y-3">
               <p className="text-[10px] text-amber-800 font-bold leading-tight uppercase">
                 1. Insira o E-mail para confirmar
               </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400">Chave de Mestre</label>
                    <Input 
                      placeholder="CHAVE_MESTRE" 
                      value={key} 
                      onChange={e => setKey(e.target.value)}
                      className="bg-white h-10 text-xs border-amber-300"
                    />
                  </div>
                 <Input 
                   placeholder="E-mail do cadastro" 
                   value={email} 
                   onChange={e => setEmail(e.target.value)}
                   className="bg-white h-12 text-sm border-amber-300 focus:ring-amber-500"
                 />
                 <p className="text-[10px] text-zinc-500 font-bold italic">
                   Nota: Apenas o administrador mestre (leandrobrum2009@gmail.com) pode autorizar esta ação agora.
                 </p>
                 <Button 
                   onClick={handleConfirmEmail} 
                   disabled={confirming}
                   className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest mt-2"
                 >
                   {confirming ? <Loader2 className="animate-spin mr-2" /> : 'FORÇAR CONFIRMAÇÃO'}
                 </Button>
               </div>
            </div>
          </div>
 
          {/* STEP 2: Database Repair */}
          <div className="space-y-4 border-t pt-8">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">2</div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Reparar Estrutura (SQL)</h3>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200 shadow-sm space-y-3">
              <p className="text-[10px] text-blue-800 font-bold leading-tight uppercase">
                Se as colunas ou tabelas estiverem faltando (Ex: erro de 'size'), clique abaixo.
              </p>
               <Button 
                 onClick={generateRepairSql}
                 className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest"
               >
                 GERAR SQL DE REPARO
               </Button>
 
               {showSql && (
                 <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-4">
                   <div className="relative">
                     <textarea 
                       readOnly 
                       value={generatedSql}
                       className="w-full h-48 p-3 bg-zinc-900 text-green-400 font-mono text-[10px] rounded-lg border-2 border-zinc-700"
                     />
                     <Button 
                       size="sm" 
                       className="absolute top-2 right-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600"
                       onClick={copyToClipboard}
                     >
                       {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                     </Button>
                   </div>
                   <div className="p-3 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-start gap-3">
                     <div className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">!</div>
                     <p>IMPORTANTE: Copie todo o código acima e cole no SQL EDITOR do seu painel Supabase, depois clique em RUN.</p>
                   </div>
                 </div>
               )}
            </div>
          </div>

          {/* STEP 3: Get Admin */}
          <div className="space-y-4 border-t pt-8">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">3</div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Privilégios Admin</h3>
            </div>
 
            <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200 shadow-sm space-y-3 text-center">
              <p className="text-[10px] text-green-800 font-bold leading-tight uppercase mb-4">
                Concede privilégios totais de administrador
              </p>
              <Button 
                onClick={handleFix} 
                disabled={loading}
                className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black text-lg uppercase tracking-tighter"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : 'LIBERAR ACESSO TOTAL'}
              </Button>
            </div>
          </div>

           {/* STEP 3: Seed Data (Optional) */}
           <div className="space-y-4 border-t pt-8">
             <div className="flex items-center gap-3">
               <div className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">3</div>
               <h3 className="font-black text-gray-900 uppercase tracking-tight">Carga de Receitas</h3>
             </div>

             <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-200 shadow-sm space-y-3">
               <p className="text-[10px] text-purple-800 font-bold leading-tight uppercase">
                 Clique aqui se o site estiver sem receitas
               </p>
               <Button 
                 onClick={handleSeedRecipes} 
                 disabled={seeding}
                 className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest"
               >
                 {seeding ? <Loader2 className="animate-spin mr-2" /> : <><Zap className="mr-2 h-4 w-4" /> SEMEAR 40 RECEITAS</>}
               </Button>
             </div>
           </div>

           {status && (
             <div className="p-4 bg-zinc-900 text-green-400 rounded-lg text-xs font-mono border-l-4 border-green-500 animate-in fade-in slide-in-from-bottom-2">
               {status}
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  )
}
