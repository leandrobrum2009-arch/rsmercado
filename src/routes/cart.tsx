import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "../contexts/CartContext";
 import { Trash2, Plus, Minus, ArrowRight, Ticket, CreditCard, Banknote, QrCode, ShoppingCart, Loader2, ChefHat, MapPin, Info, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { formatCurrency, sendWhatsAppMessage, formatWhatsAppMessage, getWhatsAppConfig } from "../lib/whatsapp";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { RecipeSuggestions } from "@/components/RecipeSuggestions";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, total, totalPoints, updateQuantity, removeFromCart, clearCart } = useCart();
  const [coupon, setCoupon] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [isProcessing, setIsProcessing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [pointsMultiplier, setPointsMultiplier] = useState(1);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isValidDeliveryArea, setIsValidDeliveryArea] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeliveryFee = async () => {
      if (selectedAddress?.neighborhood) {
        const { data } = await supabase
          .from('delivery_neighborhoods')
          .select('fee')
          .eq('name', selectedAddress.neighborhood)
          .eq('active', true)
          .maybeSingle();
        
        if (data) {
          setDeliveryFee(data.fee);
          setIsValidDeliveryArea(true);
          if (data.fee > 0) {
            toast.success(`Taxa de entrega para ${selectedAddress.neighborhood}: ${formatCurrency(data.fee)}`);
          } else {
            toast.success(`Entrega grátis para ${selectedAddress.neighborhood}!`);
          }
        } else {
          setDeliveryFee(0);
          setIsValidDeliveryArea(false);
        }
      } else {
        setDeliveryFee(0);
        setIsValidDeliveryArea(null);
      }
    };
    fetchDeliveryFee();
  }, [selectedAddress]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      }
    };

    const fetchSettings = async () => {
      const { data } = await supabase.from('store_settings').select('value').eq('key', 'points_multiplier').maybeSingle();
      if (data && data.value) {
        const val = typeof data.value === 'object' ? data.value.points_per_real : data.value;
        setPointsMultiplier(Number(val) || 1);
      }
    };

    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);

        // Addresses
        const { data: addrData } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        setAddresses(addrData || []);
        if (addrData && addrData.length > 0) {
          setSelectedAddress(addrData.find(a => a.is_default) || addrData[0]);
        }
      }
    };

    fetchData();
  }, []);

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

  const handleCheckout = async () => {
    if (!profile) {
      toast.error("Você precisa estar logado para finalizar o pedido.");
      navigate({ to: "/profile" });
      return;
    }

    if (!profile.whatsapp) {
      toast.error("Por favor, preencha seu WhatsApp no perfil para receber notificações.");
      navigate({ to: "/profile" });
      return;
    }

    if (!selectedAddress) {
      toast.error("Por favor, adicione um endereço de entrega.");
      navigate({ to: "/profile" });
      return;
    }

    if (isValidDeliveryArea === false) {
      toast.error("Desculpe, não realizamos entregas no bairro " + selectedAddress.neighborhood);
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create Order
      const orderPayload: any = {
        user_id: profile.id,
        total_amount: total + deliveryFee,
        delivery_fee: deliveryFee,
        payment_method: paymentMethod,
        status: 'pending',
        points_earned: Math.floor(total * pointsMultiplier),
        customer_name: profile.full_name,
        customer_phone: profile.whatsapp,
        delivery_address: selectedAddress,
        coupon_code: coupon
      };

      let { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (orderError && orderError.message.includes('column')) {
        console.warn('Falling back to minimal order insert');
        const { customer_name, customer_phone, ...minimalPayload } = orderPayload;
        const result = await supabase
          .from('orders')
          .insert(minimalPayload)
          .select()
          .single();
        order = result.data;
        orderError = result.error;
      }

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

       // 3. Send WhatsApp Notifications
       const userMessage = formatWhatsAppMessage('order', {
         id: order.id,
         total_amount: total,
         status: 'Recebido'
       });
       
       await sendWhatsAppMessage(profile.whatsapp, userMessage);

       // Notify Admin if enabled
       const waConfig = await getWhatsAppConfig();
       if (waConfig?.notify_new_order_admin !== false) {
         const { data: storeData } = await supabase.from('store_settings').select('value').eq('key', 'admin_whatsapp').maybeSingle();
         if (storeData && storeData.value) {
           const adminMessage = `🔔 *NOVO PEDIDO RECEBIDO!* 🔔\n\n👤 Cliente: *${profile.full_name}*\n💰 Valor: *R$ ${total.toFixed(2)}*\n📍 Bairro: *${selectedAddress.neighborhood}*\n💳 Pagamento: *${paymentMethod.toUpperCase()}*\n\n👉 Acesse o painel para gerenciar: ${window.location.origin}/admin`;
           await sendWhatsAppMessage(storeData.value, adminMessage);
         }
       }

       toast.success(`Pedido #${order.id.substring(0, 8)} enviado! Você ganhou ${Math.floor(total * pointsMultiplier)} pontos.`);
      clearCart();
      navigate({ to: "/profile" });
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Erro ao processar pedido: " + error.message);
    } finally {
      setIsProcessing(false);
    }
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

        {/* Recipe Suggestions */}
        <RecipeSuggestions cartItems={items} />

        {/* Delivery Address */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider px-2 flex justify-between items-center">
            <span>Endereço de Entrega</span>
            <Link to="/profile" className="text-[10px] text-green-600 font-black uppercase">Alterar / Novo</Link>
          </h3>
          {addresses.length === 0 ? (
            <Link to="/profile" className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border-2 border-dashed border-zinc-200 text-center gap-2 group hover:border-green-500 transition-colors">
              <MapPin className="text-zinc-300 group-hover:text-green-500 transition-colors" size={32} />
              <p className="text-xs font-bold text-zinc-500">Nenhum endereço cadastrado</p>
              <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-3 py-1 rounded-full">Clique aqui para adicionar</span>
            </Link>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                  <MapPin size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{selectedAddress?.recipient_name}</span>
                    <span className="bg-gray-100 text-[8px] font-black px-2 py-0.5 rounded uppercase">{selectedAddress?.label}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedAddress?.street}, {selectedAddress?.number}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedAddress?.neighborhood} - {selectedAddress?.city}
                  </p>
                  {selectedAddress?.reference_point && (
                    <div className="mt-2 text-[10px] text-zinc-600 bg-zinc-50 p-2 rounded-lg border border-zinc-100 flex items-center gap-1">
                      <Info size={12} className="text-zinc-400" />
                      <span className="font-bold uppercase opacity-60">Ref:</span> {selectedAddress?.reference_point}
                    </div>
                  )}
                  
                  {isValidDeliveryArea === false && (
                    <div className="mt-2 text-[10px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span className="font-bold uppercase">Área não atendida:</span> 
                      Não entregamos em {selectedAddress.neighborhood}
                    </div>
                  )}
                </div>
              </div>
              
              {addresses.length > 1 && (
                <div className="pt-3 border-t">
                  <select 
                    className="w-full bg-gray-50 border-none rounded-xl text-xs font-bold uppercase p-3"
                    value={selectedAddress?.id}
                    onChange={(e) => setSelectedAddress(addresses.find(a => a.id === e.target.value))}
                  >
                    {addresses.map(addr => (
                      <option key={addr.id} value={addr.id}>{addr.label}: {addr.street}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider px-2">Forma de Pagamento</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'pix', label: 'PIX (Automático)', icon: QrCode },
              { id: 'sipag', label: 'Cartão (SIPAG)', icon: CreditCard },
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
          <div className="flex justify-between items-center text-gray-500">
            <span className="flex items-center gap-1">
              Entrega 
              <span className="text-[10px] font-bold text-zinc-400">({selectedAddress?.neighborhood || 'Escolha o endereço'})</span>
            </span>
            {isValidDeliveryArea === false ? (
              <span className="text-red-600 font-bold uppercase text-xs">Indisponível</span>
            ) : deliveryFee > 0 ? (
              <span className="text-zinc-900 font-bold">{formatCurrency(deliveryFee)}</span>
            ) : (
              <span className="text-green-600 font-bold uppercase text-xs tracking-tighter">Grátis</span>
            )}
          </div>
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-xl font-bold text-gray-800">Total</span>
            <span className="text-2xl font-black text-green-700">{formatCurrency(total + deliveryFee)}</span>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleCheckout}
          disabled={isProcessing}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Processando...
            </>
          ) : (
            <>
              Finalizar Pedido
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
