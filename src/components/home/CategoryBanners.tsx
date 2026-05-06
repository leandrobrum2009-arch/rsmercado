import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryBanners() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryBanners = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .not('banner_url', 'is', null)
        .limit(4);
      
      setCategories(data || []);
      setLoading(false);
    };
    fetchCategoryBanners();
  }, []);

  if (loading) return <div className="px-4 mb-4"><Skeleton className="w-full h-32 rounded-2xl" /></div>;
  if (categories.length === 0) return null;

  return (
    <div className="px-4 mb-6">
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {categories.map((cat) => (
          <Link 
            key={cat.id} 
            to="/search" 
            search={{ category: cat.slug }}
            className="min-w-[280px] h-32 relative rounded-2xl overflow-hidden shadow-md group active:scale-[0.98] transition-all"
          >
            <img 
              src={cat.banner_url} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              alt={cat.name} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
              <div className="text-white">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Especial</p>
                <h3 className="text-lg font-black uppercase italic italic tracking-tighter">{cat.name}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}