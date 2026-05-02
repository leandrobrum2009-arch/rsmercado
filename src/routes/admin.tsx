import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductManagement } from '@/components/admin/ProductManagement'
import { CategoryManagement } from '@/components/admin/CategoryManagement'
import { ProductImporter } from '@/components/admin/ProductImporter'
import { NewsManager } from '@/components/admin/NewsManager'
import { FlyerCreator } from '@/components/admin/FlyerCreator'
import { BannerManager } from '@/components/admin/BannerManager'
import { WhatsAppManager } from '@/components/admin/WhatsAppManager'
import { WebhookManager } from '@/components/admin/WebhookManager'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

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

      // MASTER BYPASS for the owner
      if (session.user.email === 'leandrobrum2009@gmail.com') {
        console.log('Admin check: MASTER BYPASS for owner');
        return true;
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

        const isAdmin = roleData?.role === 'admin';
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
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Painel Administrativo</h1>
      
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1 mb-8 text-[10px] md:text-xs">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="importer">Importação</TabsTrigger>
          <TabsTrigger value="news">Notícias</TabsTrigger>
          <TabsTrigger value="flyers">Encartes</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          <ProductManagement />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoryManagement />
        </TabsContent>

        <TabsContent value="importer">
          <ProductImporter />
        </TabsContent>
        
        <TabsContent value="news">
          <NewsManager />
        </TabsContent>

        <TabsContent value="flyers">
          <FlyerCreator />
        </TabsContent>

        <TabsContent value="banners">
          <BannerManager />
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
