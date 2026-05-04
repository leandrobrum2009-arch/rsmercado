import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight } from "lucide-react";

export function HomeBanners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .not('banner_url', 'is', null)
        .limit(3);
      
      setBanners(data || []);
      setLoading(false);
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
        <div 
          key={banner.id} 
          className={`relative rounded-[32px] overflow-hidden shadow-lg h-44 group active:scale-[0.98] transition-all ${i === 0 ? 'h-52' : 'h-36'}`}
          onClick={() => window.location.href = `/search?q=${banner.name}`}
        >
          <img 
            src={banner.banner_url} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={banner.name} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
            <span className="text-white/60 text-[8px] font-black uppercase tracking-[0.2em] mb-1">Destaque da Semana</span>
            <h3 className="text-white text-3xl font-black uppercase italic italic tracking-tighter leading-none">{banner.name}</h3>
            <div className="flex items-center gap-2 mt-3 text-white/90 font-bold text-[10px] uppercase">
              <span>Explorar agora</span>
              <ArrowRight size={12} className="group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}