import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag, Truck, CheckCircle, Clock, Package, MapPin, ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function OrderTracking({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) fetchOrders()
  }, [userId])

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    setOrders(data || [])
    setLoading(false)
  }

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string, icon: any, color: string }> = {
      pending: { label: 'Pendente', icon: Clock, color: 'text-zinc-400' },
      approved: { label: 'Aprovado', icon: CheckCircle, color: 'text-green-500' },
      collecting: { label: 'Em Coleta', icon: ShoppingBag, color: 'text-amber-500' },
      collected: { label: 'Coletado', icon: Package, color: 'text-blue-500' },
      waiting_courier: { label: 'Aguardando Entregador', icon: MapPin, color: 'text-purple-500' },
      out_for_delivery: { label: 'Saiu para Entrega', icon: Truck, color: 'text-indigo-500' },
      delivered: { label: 'Entregue', icon: CheckCircle, color: 'text-green-600' },
      cancelled: { label: 'Cancelado', icon: Package, color: 'text-red-500' }
    }
    return map[status] || map.pending
  }

  if (loading) return null

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Acompanhamento de Pedidos</h3>
      {orders.length === 0 ? (
        <Card className="border-2 border-dashed border-zinc-100 shadow-none">
          <CardContent className="py-10 text-center">
            <ShoppingBag className="w-8 h-8 mx-auto text-zinc-200 mb-2" />
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Você ainda não fez nenhum pedido.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const info = getStatusInfo(order.status)
            return (
              <Card key={order.id} className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white group hover:shadow-xl transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-zinc-50 ${info.color}`}>
                      <info.icon size={20} />
                    </div>
                    <div>
                      <p className="font-black text-[10px] uppercase text-zinc-400">Pedido #{order.id.substring(0, 8)}</p>
                      <p className="font-black uppercase text-xs text-zinc-900">{info.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-black text-xs text-green-600">R$ {parseFloat(order.total_amount).toFixed(2)}</p>
                      <p className="text-[9px] font-bold text-zinc-300 uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <Link 
                      to="/track/$orderId" 
                      params={{ orderId: order.id }}
                      className="p-2 bg-zinc-100 rounded-xl text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all shadow-inner"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </CardContent>
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                   <div className="bg-zinc-50 px-4 py-2 border-t flex items-center gap-2">
                     <div className="h-1.5 flex-1 bg-zinc-200 rounded-full overflow-hidden">
                       <div 
                        className={`h-full bg-green-500 transition-all duration-1000 ${
                          order.status === 'pending' ? 'w-[10%]' :
                          order.status === 'approved' ? 'w-[30%]' :
                          order.status === 'collecting' ? 'w-[50%]' :
                          order.status === 'collected' ? 'w-[70%]' :
                          order.status === 'waiting_courier' ? 'w-[85%]' :
                          'w-[95%]'
                        }`} 
                       />
                     </div>
                     <span className="text-[9px] font-black uppercase text-zinc-400 animate-pulse">A caminho...</span>
                   </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
