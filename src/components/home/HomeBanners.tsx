import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import * as LucideIcons from "lucide-react";

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

export function HomeBanners() {
  const [banners, setBanners] = useState<(any & { product_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .not('banner_url', 'is', null)
          .neq('banner_url', '')
          .limit(3);
        
        if (catData && catData.length > 0) {
          const { data: countData } = await supabase.from('products').select('category_id');
          const counts: Record<string, number> = {};
          countData?.forEach(p => {
            if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1;
          });

          setBanners(catData.map(c => ({
            ...c,
            product_count: counts[c.id] || 0
          })));
        }
      } catch (err) {
        console.error('Error fetching home banners:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  if (loading) return <div className="px-4 mb-6"><Skeleton className="w-full h-40 rounded-3xl" /></div>;
  if (banners.length === 0) {
    // Fallback static banner if no category banners are uploaded yet
    return (
      <div className="px-4 mb-6">
        <div className="bg-zinc-900 rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-[60%]">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Ofertas Especiais</div>
              <Sparkles size={14} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-black italic uppercase leading-tight tracking-tighter mb-2">Qualidade que você confia.</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Produtos frescos direto do produtor para sua mesa.</p>
            <button className="bg-white text-zinc-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:scale-105 transition-transform">
              Ver Ofertas <ArrowRight size={12} />
            </button>
          </div>
          <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-green-500/20 rounded-full blur-3xl" />
          <div className="absolute right-4 bottom-4 w-32 h-32 opacity-80">
             <img src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=300&h=300&fit=crop" className="w-full h-full object-contain rounded-2xl" alt="Fresh" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mb-6 space-y-4">
      {banners.map((banner, i) => (
        <Link 
          key={banner.id} 
          to="/search"
          search={{ category: banner.slug }}
          className={`block relative rounded-[32px] overflow-hidden shadow-lg group active:scale-[0.98] transition-all ${i === 0 ? 'h-52' : 'h-40'}`}
        >
          <img 
            src={banner.banner_url} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={banner.name} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 flex flex-col justify-end">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                     {banner.icon_url ? (
                       <img src={banner.icon_url} className="w-5 h-5 object-contain" alt={banner.name} />
                     ) : (() => {
                       const { IconComponent, strokeWidth } = getIconConfig(banner);
                       return <IconComponent size={16} strokeWidth={strokeWidth} />;
                     })()}
                   </div>
                   <span className="text-white/60 text-[8px] font-black uppercase tracking-[0.2em]">Destaque da Semana</span>
                </div>
                <h3 className="text-white text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">{banner.name}</h3>
                <p className="text-[9px] font-bold text-white/50 uppercase">{banner.product_count} Produtos disponíveis</p>
              </div>
              <div className="bg-white text-zinc-900 p-2 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}