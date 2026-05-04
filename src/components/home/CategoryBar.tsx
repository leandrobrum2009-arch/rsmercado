import { Link } from "@tanstack/react-router";
import { 
  Apple, Croissant, Beef, Wine, Milk, SprayCan, Dog, Brush, 
  ShoppingBag, Sparkles, Carrot, Coffee, Cookie, Fish, 
  GlassWater, IceCream, Pizza, Utensils, Baby, Bath, Flower2
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const iconMap: Record<string, any> = {
  "Hortifruti": Apple,
  "Frutas": Apple,
  "Legumes": Carrot,
  "Verduras": Carrot,
  "Padaria": Croissant,
  "Pães": Croissant,
  "Carnes": Beef,
  "Açougue": Beef,
  "Bebidas": Wine,
  "Cervejas": Wine,
  "Vinhos": Wine,
  "Laticínios": Milk,
  "Leites": Milk,
  "Limpeza": SprayCan,
  "Higiene": Brush,
  "Pet Shop": Dog,
  "Pets": Dog,
  "Doces": Cookie,
  "Mercearia": Coffee,
  "Peixaria": Fish,
  "Frios": IceCream,
  "Congelados": IceCream,
  "Bazar": Utensils,
  "Infantil": Baby,
  "Perfumaria": Bath,
  "Floricultura": Flower2
};

const fallbackCategories = [
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
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        setCategories(fallbackCategories);
      }
    };
    fetchCategories();
  }, []);

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
                  const IconComponent = iconMap[cat.name] || iconMap[cat.icon_name || ""] || ShoppingBag;
                  const colors: Record<string, { bg: string, text: string, border: string, shadow: string }> = {
                    "Hortifruti": { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", shadow: "shadow-emerald-100" },
                    "Padaria": { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", shadow: "shadow-orange-100" },
                    "Carnes": { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", shadow: "shadow-rose-100" },
                    "Bebidas": { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", shadow: "shadow-indigo-100" },
                    "Laticínios": { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", shadow: "shadow-blue-100" },
                    "Limpeza": { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-100", shadow: "shadow-sky-100" },
                    "Pet Shop": { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", shadow: "shadow-amber-100" },
                    "Higiene": { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", shadow: "shadow-purple-100" },
                    "Mercearia": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", shadow: "shadow-amber-100" },
                  };
                  const colorData = colors[cat.name] || { bg: "bg-zinc-50", text: "text-zinc-600", border: "border-zinc-100", shadow: "shadow-zinc-100" };
                 
                 return (
                   <button
                     key={cat.slug}
                     onClick={() => window.location.href = `/search?q=${cat.name}`}
                     className="flex flex-col items-center gap-3 group border-0 bg-transparent p-0 cursor-pointer w-20"
                   >
                      <div className={`w-16 h-16 rounded-[22px] ${colorData.bg} ${colorData.text} ${colorData.border} border-2 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-sm ${colorData.shadow} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {cat.icon_url ? (
                          <img src={cat.icon_url} className="w-10 h-10 object-contain relative z-10" alt={cat.name} />
                        ) : (
                          <IconComponent size={28} strokeWidth={2.5} className="transition-colors relative z-10" />
                        )}
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