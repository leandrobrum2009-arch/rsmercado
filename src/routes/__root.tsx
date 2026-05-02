 import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
 import { Home, ShoppingCart, User, Search, Newspaper, Settings, Menu } from "lucide-react";
 import { CartProvider, useCart } from "../contexts/CartContext";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
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
   const [isClient, setIsClient] = useState(false);

   useEffect(() => {
     setIsClient(true);
   }, []);

   const location = useLocation();
   const { items } = useCart();
   const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
 
   const navItems = [
     { name: "Início", path: "/", icon: Home },
     { name: "Buscar", path: "/search", icon: Search },
     { name: "Carrinho", path: "/cart", icon: ShoppingCart, badge: cartCount },
     { name: "Notícias", path: "/news", icon: Newspaper },
     { name: "Perfil", path: "/profile", icon: User },
   ];
 
   const isAdminPage = location.pathname.startsWith('/admin');
 
   return (
     <div className="flex flex-col min-h-screen bg-gray-50">
       {/* Desktop Header */}
       <header className="sticky top-0 z-50 w-full bg-white border-b shadow-sm hidden md:block">
         <div className="container flex items-center justify-between h-16 px-4 mx-auto">
           <Link to="/" className="text-2xl font-bold text-green-600">SuperLoja</Link>
           <div className="flex items-center space-x-6">
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
             <Link to="/admin" className="text-gray-600 hover:text-green-600">
               <Settings size={20} />
             </Link>
           </div>
         </div>
       </header>
 
       {/* Mobile Header */}
       <header className="sticky top-0 z-50 w-full bg-white border-b shadow-sm md:hidden">
         <div className="flex items-center justify-between h-14 px-4">
           <Link to="/" className="text-xl font-bold text-green-600">SuperLoja</Link>
           <div className="flex items-center space-x-3">
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
