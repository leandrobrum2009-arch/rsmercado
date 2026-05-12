     import { Plus, Minus, ShoppingCart, Tag, ShoppingBag, Zap } from "lucide-react";
     import { Button } from "@/components/ui/button";
    import * as LucideIcons from "lucide-react";
    const getCategoryIcon = (category: any) => {
      if (!category) return ShoppingBag;
      if (category.icon_url) return null; // Using image instead
      
      const [name] = (category.icon_name || "").split(":");
      // @ts-ignore
      return LucideIcons[name] || LucideIcons[category.name] || ShoppingBag;
    };


 import { useCart } from "../contexts/CartContext";
 import { toast } from "@/lib/toast";
 import { SmartImage } from "./ui/SmartImage";
   import { useState, useRef } from "react";
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
   import { Input } from "@/components/ui/input";
 
  interface ProductProps {
     product: any;
     multiplier?: number;
  }
 
    export const ProductCard = ({ product, multiplier = 1 }: ProductProps) => {
     const { addToCart, items, updateQuantity } = useCart();
     const cartItem = items.find(i => i.id === product.id);
     const [selectedWeight, setSelectedWeight] = useState(product.is_weight_based ? "0.100" : "1");
     const [isCustomWeight, setIsCustomWeight] = useState(false);
     const customWeightRef = useRef<HTMLInputElement>(null);
    const isOutOfStock = product.stock !== undefined && product.stock <= 0;
 
     const handleAdd = () => {
       let qty = parseFloat(selectedWeight);
       if (isCustomWeight && customWeightRef.current) {
         const val = parseFloat(customWeightRef.current.value.replace(',', '.'));
         if (isNaN(val) || val <= 0) {
           toast.error("Por favor, insira um peso válido.");
           return;
         }
         // If they typed in grams but the unit is kg, we need to convert if they expect 500 to be 500g
         // But let's assume they type in KG format (e.g. 0.050 for 50g) or let's make it smarter.
         qty = val;
       }
       
       addToCart(product, qty);
       const weightLabel = qty >= 1 ? `${qty.toFixed(2)}kg` : `${(qty * 1000).toFixed(0)}g`;
       toast.success(`${product.name} (${product.is_weight_based ? weightLabel : qty + ' ' + (product.unit || 'un')}) adicionado!`);
     };
 
   return (
     <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col group">
       <div className="relative aspect-square overflow-hidden bg-gray-100">
           {product.image_url ? (
             <SmartImage 
               src={product.image_url} 
               tableName="products" 
               itemId={product.id} 
               alt={product.name}
               className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
             />
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 border-b border-zinc-100 group-hover:bg-primary/5 transition-colors p-4">
               {product.categories?.icon_url ? (
                 <img src={product.categories.icon_url} className="w-16 h-16 object-contain opacity-50 group-hover:opacity-100 transition-all group-hover:scale-110" alt={product.categories.name} />
               ) : (() => {
                 const Icon = getCategoryIcon(product.categories);
                 return <Icon size={48} className="text-zinc-200 group-hover:text-primary/30 transition-colors" strokeWidth={1.5} />;
               })()}
               <span className="text-[8px] font-black uppercase text-zinc-300 mt-2 tracking-widest">{product.categories?.name || 'Geral'}</span>
             </div>
           )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
              <span className="bg-red-600 text-white font-black uppercase text-[10px] px-3 py-1 rounded-full animate-pulse shadow-lg">Sem Estoque</span>
            </div>
          )}
            <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
              {product.tags && product.tags.map((tag: string) => {
                const isBadge = ['OFERTA', 'NOVO', 'RELAMPAGO', 'EXCLUSIVO', 'DESTAQUE'].includes(tag);
                if (!isBadge) return (
                  <div key={tag} className="bg-zinc-900 text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest shadow-lg border border-white/20">
                    {tag}
                  </div>
                );
                
                const badgeStyles: Record<string, string> = {
                  'OFERTA': 'bg-red-600 text-white',
                  'NOVO': 'bg-green-600 text-white',
                  'RELAMPAGO': 'bg-amber-500 text-white animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]',
                  'EXCLUSIVO': 'bg-purple-600 text-white',
                  'DESTAQUE': 'bg-blue-600 text-white animate-bounce'
                };
                
                return (
                  <div key={tag} className={`${badgeStyles[tag] || 'bg-zinc-900 text-white'} text-[9px] font-black px-2 py-1 rounded-sm uppercase tracking-tighter shadow-xl border border-white/10 flex items-center gap-1`}>
                    {tag === 'RELAMPAGO' && <Zap size={10} className="fill-white" />}
                    {tag}
                  </div>
                );
              })}
            {(product.points_value > 0 || (product.price * multiplier) > 0) && (
              <div className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                +{product.points_value > 0 ? product.points_value : Math.floor(product.price * multiplier)} PTS
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
           <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              {product.brand && (
                <span className="text-[9px] font-black text-white bg-zinc-900 uppercase tracking-tighter px-2 py-0.5 rounded shadow-sm border border-zinc-800">
                  {product.brand}
                </span>
              )}
              {product.size && (
                <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 uppercase px-1.5 py-0.5 rounded border border-zinc-200">
                  {product.size}
                </span>
              )}
           </div>
           <h3 className="text-[13px] font-bold text-gray-800 line-clamp-2 h-10 mb-1 leading-[1.1] tracking-tight">{product.name}</h3>
         
         <div className="mt-auto">
           <div className="flex items-baseline gap-2">
               <div className="flex flex-col">
                 <span className="text-lg font-bold text-green-700 leading-none">
                   R$ {Number(product.price || 0).toFixed(2)}
                   {product.is_weight_based && <span className="text-[10px] ml-1 opacity-60">/kg</span>}
                 </span>
                 {product.unit && !product.is_weight_based && (
                   <span className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Un: {product.unit}</span>
                 )}
               </div>
              {product.old_price && (
                <span className="text-xs text-gray-400 line-through">
                  R$ {Number(product.old_price).toFixed(2)}
                </span>
              )}
           </div>
 
            <div className="mt-3 space-y-2">
               {product.is_weight_based && !cartItem && (
                 <div className="flex flex-col gap-1.5">
                   <label className="text-[9px] font-black uppercase text-zinc-400 tracking-tighter">Peso / Quantidade:</label>
                   {isCustomWeight ? (
                     <div className="flex gap-1">
                       <Input 
                         ref={customWeightRef}
                         type="text" 
                         placeholder="0.050 (ex: 50g)" 
                         className="h-8 text-[10px] font-bold border-zinc-200 bg-zinc-50 flex-1" 
                         defaultValue={selectedWeight}
                       />
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="h-8 px-2 text-[8px] font-black"
                         onClick={() => setIsCustomWeight(false)}
                       >
                         Voltar
                       </Button>
                     </div>
                   ) : (
                     <Select value={selectedWeight} onValueChange={(val) => {
                       if (val === "custom") {
                         setIsCustomWeight(true);
                       } else {
                         setSelectedWeight(val);
                       }
                     }}>
                       <SelectTrigger className="h-8 text-[10px] font-bold border-zinc-200 bg-zinc-50">
                         <SelectValue placeholder="Selecione" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="0.050" className="text-[10px]">50g</SelectItem>
                         <SelectItem value="0.100" className="text-[10px]">100g</SelectItem>
                         <SelectItem value="0.200" className="text-[10px]">200g</SelectItem>
                         <SelectItem value="0.250" className="text-[10px]">250g</SelectItem>
                         <SelectItem value="0.500" className="text-[10px]">500g</SelectItem>
                         <SelectItem value="1.000" className="text-[10px]">1kg</SelectItem>
                         <SelectItem value="2.000" className="text-[10px]">2kg</SelectItem>
                         <SelectItem value="custom" className="text-[10px] font-black italic">Outro peso...</SelectItem>
                       </SelectContent>
                     </Select>
                   )}
                 </div>
               )}

              {cartItem ? (
                <div className="flex items-center justify-between bg-zinc-100 rounded-lg p-1 border border-zinc-200">
                  <button 
                    onClick={() => updateQuantity(product.id, cartItem.quantity - (product.is_weight_based ? 0.1 : 1))}
                    className="p-1 text-zinc-600 hover:bg-white rounded-md transition-all shadow-sm"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[11px] font-black italic">{product.is_weight_based ? cartItem.quantity.toFixed(3) : cartItem.quantity}</span>
                    <span className="text-[7px] font-bold uppercase opacity-50">{product.is_weight_based ? 'kg' : (product.unit || 'un')}</span>
                  </div>
                  <button 
                    onClick={() => updateQuantity(product.id, cartItem.quantity + (product.is_weight_based ? 0.1 : 1))}
                    className="p-1 text-green-600 hover:bg-white rounded-md transition-all shadow-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                  <button 
                    onClick={handleAdd}
                    disabled={isOutOfStock}
                    className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md ${isOutOfStock ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none' : 'bg-zinc-900 text-white hover:bg-black'}`}
                  >
                    <Plus size={14} className={isOutOfStock ? 'text-zinc-300' : 'text-green-400'} />
                    {isOutOfStock ? 'Indisponível' : 'Adicionar'}
                  </button>
              )}
            </div>
         </div>
       </div>
     </div>
   );
 };