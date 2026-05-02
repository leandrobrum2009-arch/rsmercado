import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
 import { useCart } from "../contexts/CartContext";
import { Trash2, Plus, Minus, ArrowRight, Ticket, CreditCard, Banknote, QrCode, ShoppingCart, Loader2 } from "lucide-react";
 import { useState } from "react";
 import { formatCurrency } from "../lib/whatsapp";
import { supabase } from "@/lib/supabase";
 import { toast } from "sonner";
 
 export const Route = createFileRoute("/cart")({
   component: CartPage,
 });
 
 function CartPage() {
   const { items, total, totalPoints, updateQuantity, removeFromCart, clearCart } = useCart();
   const [coupon, setCoupon] = useState("");
   const [paymentMethod, setPaymentMethod] = useState("pix");
 
   if (items.length === 0) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
         <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
           <ShoppingCart size={40} />
         </div>
         <h2 className="text-xl font-bold text-gray-800">Seu carrinho está vazio</h2>
         <p className="text-gray-500 text-center mt-2 max-w-[250px]">
           Adicione produtos para começar suas compras no SuperLoja.
         </p>
         <Link to="/" className="mt-8 bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg">
           Ir para as compras
         </Link>
       </div>
     );
   }
 
   const handleCheckout = () => {
     toast.success("Pedido enviado com sucesso!");
     // In a real app, here we would call Supabase to create the order
     // and then redirect to a tracking page.
   };
 
   return (
     <div className="bg-gray-50 min-h-screen pb-24">
       <div className="bg-white p-4 border-b sticky top-0 z-10 md:static">
         <h1 className="text-xl font-bold text-gray-800">Meu Carrinho</h1>
       </div>
 
       <div className="container mx-auto p-4 space-y-6">
         {/* Items List */}
         <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
           {items.map((item) => (
             <div key={item.id} className="flex items-center gap-4 p-4 border-b last:border-0">
               <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-gray-50" />
               <div className="flex-1">
                 <h3 className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</h3>
                 <p className="text-green-600 font-bold text-sm">{formatCurrency(item.price)}</p>
                 <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 font-bold uppercase">
                   <span>{item.points_value * item.quantity} pontos</span>
                 </div>
                 
                 <div className="flex items-center justify-between mt-2">
                   <div className="flex items-center bg-gray-100 rounded-lg p-1">
                     <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 text-green-600">
                       <Minus size={16} />
                     </button>
                     <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                     <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 text-green-600">
                       <Plus size={16} />
                     </button>
                   </div>
                   <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                     <Trash2 size={18} />
                   </button>
                 </div>
               </div>
             </div>
           ))}
         </div>
 
         {/* Coupon */}
         <div className="bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-3">
           <Ticket className="text-gray-400" size={20} />
           <input 
             type="text" 
             placeholder="Cupom de desconto" 
             className="flex-1 text-sm outline-none"
             value={coupon}
             onChange={(e) => setCoupon(e.target.value)}
           />
           <button className="text-green-600 font-bold text-sm uppercase">Aplicar</button>
         </div>
 
         {/* Payment Methods */}
         <div className="space-y-3">
           <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider px-2">Forma de Pagamento</h3>
           <div className="grid grid-cols-1 gap-2">
             {[
               { id: 'pix', label: 'PIX (Automático)', icon: QrCode },
               { id: 'sipag', label: 'Cartão (SIPAG)', icon: CreditCard },
               { id: 'mercadopago', label: 'Mercado Pago', icon: Banknote },
               { id: 'money', label: 'Dinheiro na Entrega', icon: Banknote },
             ].map((method) => (
               <button
                 key={method.id}
                 onClick={() => setPaymentMethod(method.id)}
                 className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                   paymentMethod === method.id 
                   ? "border-green-600 bg-green-50" 
                   : "border-transparent bg-white shadow-sm"
                 }`}
               >
                 <div className={`p-2 rounded-xl ${paymentMethod === method.id ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                   <method.icon size={20} />
                 </div>
                 <span className={`font-bold ${paymentMethod === method.id ? "text-green-800" : "text-gray-700"}`}>
                   {method.label}
                 </span>
               </button>
             ))}
           </div>
         </div>
 
         {/* Summary */}
         <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-4">
           <div className="flex justify-between text-gray-500">
             <span>Subtotal</span>
             <span>{formatCurrency(total)}</span>
           </div>
           <div className="flex justify-between text-gray-500">
             <span>Entrega</span>
             <span className="text-green-600 font-bold uppercase text-xs tracking-tighter self-center">Grátis</span>
           </div>
           <div className="flex justify-between text-amber-600 font-bold bg-amber-50 p-2 rounded-xl">
             <span>Você ganhará:</span>
             <span>{totalPoints} pontos</span>
           </div>
           <div className="border-t pt-4 flex justify-between items-center">
             <span className="text-xl font-bold text-gray-800">Total</span>
             <span className="text-2xl font-black text-green-700">{formatCurrency(total)}</span>
           </div>
         </div>
 
         {/* Action Button */}
         <button 
           onClick={handleCheckout}
           className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-transform"
         >
           Finalizar Pedido
           <ArrowRight size={20} />
         </button>
       </div>
     </div>
   );
 }
 
 function ShoppingCart({ size }: { size: number }) {
   return (
     <svg 
       width={size} 
       height={size} 
       viewBox="0 0 24 24" 
       fill="none" 
       stroke="currentColor" 
       strokeWidth="2" 
       strokeLinecap="round" 
       strokeLinejoin="round"
     >
       <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
       <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.1-5.38a.5.5 0 0 0-.49-.6H6.14"/>
     </svg>
   );
 }