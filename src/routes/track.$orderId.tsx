 import { createFileRoute, Link } from '@tanstack/react-router'
 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { ShoppingBag, Truck, CheckCircle, Clock, Package, MapPin, ArrowLeft, Loader2, Map } from 'lucide-react'
 import { Button } from '@/components/ui/button'
 import { Card, CardContent } from '@/components/ui/card'
 import { formatCurrency } from '@/lib/whatsapp'
 
 export const Route = createFileRoute('/track/$orderId')({
   component: TrackingPage,
 })
 
 function TrackingPage() {
   const { orderId } = Route.useParams()
   const [order, setOrder] = useState<any>(null)
   const [loading, setLoading] = useState(true)
 
   useEffect(() => {
     const fetchOrder = async () => {
       const { data, error } = await supabase
         .from('orders')
         .select('*, order_items(*, products(name, image_url))')
         .eq('id', orderId)
         .maybeSingle()
       
       if (data) setOrder(data)
       setLoading(false)
     }
 
     fetchOrder()
 
     // Real-time updates
     const channel = supabase
       .channel(`track-${orderId}`)
       .on('postgres_changes', { 
         event: 'UPDATE', 
         schema: 'public', 
         table: 'orders', 
         filter: `id=eq.${orderId}` 
       }, (payload) => {
         setOrder(prev => ({ ...prev, ...payload.new }))
       })
       .subscribe()
 
     return () => {
       supabase.removeChannel(channel)
     }
   }, [orderId])
 
   const getStatusInfo = (status: string) => {
     const map: Record<string, { label: string, icon: any, color: string, progress: string }> = {
       pending: { label: 'Aguardando Aprovação', icon: Clock, color: 'text-zinc-400', progress: '10%' },
       approved: { label: 'Pedido Aprovado', icon: CheckCircle, color: 'text-green-500', progress: '30%' },
       collecting: { label: 'Separando Produtos', icon: ShoppingBag, color: 'text-amber-500', progress: '50%' },
       collected: { label: 'Pronto para Envio', icon: Package, color: 'text-blue-500', progress: '70%' },
       waiting_courier: { label: 'Aguardando Entregador', icon: MapPin, color: 'text-purple-500', progress: '85%' },
       out_for_delivery: { label: 'Saiu para Entrega', icon: Truck, color: 'text-indigo-500', progress: '95%' },
       delivered: { label: 'Entregue com Sucesso', icon: CheckCircle, color: 'text-green-600', progress: '100%' },
       cancelled: { label: 'Pedido Cancelado', icon: Package, color: 'text-red-500', progress: '0%' }
     }
     return map[status] || map.pending
   }
 
   if (loading) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
         <Loader2 className="animate-spin text-primary w-10 h-10" />
         <p className="text-xs font-black uppercase text-zinc-400 tracking-widest">Localizando seu pedido...</p>
       </div>
     )
   }
 
   if (!order) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50">
         <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300 mb-4">
           <ShoppingBag size={40} />
         </div>
         <h1 className="text-xl font-black uppercase italic tracking-tighter">Pedido não encontrado</h1>
         <p className="text-sm text-zinc-500 mt-2 mb-8">Verifique se o link está correto ou entre em contato com a loja.</p>
         <Link to="/">
           <Button className="rounded-2xl h-12 px-8 font-black uppercase italic tracking-widest">Voltar para a Loja</Button>
         </Link>
       </div>
     )
   }
 
   const info = getStatusInfo(order.status)
 
   return (
     <div className="bg-zinc-50 min-h-screen pb-20">
       <div className="bg-zinc-900 text-white p-8 pb-32 rounded-b-[60px] relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
         <div className="max-w-xl mx-auto relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 font-bold uppercase text-[10px] tracking-widest">
              <ArrowLeft size={16} /> Voltar para a Loja
            </Link>
            
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Rastreamento ao Vivo</p>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Status do <br /> <span className="text-primary">Pedido</span></h1>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/10 text-right">
                <p className="text-[8px] font-black uppercase opacity-50 mb-1">ID do Pedido</p>
                <p className="font-mono text-sm font-bold">#{order.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
         </div>
       </div>
 
       <div className="max-w-xl mx-auto px-4 -mt-16 space-y-6 relative z-20">
         {/* Status Card */}
         <Card className="border-0 shadow-2xl rounded-[40px] overflow-hidden bg-white">
           <CardContent className="p-8">
              <div className="flex items-center gap-6 mb-8">
                <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center bg-zinc-50 ${info.color}`}>
                  <info.icon size={40} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900 leading-tight">{info.label}</h2>
                  <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">Atualizado agora em tempo real</p>
                </div>
              </div>
 
              {order.status !== 'cancelled' && (
                <div className="space-y-4">
                  <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(22,163,74,0.5)]"
                      style={{ width: info.progress }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-zinc-300 tracking-tighter">
                    <span className={order.status === 'pending' ? 'text-primary' : ''}>Pedido</span>
                    <span className={order.status === 'collecting' ? 'text-primary' : ''}>Preparando</span>
                    <span className={order.status === 'out_for_delivery' ? 'text-primary' : ''}>Em Rota</span>
                    <span className={order.status === 'delivered' ? 'text-primary' : ''}>Entregue</span>
                  </div>
                </div>
              )}
           </CardContent>
         </Card>
 
         {/* Details */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg rounded-3xl bg-white overflow-hidden">
              <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2">
                  <MapPin size={14} className="text-red-500" /> Endereço de Entrega
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-black text-zinc-800 uppercase tracking-tighter leading-tight">
                    {order.delivery_address?.street}, {order.delivery_address?.number}
                  </p>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">
                    {order.delivery_address?.neighborhood} - {order.delivery_address?.city}
                  </p>
                </div>
              </CardContent>
            </Card>
 
            <Card className="border-0 shadow-lg rounded-3xl bg-zinc-900 text-white overflow-hidden">
              <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4 flex items-center gap-2">
                  <ShoppingBag size={14} className="text-primary" /> Resumo Financeiro
                </p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold opacity-50 uppercase">{order.payment_method || 'Pagamento'}</p>
                    <p className="text-2xl font-black italic tracking-tighter text-primary">{formatCurrency(order.total_amount)}</p>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-0 font-black uppercase text-[8px] py-1 px-3">
                    {order.order_items?.length || 0} ITENS
                  </Badge>
                </div>
              </CardContent>
            </Card>
         </div>
 
         {/* Items list */}
         <Card className="border-0 shadow-lg rounded-[32px] bg-white overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 border-b border-zinc-50">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                  <Package size={14} className="text-amber-500" /> Itens do seu Carrinho
                </p>
              </div>
              <div className="divide-y divide-zinc-50">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-zinc-50/50 transition-colors">
                    <img src={item.products?.image_url} className="w-12 h-12 rounded-2xl object-cover border border-zinc-100 shadow-sm" />
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase text-zinc-800 line-clamp-1">{item.products?.name}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Qtd: {item.quantity} • {formatCurrency(item.unit_price)}</p>
                    </div>
                    <p className="text-xs font-black text-zinc-900">{formatCurrency(item.quantity * item.unit_price)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
         </Card>
 
         {/* Live Map Mockup */}
         {order.status === 'out_for_delivery' && (
           <div className="bg-blue-600 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
             <div className="absolute top-0 right-0 opacity-10 -mr-8 -mt-8 rotate-12">
               <Map size={150} strokeWidth={1} />
             </div>
             <h4 className="text-xl font-black uppercase italic tracking-tighter mb-2">Entregador em Rota!</h4>
             <p className="text-blue-100 text-xs font-bold leading-relaxed mb-6 uppercase tracking-tight">
               Seu pedido já saiu da loja e está a caminho do seu endereço. Prepare-se para receber!
             </p>
             <div className="flex gap-2">
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase">Localização Ativa</span>
                </div>
             </div>
           </div>
         )}
 
         {/* Action */}
         <div className="text-center pt-8">
           <p className="text-[10px] font-black uppercase text-zinc-300 tracking-widest mb-4">Dúvidas sobre seu pedido?</p>
           <Button 
            variant="outline" 
            className="rounded-2xl border-2 border-zinc-200 h-14 px-8 font-black uppercase text-xs hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all active:scale-95 shadow-xl shadow-zinc-200/50"
            onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
           >
             Falar com Atendente
           </Button>
         </div>
       </div>
     </div>
   )
 }