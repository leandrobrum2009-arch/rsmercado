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
 
   const sqlToRun = `-- SCRIPT DE REPARAÇÃO DE BANCO DE DATOS
 -- Copie este código e cole no SQL Editor do seu painel Supabase
 
 -- 1. Criar tabela de endereços se não existir
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
 
 -- 2. Habilitar RLS
 ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
 
 -- 3. Criar política de segurança
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_addresses' AND policyname='Users can manage their own addresses') THEN
     CREATE POLICY "Users can manage their own addresses" ON public.user_addresses FOR ALL USING (auth.uid() = user_id);
   END IF;
 END $$;
 
 -- 4. Garantir que as tabelas de marketing existem
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
 
 -- 5. Restaurar função de admin master
 CREATE OR REPLACE FUNCTION public.is_admin() 
 RETURNS BOOLEAN 
 LANGUAGE plpgsql 
 SECURITY DEFINER
 SET search_path = public, auth
 AS $$
 BEGIN
   RETURN (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') OR 
          EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
 END;
 $$;`
 
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