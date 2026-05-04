  import { Plus, Minus, ShoppingCart, Tag, Apple, Croissant, Beef, Wine, Milk, SprayCan, Dog, Brush, ShoppingBag } from "lucide-react";
  const categoryIcons: Record<string, any> = {
    "Hortifruti": Apple,
    "Padaria": Croissant,
    "Açougue": Beef,
    "Carnes": Beef,
    "Bebidas": Wine,
    "Laticínios": Milk,
    "Limpeza": SprayCan,
    "Pet Shop": Dog,
    "Higiene": Brush,
  };

 import { useCart } from "../contexts/CartContext";
 import { toast } from "@/lib/toast";
import { SmartImage } from "./ui/SmartImage";
 
 interface ProductProps {
    product: any;
 }
 
 export const ProductCard = ({ product }: ProductProps) => {
   const { addToCart, items, updateQuantity } = useCart();
   const cartItem = items.find(i => i.id === product.id);
 
   const handleAdd = () => {
     addToCart(product);
     toast.success(`${product.name} adicionado ao carrinho!`);
   };
 
   return (
     <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col group">
       <div className="relative aspect-square overflow-hidden bg-gray-100">
          <SmartImage 
            src={product.image_url} 
            tableName="products" 
            itemId={product.id} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.points_value > 0 && (
              <div className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                +{product.points_value} PTS
              </div>
            )}
            {product.categories?.name && (
              <div className="bg-white/90 backdrop-blur-sm text-zinc-900 text-[8px] font-black px-2 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase tracking-tight shadow-sm border border-zinc-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {product.categories.name}
              </div>
            )}
          </div>
       </div>
       
       <div className="p-3 flex-1 flex flex-col">
         <h3 className="text-sm font-medium text-gray-800 line-clamp-2 h-10 mb-1">{product.name}</h3>
         
         <div className="mt-auto">
           <div className="flex items-baseline gap-2">
             <span className="text-lg font-bold text-green-700">
               R$ {product.price.toFixed(2)}
             </span>
             {product.old_price && (
               <span className="text-xs text-gray-400 line-through">
                 R$ {product.old_price.toFixed(2)}
               </span>
             )}
           </div>
 
           <div className="mt-3">
             {cartItem ? (
               <div className="flex items-center justify-between bg-gray-100 rounded-lg p-1">
                 <button 
                   onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                   className="p-1 text-green-600 hover:bg-white rounded-md transition-colors"
                 >
                   <Minus size={16} />
                 </button>
                 <span className="text-sm font-semibold">{cartItem.quantity}</span>
                 <button 
                   onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                   className="p-1 text-green-600 hover:bg-white rounded-md transition-colors"
                 >
                   <Plus size={16} />
                 </button>
               </div>
             ) : (
               <button 
                 onClick={handleAdd}
                 className="w-full bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-green-700 transition-colors"
               >
                 <ShoppingCart size={16} />
                 Adicionar
               </button>
             )}
           </div>
         </div>
       </div>
     </div>
   );
 };