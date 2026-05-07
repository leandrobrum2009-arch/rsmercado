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
 
  const sqlToRun = `-- 🛠️ SCRIPT DE REPARAÇÃO MASTER V8 (FIX PARAMETERS) - RS SUPERMERCADO
  -- 🛡️ ULTIMATE SECURITY & REPAIR SCRIPT - ATUALIZADO EM ${new Date().toLocaleString('pt-BR')}

  -- 1. FORÇAR CONFIRMAÇÃO DE E-MAIL (CORRIGE BLOQUEIO DE LOGIN)
  -- Note: We use email_confirmed_at. confirmed_at is a generated column.
   UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'leandrobrum2009@gmail.com';

     -- 0. LIMPEZA DE POLÍTICAS (PREVENTIVO)
     -- Flyers
     DROP POLICY IF EXISTS "Anyone can view flyers" ON public.flyers;
     DROP POLICY IF EXISTS "Admin manage flyers" ON public.flyers;
     DROP POLICY IF EXISTS "Admins manage flyers" ON public.flyers;
     DROP POLICY IF EXISTS "Flyers viewable by everyone" ON public.flyers;
     DROP POLICY IF EXISTS "Admins can manage flyers" ON public.flyers;
     DROP POLICY IF EXISTS "Administrador gerencia flyers" ON public.flyers;
     DROP POLICY IF EXISTS "Admin gerenciar flyers" ON public.flyers;
     DROP POLICY IF EXISTS "Administradores gerenciam encartes" ON public.flyers;
     
     -- Outras Tabelas (Limpeza Crítica)
     DROP POLICY IF EXISTS "Public view alerts" ON public.store_alerts;
     DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
     DROP POLICY IF EXISTS "Admins view audit logs" ON public.migration_audit_logs;
     DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
     DROP POLICY IF EXISTS "Admin manage settings" ON public.store_settings;

     -- 🛡️ REPARAR PERMISSÕES DE ENCARTES (FLYERS)
     ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "Anyone can view flyers" ON public.flyers FOR SELECT USING (true);
     CREATE POLICY "Admin manage flyers" ON public.flyers FOR ALL TO authenticated 
     USING (public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com'))
     WITH CHECK (public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com'));
 
 -- 2. GARANTIR FUNÇÃO IS_ADMIN (CORRIGE O ACESSO AO PAINEL)
   -- 2. GARANTIR FUNÇÃO IS_ADMIN SEGURA E NÃO RECURSIVA
    CREATE OR REPLACE FUNCTION public.is_admin() 
    RETURNS BOOLEAN 
    LANGUAGE plpgsql 
    SECURITY DEFINER 
    SET search_path = public, auth 
    AS $BODY$
    BEGIN
      -- 1. Master bypass (JWT check is extremely fast)
      IF (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') THEN
        RETURN TRUE;
      END IF;
  
      -- 2. Check roles table
      RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      );
    END; $BODY$;
 
  -- 3. PROMOVER USUÁRIO A ADMIN (IDEMPOTENTE SEM DO UPDATE)
  DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'leandrobrum2009@gmail.com');
  INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email = 'leandrobrum2009@gmail.com';
 
  -- 4. CRIAR TABELA DE SITE VISITS (EVITA CRASH NO DASHBOARD)
  CREATE TABLE IF NOT EXISTS public.site_visits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, path TEXT, user_agent TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
   ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
   DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
   CREATE POLICY "Anyone can insert visits" ON public.site_visits FOR INSERT WITH CHECK (true);
   DROP POLICY IF EXISTS "Admins view all visits" ON public.site_visits;
   CREATE POLICY "Admins view all visits" ON public.site_visits FOR SELECT USING (public.is_admin());

    -- 11. TABELAS DE PEDIDOS (GARANTIR QUE EXISTAM E ESTEJAM ATUALIZADAS)
    CREATE TABLE IF NOT EXISTS public.orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id),
        customer_name TEXT,
        customer_phone TEXT,
        total_amount DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        payment_method TEXT,
        status TEXT DEFAULT 'pending',
        delivery_address JSONB,
        points_earned INTEGER DEFAULT 0,
        coupon_code TEXT,
        change_for DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Garantir colunas novas se a tabela já existia
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10,2);
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
   
    CREATE TABLE IF NOT EXISTS public.order_items (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
       product_id UUID,
       quantity INTEGER NOT NULL,
       unit_price DECIMAL(10,2) NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Adicionar FK de forma idempotente sem bloco DO
    ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

  CREATE TABLE IF NOT EXISTS public.app_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      rating INTEGER,
      comment TEXT,
      page_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

 -- 5. TABELAS DE WHATSAPP (MALA DIRETA)
 CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), message TEXT NOT NULL, status TEXT DEFAULT 'pending', total_recipients INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0, target_audience TEXT, scheduled_for TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
 ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
 
 -- 6. TABELA DE ENDEREÇOS
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
    message_text TEXT,
    message_hash TEXT,
    campaign_id UUID,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

    -- Endereços
    DROP POLICY IF EXISTS "Users manage own addresses" ON public.user_addresses;
    CREATE POLICY "Users manage own addresses" ON public.user_addresses FOR ALL USING (auth.uid() = user_id);
    
    -- Configurações (Público lê, Admin altera)
    DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
    CREATE POLICY "Public read settings" ON public.store_settings FOR SELECT USING (key NOT IN ('whatsapp_config', 'api_keys', 'secret_config'));
    DROP POLICY IF EXISTS "Admin manage settings" ON public.store_settings;
    CREATE POLICY "Admin manage settings" ON public.store_settings FOR ALL USING (public.is_admin());

     -- Fidelidade
     DROP POLICY IF EXISTS "Admin manage rewards" ON public.loyalty_rewards;
     CREATE POLICY "Admin manage rewards" ON public.loyalty_rewards FOR ALL USING (public.is_admin());
     DROP POLICY IF EXISTS "Public read rewards" ON public.loyalty_rewards;
     CREATE POLICY "Public read rewards" ON public.loyalty_rewards FOR SELECT USING (active = true);
 
     DROP POLICY IF EXISTS "Admin manage challenges" ON public.weekly_challenges;
     CREATE POLICY "Admin manage challenges" ON public.weekly_challenges FOR ALL USING (public.is_admin());
     DROP POLICY IF EXISTS "Public read challenges" ON public.weekly_challenges;
     CREATE POLICY "Public read challenges" ON public.weekly_challenges FOR SELECT USING (active = true);
 
     -- Bairros
     DROP POLICY IF EXISTS "Admin manage neighborhoods" ON public.delivery_neighborhoods;
     CREATE POLICY "Admin manage neighborhoods" ON public.delivery_neighborhoods FOR ALL USING (public.is_admin());
     DROP POLICY IF EXISTS "Public read neighborhoods" ON public.delivery_neighborhoods;
     CREATE POLICY "Public read neighborhoods" ON public.delivery_neighborhoods FOR SELECT USING (active = true);
 
     -- WhatsApp
     DROP POLICY IF EXISTS "Admin manage templates" ON public.whatsapp_templates;
     CREATE POLICY "Admin manage templates" ON public.whatsapp_templates FOR ALL USING (public.is_admin());

      -- Pedidos
      DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
      DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
      DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
      CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
      CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR customer_phone = (SELECT COALESCE(auth.jwt()->>'phone', '')) OR public.is_admin());
      CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (public.is_admin());

      -- Itens do Pedido
      DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
      DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
      DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;
      CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
      CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE public.orders.id = order_id AND (public.orders.user_id = auth.uid() OR public.orders.customer_phone = (SELECT COALESCE(auth.jwt()->>'phone', '')) OR public.is_admin())));

      -- Feedback
      DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.app_feedback;
      CREATE POLICY "Anyone can insert feedback" ON public.app_feedback FOR INSERT WITH CHECK (true);
      DROP POLICY IF EXISTS "Admins view all feedback" ON public.app_feedback;
      CREATE POLICY "Admins view all feedback" ON public.app_feedback FOR SELECT USING (public.is_admin());
 
 -- 9. REPARAR CATEGORIAS E PRODUTOS
 ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon_name TEXT;
 ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS banner_url TEXT;
 ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accept_marketing BOOLEAN DEFAULT TRUE;
 
 -- ATUALIZAR POLÍTICAS
 DROP POLICY IF EXISTS "Admins can do everything on categories" ON public.categories;
 CREATE POLICY "Admins can do everything on categories" ON public.categories FOR ALL USING (public.is_admin());
 
  DROP POLICY IF EXISTS "Admins can do everything on products" ON public.products;
  CREATE POLICY "Admins can do everything on products" ON public.products FOR ALL USING (public.is_admin());
  
  DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
  CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);
  
  DROP POLICY IF EXISTS "Public can view products" ON public.products;
  CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
  
  -- 3. POLÍTICAS DE SEGURANÇA NÃO RECURSIVAS
  -- Fix recursion on user_roles
  ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
   DROP POLICY IF EXISTS "Users view own role" ON public.user_roles;
   DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
   
  CREATE POLICY "Admins manage roles" ON public.user_roles 
  FOR ALL USING ((auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com'));
  
  CREATE POLICY "Users view own role" ON public.user_roles 
  FOR SELECT USING (auth.uid() = user_id);

 -- 10. NOTIFICAÇÕES E ALERTAS
  -- FUNÇÃO PARA NOTIFICAR TODOS
    DROP FUNCTION IF EXISTS public.notify_all_users(text,text,text);
    CREATE OR REPLACE FUNCTION public.notify_all_users(p_title TEXT, p_message TEXT, p_type TEXT DEFAULT 'info')
    RETURNS VOID 
    LANGUAGE plpgsql 
    SECURITY DEFINER 
    SET search_path = public, auth
    AS $BODY$
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type)
      SELECT id, p_title, p_message, p_type FROM auth.users;
    END; $BODY$;

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
  DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
  CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
 
  CREATE TABLE IF NOT EXISTS public.store_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_active BOOLEAN DEFAULT TRUE,
      target_url TEXT,
      duration_seconds INTEGER DEFAULT 10,
      shimmer_speed_seconds DECIMAL(4,1) DEFAULT 2.0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ALTER TABLE public.store_alerts ADD COLUMN IF NOT EXISTS target_url TEXT;
  ALTER TABLE public.store_alerts ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 10;
  ALTER TABLE public.store_alerts ADD COLUMN IF NOT EXISTS shimmer_speed_seconds DECIMAL(4,1) DEFAULT 2.0;
 ALTER TABLE public.store_alerts ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Public view alerts" ON public.store_alerts;
  CREATE POLICY "Public view alerts" ON public.store_alerts FOR SELECT USING (true);
 
   -- 4. HARDENING E PERMISSÕES GERAIS
   -- Enable RLS on all sensitive tables manually to avoid DO block syntax issues
   ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.flyers ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.banners ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.store_settings ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.user_addresses ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.site_visits ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.store_alerts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.app_feedback ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.weekly_challenges ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.delivery_neighborhoods ENABLE ROW LEVEL SECURITY;
   ALTER TABLE IF EXISTS public.migration_audit_logs ENABLE ROW LEVEL SECURITY;
  -- Secure store_settings (Protect secrets)
  DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
  CREATE POLICY "Public read settings" ON public.store_settings 
  FOR SELECT USING (key NOT IN ('whatsapp_config', 'api_keys', 'secret_config', 'admin_setup_secret', 'webhook_secrets'));

  -- FINALIZAR PERMISSÕES
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT SELECT ON public.store_settings TO anon, authenticated;
  GRANT SELECT ON public.categories TO anon, authenticated;
  GRANT SELECT ON public.products TO anon, authenticated;
  GRANT SELECT ON public.banners TO anon, authenticated;
  GRANT SELECT ON public.store_alerts TO anon, authenticated;
  GRANT SELECT ON public.delivery_neighborhoods TO anon, authenticated;

  -- 12. SISTEMA DE AUDITORIA DE MIGRAÇÕES
  CREATE TABLE IF NOT EXISTS public.migration_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      migration_name TEXT NOT NULL,
      step_name TEXT NOT NULL,
      status TEXT NOT NULL,
      details JSONB DEFAULT '{}',
      executed_by UUID DEFAULT auth.uid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ALTER TABLE public.migration_audit_logs ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Admins view audit logs" ON public.migration_audit_logs;
  DROP FUNCTION IF EXISTS public.log_migration_step(text,text,text,jsonb);
  CREATE OR REPLACE FUNCTION public.log_migration_step(p_migration_name TEXT, p_step_name TEXT, p_status TEXT, p_details JSONB DEFAULT '{}')
  RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $BODY$
  BEGIN
      INSERT INTO public.migration_audit_logs (migration_name, step_name, status, details)
      VALUES (p_migration_name, p_step_name, p_status, p_details);
  END; $BODY$;

  GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
  GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.log_migration_step(TEXT, TEXT, TEXT, JSONB) TO authenticated;

  SELECT public.log_migration_step('ADMIN_FIX_UI', 'Repair Script Execution', 'completed', '{"source": "admin-fix-page"}');`
 
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
                <AlertTriangle className="text-red-600" /> Reparação do Banco de Dados
              </CardTitle>
              <CardDescription className="text-red-700 font-medium">
                Este script repara permissões (RLS) e garante que todas as tabelas e colunas necessárias existam.
              </CardDescription>
              <div className="mt-2 p-2 bg-amber-100 border border-amber-200 rounded text-amber-800 text-[10px] font-bold uppercase">
                ⚠️ ATENÇÃO: Certifique-se de que a tradução automática do seu navegador esteja DESATIVADA para esta página antes de copiar o código.
              </div>
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
                <pre className="whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto" translate="no">
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