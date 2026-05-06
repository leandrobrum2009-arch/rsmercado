 import { ProductCard } from "../ProductCard";
 import { useEffect, useState } from "react";
 import { supabase } from "@/lib/supabase";
 import { Loader2 } from "lucide-react";
 
   export const ProductGrid = ({ title, categoryName, tag }: { title: string, categoryName?: string, tag?: string }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [multiplier, setMultiplier] = useState(1);
  
   useEffect(() => {
     const fetchMultiplier = async () => {
       const { data } = await supabase.from('store_settings').select('value').eq('key', 'points_multiplier').maybeSingle();
       if (data && data.value) {
         // The value might be an object or a number depending on how it's stored
         const val = typeof data.value === 'object' ? data.value.points_per_real : data.value;
         setMultiplier(Number(val) || 1);
       }
     };

     fetchMultiplier();
    const fetchProducts = async () => {
      try {
         // Try to fetch with all filters
         let query = supabase
           .from('products')
           .select('*, categories(name)')
           .eq('is_available', true)
           .eq('is_approved', true);

         if (categoryName) {
           // This assumes categories(name) can be filtered this way or we need a join
           // For simplicity in this env, we'll filter after fetch if needed, 
           // but let's try a basic join filter
         }

         let { data, error } = await query.order('created_at', { ascending: false });

        // If it fails because of missing columns, try a simpler query
        if (error && error.message.includes('column')) {
          console.warn('Advanced filtering failed due to missing columns, falling back to simple query');
          const result = await supabase
            .from('products')
            .select('*, categories(name)')
            .order('created_at', { ascending: false });
          data = result.data;
          error = result.error;
        }

         if (error) throw error;
 
         let filteredData = data || [];
          if (categoryName) {
            filteredData = filteredData.filter((p: any) => 
              p.categories?.name?.toLowerCase().includes(categoryName.toLowerCase())
            );
          }

          if (tag) {
            filteredData = filteredData.filter((p: any) => 
              p.tags && p.tags.includes(tag)
            );
          }

         setProducts(filteredData);
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);
 
   if (loading) {
     return (
       <div className="flex justify-center p-12">
         <Loader2 className="animate-spin text-green-600" />
       </div>
     );
   }
 
   return (
     <section className="px-4 py-6">
       <div className="flex items-center justify-between mb-4">
         <h2 className="text-lg font-bold text-gray-800">{title}</h2>
         <button className="text-green-600 text-sm font-semibold">Ver tudo</button>
       </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
           {products.map((p) => (
             <ProductCard key={p.id} product={p} multiplier={multiplier} />
           ))}
          </div>
        ) : (
          <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl p-12 text-center">
            <p className="text-zinc-500 font-bold uppercase text-xs">Nenhum produto disponível no momento</p>
            <p className="text-[10px] text-zinc-400 mt-1 uppercase">Aguardando atualização do catálogo pelo administrador</p>
          </div>
        )}
     </section>
   );
 };