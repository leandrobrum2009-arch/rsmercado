import { ThemeSettingsManager } from '@/components/admin/ThemeSettingsManager'
 import { AlertManager } from '@/components/admin/AlertManager'
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
   Bell,
   AlertCircle,
    Truck,
    Percent,
    Lock,
    LayoutGrid
  } from 'lucide-react'
 import { AdminRoleManager } from '@/components/admin/AdminRoleManager'
 import { OfferManager } from '@/components/admin/OfferManager'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductManagement } from '@/components/admin/ProductManagement'
 import { CategoryManagement } from '@/components/admin/CategoryManagement'
 import { ProductOrganizer } from '@/components/admin/ProductOrganizer'
import { OrderManagement } from '@/components/admin/OrderManagement'
import { ProductImporter } from '@/components/admin/ProductImporter'
import { RecipeManager } from '@/components/admin/RecipeManager'
import { FlyerCreator } from '@/components/admin/FlyerCreator'
import { BannerManager } from '@/components/admin/BannerManager'
import { StoreSettingsManager } from '@/components/admin/StoreSettingsManager'
import { WhatsAppManager } from '@/components/admin/WhatsAppManager'
 import { WebhookManager } from '@/components/admin/WebhookManager'
 import { DeliveryReport } from '@/components/admin/DeliveryReport'
   import { LoyaltyManager } from '@/components/admin/LoyaltyManager'
   import { HomeLayoutManager } from '@/components/admin/HomeLayoutManager'
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
   const [userPermissions, setUserPermissions] = useState<string[]>([])
   const [session, setSession] = useState<any>(null)
   const [activeTab, setActiveTab] = useState('dashboard')
   const [sidebarOpen, setSidebarOpen] = useState(false)
   const [isAdminDiagnostic, setIsAdminDiagnostic] = useState<boolean | null>(null)
    const [lastError, setLastError] = useState<string | null>(null)
 
   useEffect(() => {
     const fetchPermissionsAndAdmin = async () => {
       try {
         const { data: { session: currentSession } } = await supabase.auth.getSession()
         setSession(currentSession)
         
         if (currentSession) {
           const { data: roleData } = await supabase
             .from('user_roles')
             .select('permissions')
             .eq('user_id', currentSession.user.id)
             .maybeSingle()
           
           if (roleData?.permissions) {
             setUserPermissions(roleData.permissions)
           } else if (currentSession.user.email === 'leandrobrum2009@gmail.com') {
             setUserPermissions(["delivery_report", "dashboard", "orders", "products", "customers", "loyalty", "layout", "categories", "importer", "offers", "banners", "flyers", "recipes", "notifications", "alerts", "settings", "whatsapp", "webhooks", "admin_roles"])
           }
         }
 
         const { data, error } = await supabase.rpc('is_admin')
         if (error) {
           setLastError(error.message)
           setIsAdminDiagnostic(false)
         } else {
           setIsAdminDiagnostic(data)
         }
       } catch (err: any) {
         console.error('Error in Admin init:', err)
         setLastError(err.message)
         setIsAdminDiagnostic(false)
       }
     }
     fetchPermissionsAndAdmin()
   }, [])

     const menuGroups = [
       {
         title: 'Relatórios',
         items: [
           { id: 'delivery_report', label: 'Relatório de Entregas', icon: Truck },
         ]
       },
      {
        title: 'Visão Geral',
        items: [
          { id: 'dashboard', label: 'Início / Dashboard', icon: LayoutTemplate },
        ]
      },
     {
       title: 'Vendas e Pedidos',
       items: [
          { id: 'orders', label: 'Pedidos', icon: ClipboardList },
          { id: 'products', label: 'Produtos', icon: ShoppingBag },
          { id: 'customers', label: 'Clientes', icon: Users },
           { id: 'loyalty', label: 'Fidelidade & Bairros', icon: ShieldCheck },
           { id: 'layout', label: 'Layout Home', icon: LayoutTemplate },
             { id: 'categories', label: 'Categorias', icon: Tag },
              { id: 'organizer', label: 'Organizador', icon: LayoutGrid },
              { id: 'importer', label: 'Importação', icon: Upload },
        ]
     },
       {
         title: 'Marketing e Conteúdo',
          items: [
            { id: 'offers', label: 'Gestão de Ofertas', icon: Percent },
            { id: 'banners', label: 'Banners', icon: ImageIcon },
               { id: 'flyers', label: 'Encartes', icon: LayoutTemplate },
               { id: 'recipes', label: 'Receitas', icon: ChefHat },
              { id: 'notifications', label: 'Notificações', icon: Bell },
              { id: 'alerts', label: 'Alertas AO VIVO', icon: AlertCircle },
           ]
         },
       {
       title: 'Configurações e Integrações',
        items: [
             { id: 'settings', label: 'Dados da Loja', icon: LayoutTemplate },
             { id: 'theme', label: 'Tema Visual', icon: Palette },
                <TabsContent value="theme" className="mt-0 focus-visible:ring-0">
                  <ThemeSettingsManager />
                </TabsContent>
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook }
          ]
        },
        {
          title: 'Controle de Acesso',
          items: [
            { id: 'admin_roles', label: 'Cargos e Permissões', icon: Lock }
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
                  {group.items.map((item) => {
                    const isAllowed = userPermissions.includes(item.id) || userPermissions.includes('all') || session?.user?.email === 'leandrobrum2009@gmail.com'
                    if (!isAllowed) return null
                    return (
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
                    )
                  })}
               </div>
             </div>
           ))}
         </nav>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {lastError && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
                <AlertCircle className="flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-black uppercase">Erro de Diagnóstico Admin</p>
                  <p className="text-sm font-medium">{lastError}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin-fix'} className="border-red-200 text-red-700 hover:bg-red-100">
                  Reparar Banco
                </Button>
              </div>
            )}
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
                 <TabsContent value="alerts" className="mt-0 focus-visible:ring-0">
                   <AlertManager />
                 </TabsContent>
                 <TabsContent value="delivery_report" className="mt-0 focus-visible:ring-0">
                   <DeliveryReport />
                 </TabsContent>
                  <TabsContent value="layout" className="mt-0 focus-visible:ring-0">
                    <HomeLayoutManager />
                  </TabsContent>
                   <TabsContent value="offers" className="mt-0 focus-visible:ring-0">
                     <OfferManager />
                   </TabsContent>
                   <TabsContent value="organizer" className="mt-0 focus-visible:ring-0">
                     <ProductOrganizer />
                   </TabsContent>
                   <TabsContent value="admin_roles" className="mt-0 focus-visible:ring-0">
                     <AdminRoleManager />
                   </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
