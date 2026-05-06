   import { StoreAlertBanner } from "../components/StoreAlertBanner";
   import { registerServiceWorker } from "../lib/webpush";
   import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
    import { Home, ShoppingCart, User, Search, ChefHat, Settings, Menu, ShieldCheck, AlertTriangle, ExternalLink, Bell, Trophy } from "lucide-react";
   import { NotificationCenter } from "../components/NotificationCenter";
 import { CartProvider, useCart } from "../contexts/CartContext";
  import { useState, useEffect } from "react";
  import { supabase } from "@/lib/supabase";
 import { Toaster } from "sonner";

import "../styles.css";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SuperLoja" },
      { name: "description", content: "Super Mercado Lovable is an e-commerce app for grocery sales and delivery on iOS, Android, and web." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "RS SUPERMERCADO" },
      { property: "og:description", content: "Super Mercado Lovable is an e-commerce app for grocery sales and delivery on iOS, Android, and web." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "RS SUPERMERCADO" },
      { name: "twitter:description", content: "Super Mercado Lovable is an e-commerce app for grocery sales and delivery on iOS, Android, and web." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/WxJErcW45VZ2hRNnVqaobidOD5A3/social-images/social-1777718786716-WhatsApp_Image_2026-03-29_at_10.37.22.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/WxJErcW45VZ2hRNnVqaobidOD5A3/social-images/social-1777718786716-WhatsApp_Image_2026-03-29_at_10.37.22.webp" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

 function Layout() {
   const location = useLocation();
   const { items } = useCart();
   const [isAdmin, setIsAdmin] = useState(false);
    const [storeSettings, setStoreSettings] = useState<any>({
      site_name: 'SuperLoja',
      logo_url: '',
      colors: { primary: '#16a34a', secondary: '#facc15' }
    });
   const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
 
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

   useEffect(() => {
     if (typeof window !== 'undefined') {
       registerServiceWorker();
     }
 
     const trackVisit = async () => {
       try {
         const { data: { user } } = await supabase.auth.getUser();
         await supabase.from('site_visits').insert({
           user_id: user?.id || null,
           path: location.pathname,
           user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR'
         });
       } catch (e) {
         console.error('Tracking error:', e);
       }
     };
 
     trackVisit();
 
     const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('store_settings').select('*');
        if (error) throw error;
        if (data) {
          const newSettings = { ...storeSettings };
          data.forEach(item => {
            if (item.key === 'site_name') newSettings.site_name = item.value;
            if (item.key === 'logo_url') newSettings.logo_url = item.value;
            if (item.key === 'color_palette') {
              newSettings.colors.primary = item.value.primary || newSettings.colors.primary;
              newSettings.colors.secondary = item.value.secondary || newSettings.colors.secondary;
            }
            if (item.key === 'theme_settings') {
              newSettings.theme = item.value;
            }
          });
          setStoreSettings(newSettings);
          
          if (newSettings.site_name) document.title = newSettings.site_name;
          
          const applyTheme = (theme: any) => {
            if (!theme) return;
            const root = document.documentElement;
            if (theme.colors) {
              if (theme.colors.primary) root.style.setProperty('--primary', theme.colors.primary);
              if (theme.colors.secondary) root.style.setProperty('--secondary', theme.colors.secondary);
              if (theme.colors.background) root.style.setProperty('--background', theme.colors.background);
              if (theme.colors.foreground) root.style.setProperty('--foreground', theme.colors.foreground);
              if (theme.colors.muted) root.style.setProperty('--muted-foreground', theme.colors.muted);
              if (theme.colors.card) root.style.setProperty('--card', theme.colors.card);
              if (theme.colors.border) root.style.setProperty('--border', theme.colors.border);
              if (theme.colors.accent) root.style.setProperty('--accent', theme.colors.accent);
            }
            if (theme.radius !== undefined) root.style.setProperty('--radius', `${theme.radius}rem`);
            if (theme.fontSize) root.style.setProperty('--base-font-size', `${theme.fontSize}px`);
            if (theme.fontFamily) {
              const fontMap: Record<string, string> = {
                'sans': 'Inter, ui-sans-serif, system-ui',
                'serif': 'serif',
                'mono': 'monospace',
                'inter': 'Inter, sans-serif',
                'montserrat': 'Montserrat, sans-serif'
              };
              const fontVal = fontMap[theme.fontFamily] || fontMap['sans'];
              root.style.setProperty('--font-family', fontVal);
              document.body.style.fontFamily = fontVal;
            }
          };

          if (newSettings.theme) {
            applyTheme(newSettings.theme);
          } else {
            // Fallback for legacy color_palette
            if (newSettings.colors.primary) document.documentElement.style.setProperty('--primary', newSettings.colors.primary);
            if (newSettings.colors.secondary) document.documentElement.style.setProperty('--secondary', newSettings.colors.secondary);
          }
        }
        setIsConnected(true);
      } catch (err) {
        console.log('Store settings not available, using defaults');
      }
    };

    fetchSettings();

    const checkAdmin = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session) {
          setIsConnected(true);
          const { data, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (!roleError) setIsAdmin(data?.role === 'admin');
        } else {
          // Even if not logged in, if we got here without a network error, we're likely connected
          if (isConnected === null) setIsConnected(true);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Connection check failed:', err);
        setIsConnected(false);
      }
    };

    checkAdmin();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setIsAdmin(false);
      else checkAdmin();
    });

    return () => subscription.unsubscribe();
  }, []);
 
   const navItems = [
     { name: "Início", path: "/", icon: Home },
     { name: "Buscar", path: "/search", icon: Search },
     { name: "Carrinho", path: "/cart", icon: ShoppingCart, badge: cartCount },
      { name: "Receitas", path: "/recipes", icon: ChefHat },
      { name: "Fidelidade", path: "/loyalty", icon: Trophy },
      { name: "Perfil", path: "/profile", icon: User },
   ];
 
   if (isAdmin) {
     navItems.splice(4, 0, { name: "Admin", path: "/admin", icon: ShieldCheck });
   }
 
    const isAdminPage = location.pathname.startsWith('/admin');
    // Check for keys in environment or localStorage
    const [supabaseConfig] = useState({
      url: (typeof window !== 'undefined' ? localStorage.getItem('supabase_url') : null) || import.meta.env.VITE_SUPABASE_URL || '',
      key: (typeof window !== 'undefined' ? localStorage.getItem('supabase_anon_key') : null) || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    });
    
     const isSupabaseMissing = isConnected === false || (!supabaseConfig.url || supabaseConfig.url.includes('placeholder') || !supabaseConfig.key || supabaseConfig.key === 'placeholder');
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [tempUrl, setTempUrl] = useState(supabaseConfig.url);
    const [tempKey, setTempKey] = useState(supabaseConfig.key);

    const saveConfig = () => {
      localStorage.setItem('supabase_url', tempUrl);
      localStorage.setItem('supabase_anon_key', tempKey);
      window.location.reload();
    };

 
    return (
       <div className="flex flex-col min-h-screen bg-gray-50">
         <StoreAlertBanner />
        {isSupabaseMissing && (
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-lg animate-pulse z-[60]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="flex-shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-tight">Conexão Supabase Perdida</p>
                <p className="text-[10px] opacity-90 font-bold uppercase leading-tight">
                  Clique no ícone do Supabase na barra lateral e em "Connect" para restaurar o banco de dados.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowConfigModal(true)}
                className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
              >
                INSERIR CHAVES
              </button>
              <button 
                onClick={() => window.location.href = 'https://lovable.dev'}
                className="bg-white text-red-600 p-2 rounded-lg"
              >
                <ExternalLink size={16} />
              </button>
            </div>
          </div>
        )}
       {/* Desktop Header */}
       <header className="sticky top-0 z-50 w-full bg-white border-b shadow-sm hidden md:block">
         <div className="container flex items-center justify-between h-16 px-4 mx-auto">
            <Link to="/" className="flex items-center gap-2 py-1">
              {storeSettings.logo_url ? (
                <img src={storeSettings.logo_url} alt="Logo" className="h-14 md:h-16 object-contain" />
              ) : (
                <span className="text-2xl font-black italic tracking-tighter text-primary">{storeSettings.site_name}</span>
              )}
            </Link>
            <div className="flex items-center space-x-4">
              <NotificationCenter />
             {navItems.map((item) => (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-green-600 ${
                   location.pathname === item.path ? "text-green-600" : "text-gray-600"
                 }`}
               >
                 <item.icon size={20} />
                 <span>{item.name}</span>
                 {item.badge ? (
                   <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                     {item.badge}
                   </span>
                 ) : null}
               </Link>
             ))}
             <Link to="/admin" search={{ tab: 'dashboard', edit: undefined }} className="text-gray-600 hover:text-green-600">
               <Settings size={20} />
             </Link>
           </div>
         </div>
       </header>
 
       {/* Mobile Header */}
       <header className="sticky top-0 z-50 w-full bg-white border-b shadow-sm md:hidden">
         <div className="flex items-center justify-between h-14 px-4">
            <Link to="/" className="flex items-center gap-2">
              {storeSettings.logo_url ? (
                <img src={storeSettings.logo_url} alt="Logo" className="h-10 md:h-12 object-contain" />
              ) : (
                <span className="text-xl font-black italic tracking-tighter text-primary">{storeSettings.site_name}</span>
              )}
            </Link>
            <div className="flex items-center space-x-1">
              <NotificationCenter />
             <Link to="/search" className="p-2 text-gray-600">
               <Search size={20} />
             </Link>
             <Link to="/cart" className="relative p-2 text-gray-600">
               <ShoppingCart size={20} />
               {cartCount > 0 && (
                 <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                   {cartCount}
                 </span>
               )}
             </Link>
           </div>
         </div>
       </header>
 
       <main className="flex-1 pb-20 md:pb-0">
         <Outlet />
       </main>
 
       {/* Mobile Bottom Navigation */}
       {!isAdminPage && (
         <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t md:hidden">
           <div className="flex items-center justify-around h-16">
             {navItems.map((item) => (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                   location.pathname === item.path ? "text-green-600" : "text-gray-500"
                 }`}
               >
                 <div className="relative">
                   <item.icon size={24} />
                   {item.badge ? (
                     <span className="absolute -top-1 -right-2 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                       {item.badge}
                     </span>
                   ) : null}
                 </div>
                 <span className="text-[10px] font-medium uppercase">{item.name}</span>
               </Link>
             ))}
           </div>
         </nav>
       )}
        {showConfigModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Configurar Supabase</h3>
              <p className="text-sm text-gray-600 mb-6">
                Cole aqui as chaves do seu projeto Supabase para restaurar a conexão.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">URL do Projeto</label>
                  <input 
                    type="text" 
                    value={tempUrl} 
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="https://xxxx.supabase.co"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Chave Anon (Public)</label>
                  <textarea 
                    value={tempKey} 
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="eyJhbGci..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm h-24 resize-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveConfig}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-md"
                >
                  Salvar e Recarregar
                </button>
              </div>
            </div>
          </div>
        )}
        <Toaster position="top-center" />
     </div>
   );
 }
 
 function RootComponent() {
   return (
     <CartProvider>
       <Layout />
     </CartProvider>
   );
 }
