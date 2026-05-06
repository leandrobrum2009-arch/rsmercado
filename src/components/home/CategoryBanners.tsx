import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryBanners() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryBanners = async () => {
      const { data } = await supabase.from('categories').select('*');
      
      if (data) {
        const withBanners = data.filter(cat => cat.banner_url && cat.banner_url.trim() !== '');
        setCategories(withBanners);
      }
      setLoading(false);
    };
    fetchCategoryBanners();
  }, []);

  if (loading) return <div className="px-4 mb-4"><Skeleton className="w-full h-32 rounded-2xl" /></div>;
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
              <div className="text-white transform group-hover:translate-x-1 transition-transform">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">Confira</p>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{cat.name}</h3>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Ver Produtos</span>
                  <div className="w-6 h-0.5 bg-white/50" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}