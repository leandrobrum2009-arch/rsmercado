 import { Link } from "@tanstack/react-router";
  import { Apple, Croissant, Beef, Wine, Milk, SprayCan, Dog, Brush, ShoppingBag, Sparkles } from "lucide-react";
 
 const iconMap: Record<string, any> = {
   "Hortifruti": Apple,
   "Padaria": Croissant,
   "Carnes": Beef,
   "Bebidas": Wine,
   "Laticínios": Milk,
   "Limpeza": SprayCan,
   "Pet Shop": Dog,
   "Higiene": Brush,
 };
 
 const categories = [
   { name: "Hortifruti", slug: "hortifruti" },
   { name: "Padaria", slug: "padaria" },
   { name: "Carnes", slug: "acougue" },
   { name: "Bebidas", slug: "bebidas" },
   { name: "Laticínios", slug: "laticinios" },
   { name: "Limpeza", slug: "limpeza" },
   { name: "Pet Shop", slug: "pet-shop" },
   { name: "Higiene", slug: "higiene" },
 ];
 
  export const CategoryBar = () => {
    return (
      <div className="py-6 bg-white overflow-hidden">
        {/* Promotional Small Banner inside categories */}
        <div className="px-4 mb-6">
          <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-4 flex items-center justify-between shadow-md relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={12} className="text-amber-300 animate-pulse" />
                <span className="text-[10px] font-black text-green-100 uppercase tracking-widest">Ofertas do Dia</span>
              </div>
              <h3 className="text-white font-black uppercase italic text-lg leading-none tracking-tighter">Explore por Categoria</h3>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl text-white font-black text-[10px] uppercase border border-white/30 group-hover:scale-110 transition-transform cursor-pointer">
              Ver Todas
            </div>
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
              🛒
            </div>
          </div>
        </div>

        <div className="px-4 mb-4 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase italic tracking-tighter text-zinc-400">Navegue rápido</h2>
        </div>
        
        <div className="overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-4 px-4 min-w-max">
             {categories.map((cat) => {
                const IconComponent = iconMap[cat.name] || ShoppingBag;
                return (
               <button
                 key={cat.slug}
                 onClick={() => window.location.href = `/search?q=${cat.name}`}
                  className="flex flex-col items-center gap-3 group border-0 bg-transparent p-0 cursor-pointer w-20"
               >
                 <div className="w-16 h-16 rounded-[24px] bg-zinc-50 border-2 border-zinc-100 flex items-center justify-center group-hover:border-green-500 group-hover:bg-green-600 group-hover:text-white transition-all duration-300 shadow-sm relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   <IconComponent size={28} strokeWidth={2.5} className="text-zinc-700 group-hover:text-white transition-colors relative z-10" />
                 </div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-zinc-500 group-hover:text-zinc-900 text-center transition-colors">
                   {cat.name}
                 </span>
               </button>
                );
             })}
          </div>
        </div>
      </div>
    );
  };