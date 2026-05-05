import { Link } from "@tanstack/react-router";
import { 
  Apple, Croissant, Beef, Wine, Milk, SprayCan, Dog, Brush, 
  ShoppingBag, Sparkles, Carrot, Coffee, Cookie, Fish, 
  GlassWater, IceCream, Pizza, Utensils, Baby, Bath, Flower2
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const getIconConfig = (cat: any) => {
  const [name, style] = (cat.icon_name || "").split(":");
  
  const icons: Record<string, any> = {
    Apple, Croissant, Beef, Wine, Milk, SprayCan, Dog, Brush, 
    ShoppingBag, Sparkles, Carrot, Coffee, Cookie, Fish, 
    GlassWater, IceCream, Pizza, Utensils, Baby, Bath, Flower2,
    "Hortifruti": Apple, "Frutas": Apple, "Legumes": Carrot, "Verduras": Carrot,
    "Padaria": Croissant, "Pães": Croissant, "Carnes": Beef, "Açougue": Beef,
    "Bebidas": Wine, "Cervejas": Wine, "Vinhos": Wine, "Laticínios": Milk,
    "Leites": Milk, "Limpeza": SprayCan, "Higiene": Brush, "Pet Shop": Dog,
    "Pets": Dog, "Doces": Cookie, "Mercearia": Coffee, "Peixaria": Fish,
    "Frios": IceCream, "Congelados": IceCream, "Bazar": Utensils,
    "Infantil": Baby, "Perfumaria": Bath, "Floricultura": Flower2
  };
  
  const IconComponent = icons[name] || icons[cat.name] || ShoppingBag;
  
  let strokeWidth = 1.5;
  if (style === "bold") strokeWidth = 2.5;
  if (style === "classic") strokeWidth = 2.0;
  if (style === "thin") strokeWidth = 1.0;
  
  return { IconComponent, strokeWidth };
};

const fallbackCategories = [
  { name: "Hortifruti", slug: "hortifruti", icon_name: "Apple" },
  { name: "Carnes", slug: "acougue", icon_name: "Beef" },
  { name: "Padaria", slug: "padaria", icon_name: "Croissant" },
  { name: "Laticínios", slug: "laticinios", icon_name: "Milk" },
  { name: "Bebidas", slug: "bebidas", icon_name: "Wine" },
  { name: "Doces", slug: "doces", icon_name: "Cookie" },
  { name: "Limpeza", slug: "limpeza", icon_name: "SprayCan" },
  { name: "Higiene", slug: "higiene", icon_name: "Brush" },
  { name: "Pet Shop", slug: "pet-shop", icon_name: "Dog" },
];

export const CategoryBar = () => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*');
      
      if (data && data.length > 0) {
        // Sort prioritizing specific categories
        const prioritized = ["Mercearia", "Bebidas"];
        const sorted = [...data].sort((a, b) => {
          const aIndex = prioritized.indexOf(a.name);
          const bIndex = prioritized.indexOf(b.name);
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          
          return a.name.localeCompare(b.name);
        });
        setCategories(sorted);
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


        
        <div className="overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-4 px-4 min-w-max">
             {categories.map((cat) => {
                   const { IconComponent, strokeWidth } = getIconConfig(cat);
                 return (
                   <button
                     key={cat.slug}
                     onClick={() => window.location.href = `/search?q=${cat.name}`}
                     className="flex flex-col items-center gap-3 group border-0 bg-transparent p-0 cursor-pointer w-20"
                   >
                      <div className="w-16 h-16 rounded-2xl bg-zinc-50 text-zinc-400 border border-zinc-100 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {cat.icon_url ? (
                          <img src={cat.icon_url} className="w-10 h-10 object-contain relative z-10 brightness-0 opacity-40 group-hover:brightness-100 group-hover:opacity-100 transition-all" alt={cat.name} />
                        ) : (
                          <IconComponent size={24} strokeWidth={strokeWidth} className="transition-colors relative z-10" />
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