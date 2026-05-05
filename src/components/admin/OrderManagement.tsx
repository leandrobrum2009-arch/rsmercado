import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
 import { Loader2, ShoppingBag, Eye, MapPin, CreditCard, Phone, User, Package, ListChecks } from 'lucide-react'
import { toast } from '@/lib/toast'
import { formatCurrency, sendWhatsAppMessage } from '@/lib/whatsapp'

 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
 import { Separator } from '@/components/ui/separator'
 import { ScrollArea } from '@/components/ui/scroll-area'
 
 export function OrderManagement() {
   const [orders, setOrders] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [selectedOrder, setSelectedOrder] = useState<any>(null)
   const [orderItems, setOrderItems] = useState<any[]>([])
   const [loadingItems, setLoadingItems] = useState(false)
   const fetchOrderDetails = async (order: any) => {
     setSelectedOrder(order)
     setLoadingItems(true)
     const { data, error } = await supabase
       .from('order_items')
       .select('*, products(name, image_url)')
       .eq('order_id', order.id)
     
     if (error) {
       console.error('Error fetching order items:', error)
       toast.error('Erro ao carregar itens do pedido')
     } else {
       setOrderItems(data || [])
     }
     setLoadingItems(false)
   }
 

  useEffect(() => {
    fetchOrders()
    
    // Subscribe to new orders with a unique channel name
    const channelName = `orders-channel-${Math.random().toString(36).substr(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles(full_name, whatsapp)')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  const updateOrderStatus = async (orderId: string, status: string, customerPhone: string, customerName: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (error) {
      toast.error('Erro ao atualizar status')
      return
    }

    toast.success('Status atualizado!')
    fetchOrders()

    // Notify via WhatsApp
    if (customerPhone) {
       const statusLabels: Record<string, string> = {
         pending: 'Pendente',
         approved: 'Pedido Aprovado ✅',
         collecting: 'Em Coleta 🛒',
         collected: 'Pedido Coletado 📦',
         waiting_courier: 'Aguardando Entregador 🛵',
         out_for_delivery: 'Saiu para Entrega 🚚',
         delivered: 'Entregue 🏁',
         cancelled: 'Cancelado ❌'
       }
      
      const message = `Olá *${customerName}*!\n\nO status do seu pedido #${orderId.substring(0, 8)} mudou para: *${statusLabels[status] || status}*.\n\nAgradecemos a preferência! 🛒`
      await sendWhatsAppMessage(customerPhone, message)
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="text-primary" /> Gerenciamento de Pedidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">#{order.id.substring(0, 8)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-bold">{order.profiles?.full_name || 'Desconhecido'}</p>
                      <p className="text-xs text-muted-foreground">{order.profiles?.whatsapp || 'Sem Whats'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(order.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      order.status === 'delivered' ? 'default' : 
                      order.status === 'cancelled' ? 'destructive' : 
                      'secondary'
                    }>
                      {order.status}
                    </Badge>
                  </TableCell>
                   <TableCell className="flex items-center gap-2">
                     <Select 
                       value={order.status} 
                       onValueChange={(val) => updateOrderStatus(order.id, val, order.profiles?.whatsapp, order.profiles?.full_name)}
                     >
                       <SelectTrigger className="w-[140px] h-8 text-xs">
                         <SelectValue />
                       </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="approved">Aprovado</SelectItem>
                          <SelectItem value="collecting">Em Coleta</SelectItem>
                          <SelectItem value="collected">Coletado</SelectItem>
                          <SelectItem value="waiting_courier">Aguardando Entregador</SelectItem>
                          <SelectItem value="out_for_delivery">Saiu para Entrega</SelectItem>
                          <SelectItem value="delivered">Entregue</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                     </Select>
 
                     <Dialog>
                       <DialogTrigger asChild>
                         <Button 
                           variant="outline" 
                           size="icon" 
                           className="h-8 w-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                           onClick={() => fetchOrderDetails(order)}
                         >
                           <Eye size={14} />
                         </Button>
                       </DialogTrigger>
                       <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                         <DialogHeader className="bg-zinc-900 text-white p-6">
                           <div className="flex justify-between items-center pr-6">
                             <div>
                               <DialogTitle className="text-xl font-black italic uppercase italic tracking-tighter">Detalhes do Pedido</DialogTitle>
                               <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">ID: #{order.id.substring(0, 8)}</p>
                             </div>
                             <Badge variant="outline" className="text-green-400 border-green-400 font-black uppercase text-[10px]">
                               {order.status}
                             </Badge>
                           </div>
                         </DialogHeader>
                         
                         <ScrollArea className="max-h-[80vh]">
                           <div className="p-8 space-y-8">
                             {/* Customer & Address */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="space-y-4">
                                 <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                   <User size={14} className="text-primary" /> Dados do Cliente
                                 </h4>
                                 <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                   <p className="font-black text-sm text-zinc-900">{order.profiles?.full_name || 'Desconhecido'}</p>
                                   <div className="flex items-center gap-1 mt-1 text-zinc-500">
                                     <Phone size={12} />
                                     <p className="text-xs font-bold">{order.profiles?.whatsapp || 'Não informado'}</p>
                                   </div>
                                   <div className="flex items-center gap-1 mt-1 text-zinc-500">
                                     <CreditCard size={12} />
                                     <p className="text-xs font-bold uppercase">{order.payment_method || 'PIX'}</p>
                                   </div>
                                 </div>
                               </div>
 
                               <div className="space-y-4">
                                 <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                   <MapPin size={14} className="text-red-500" /> Endereço de Entrega
                                 </h4>
                                 <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                   <p className="text-xs font-bold text-zinc-800 leading-relaxed">
                                     {order.delivery_address?.street}, {order.delivery_address?.number}<br />
                                     {order.delivery_address?.neighborhood} - {order.delivery_address?.city}
                                   </p>
                                   {order.delivery_address?.reference && (
                                     <div className="mt-2 pt-2 border-t border-zinc-200">
                                       <p className="text-[9px] font-black uppercase text-zinc-400">Ponto de Referência</p>
                                       <p className="text-[10px] font-bold text-zinc-700 italic">"{order.delivery_address.reference}"</p>
                                     </div>
                                   )}
                                 </div>
                               </div>
                             </div>
 
                             {/* Items List */}
                             <div className="space-y-4">
                               <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                                 <ListChecks size={14} className="text-green-500" /> Itens do Pedido
                               </h4>
                               <div className="border border-zinc-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                                 <Table>
                                   <TableHeader className="bg-zinc-50">
                                     <TableRow>
                                       <TableHead className="text-[9px] font-black uppercase">Produto</TableHead>
                                       <TableHead className="text-[9px] font-black uppercase text-center">Qtd</TableHead>
                                       <TableHead className="text-[9px] font-black uppercase text-right">Valor</TableHead>
                                     </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                     {loadingItems ? (
                                       <TableRow>
                                         <TableCell colSpan={3} className="text-center py-8">
                                           <Loader2 className="animate-spin h-5 w-5 mx-auto text-zinc-300" />
                                         </TableCell>
                                       </TableRow>
                                     ) : orderItems.map((item) => (
                                       <TableRow key={item.id}>
                                         <TableCell>
                                           <div className="flex items-center gap-3">
                                             <img src={item.products?.image_url} className="w-8 h-8 rounded object-cover border" />
                                             <p className="text-[11px] font-bold text-zinc-800 line-clamp-1">{item.products?.name}</p>
                                           </div>
                                         </TableCell>
                                         <TableCell className="text-center font-black text-[11px]">x{item.quantity}</TableCell>
                                         <TableCell className="text-right font-black text-[11px] text-zinc-900">R$ {(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                                       </TableRow>
                                     ))}
                                   </TableBody>
                                 </Table>
                                 
                                 <div className="bg-zinc-900 text-white p-6 space-y-2">
                                   <div className="flex justify-between items-center text-[10px] font-bold uppercase text-zinc-400">
                                     <span>Subtotal dos Itens</span>
                                     <span>R$ {(Number(order.total_amount) - (Number(order.delivery_fee) || 0)).toFixed(2)}</span>
                                   </div>
                                   <div className="flex justify-between items-center text-[10px] font-bold uppercase text-zinc-400">
                                     <span>Taxa de Entrega</span>
                                     <span>R$ {parseFloat(order.delivery_fee || 0).toFixed(2)}</span>
                                   </div>
                                   <Separator className="bg-zinc-800 my-2" />
                                   <div className="flex justify-between items-center">
                                     <span className="text-xs font-black uppercase italic tracking-tighter">Total Geral</span>
                                     <span className="text-xl font-black text-green-400">R$ {Number(order.total_amount).toFixed(2)}</span>
                                   </div>
                                 </div>
                               </div>
                             </div>
                             
                             {/* Action Buttons */}
                             <div className="flex gap-3 pb-4">
                               <Button className="flex-1 bg-zinc-900 hover:bg-black font-black uppercase text-[10px] h-12 rounded-2xl shadow-xl shadow-zinc-200">
                                 <Package size={16} className="mr-2" /> Imprimir Cupom
                               </Button>
                               <Button 
                                 className="flex-1 bg-green-600 hover:bg-green-700 font-black uppercase text-[10px] h-12 rounded-2xl shadow-xl shadow-green-100"
                                 onClick={() => {
                                   const message = `Olá *${order.profiles?.full_name}*!\n\nEstamos processando o seu pedido *#${order.id.substring(0, 8)}*.\n\n🚚 Status: *Aprovado*\n💰 Total: *R$ ${Number(order.total_amount).toFixed(2)}*\n\nLogo ele sairá para entrega! 🛒`
                                   sendWhatsAppMessage(order.profiles?.whatsapp || '', message)
                                 }}
                               >
                                 <Phone size={16} className="mr-2" /> Chamar no Whats
                               </Button>
                             </div>
                           </div>
                         </ScrollArea>
                       </DialogContent>
                     </Dialog>
                   </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}