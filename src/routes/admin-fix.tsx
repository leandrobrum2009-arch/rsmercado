 import { createFileRoute } from '@tanstack/react-router'
 import { useState } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { AlertTriangle, CheckCircle, Database, Copy, ExternalLink, Loader2 } from 'lucide-react'
 import { toast } from 'sonner'
 
 export const Route = createFileRoute('/admin-fix')({
   component: AdminFixPage,
 })
 
 function AdminFixPage() {
   const [loading, setLoading] = useState(false)
 
  const sqlToRun = `-- 🛠️ SCRIPT DE REPARAÇÃO COMPLETA - RS SUPERMERCADO
-- Copie tudo e cole no SQL Editor do Supabase (clique em RUN)

-- 1. TABELAS BASE E EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE ROLES (ESSENCIAL PARA ADMIN)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. FUNÇÃO IS_ADMIN (RESTAURAÇÃO)
 CREATE OR REPLACE FUNCTION public.is_admin() 
 RETURNS BOOLEAN AS $$
 BEGIN
   RETURN (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') OR 
          EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') OR
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true);
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TABELA DE ENDEREÇOS (CORREÇÃO DO ERRO ATUAL)
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT DEFAULT 'Casa',
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    recipient_name TEXT,
    contact_phone TEXT,
    reference_point TEXT,
    observations TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- 5. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 6. TABELAS DE FIDELIDADE E BAIRROS
CREATE TABLE IF NOT EXISTS public.delivery_neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    fee DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.delivery_neighborhoods ENABLE ROW LEVEL SECURITY;

 CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     description TEXT,
     points_cost INTEGER NOT NULL,
     reward_type TEXT NOT NULL DEFAULT 'product',
     reward_data JSONB DEFAULT '{}',
     image_url TEXT,
     active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
 
 -- 7. MISSÕES SEMANAIS
 CREATE TABLE IF NOT EXISTS public.weekly_challenges (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     description TEXT,
     requirement_type TEXT NOT NULL DEFAULT 'total_amount',
     requirement_data JSONB DEFAULT '{}',
     points_reward INTEGER NOT NULL,
     start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
     end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
     active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;

-- 7. TABELAS DE WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    message_hash TEXT NOT NULL,
    campaign_id UUID,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS DE SEGURANÇA (RLS)
DO $$ 
BEGIN
    -- Endereços
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_addresses' AND policyname='Users manage own addresses') THEN
        CREATE POLICY "Users manage own addresses" ON public.user_addresses FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    -- Configurações (Público lê, Admin altera)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_settings' AND policyname='Public read settings') THEN
        CREATE POLICY "Public read settings" ON public.store_settings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_settings' AND policyname='Admin manage settings') THEN
        CREATE POLICY "Admin manage settings" ON public.store_settings FOR ALL USING (public.is_admin());
    END IF;

     -- Fidelidade
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_rewards' AND policyname='Admin manage rewards') THEN
         CREATE POLICY "Admin manage rewards" ON public.loyalty_rewards FOR ALL USING (public.is_admin());
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_rewards' AND policyname='Public read rewards') THEN
         CREATE POLICY "Public read rewards" ON public.loyalty_rewards FOR SELECT USING (active = true);
     END IF;
 
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weekly_challenges' AND policyname='Admin manage challenges') THEN
         CREATE POLICY "Admin manage challenges" ON public.weekly_challenges FOR ALL USING (public.is_admin());
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weekly_challenges' AND policyname='Public read challenges') THEN
         CREATE POLICY "Public read challenges" ON public.weekly_challenges FOR SELECT USING (active = true);
     END IF;
 
     -- Bairros
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_neighborhoods' AND policyname='Admin manage neighborhoods') THEN
         CREATE POLICY "Admin manage neighborhoods" ON public.delivery_neighborhoods FOR ALL USING (public.is_admin());
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_neighborhoods' AND policyname='Public read neighborhoods') THEN
         CREATE POLICY "Public read neighborhoods" ON public.delivery_neighborhoods FOR SELECT USING (active = true);
     END IF;
 
     -- WhatsApp
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='whatsapp_templates' AND policyname='Admin manage templates') THEN
          CREATE POLICY "Admin manage templates" ON public.whatsapp_templates FOR ALL USING (public.is_admin());
      END IF;
 END $$;
 
 -- 9. REPARAR CATEGORIAS E PRODUTOS
 ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon_name TEXT;
 ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS banner_url TEXT;
 
 -- ATUALIZAR POLÍTICAS
 DROP POLICY IF EXISTS "Admins can do everything on categories" ON public.categories;
 CREATE POLICY "Admins can do everything on categories" ON public.categories FOR ALL USING (public.is_admin());
 
  DROP POLICY IF EXISTS "Admins can do everything on products" ON public.products;
  CREATE POLICY "Admins can do everything on products" ON public.products FOR ALL USING (public.is_admin());

 -- 10. NOTIFICAÇÕES E ALERTAS
 CREATE TABLE IF NOT EXISTS public.notifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     message TEXT NOT NULL,
     type TEXT DEFAULT 'info',
     is_read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users view own notifications') THEN
         CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
     END IF;
 END $$;
 
 CREATE TABLE IF NOT EXISTS public.store_alerts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     message TEXT NOT NULL,
     type TEXT DEFAULT 'info',
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 ALTER TABLE public.store_alerts ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_alerts' AND policyname='Public view alerts') THEN
         CREATE POLICY "Public view alerts" ON public.store_alerts FOR SELECT USING (true);
     END IF;
 END $$;
 
 CREATE TABLE IF NOT EXISTS public.site_visits (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     visitor_id TEXT,
     page_path TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_visits' AND policyname='Public insert visits') THEN
         CREATE POLICY "Public insert visits" ON public.site_visits FOR INSERT WITH CHECK (true);
     END IF;
 END $$;`
 
   const copyToClipboard = () => {
     navigator.clipboard.writeText(sqlToRun)
     toast.success('Código SQL copiado!')
   }
 
   return (
     <div className="container mx-auto px-4 py-12 max-w-3xl">
       <div className="text-center mb-10">
         <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full text-red-600 mb-4">
           <Database size={32} />
         </div>
         <h1 className="text-4xl font-black uppercase tracking-tighter">Reparar Sistema</h1>
         <p className="text-muted-foreground font-bold uppercase text-[10px] mt-2 tracking-widest">Utilitário de Recuperação de Banco de Dados</p>
       </div>
 
       <div className="grid gap-8">
         <Card className="border-2 border-red-100 shadow-xl overflow-hidden">
           <CardHeader className="bg-red-50 border-b border-red-100">
             <CardTitle className="flex items-center gap-2 text-red-900">
               <AlertTriangle className="text-red-600" /> Erro Detectado: Tabela Faltando
             </CardTitle>
             <CardDescription className="text-red-700 font-medium">
               Algumas tabelas essenciais (como endereços de entrega) não foram encontradas no seu banco de dados Supabase.
             </CardDescription>
           </CardHeader>
           <CardContent className="pt-6 space-y-6">
             <div className="bg-zinc-900 rounded-xl p-6 text-zinc-400 font-mono text-sm relative group">
               <button 
                 onClick={copyToClipboard}
                 className="absolute top-4 right-4 bg-zinc-800 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700"
                 title="Copiar SQL"
               >
                 <Copy size={16} />
               </button>
               <pre className="whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                 {sqlToRun}
               </pre>
             </div>
 
             <div className="flex flex-col gap-4">
               <h3 className="font-black uppercase text-xs tracking-wider flex items-center gap-2">
                 <CheckCircle size={16} className="text-green-600" /> Instruções de Reparo:
               </h3>
               <ol className="space-y-3 text-sm font-medium text-zinc-600">
                 <li className="flex gap-3">
                   <span className="bg-zinc-200 text-zinc-600 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">1</span>
                   <span>Clique no botão azul abaixo para abrir o seu painel do Supabase.</span>
                 </li>
                 <li className="flex gap-3">
                   <span className="bg-zinc-200 text-zinc-600 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">2</span>
                   <span>No menu lateral esquerdo, clique no ícone <span className="font-bold">"SQL Editor"</span>.</span>
                 </li>
                 <li className="flex gap-3">
                   <span className="bg-zinc-200 text-zinc-600 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">3</span>
                   <span>Clique em <span className="font-bold">"+ New query"</span> e cole o código acima.</span>
                 </li>
                 <li className="flex gap-3">
                   <span className="bg-zinc-200 text-zinc-600 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">4</span>
                   <span>Clique no botão verde <span className="font-bold text-green-700">"RUN"</span> no canto inferior direito.</span>
                 </li>
               </ol>
             </div>
 
             <div className="flex flex-col md:flex-row gap-4 pt-4">
               <Button 
                 onClick={copyToClipboard}
                 className="flex-1 h-14 rounded-2xl font-black uppercase tracking-wider text-sm shadow-lg hover:scale-[1.02] transition-transform"
               >
                 <Copy className="mr-2" size={20} /> Copiar Código SQL
               </Button>
               <Button 
                 variant="outline"
                 onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                 className="flex-1 h-14 rounded-2xl font-black uppercase tracking-wider text-sm border-2 border-primary text-primary hover:bg-primary/5"
               >
                 <ExternalLink className="mr-2" size={20} /> Abrir Supabase
               </Button>
             </div>
           </CardContent>
         </Card>
 
         <div className="text-center">
           <Button 
             variant="ghost" 
             onClick={() => window.location.href = '/'}
             className="text-zinc-400 font-bold uppercase text-[10px] hover:text-zinc-900"
           >
             Voltar para a Loja
           </Button>
         </div>
       </div>
     </div>
   )
 }