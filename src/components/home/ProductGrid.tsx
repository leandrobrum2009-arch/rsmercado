 import { ProductCard } from "../ProductCard";
 
 const mockProducts = [
   { id: "1", name: "Banana Nanica Selecionada", price: 5.99, old_price: 7.50, image_url: "https://images.unsplash.com/photo-1571771894821-ad9902510f57?q=80&w=300&auto=format&fit=crop", points_value: 5 },
   { id: "2", name: "Leite Integral Tipo A 1L", price: 4.89, image_url: "https://images.unsplash.com/photo-1550583724-125581f77833?q=80&w=300&auto=format&fit=crop", points_value: 2 },
   { id: "3", name: "Pão Francês - Unidade", price: 0.95, image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=300&auto=format&fit=crop", points_value: 1 },
   { id: "4", name: "Filet Mignon Bovino Kg", price: 89.90, old_price: 98.00, image_url: "https://images.unsplash.com/photo-1588168333986-5078d3ae3973?q=80&w=300&auto=format&fit=crop", points_value: 50 },
   { id: "5", name: "Detergente Líquido Limão", price: 2.45, image_url: "https://images.unsplash.com/photo-1584622781564-1d9876a13d00?q=80&w=300&auto=format&fit=crop", points_value: 2 },
   { id: "6", name: "Cerveja Pilsen Lata 350ml", price: 3.99, image_url: "https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=300&auto=format&fit=crop", points_value: 3 },
 ];
 
 export const ProductGrid = ({ title }: { title: string }) => {
   return (
     <section className="px-4 py-6">
       <div className="flex items-center justify-between mb-4">
         <h2 className="text-lg font-bold text-gray-800">{title}</h2>
         <button className="text-green-600 text-sm font-semibold">Ver tudo</button>
       </div>
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
         {mockProducts.map((p) => (
           <ProductCard key={p.id} product={p} />
         ))}
       </div>
     </section>
   );
 };