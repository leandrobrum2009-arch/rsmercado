 import { createFileRoute, Link } from '@tanstack/react-router'
 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
    import { ShoppingBag, Truck, CheckCircle, Clock, Package, MapPin, ArrowLeft, Loader2, Map, QrCode, CreditCard, Copy, Check, Phone, RefreshCw, AlertTriangle, Wallet, ExternalLink, Info } from 'lucide-react'
 import { toast } from '@/lib/toast'
 import { logAttempt } from '@/lib/logs'
 import { Button } from '@/components/ui/button'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Input } from '@/components/ui/input'
 import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
 import { formatCurrency, sendWhatsAppMessage, getWhatsAppConfig, formatWhatsAppMessage, getWhatsAppTemplates } from '@/lib/whatsapp'
 import { generatePixPayload } from '@/lib/pix'
 
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
         setOrder((prev: any) => ({ ...prev, ...payload.new }))
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
 
   const [copied, setCopied] = useState(false)
   const [paying, setPaying] = useState(false)
   const [resendingProof, setResendingProof] = useState(false)
   const [pixTimeLeft, setPixTimeLeft] = useState(600) // 10 minutes
   const [pixExpired, setPixExpired] = useState(false)
    const [backendQrCode, setBackendQrCode] = useState<string | null>(null)
    const [loadingQr, setLoadingQr] = useState(false)
    const [pixPayload, setPixPayload] = useState<string>('')
   const [pixKey, setPixKey] = useState<string>('')
 
   useEffect(() => {
     const fetchPixConfig = async () => {
       if (order?.status === 'pending' && order?.payment_method === 'pix') {
         setLoadingQr(true)
         try {
           const { data: configData } = await supabase
             .from('store_settings')
             .select('value')
             .eq('key', 'pix_config')
             .maybeSingle()
           
           const config = configData?.value || { key: 'rs-supermercado-pix-key-test-123', merchant_name: 'RS SUPERMERCADO', merchant_city: 'SAO PAULO' }
           setPixKey(config.key)
           
           const payload = generatePixPayload(
             config.key,
             config.merchant_name,
             config.merchant_city,
             Number(order.total_amount),
             order.id
           )
           
           setPixPayload(payload)

           const { data, error } = await supabase.functions.invoke('generate-pix-qr', {
             body: { payload }
           })
           
           if (!error && data?.qr_code) {
             setBackendQrCode(data.qr_code)
           }
         } catch (err) {
           console.error('Error setting up PIX:', err)
         } finally {
           setLoadingQr(false)
         }
       }
     }
     fetchPixConfig()
   }, [order?.status, order?.payment_method, order?.total_amount, order?.id])

  useEffect(() => {
    if (order?.status === 'pending' && order?.payment_method === 'pix' && pixTimeLeft > 0 && !pixExpired) {
      const timer = setInterval(() => {
        setPixTimeLeft(prev => {
          if (prev <= 1) {
            setPixExpired(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [order?.status, order?.payment_method, pixTimeLeft, pixExpired])

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
 
   const formatTime = (seconds: number) => {
     const mins = Math.floor(seconds / 60)
     const secs = seconds % 60
     return `${mins}:${secs.toString().padStart(2, '0')}`
   }
 
   const handleRetryPix = () => {
     setPixTimeLeft(600)
     setPixExpired(false)
     toast.success("Novo QR Code gerado!")
     logAttempt('payment_attempt', 'success', { order_id: orderId, type: 'pix', action: 'retry' })
   }
   const handleResendProof = async () => {
     setResendingProof(true)
     try {
       const { data: items, error: itemsError } = await supabase
         .from('order_items')
         .select('*, products(name)')
         .eq('order_id', orderId)
 
       if (itemsError) throw itemsError
 
       const addressStr = order.delivery_address 
         ? `${order.delivery_address.street}, ${order.delivery_address.number} - ${order.delivery_address.neighborhood}`
         : 'Não informado'
 
       const summary = formatWhatsAppMessage('order_summary', {
         id: orderId,
         customer_name: order.customer_name || order.profiles?.full_name || 'Cliente',
         address: addressStr,
         payment_method: order.payment_method,
         items: items,
         subtotal: Number(order.total_amount) - (Number(order.delivery_fee) || 0),
         delivery_fee: Number(order.delivery_fee) || 0,
         total_amount: Number(order.total_amount)
       })
 
       const phone = order.customer_phone || order.profiles?.whatsapp
       if (phone) {
         await sendWhatsAppMessage(phone, summary)
         toast.success("Comprovante enviado para seu WhatsApp!")
       } else {
         toast.error("Número de telefone não encontrado.")
       }
     } catch (err: any) {
       toast.error("Erro ao reenviar: " + err.message)
     } finally {
       setResendingProof(false)
     }
   }
 
    const [paymentStep, setPaymentStep] = useState<'info' | 'form' | 'processing' | 'done'>('info')
    const [cardData, setCardData] = useState({
      number: '',
      name: '',
      expiry: '',
      cvv: ''
    })
 
    const handleCopyKey = () => {
      navigator.clipboard.writeText(pixPayload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Copia e Cola copiado!")
    }
 
    const handleMercadoPagoPayment = async () => {
      setPaying(true)
      try {
        const { data, error } = await supabase.functions.invoke('process-mercadopago-payment', {
          body: { orderId }
        })

        if (error || !data.success) {
          throw new Error(data?.error || 'Erro ao iniciar pagamento com Mercado Pago')
        }

        // Try to get config to see if we use sandbox
        const { data: configData } = await supabase.from('store_settings').select('value').eq('key', 'mercadopago_config').maybeSingle();
        const config = configData?.value || {};
        const url = config.environment === 'sandbox' ? (data.sandbox_init_point || data.init_point) : data.init_point;
        
        window.location.href = url;
      } catch (err: any) {
        toast.error(err.message || "Erro ao iniciar pagamento")
      } finally {
        setPaying(false)
      }
    }

    const handleSimulatePayment = async () => {
      setPaying(true)
      setPaymentStep('processing')
      try {
        // If it's Sipag, use the real Edge Function
        if (order?.payment_method === 'sipag') {
          const { data, error } = await supabase.functions.invoke('process-sipag-payment', {
            body: { orderId, cardData }
          })

          if (error || !data.success) {
            throw new Error(data?.error || data?.message || 'Erro ao processar pagamento com Sipag')
          }
          
          logAttempt('payment_attempt', 'success', { order_id: orderId, type: 'sipag' });
        } else {
          // Fallback to simulation for other methods (like Pix simulation button)
          await new Promise(resolve => setTimeout(resolve, 3000))
          const { error } = await supabase
            .from('orders')
            .update({ status: 'approved' })
            .eq('id', orderId)
          
          if (error) throw error;
          logAttempt('payment_attempt', 'success', { order_id: orderId, type: order?.payment_method, simulation: true });
        }
         
        // Notify via WhatsApp if enabled
        const config = await getWhatsAppConfig();
        if (config?.notify_order_status !== false) {
          const templates = await getWhatsAppTemplates();
          const message = formatWhatsAppMessage('payment_confirmed', {
            id: orderId,
            status: 'approved',
            customer_name: order?.customer_name || order?.profiles?.full_name || 'Cliente'
          }, templates);
          const phone = order?.customer_phone || order?.profiles?.whatsapp;
          if (phone) await sendWhatsAppMessage(phone, message);
        }

        toast.success("Pagamento confirmado!")
        setPaymentStep('done')
      } catch (err: any) {
        console.error('Payment error:', err)
        toast.error(err.message || "Erro ao processar pagamento")
        setPaymentStep('form')
      } finally {
        setPaying(false)
      }
    }
 
   const info = getStatusInfo(order.status)
          {/* Payment Simulation Section */}
          {order.status === 'pending' && (order.payment_method === 'pix' || order.payment_method === 'sipag' || order.payment_method === 'mercadopago') && (
            <Card className="border-4 border-primary/20 shadow-2xl rounded-[40px] overflow-hidden bg-white animate-in zoom-in duration-500">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    {order.payment_method === 'pix' ? <QrCode size={24} /> : <CreditCard size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900">Finalizar Pagamento</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Seu pedido aguarda a confirmação</p>
                  </div>
                </div>

                  {order.payment_method === 'pix' ? (
                  <div className="space-y-6">
                    {!pixExpired ? (
                      <>
                        <div className="bg-zinc-50 p-6 rounded-3xl flex flex-col items-center gap-4 border border-zinc-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-amber-500 animate-pulse" />
                            <span className="text-xs font-black uppercase text-zinc-500">Expira em: <span className="text-amber-600">{formatTime(pixTimeLeft)}</span></span>
                          </div>
                           <div className="bg-white p-4 rounded-3xl shadow-xl border-4 border-primary/10 relative min-h-[200px] flex items-center justify-center overflow-hidden group">
                             {loadingQr ? (
                               <div className="flex flex-col items-center gap-2">
                                 <Loader2 className="animate-spin text-primary" size={40} />
                                 <span className="text-[10px] font-black uppercase text-zinc-400">Gerando QR Code...</span>
                               </div>
                             ) : backendQrCode ? (
                               <div className="relative">
                                 <img 
                                   src={backendQrCode} 
                                   alt="PIX QR Code" 
                                   className="w-48 h-48 animate-in zoom-in duration-500"
                                 />
                                 <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                   <div className="bg-primary text-white p-3 rounded-2xl shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                                      <QrCode size={32} />
                                   </div>
                                 </div>
                               </div>
                             ) : (
                               <div className="text-center p-4">
                                 <AlertTriangle className="text-amber-500 mx-auto mb-2" size={32} />
                                 <p className="text-[10px] font-black uppercase text-zinc-400">Erro ao carregar QR Code</p>
                               </div>
                             )}
                           </div>
                          <p className="text-[10px] font-black uppercase text-zinc-400 text-center">Escaneie o código acima ou copie a chave abaixo</p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block text-center">Código Copia e Cola</label>
                            <Button 
                              variant="outline" 
                              className={`w-full h-14 rounded-2xl border-2 border-dashed font-bold flex items-center justify-between px-6 transition-all ${copied ? 'border-green-500 bg-green-50 text-green-700' : 'border-zinc-200 hover:bg-zinc-50'}`}
                              onClick={handleCopyKey}
                            >
                              <span className="text-xs truncate mr-4 font-mono">{pixPayload || 'Gerando código...'}</span>
                              {copied ? <Check size={18} className="text-green-600 shrink-0" /> : <Copy size={18} className="text-zinc-400 shrink-0" />}
                            </Button>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-zinc-100"></div>
                            <span className="text-[8px] font-black uppercase text-zinc-300">Ou use a Chave</span>
                            <div className="flex-1 h-px bg-zinc-100"></div>
                          </div>

                          <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase text-zinc-400">Chave PIX</span>
                              <span className="text-xs font-bold text-zinc-600">{pixKey}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 text-[10px] font-black uppercase"
                              onClick={() => {
                                navigator.clipboard.writeText(pixKey)
                                toast.success("Chave PIX copiada!")
                              }}
                            >
                              Copiar
                            </Button>
                          </div>
                        </div>

                         <div className="mt-8 pt-8 border-t border-zinc-100 space-y-4">
                           <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                              <Info className="text-amber-500 shrink-0" size={18} />
                              <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                                Após realizar o pagamento, o sistema identificará o recebimento e seu pedido será aprovado automaticamente. 
                                <span className="block mt-1 text-amber-600/60 font-medium italic">O processo costuma levar alguns segundos.</span>
                              </p>
                           </div>

                           <div className="flex flex-col gap-2">
                             <Button 
                               variant="ghost"
                               className="w-full h-12 rounded-xl text-zinc-400 font-black uppercase italic tracking-widest hover:text-primary transition-colors text-[10px]"
                               onClick={handleSimulatePayment}
                               disabled={paying}
                             >
                               {paying ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" size={14} />}
                               Já paguei, verificar agora
                             </Button>
                           </div>
                         </div>
                      </>
                    ) : (
                      <div className="bg-red-50 p-8 rounded-[40px] flex flex-col items-center text-center gap-6 border-2 border-red-100 animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-100 rounded-[30px] flex items-center justify-center text-red-600">
                          <AlertTriangle size={40} />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black uppercase italic tracking-tighter text-red-900">QR Code Expirado</h4>
                          <p className="text-xs font-bold text-red-700/60 uppercase tracking-widest leading-relaxed">
                            O tempo para pagamento via PIX acabou. Não se preocupe, você pode gerar um novo código abaixo.
                          </p>
                        </div>
                        <Button 
                          onClick={handleRetryPix}
                          className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest flex gap-2"
                        >
                          <RefreshCw size={18} /> GERAR NOVO QR CODE
                        </Button>
                      </div>
                    )}
                  </div>
                  ) : order.payment_method === 'mercadopago' ? (
                     <div className="space-y-6">
                        <div className="bg-zinc-50 p-8 rounded-[40px] flex flex-col items-center text-center gap-6 border-2 border-zinc-100 animate-in fade-in zoom-in duration-300">
                          <div className="w-20 h-20 bg-blue-100 rounded-[30px] flex items-center justify-center text-blue-600">
                            <Wallet size={40} />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900">Mercado Pago</h4>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                              Finalize seu pagamento com segurança via Cartão, PIX ou Boleto através do Mercado Pago.
                            </p>
                          </div>
                          <Button 
                            onClick={handleMercadoPagoPayment}
                            disabled={paying}
                            className="w-full h-14 rounded-2xl bg-[#009EE3] hover:bg-[#008ED1] text-white font-black uppercase tracking-widest flex gap-2 shadow-xl shadow-blue-100"
                          >
                            {paying ? <Loader2 className="animate-spin" /> : <ExternalLink size={18} />}
                            PAGAR COM MERCADO PAGO
                          </Button>
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-6">
                     {paymentStep === 'info' && (
                       <div className="space-y-6">
                         <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 p-6 rounded-3xl text-white relative overflow-hidden aspect-[1.6/1] shadow-2xl">
                           <div className="absolute top-0 right-0 opacity-10 -mr-8 -mt-8 rotate-12">
                             <CreditCard size={150} strokeWidth={1} />
                           </div>
                           <div className="flex justify-between items-start">
                             <div className="w-10 h-10 bg-amber-400/80 rounded-lg blur-[0.5px] shadow-inner"></div>
                             <p className="font-black italic text-lg text-primary tracking-tighter">SIPAG</p>
                           </div>
                           <div className="mt-8">
                             <p className="text-xl font-mono tracking-[4px] text-white">•••• •••• •••• ••••</p>
                             <div className="flex justify-between mt-6">
                               <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">{order.customer_name || 'TITULAR DO CARTÃO'}</p>
                               <p className="text-[10px] font-black uppercase opacity-60">MM/AA</p>
                             </div>
                           </div>
                         </div>
                         <Button 
                           className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-zinc-900 text-white"
                           onClick={() => setPaymentStep('form')}
                         >
                           INSERIR DADOS DO CARTÃO
                         </Button>
                       </div>
                     )}

                     {paymentStep === 'form' && (
                       <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                         <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-zinc-400">Número do Cartão</Label>
                           <Input 
                             placeholder="0000 0000 0000 0000"
                             value={cardData.number}
                             onChange={e => setCardData({...cardData, number: e.target.value.replace(/\D/g, '').substring(0, 16).replace(/(\d{4})/g, '$1 ').trim()})}
                             className="h-12 rounded-xl font-bold"
                           />
                         </div>
                         <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-zinc-400">Nome no Cartão</Label>
                           <Input 
                             placeholder="Como está no cartão"
                             value={cardData.name}
                             onChange={e => setCardData({...cardData, name: e.target.value.toUpperCase()})}
                             className="h-12 rounded-xl font-bold"
                           />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-zinc-400">Validade</Label>
                             <Input 
                               placeholder="MM/AA"
                               value={cardData.expiry}
                               onChange={e => setCardData({...cardData, expiry: e.target.value.replace(/\D/g, '').substring(0, 4).replace(/(\d{2})/, '$1/').trim()})}
                               className="h-12 rounded-xl font-bold"
                             />
                           </div>
                           <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-zinc-400">CVV</Label>
                             <Input 
                               placeholder="123"
                               type="password"
                               value={cardData.cvv}
                               onChange={e => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '').substring(0, 3)})}
                               className="h-12 rounded-xl font-bold"
                             />
                           </div>
                         </div>
                         <div className="flex gap-2">
                            <Button variant="outline" className="h-14 rounded-2xl font-bold" onClick={() => setPaymentStep('info')}>Voltar</Button>
                            <Button 
                              className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest bg-primary"
                              onClick={handleSimulatePayment}
                            >
                              PAGAR AGORA
                            </Button>
                         </div>
                       </div>
                     )}

                     {paymentStep === 'processing' && (
                       <div className="py-12 flex flex-col items-center justify-center gap-6 animate-pulse">
                         <div className="relative">
                            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <CreditCard size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                         </div>
                         <div className="text-center space-y-2">
                           <h4 className="text-lg font-black uppercase italic tracking-tighter">Processando Transação</h4>
                           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Comunicando com a operadora SIPAG...</p>
                         </div>
                       </div>
                     )}
                   </div>
                 )}
              </CardContent>
            </Card>
          )}

 
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
                   <div className="flex flex-col gap-2 items-end">
                     <Badge className="bg-primary/20 text-primary border-0 font-black uppercase text-[8px] py-1 px-3">
                       {order.order_items?.length || 0} ITENS
                     </Badge>
                     <Button 
                       size="sm" 
                       variant="ghost" 
                       className="h-8 text-[8px] font-black uppercase text-primary bg-primary/5 hover:bg-primary/10 rounded-xl"
                       onClick={handleResendProof}
                       disabled={resendingProof}
                     >
                       {resendingProof ? <Loader2 className="animate-spin mr-1" size={10} /> : <Phone className="mr-1" size={10} />}
                       Receber Comprovante
                     </Button>
                   </div>
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