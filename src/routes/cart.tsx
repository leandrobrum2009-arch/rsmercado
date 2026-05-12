 import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "../contexts/CartContext";
    import { Trash2, Plus, Minus, ArrowRight, Ticket, CreditCard, Banknote, QrCode, ShoppingCart, Loader2, ChefHat, MapPin, Info, AlertCircle, Phone, Search, ShoppingBag, User, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
 import { formatCurrency, sendWhatsAppMessage, formatWhatsAppMessage, getWhatsAppConfig, getWhatsAppTemplates } from "../lib/whatsapp";
 import { sendSMS, makeNotificationCall } from "../lib/notifications";
import { supabase } from "@/lib/supabase";
 import { toast } from "@/lib/toast";
 import { logAttempt } from "@/lib/logs";
 import { RecipeSuggestions } from "@/components/RecipeSuggestions";
 import { AuthForm } from "@/components/auth/AuthForm";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, total, totalPoints, updateQuantity, removeFromCart, clearCart } = useCart();
   const [coupon, setCoupon] = useState("");
   const [discount, setDiscount] = useState(0);
   const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
   const [isProcessing, setIsProcessing] = useState(false);
   const [lookupPhone, setLookupPhone] = useState('');
   const [guestOrders, setGuestOrders] = useState<any[]>([]);
   const [isSearching, setIsSearching] = useState(false);
 
   const handleOrderLookup = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!lookupPhone) return;
     setIsSearching(true);
     try {
       const { data, error } = await supabase
         .from('orders')
         .select('*')
         .eq('customer_phone', lookupPhone)
         .order('created_at', { ascending: false });
       if (error) throw error;
       setGuestOrders(data || []);
       if (data && data.length > 0) {
         toast.success(`${data.length} pedidos encontrados!`);
       } else {
         toast.info('Nenhum pedido encontrado para este WhatsApp.');
       }
     } catch (err: any) {
       toast.error('Erro ao buscar pedidos: ' + err.message);
     } finally {
       setIsSearching(false);
     }
   };
    const [profile, setProfile] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
   const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
   const [changeFor, setChangeFor] = useState("");

   useEffect(() => {
     const fetchNeighborhoods = async () => {
       const { data } = await supabase.from('delivery_neighborhoods').select('*').eq('active', true).order('name');
       setNeighborhoods(data || []);
     };
     fetchNeighborhoods();
   }, []);

    const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
   const [loyaltySettings, setLoyaltySettings] = useState<any>(null);
     const [sipagEnabled, setSipagEnabled] = useState(false);
     const [mercadoPagoEnabled, setMercadoPagoEnabled] = useState(false);
     const [pixEnabled, setPixEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isValidDeliveryArea, setIsValidDeliveryArea] = useState<boolean | null>(null);
  const navigate = useNavigate();

    useEffect(() => {
      const fetchDeliveryFee = async () => {
        const neighborhoodName = selectedAddress?.neighborhood;
        
        if (neighborhoodName) {
          const { data } = await supabase
            .from('delivery_neighborhoods')
            .select('fee')
            .eq('name', neighborhoodName)
            .eq('active', true)
            .maybeSingle();
          
          if (data) {
            setDeliveryFee(data.fee);
            setIsValidDeliveryArea(true);
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
      const fetchSettings = async () => {
        const { data: pointsData } = await supabase.from('store_settings').select('value').eq('key', 'points_multiplier').maybeSingle();
        if (pointsData && pointsData.value) {
          setLoyaltySettings(pointsData.value);
        }
         const { data: sipagData } = await supabase.from('store_settings').select('value').eq('key', 'sipag_config').maybeSingle();
         if (sipagData && sipagData.value) {
           setSipagEnabled(sipagData.value.enabled);
         }
          const { data: mercadoPagoData } = await supabase.from('store_settings').select('value').eq('key', 'mercadopago_config').maybeSingle();
          if (mercadoPagoData && mercadoPagoData.value) {
            setMercadoPagoEnabled(mercadoPagoData.value.enabled);
          }
          const { data: pixData } = await supabase.from('store_settings').select('value').eq('key', 'pix_config').maybeSingle();
          if (pixData && pixData.value) {
            setPixEnabled(pixData.value.enabled);
          }
      };

     const fetchData = async () => {
       const { data: { session: currentSession } } = await supabase.auth.getSession();
       setSession(currentSession);
       if (currentSession) {
         // Profile
         const { data: profileData } = await supabase
           .from('profiles')
           .select('*')
           .eq('id', currentSession.user.id)
           .maybeSingle();
         setProfile(profileData);
 
         // Addresses
         const { data: addrData } = await supabase
           .from('user_addresses')
           .select('*')
           .eq('user_id', currentSession.user.id)
           .order('created_at', { ascending: false });
         
         setAddresses(addrData || []);
         if (addrData && addrData.length > 0) {
           setSelectedAddress(addrData.find(a => a.is_default) || addrData[0]);
         }
       }
     };
 
     fetchData();
    fetchSettings();
 
     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
       setSession(session);
       if (session) fetchData();
       else {
         setProfile(null);
         setAddresses([]);
       }
     });
 
     return () => subscription.unsubscribe();
  }, []);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
          <ShoppingCart size={40} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Seu carrinho está vazio</h2>
        <p className="text-gray-500 text-center mt-2 max-w-[250px]">
           Adicione produtos para começar suas compras no RS SUPERMERCADO.
        </p>
        <Link to="/" className="mt-8 bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg">
          Ir para as compras
        </Link>
      </div>
    );
  }

   const handleApplyCoupon = async () => {
     if (!session) {
       toast.error("Faça login para aplicar o cupom.");
       return;
     }
     
      const normalizedCoupon = coupon.trim().toUpperCase();
      if (normalizedCoupon === 'PRIMEIRA') {
       setIsCheckingCoupon(true);
       try {
         const { count, error } = await supabase
           .from('orders')
           .select('*', { count: 'exact', head: true })
           .eq('user_id', session.user.id);
           
         if (error) throw error;
         
         if (count && count > 0) {
           toast.error("O cupom PRIMEIRA é válido apenas para a primeira compra.");
           setDiscount(0);
         } else {
           const discountValue = total * 0.10;
           setDiscount(discountValue);
           toast.success(`Cupom PRIMEIRA aplicado! Desconto de ${formatCurrency(discountValue)}`);
         }
       } catch (err) {
         toast.error("Erro ao validar cupom.");
       } finally {
         setIsCheckingCoupon(false);
       }
     } else if (coupon) {
       toast.error("Cupom inválido.");
       setDiscount(0);
     }
   };
 
     const handleCheckout = async () => {
       if (!session || !profile) {
         toast.error("Por favor, faça login para finalizar sua compra.");
         return;
       }
 
       const customerName = profile.full_name;
       const customerPhone = profile.whatsapp;
       const deliveryAddress = selectedAddress;
  
       if (!customerName || !customerPhone) {
         toast.error("Por favor, complete seu cadastro com Nome e WhatsApp.");
         return;
       }
  
      if (!deliveryAddress) {
        toast.error("Por favor, selecione um endereço de entrega.");
        return;
      }
 
      setIsProcessing(true);
       const orderPayload: any = {
         change_for: paymentMethod === 'money' && changeFor ? parseFloat(changeFor) : null,
         user_id: profile?.id || null,
         total_amount: total - discount + deliveryFee,
         discount_amount: discount,
         delivery_fee: deliveryFee,
         payment_method: paymentMethod,
          status: 'pending',
          points_earned: (() => {
            const multiplier = Number(loyaltySettings?.points_per_real) || 1;
            const minValue = Number(loyaltySettings?.min_order_value_to_earn) || 0;
            return total >= minValue ? Math.floor(total * multiplier) : 0;
          })(),
          customer_name: customerName,
         customer_phone: customerPhone,
         delivery_address: deliveryAddress,
         coupon_code: coupon
       };
       
       // Log para depuração de RLS
       console.log('Final payload before insert:', orderPayload);
      console.log('Starting order creation with payload:', orderPayload);
      try {

       console.log('Inserting into orders table...');
       let { data: order, error: orderError } = await supabase
         .from('orders')
         .insert(orderPayload)
         .select()
         .single();
       console.log('Primary insert result:', { order, orderError });
 
        if (orderError && (orderError.message.includes('column') || orderError.code === '42703')) {
         console.warn('Falling back to minimal order insert due to missing columns');
         const { customer_name, customer_phone, change_for, points_earned, coupon_code, delivery_address, discount_amount, ...minimalPayload } = orderPayload;
         const result = await supabase
          .from('orders')
          .insert(minimalPayload)
          .select()
          .single();
        order = result.data;
        orderError = result.error;
      }

       if (orderError) {
         logAttempt('payment_attempt', 'failure', { ...orderPayload, error: orderError.message });
         throw orderError;
       }
 
       logAttempt('payment_attempt', 'success', { order_id: order.id, total_amount: orderPayload.total_amount });

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
         const addressStr = `${selectedAddress?.street}, ${selectedAddress?.number} - ${selectedAddress?.neighborhood}`;
         const templates = await getWhatsAppTemplates();
         const userSummary = formatWhatsAppMessage('order_summary', {
          id: order.id,
          customer_name: customerName,
          address: addressStr,
          payment_method: paymentMethod === 'money' ? `Dinheiro${changeFor ? ` (Troco para R$ ${changeFor})` : ' (Sem troco)'}` : paymentMethod,
          items: items,
          subtotal: total,
          discount: discount,
          delivery_fee: deliveryFee,
           total_amount: total - discount + deliveryFee
         }, templates);
        
        const userFullMessage = `✅ *PEDIDO RECEBIDO COM SUCESSO!* ✅\n\nOlá *${customerName}*, seu pedido foi processado e já estamos preparando tudo!\n\n${userSummary}`;
        await sendWhatsAppMessage(customerPhone, userFullMessage);

        // Notify Admin via WhatsApp if enabled
        const waConfig = await getWhatsAppConfig();
        const { data: extConfig } = await supabase.from('store_settings').select('value').eq('key', 'external_notification_config').maybeSingle();
        const notifications = extConfig?.value || {};

         if (waConfig?.notify_new_order_admin !== false || notifications.whatsapp_enabled) {
          const { data: adminSettings } = await supabase.from('store_settings').select('value').eq('key', 'admin_whatsapp').maybeSingle();
          if (adminSettings && adminSettings.value) {
            const adminSummary = formatWhatsAppMessage('order_summary', {
             id: order.id,
             customer_name: customerName,
              address: `${selectedAddress?.street}, ${selectedAddress?.number} - ${selectedAddress?.neighborhood}`,
              payment_method: paymentMethod === 'money' ? `Dinheiro${changeFor ? ` (Troco para R$ ${changeFor})` : ' (Sem troco)'}` : paymentMethod,
             items: items, // use cart items
             subtotal: total,
             discount: discount,
             delivery_fee: deliveryFee,
              total_amount: total - discount + deliveryFee
            }, templates);
          
           const adminFullMessage = `🔔 *NOVO PEDIDO RECEBIDO!* 🔔\n\n${adminSummary}\n\n👉 Gerenciar no painel: ${window.location.origin}/admin`;
           await sendWhatsAppMessage(adminSettings.value, adminFullMessage);
           
           // SMS and Call notifications to admin
           await sendSMS(adminSettings.value, `Novo pedido #${order.id.substring(0, 8)} recebido! Total: R$ ${(total - discount + deliveryFee).toFixed(2)}`);
           await makeNotificationCall(adminSettings.value);
        }
       }

        toast.success(`Pedido #${order.id.substring(0, 8)} enviado!`);
        const earnedPoints = loyaltySettings && total >= (loyaltySettings.min_order_value_to_earn || 0) 
          ? Math.floor(total * (loyaltySettings.points_per_real || 1)) 
          : 0;
        if (profile && earnedPoints > 0) toast.success(`Você ganhará ${earnedPoints} pontos após a entrega.`);
       clearCart();
      navigate({ to: `/track/${order.id}` });
     } catch (error: any) {
       console.error("Checkout error:", error);
       let errorMessage = error.message;
       
       if (error.message?.includes('row-level security') || error.code === '42501') {
         errorMessage = "Erro de permissão no banco de dados. Por favor, acesse /admin-fix e execute o script de reparação para corrigir o acesso.";
       }
       
       toast.error("Erro ao processar pedido: " + errorMessage);
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

        {/* Coupon Section */}
        <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <Ticket size={16} className="text-primary" /> Cupom de Desconto
          </h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Digite seu cupom" 
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                className="w-full h-12 bg-zinc-50 border-zinc-100 rounded-xl px-4 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-green-500 transition-all uppercase"
              />
              {discount > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Ticket size={12} className="text-white" />
                  </div>
                </div>
              )}
            </div>
            <Button 
              onClick={handleApplyCoupon}
              disabled={isCheckingCoupon || !coupon}
              className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-zinc-900 text-white"
            >
              {isCheckingCoupon ? <Loader2 className="animate-spin" size={14} /> : 'Aplicar'}
            </Button>
          </div>
          {discount === 0 && (
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
              🎁 Primeira compra? Use o cupom <span className="text-primary font-black">PRIMEIRA</span> para 10% de desconto!
            </p>
          )}
        </div>

          {/* Auth Section for non-logged in users */}
          {!session && (
            <div className="bg-white rounded-3xl shadow-xl border-4 border-primary/20 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="text-primary" size={32} />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">Identifique-se para Comprar</h2>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Precisamos dos seus dados para garantir a melhor entrega!</p>
              </div>
              <AuthForm />
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <Info className="text-amber-500 flex-shrink-0" size={20} />
                <p className="text-[10px] font-bold text-amber-700 uppercase leading-tight">
                  Seu cadastro é rápido e seguro. Com ele você ganha pontos de fidelidade em cada compra!
                </p>
              </div>
            </div>
          )}

        {/* Address Selection or Quick Address */}
        <div className="space-y-3">
         <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider px-2">Endereço de Entrega</h3>

         {addresses.length === 0 ? (
           <Link to="/profile" className="w-full flex flex-col items-center justify-center p-8 bg-white rounded-3xl border-2 border-dashed border-zinc-200 text-center gap-2 group hover:border-green-500 transition-colors">
             <MapPin className="text-zinc-300 group-hover:text-green-500 transition-colors" size={32} />
             <p className="text-xs font-bold text-zinc-500">Nenhum endereço cadastrado</p>
             <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-3 py-1 rounded-full">Clique para Cadastrar Endereço</span>
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
               ...(pixEnabled ? [{ id: 'pix', label: 'PIX (Direto)', icon: QrCode }] : []),
               ...(sipagEnabled ? [{ id: 'sipag', label: 'Cartão de Crédito', icon: CreditCard }] : []),
               ...(mercadoPagoEnabled ? [{ id: 'mercadopago', label: 'Cartão/PIX (Mercado Pago)', icon: Wallet }] : []),
              { id: 'money', label: 'Dinheiro na Entrega', icon: Banknote },
            ].filter(Boolean).map((method) => (
              <div key={method.id} className="space-y-2">
                <button
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
                {method.id === 'money' && paymentMethod === 'money' && (
                  <div className="px-4 py-3 bg-white border-x-2 border-b-2 border-green-600/20 rounded-b-2xl -mt-2 space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400">Precisa de troco para quanto?</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Valor em R$ (ex: 50.00)" 
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value)}
                        className="flex-1 h-10 bg-zinc-50 border-zinc-100 rounded-lg px-3 text-sm font-bold focus:ring-2 focus:ring-green-500"
                      />
                      <button onClick={() => setChangeFor("")} className="px-3 text-[10px] font-black uppercase text-zinc-400">Não</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-4">
           <div className="flex justify-between text-gray-500 text-sm">
             <span>Subtotal</span>
             <span>{formatCurrency(total)}</span>
           </div>
           {discount > 0 && (
             <div className="flex justify-between text-green-600 text-sm font-bold animate-in slide-in-from-right-2">
               <span className="flex items-center gap-1"><Ticket size={14} /> Desconto (Cupom)</span>
               <span>-{formatCurrency(discount)}</span>
             </div>
           )}
          <div className="flex justify-between items-center text-gray-500">
            <span className="flex items-center gap-1">
               Entrega 
               <span className="text-[10px] font-bold text-zinc-400">({selectedAddress?.neighborhood || 'Escolha o bairro'})</span>
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
             <span className="text-2xl font-black text-green-700">{formatCurrency(total - discount + deliveryFee)}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-3">
          {isValidDeliveryArea === false && (
            <p className="text-[10px] font-black uppercase text-red-600 text-center bg-red-50 py-2 rounded-xl border border-red-100">
              ⚠️ Selecione um endereço em nossa área de cobertura para continuar
            </p>
          )}
          
           <button 
             onClick={handleCheckout}
             disabled={isProcessing || isValidDeliveryArea !== true || !selectedAddress}
             className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed ${
               !isProcessing && isValidDeliveryArea === true && selectedAddress
               ? "bg-green-600 text-white shadow-green-100"
               : "bg-zinc-200 text-zinc-500 shadow-none"
             }`}
           >
             {isProcessing ? (
               <>
                 <Loader2 className="animate-spin" size={20} />
                 Processando...
               </>
             ) : (
               <>
                 {isValidDeliveryArea === false ? 'Área não atendida' : !selectedAddress ? 'Selecione o endereço' : 'Finalizar Pedido'}
                 <ArrowRight size={20} />
               </>
             )}
           </button>
        </div>
      </div>
    </div>
  );
}
