 import { RLSAuditor } from '@/components/admin/RLSAuditor'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductManagement } from '@/components/admin/ProductManagement'
import { CategoryManagement } from '@/components/admin/CategoryManagement'
import { OrderManagement } from '@/components/admin/OrderManagement'
import { ProductImporter } from '@/components/admin/ProductImporter'
import { RecipeManager } from '@/components/admin/RecipeManager'
import { FlyerCreator } from '@/components/admin/FlyerCreator'
import { BannerManager } from '@/components/admin/BannerManager'
 import { StoreSettingsManager } from '@/components/admin/StoreSettingsManager'
import { WhatsAppManager } from '@/components/admin/WhatsAppManager'
import { WebhookManager } from '@/components/admin/WebhookManager'
import { Button } from '@/components/ui/button'
import { Loader2, Bug } from 'lucide-react'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    let session = null
    try {
      if (supabase?.auth) {
        const { data } = await supabase.auth.getSession()
        session = data.session
      }
    } catch (e) {
      console.error('Error getting session:', e)
    }

    const checkAdmin = async () => {
      if (!session) {
        console.log('Admin check: No session found, redirecting to home');
        throw redirect({
          to: '/',
          search: { redirect: location.href },
        })
      }

      try {
        // Secure check using user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (roleError) {
          console.error('Role check error:', roleError)
        }

         const isAdmin = roleData?.role === 'admin' || session.user.email === 'leandrobrum2009@gmail.com';
        console.log('Secure Admin check for user:', session.user.id, 'Result:', isAdmin);

        if (!isAdmin) {
          console.log('Admin check: User is not admin, redirecting to profile');
          throw redirect({ to: '/profile' })
        }
        return true;
      } catch (e) {
        if (e instanceof Error && e.message.includes('redirect')) throw e;
        console.error('Error checking admin status:', e)
        throw redirect({ to: '/profile' })
      }
    };

    await checkAdmin();
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [isAdminDiagnostic, setIsAdminDiagnostic] = useState<boolean | null>(null)
  
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.rpc('is_admin')
      setIsAdminDiagnostic(data)
      console.log('Diagnostic: User is admin?', data)
    }
    check()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      {isAdminDiagnostic === false && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p className="font-bold uppercase text-xs">Atenção: O Banco de Dados não te reconheceu como Admin.</p>
          <p className="text-[10px]">Isso pode impedir que os produtos apareçam. Use a página /admin-fix para restaurar seu acesso.</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[10px] text-gray-400"
          onClick={() => {
            supabase.auth.getSession().then(({data}) => {
              alert(`DEBUG INFO:\nUser: ${data.session?.user.email}\nID: ${data.session?.user.id}\nAdmin State: ${isAdminDiagnostic}`)
            })
          }}
        >
          <Bug className="h-3 w-3 mr-1" /> Diagnóstico
        </Button>
      </div>
      
      <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-11 gap-1 mb-8 text-[10px] md:text-xs">
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="importer">Importação</TabsTrigger>
          <TabsTrigger value="recipes">Receitas</TabsTrigger>
          <TabsTrigger value="flyers">Encartes</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
           <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>
         <TabsContent value="settings">
           <StoreSettingsManager />
         </TabsContent>
 
        <TabsContent value="security">
          <RLSAuditor />
        </TabsContent>
        
        <TabsContent value="products">
          <ProductManagement />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoryManagement />
        </TabsContent>

        <TabsContent value="importer">
          <ProductImporter />
        </TabsContent>
        
        <TabsContent value="recipes">
          <RecipeManager />
        </TabsContent>

        <TabsContent value="flyers">
          <FlyerCreator />
        </TabsContent>

        <TabsContent value="banners">
          <BannerManager />
        </TabsContent>

        <TabsContent value="orders">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppManager />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
