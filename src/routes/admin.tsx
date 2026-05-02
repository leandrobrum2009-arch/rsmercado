import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductManagement } from '@/components/admin/ProductManagement'
import { ProductImporter } from '@/components/admin/ProductImporter'
import { NewsManager } from '@/components/admin/NewsManager'
import { FlyerCreator } from '@/components/admin/FlyerCreator'
import { BannerManager } from '@/components/admin/BannerManager'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    let session = null
    try {
      const { data } = await supabase.auth.getSession()
      session = data.session
    } catch (e) {
      console.error('Error getting session:', e)
    }

    if (!session) {
      throw redirect({
        to: '/',
        search: { redirect: location.href },
      })
    }

    try {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_admin) {
        throw redirect({ to: '/' })
      }
    } catch (e) {
      console.error('Error checking admin status:', e)
      throw redirect({ to: '/' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Painel Administrativo</h1>
      
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="importer">Importação Automática</TabsTrigger>
          <TabsTrigger value="news">Notícias/Blog</TabsTrigger>
          <TabsTrigger value="flyers">Gerador de Encartes</TabsTrigger>
          <TabsTrigger value="banners">Banners/CMS</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          <ProductManagement />
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
      </Tabs>
    </div>
  )
}
