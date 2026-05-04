 import { Link } from "@tanstack/react-router";
 import { Apple, Croissant, Beef, Wine, Milk, SprayCan, Dog, Brush, ShoppingBag } from "lucide-react";
 
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
     <div className="py-8 overflow-x-auto no-scrollbar bg-white">
       <div className="px-4 mb-4">
         <h2 className="text-lg font-black uppercase italic tracking-tighter text-zinc-800">Categorias</h2>
       </div>
       <div className="flex gap-4 px-4 min-w-max">
          {categories.map((cat) => {
             const IconComponent = iconMap[cat.name] || ShoppingBag;
             return (
            <button
              key={cat.slug}
              onClick={() => window.location.href = `/search?q=${cat.name}`}
               className="flex flex-col items-center gap-3 group border-0 bg-transparent p-0 cursor-pointer w-20"
            >
              <div className="w-16 h-16 rounded-3xl bg-zinc-50 border-2 border-zinc-100 flex items-center justify-center group-hover:border-green-500 group-hover:bg-green-500 group-hover:text-white transition-all duration-300 shadow-sm">
                <IconComponent size={28} strokeWidth={2.5} className="text-zinc-700 group-hover:text-white transition-colors" />
              </div>
               <span className="text-[10px] font-black uppercase tracking-tight text-zinc-500 group-hover:text-green-600 text-center">
                {cat.name}
              </span>
            </button>
             );
          })}
       </div>
     </div>
   );
 };