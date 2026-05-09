 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
 import { Badge } from '@/components/ui/badge'
 import { Loader2, Truck, MapPin, DollarSign, Calendar, TrendingUp, BarChart3, Download } from 'lucide-react'
 import { formatCurrency } from '@/lib/whatsapp'
 import { Button } from '@/components/ui/button'
 
 export function DeliveryReport() {
   const [stats, setStats] = useState<any>(null)
   const [loading, setLoading] = useState(true)
   const [recentDeliveries, setRecentDeliveries] = useState<any[]>([])
 
   useEffect(() => {
     fetchDeliveryStats()
   }, [])
 
   const fetchDeliveryStats = async () => {
     setLoading(true)
     try {
       const { data: orders, error } = await supabase
         .from('orders')
         .select('*, profiles(full_name)')
         .order('created_at', { ascending: false })
 
       if (error) throw error
 
       if (orders) {
         const totalDeliveries = orders.length
         const deliveredCount = orders.filter(o => o.status === 'delivered').length
         const pendingCount = orders.filter(o => ['pending', 'approved', 'collecting', 'collected', 'waiting_courier', 'out_for_delivery'].includes(o.status)).length
         const cancelledCount = orders.filter(o => o.status === 'cancelled').length
         
         const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0)
         const totalDeliveryFees = orders.reduce((acc, o) => acc + (Number(o.delivery_fee) || 0), 0)
 
         // Neighborhoods stats
         const neighborhoods: Record<string, number> = {}
         orders.forEach(o => {
           const n = o.delivery_address?.neighborhood || 'Não Informado'
           neighborhoods[n] = (neighborhoods[n] || 0) + 1
         })
 
         const topNeighborhoods = Object.entries(neighborhoods)
           .map(([name, count]) => ({ name, count }))
           .sort((a, b) => b.count - a.count)
           .slice(0, 5)
 
         setStats({
           totalDeliveries,
           deliveredCount,
           pendingCount,
           cancelledCount,
           totalRevenue,
           totalDeliveryFees,
           topNeighborhoods
         })
         setRecentDeliveries(orders.slice(0, 10))
       }
     } catch (e) {
       console.error('Error fetching delivery stats:', e)
     } finally {
       setLoading(false)
     }
   }
 
   if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between mb-4">
         <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">Últimas Entregas</h2>
           <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Resumo de performance logística</p>
         </div>
         <Button variant="outline" className="text-[10px] font-black uppercase h-10 rounded-xl" onClick={() => window.print()}>
           <Download size={16} className="mr-2" /> Exportar / Imprimir
         </Button>
       </div>
 
       {/* Metrics Row */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className="border-0 shadow-sm bg-zinc-900 text-white overflow-hidden">
           <CardContent className="p-6 relative">
             <Truck className="absolute -right-2 -bottom-2 text-white/10" size={80} />
             <p className="text-[10px] font-black uppercase text-zinc-400">Total de Pedidos</p>
             <h3 className="text-3xl font-black mt-1 italic tracking-tighter">{stats?.totalDeliveries}</h3>
             <div className="mt-4 flex gap-2">
               <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[8px] font-black">{stats?.deliveredCount} ENTREGUES</Badge>
             </div>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-sm bg-white overflow-hidden">
           <CardContent className="p-6 relative">
             <TrendingUp className="absolute -right-2 -bottom-2 text-zinc-50" size={80} />
             <p className="text-[10px] font-black uppercase text-zinc-400">Faturamento Total</p>
             <h3 className="text-3xl font-black mt-1 text-zinc-900 italic tracking-tighter">{formatCurrency(stats?.totalRevenue)}</h3>
             <p className="text-[9px] font-bold text-zinc-400 mt-2">VOLUME TOTAL DE VENDAS</p>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-sm bg-white overflow-hidden">
           <CardContent className="p-6 relative">
             <DollarSign className="absolute -right-2 -bottom-2 text-zinc-50" size={80} />
             <p className="text-[10px] font-black uppercase text-zinc-400">Taxas Coletadas</p>
             <h3 className="text-3xl font-black mt-1 text-green-600 italic tracking-tighter">{formatCurrency(stats?.totalDeliveryFees)}</h3>
             <p className="text-[9px] font-bold text-zinc-400 mt-2">TOTAL DE FRETE RECEBIDO</p>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-sm bg-white overflow-hidden">
           <CardContent className="p-6 relative">
             <BarChart3 className="absolute -right-2 -bottom-2 text-zinc-50" size={80} />
             <p className="text-[10px] font-black uppercase text-zinc-400">Pendentes / Em Rota</p>
             <h3 className="text-3xl font-black mt-1 text-amber-500 italic tracking-tighter">{stats?.pendingCount}</h3>
             <p className="text-[9px] font-bold text-zinc-400 mt-2">PEDIDOS AGUARDANDO ENTREGA</p>
           </CardContent>
         </Card>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Neighborhoods table */}
         <Card className="lg:col-span-1 border-0 shadow-xl rounded-3xl overflow-hidden h-full">
           <CardHeader className="bg-zinc-900 text-white">
             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
               <MapPin size={16} /> Entregas por Bairro
             </CardTitle>
           </CardHeader>
           <CardContent className="p-0">
             <Table>
               <TableHeader className="bg-zinc-50">
                 <TableRow>
                   <TableHead className="text-[10px] font-black uppercase">Bairro</TableHead>
                   <TableHead className="text-[10px] font-black uppercase text-right">Qtd</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {stats?.topNeighborhoods.map((n: any, i: number) => (
                   <TableRow key={i}>
                     <TableCell className="text-xs font-bold uppercase">{n.name}</TableCell>
                     <TableCell className="text-right font-black text-sm">{n.count}</TableCell>
                   </TableRow>
                 ))}
                 {stats?.topNeighborhoods.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={2} className="text-center py-8 text-zinc-400 text-xs font-bold uppercase">Nenhum dado</TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
 
         {/* Recent Deliveries */}
         <Card className="lg:col-span-2 border-0 shadow-xl rounded-3xl overflow-hidden">
           <CardHeader className="bg-zinc-900 text-white">
             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
               <Calendar size={16} /> Entregas Recentes
             </CardTitle>
           </CardHeader>
           <CardContent className="p-0">
             <Table>
               <TableHeader className="bg-zinc-50">
                 <TableRow>
                   <TableHead className="text-[10px] font-black uppercase">Data / Cliente</TableHead>
                   <TableHead className="text-[10px] font-black uppercase">Bairro</TableHead>
                   <TableHead className="text-[10px] font-black uppercase">Valor</TableHead>
                   <TableHead className="text-[10px] font-black uppercase text-right">Status</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {recentDeliveries.map((o) => (
                   <TableRow key={o.id}>
                     <TableCell>
                       <p className="text-[11px] font-black uppercase">{o.profiles?.full_name || 'Desconhecido'}</p>
                       <p className="text-[9px] text-zinc-400 font-bold">{new Date(o.created_at).toLocaleString()}</p>
                     </TableCell>
                     <TableCell className="text-[10px] font-bold uppercase">{o.delivery_address?.neighborhood || '-'}</TableCell>
                     <TableCell className="text-[10px] font-black">{formatCurrency(o.total_amount)}</TableCell>
                     <TableCell className="text-right">
                       <Badge className={`text-[8px] font-black uppercase ${
                         o.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                         o.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                         'bg-amber-100 text-amber-700'
                       }`}>
                         {o.status}
                       </Badge>
                     </TableCell>
                   </TableRow>
                 ))}
                 {recentDeliveries.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center py-12 text-zinc-400 text-xs font-bold uppercase">Nenhum pedido encontrado</TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
       </div>
     </div>
   )
 }