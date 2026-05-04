 import { ProductCard } from "../ProductCard";
 import { useEffect, useState } from "react";
 import { supabase } from "@/lib/supabase";
 import { Loader2 } from "lucide-react";
 
 const mockProducts = [
   { id: "m1", name: "Banana Nanica Selecionada", price: 5.99, old_price: 7.50, image_url: "https://images.unsplash.com/photo-1571771894821-ad9902510f57?q=80&w=300&auto=format&fit=crop", points_value: 5 },
   { id: "m2", name: "Leite Integral Tipo A 1L", price: 4.89, image_url: "https://images.unsplash.com/photo-1550583724-125581f77833?q=80&w=300&auto=format&fit=crop", points_value: 2 },
   { id: "m3", name: "Pão Francês - Unidade", price: 0.95, image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=300&auto=format&fit=crop", points_value: 1 },
   { id: "m4", name: "Filet Mignon Bovino Kg", price: 89.90, old_price: 98.00, image_url: "https://images.unsplash.com/photo-1588168333986-5078d3ae3973?q=80&w=300&auto=format&fit=crop", points_value: 50 },
   { id: "m5", name: "Detergente Líquido Limão", price: 2.45, image_url: "https://images.unsplash.com/photo-1584622781564-1d9876a13d00?q=80&w=300&auto=format&fit=crop", points_value: 2 },
   { id: "m6", name: "Cerveja Pilsen Lata 350ml", price: 3.99, image_url: "https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=300&auto=format&fit=crop", points_value: 3 },
 ];
 
 export const ProductGrid = ({ title }: { title: string }) => {
   const [products, setProducts] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     const fetchProducts = async () => {
       try {
          const { data, error } = await supabase
             .from('products')
             .select('*, categories(name)')
             .eq('is_available', true)
             .eq('is_approved', true)
             .order('created_at', { ascending: false });
 
         if (error) throw error;
 
         if (data && data.length > 0) {
           setProducts(data);
         } else {
           // If no products in DB, show mock products as fallback
           setProducts(mockProducts);
         }
       } catch (err) {
         console.error('Error fetching products:', err);
         setProducts(mockProducts);
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
           <ProductCard key={p.id} product={p} />
         ))}
       </div>
     </section>
   );
 };