import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShoppingBag, ExternalLink } from 'lucide-react'
import { toast } from '@/lib/toast'
import { formatCurrency, sendWhatsAppMessage } from '@/lib/whatsapp'

export function OrderManagement() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
                  <TableCell>
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