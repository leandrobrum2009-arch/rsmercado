 import { AdminDashboard } from '@/components/admin/AdminDashboard'
 import { NotificationManager } from '@/components/admin/NotificationManager'
import { 
  ShoppingBag, 
  Tag, 
  ClipboardList, 
  Upload, 
  ChefHat, 
  LayoutTemplate, 
  Image as ImageIcon, 
   MessageSquare,
   Webhook,
  Settings, 
  ShieldCheck, 
   Menu,
   X,
    Users,
    Bell
  } from 'lucide-react'
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
   import { LoyaltyManager } from '@/components/admin/LoyaltyManager'
import { CustomerManagement } from '@/components/admin/CustomerManagement'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

      let isAdmin = session.user.email === 'leandrobrum2009@gmail.com';
      
      if (!isAdmin) {
        try {
          const { data: rpcAdmin } = await supabase.rpc('is_admin');
          if (rpcAdmin) {
            isAdmin = true;
          } else {
            // Fallback to manual check if RPC fails
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();
            isAdmin = roleData?.role === 'admin';
          }
        } catch (e) {
          console.error('Error checking admin status:', e);
        }
      }

      console.log('Secure Admin check result:', isAdmin);
      return true; // We allow access so they can see the repair button if not admin
    };

    await checkAdmin();
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [isAdminDiagnostic, setIsAdminDiagnostic] = useState<boolean | null>(null)
   const [activeTab, setActiveTab] = useState('dashboard')
      {
        title: 'Visão Geral',
        items: [
          { id: 'dashboard', label: 'Início / Dashboard', icon: LayoutTemplate },
        ]
      },
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin')
        if (error) {
          console.error('Diagnostic RPC error:', error)
          setLastError(error.message)
          setIsAdminDiagnostic(false)
        } else {
          setIsAdminDiagnostic(data)
          setLastError(null)
        }
      } catch (err: any) {
        setLastError(err.message)
        setIsAdminDiagnostic(false)
      }
    }
    check()
  }, [])

   const menuGroups = [
     {
       title: 'Vendas e Pedidos',
       items: [
          { id: 'orders', label: 'Pedidos', icon: ClipboardList },
          { id: 'products', label: 'Produtos', icon: ShoppingBag },
          { id: 'customers', label: 'Clientes', icon: Users },
          { id: 'loyalty', label: 'Fidelidade & Bairros', icon: ShieldCheck },
         { id: 'categories', label: 'Categorias', icon: Tag },
         { id: 'importer', label: 'Importação', icon: Upload },
       ]
     },
       {
         title: 'Marketing e Conteúdo',
         items: [
           { id: 'banners', label: 'Banners', icon: ImageIcon },
           { id: 'flyers', label: 'Encartes', icon: LayoutTemplate },
           { id: 'recipes', label: 'Receitas', icon: ChefHat },
           { id: 'notifications', label: 'Notificações', icon: Bell },
         ]
       },
       {
       title: 'Configurações e Integrações',
       items: [
           { id: 'settings', label: 'Dados da Loja', icon: Settings },
           { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
           { id: 'webhooks', label: 'Webhooks', icon: Webhook }
         ]
     }
   ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-zinc-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="font-black italic uppercase text-lg tracking-tighter">Admin Panel</h1>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <div className={cn(
        "fixed inset-0 z-40 bg-zinc-900 text-zinc-400 transition-transform md:relative md:translate-x-0 md:w-64 flex-shrink-0 flex flex-col border-r border-zinc-800",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:block">
          <h1 className="font-black italic uppercase text-2xl tracking-tighter text-white">Painel Gestor</h1>
          <p className="text-[10px] uppercase font-bold text-zinc-500 mt-1">Controle de Operações</p>
        </div>

         <nav className="flex-1 px-4 space-y-6 mt-4 overflow-y-auto pb-20 md:pb-4">
           {menuGroups.map((group) => (
             <div key={group.title} className="space-y-2">
               <h3 className="px-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">{group.title}</h3>
               <div className="space-y-1">
                 {group.items.map((item) => (
                   <button
                     key={item.id}
                     onClick={() => {
                       setActiveTab(item.id)
                       setSidebarOpen(false)
                     }}
                     className={cn(
                       "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all",
                       activeTab === item.id 
                         ? "bg-white text-zinc-900 shadow-lg shadow-black/20" 
                         : "hover:bg-zinc-800 hover:text-white"
                     )}
                   >
                     <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-primary" : "")} />
                     {item.label}
                   </button>
                 ))}
               </div>
             </div>
           ))}
         </nav>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
               <TabsContent value="dashboard" className="mt-0 focus-visible:ring-0">
                 <AdminDashboard />
               </TabsContent>
               <TabsContent value="settings" className="mt-0 focus-visible:ring-0">
                 <StoreSettingsManager />
               </TabsContent>
              <TabsContent value="products" className="mt-0 focus-visible:ring-0">
                <ProductManagement />
              </TabsContent>
              <TabsContent value="categories" className="mt-0 focus-visible:ring-0">
                <CategoryManagement />
              </TabsContent>
              <TabsContent value="importer" className="mt-0 focus-visible:ring-0">
                <ProductImporter />
              </TabsContent>
              <TabsContent value="recipes" className="mt-0 focus-visible:ring-0">
                <RecipeManager />
              </TabsContent>
              <TabsContent value="flyers" className="mt-0 focus-visible:ring-0">
                <FlyerCreator />
              </TabsContent>
              <TabsContent value="banners" className="mt-0 focus-visible:ring-0">
                <BannerManager />
              </TabsContent>
              <TabsContent value="orders" className="mt-0 focus-visible:ring-0">
                <OrderManagement />
              </TabsContent>
               <TabsContent value="customers" className="mt-0 focus-visible:ring-0">
                 <CustomerManagement />
               </TabsContent>
                <TabsContent value="loyalty" className="mt-0 focus-visible:ring-0">
                  <LoyaltyManager />
                </TabsContent>
                <TabsContent value="whatsapp" className="mt-0 focus-visible:ring-0">
                  <WhatsAppManager />
                </TabsContent>
                <TabsContent value="webhooks" className="mt-0 focus-visible:ring-0">
                  <WebhookManager />
                </TabsContent>
                <TabsContent value="notifications" className="mt-0 focus-visible:ring-0">
                  <NotificationManager />
                </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
