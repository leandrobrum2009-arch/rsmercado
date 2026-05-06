import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import * as LucideIcons from "lucide-react";
import { ShoppingBag, ChevronRight } from "lucide-react";

const getIconConfig = (cat: any) => {
  const [name, style] = (cat.icon_name || "").split(":");
  // @ts-ignore
  const IconComponent = LucideIcons[name] || LucideIcons[cat.name] || ShoppingBag;
  
  let strokeWidth = 1.5;
  if (style === "bold") strokeWidth = 2.5;
  if (style === "classic") strokeWidth = 2.0;
  if (style === "thin") strokeWidth = 1.0;
  
  return { IconComponent, strokeWidth };
};

export function CategoryBanners() {
  const [categories, setCategories] = useState<(any & { product_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  // Define fallback images for common categories
  const fallbackImages: Record<string, string> = {
    'higiene': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800',
    'congelados': 'https://images.unsplash.com/photo-1584263343327-4479f824cca6?q=80&w=800',
    'laticinios': 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?q=80&w=800',
    'bebidas': 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?q=80&w=800',
    'hortifruti': 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=800',
    'mercearia': 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800',
    'limpeza': 'https://images.unsplash.com/photo-1584622781564-1d9876a13d00?q=80&w=800',
    'padaria': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800',
    'acougue': 'https://images.unsplash.com/photo-1607623273562-6338d8503cb6?q=80&w=800'
  };

  useEffect(() => {
    const fetchCategoryBanners = async () => {
      try {
        setLoading(true);
        const { data: catData, error } = await supabase.from('categories').select('*');
        
        if (error) throw error;

        if (catData) {
          const { data: countData } = await supabase.from('products').select('category_id');
          const counts: Record<string, number> = {};
          countData?.forEach(p => {
            if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1;
          });

          const processedCategories = catData.map(cat => {
            const slug = cat.slug || cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return {
              ...cat,
              product_count: counts[cat.id] || 0,
              banner_url: cat.banner_url || fallbackImages[slug] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800'
            };
          });
          setCategories(processedCategories);
        }
      } catch (err) {
        console.error('Error fetching categories for banners:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategoryBanners();
  }, []);

  if (loading) return (
    <div className="px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-[32px]" />)}
      </div>
    </div>
  );

  if (categories.length === 0) return null;

  return (
    <div className="px-4 py-8 bg-zinc-50 border-y border-zinc-100 mb-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1 w-8 bg-green-600 rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Departamentos</span>
        </div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">Explore Nossas Ofertas</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Link 
            key={cat.id} 
            to="/search" 
            search={{ category: cat.slug }}
            className="h-44 relative rounded-[32px] overflow-hidden shadow-xl shadow-zinc-200/50 group active:scale-[0.98] transition-all border-4 border-white"
          >
            <img 
              src={cat.banner_url} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt={cat.name} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all">
                  {cat.icon_url ? (
                    <img src={cat.icon_url} className="w-6 h-6 object-contain" alt={cat.name} />
                  ) : (() => {
                    const { IconComponent, strokeWidth } = getIconConfig(cat);
                    return <IconComponent size={20} strokeWidth={strokeWidth} />;
                  })()}
                </div>
                <div className="flex flex-col">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/70">Explore</p>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none text-white">{cat.name}</h3>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-white/60 uppercase">{cat.product_count} Produtos</span>
                <div className="bg-white text-zinc-900 p-1.5 rounded-full shadow-lg transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}