 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { toast } from '@/lib/toast'
 import { 
   TrendingUp, 
   Users, 
   ShoppingBag, 
   Clock, 
   ArrowUpRight, 
   ArrowDownRight, 
   BarChart3, 
   PieChart as PieChartIcon, 
   Package, 
   Calendar,
   Filter,
   Bell,
   Download
 } from 'lucide-react'
   const exportReport = async () => {
     try {
       const { data: orders, error } = await supabase
         .from('orders')
         .select('id, created_at, total_amount, status, payment_method, profiles(full_name)')
         .order('created_at', { ascending: false });
 
       if (error) throw error;
 
       const csvContent = [
         ['ID do Pedido', 'Data', 'Cliente', 'Total', 'Status', 'Metodo de Pagamento'].join(','),
         ...(orders || []).map((o: any) => [
           o.id.substring(0, 8),
           new Date(o.created_at).toLocaleDateString('pt-BR'),
           o.profiles?.full_name || 'Desconhecido',
           o.total_amount,
           o.status,
           o.payment_method
         ].join(','))
       ].join('\n');
 
       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.setAttribute('href', url);
       link.setAttribute('download', `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
       link.style.visibility = 'hidden';
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       toast.success('Relatório exportado com sucesso!');
     } catch (err) {
       console.error('Error exporting report:', err);
       toast.error('Erro ao exportar relatório');
     }
   };
 
 import { 
   BarChart, 
   Bar, 
   XAxis, 
   YAxis, 
   CartesianGrid, 
   Tooltip, 
   ResponsiveContainer, 
   LineChart, 
   Line, 
   PieChart, 
   Pie, 
   Cell 
 } from 'recharts'
 import { Button } from '@/components/ui/button'
 import { Badge } from '@/components/ui/badge'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 
 export function AdminDashboard() {
   const [stats, setStats] = useState<any>({
     revenue_today: 0,
     revenue_week: 0,
     revenue_month: 0,
     orders_count: 0,
     customers_count: 0,
     revenue_change: 12.5,
     orders_change: -2.4
   })
   const [topProducts, setTopProducts] = useState<any[]>([])
   const [peakHours, setPeakHours] = useState<any[]>([])
    const [demographics, setDemographics] = useState<any[]>([])
    const [relationshipStats, setRelationshipStats] = useState<any[]>([])
    const [neighborhoodStats, setNeighborhoodStats] = useState<any[]>([])
    const [neighborhoodProductStats, setNeighborhoodProductStats] = useState<any[]>([])
    const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('month')

    useEffect(() => {
     fetchDashboardData()
   }, [timeRange])
 
   const fetchDashboardData = async () => {
     setLoading(true)
     try {
       // 1. Get stats from orders
       const now = new Date()
       const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
       const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
       const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString()
 
         const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount, created_at, status, delivery_address, delivery_neighborhood_id')
          .neq('status', 'cancelled')

        if (ordersError) {
          console.error('Error fetching orders for dashboard:', ordersError)
        }
  
        if (orders && Array.isArray(orders)) {
          // Neighborhood stats
          const neighborhoodCounts: Record<string, number> = {}

          orders.forEach(o => {
            const neighborhood = (o.delivery_address as any)?.neighborhood || 'Não informado'
            neighborhoodCounts[neighborhood] = (neighborhoodCounts[neighborhood] || 0) + 1
          })

          const nStats = Object.entries(neighborhoodCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)

          setNeighborhoodStats(nStats)
         const revenueToday = orders.filter(o => o.created_at >= today).reduce((acc, o) => acc + Number(o.total_amount), 0)
         const revenueWeek = orders.filter(o => o.created_at >= lastWeek).reduce((acc, o) => acc + Number(o.total_amount), 0)
         const revenueMonth = orders.filter(o => o.created_at >= lastMonth).reduce((acc, o) => acc + Number(o.total_amount), 0)
         
         setStats({
           revenue_today: revenueToday,
           revenue_week: revenueWeek,
           revenue_month: revenueMonth,
           orders_count: orders.length,
           revenue_change: 8.2, // Mocked change
           orders_change: 3.5 // Mocked change
         })
       }
 
       // 2. Get top products
        const { data: productsData, error: productsError } = await supabase
          .from('order_items')
          .select('quantity, unit_price, products(name), orders(delivery_address)')

       if (productsError) {
         console.error('Error fetching products data for dashboard:', productsError)
       }
       
       if (productsData && Array.isArray(productsData)) {
         const grouped = productsData.reduce((acc: any, item: any) => {
            const name = (item.products as any)?.name || 'Desconhecido'
           if (!acc[name]) acc[name] = 0
           acc[name] += item.quantity
           return acc
         }, {})
         
         const top = Object.entries(grouped)
           .map(([name, sales]) => ({ name, sales }))
           .sort((a: any, b: any) => b.sales - a.sales)
           .slice(0, 5)
         
         setTopProducts(top)
          
          // Top products by neighborhood
          const neighborhoodProdMap: Record<string, Record<string, number>> = {}
          productsData.forEach((item: any) => {
             const neighborhood = (item.orders as any)?.delivery_address?.neighborhood || 'Não informado'
             const prodName = (item.products as any)?.name || 'Desconhecido'
            
            if (!neighborhoodProdMap[neighborhood]) neighborhoodProdMap[neighborhood] = {}
            neighborhoodProdMap[neighborhood][prodName] = (neighborhoodProdMap[neighborhood][prodName] || 0) + item.quantity
          })

          const npStats = Object.entries(neighborhoodProdMap).map(([neighborhood, products]) => {
            const topProduct = Object.entries(products)
              .sort((a, b) => b[1] - a[1])[0]
            return {
              neighborhood,
              product: topProduct ? topProduct[0] : 'N/A',
              sales: topProduct ? topProduct[1] : 0
            }
          }).sort((a, b) => b.sales - a.sales).slice(0, 5)

          setNeighborhoodProductStats(npStats)
       }
 
       // 3. Peak hours from site_visits (or mock if empty)
       const { data: visits } = await supabase
         .from('site_visits')
         .select('created_at')
       
       if (visits && visits.length > 0) {
         const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, visits: 0 }))
         visits.forEach(v => {
           const hour = new Date(v.created_at).getHours()
           hours[hour].visits++
         })
         setPeakHours(hours)
       } else {
         // Mock data for display
         setPeakHours([
           { hour: '08:00', visits: 120 },
           { hour: '10:00', visits: 340 },
           { hour: '12:00', visits: 560 },
           { hour: '14:00', visits: 420 },
           { hour: '16:00', visits: 680 },
           { hour: '18:00', visits: 890 },
           { hour: '20:00', visits: 720 },
           { hour: '22:00', visits: 250 }
         ])
       }
 
        // 4. Demographics from profiles
         const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('gender, household_status')

         if (profilesError) {
           console.error('Error fetching profiles for dashboard:', profilesError)
         }
         
         if (profiles && Array.isArray(profiles)) {
          const genderCounts = profiles.reduce((acc: any, p: any) => {
            const g = p.gender === 'man' ? 'Homens' : p.gender === 'woman' ? 'Mulheres' : 'Outros/Não inf.'
            acc[g] = (acc[g] || 0) + 1
            return acc
          }, {})
  
          const demoData = Object.entries(genderCounts).map(([name, value]) => ({ name, value }))
          setDemographics(demoData.length > 0 ? demoData : [
            { name: 'Homens', value: 45 },
            { name: 'Mulheres', value: 55 }
          ])

          const householdCounts = profiles.reduce((acc: any, p: any) => {
            const s = p.household_status === 'alone' ? 'Solteiro' : 
                      (p.household_status === 'couple' || p.household_status === 'family') ? 'Casal/Família' : 'Não informado'
            acc[s] = (acc[s] || 0) + 1
            return acc
          }, {})

          const householdData = Object.entries(householdCounts).map(([name, value]) => ({ name, value }))
          setRelationshipStats(householdData)
        }
 
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
        setStats((prev: any) => ({ ...prev, customers_count: count || 0 }))
 
        // 5. Get low stock products
        const { data: lowStock, error: stockError } = await supabase
          .from('products')
          .select('name, stock')
          .lt('stock', 5)
          .order('stock', { ascending: true })
          .limit(3)

         setLowStockProducts(lowStock || [])
 
         if (lowStock && lowStock.length > 0) {
           toast.warning(`Atenção: ${lowStock.length} produtos estão com estoque baixo!`, {
             description: 'Verifique os detalhes no painel de insights.'
           })
         }
  
      } catch (err) {
       console.error('Error fetching dashboard data:', err)
     } finally {
       setLoading(false)
     }
   }
 
   const COLORS = ['#16a34a', '#facc15', '#f87171', '#60a5fa', '#a78bfa']
 
   return (
     <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-900">Dashboard Geral</h2>
           <p className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Resumo de operações e audiência</p>
         </div>
         <div className="flex gap-2">
           <Select value={timeRange} onValueChange={setTimeRange}>
             <SelectTrigger className="w-36 h-10 border-zinc-200 bg-white font-bold uppercase text-[10px]">
               <Calendar className="mr-2 h-3 w-3" />
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="today">Hoje</SelectItem>
               <SelectItem value="week">Esta Semana</SelectItem>
               <SelectItem value="month">Este Mês</SelectItem>
             </SelectContent>
           </Select>
           <Button variant="outline" className="h-10 border-zinc-200 bg-white gap-2 font-bold uppercase text-[10px]" onClick={exportReport}>
             <Download className="h-4 w-4" /> Exportar
           </Button>
           <Button variant="outline" className="h-10 border-zinc-200 bg-white" onClick={fetchDashboardData}>
             <Filter className="h-4 w-4" />
           </Button>
         </div>
       </div>
 
       {/* Top Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
           <CardContent className="p-6">
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-green-50 rounded-2xl text-green-600">
                 <TrendingUp size={24} />
               </div>
               <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${stats.revenue_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                 {stats.revenue_change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                 {Math.abs(stats.revenue_change)}%
               </div>
             </div>
             <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Vendas {timeRange === 'today' ? 'Hoje' : timeRange === 'week' ? 'Semana' : 'Mês'}</p>
             <h3 className="text-2xl font-black text-zinc-900">R$ {stats.revenue_month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
           <CardContent className="p-6">
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-zinc-900 rounded-2xl text-white">
                 <ShoppingBag size={24} />
               </div>
               <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${stats.orders_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                 {stats.orders_change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                 {Math.abs(stats.orders_change)}%
               </div>
             </div>
             <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Total de Pedidos</p>
             <h3 className="text-2xl font-black text-zinc-900">{stats.orders_count}</h3>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
           <CardContent className="p-6">
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                 <Users size={24} />
               </div>
             </div>
             <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Base de Clientes</p>
             <h3 className="text-2xl font-black text-zinc-900">{stats.customers_count}</h3>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-green-600 text-white">
           <CardContent className="p-6">
             <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-white/20 rounded-2xl text-white backdrop-blur-sm">
                 <Bell size={24} />
               </div>
               <Badge className="bg-white/20 text-white border-0 text-[8px] uppercase">Novo Encarte</Badge>
             </div>
             <p className="text-[10px] font-black uppercase text-white/70 tracking-widest mb-1">Ações Ativas</p>
             <h3 className="text-lg font-black leading-tight">Encarte de Fim de Semana Publicado!</h3>
           </CardContent>
         </Card>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Peak Hours Chart */}
         <Card className="lg:col-span-2 border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
           <CardHeader className="border-b border-zinc-50 pb-4">
             <div className="flex justify-between items-center">
               <div>
                 <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                   <Clock className="text-primary" size={16} /> Horários de Pico
                 </CardTitle>
                 <CardDescription className="text-[10px] font-bold uppercase text-zinc-400">Fluxo de acessos por hora do dia</CardDescription>
               </div>
               <div className="flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-primary" />
                 <span className="text-[8px] font-black uppercase text-zinc-400">Acessos</span>
               </div>
             </div>
           </CardHeader>
           <CardContent className="p-6">
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={peakHours}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                   <XAxis 
                     dataKey="hour" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fontSize: 10, fontWeight: 700, fill: '#a1a1aa'}}
                   />
                   <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fontSize: 10, fontWeight: 700, fill: '#a1a1aa'}}
                   />
                   <Tooltip 
                     contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                   />
                   <Line 
                     type="monotone" 
                     dataKey="visits" 
                     stroke="#16a34a" 
                     strokeWidth={4} 
                     dot={false}
                     activeDot={{ r: 8, strokeWidth: 0 }}
                   />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
 
         {/* Demographics */}
         <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
           <CardHeader className="border-b border-zinc-50 pb-4">
             <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
               <Users className="text-amber-500" size={16} /> Perfil do Público
             </CardTitle>
             <CardDescription className="text-[10px] font-bold uppercase text-zinc-400">Distribuição por gênero/tipo</CardDescription>
           </CardHeader>
           <CardContent className="p-6">
             <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={demographics}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {demographics.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip 
                     contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                   />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="mt-4 space-y-2">
               {demographics.map((d, i) => (
                 <div key={d.name} className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                     <span className="text-[10px] font-black uppercase text-zinc-600">{d.name}</span>
                   </div>
                   <span className="text-[10px] font-black text-zinc-900">{d.value}%</span>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       </div>
 
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Neighborhoods Report */}
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-zinc-50 pb-4">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <BarChart3 className="text-blue-500" size={16} /> Pedidos por Bairro
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase text-zinc-400">Distribuição geográfica de vendas</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={neighborhoodStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={100}
                      tick={{fontSize: 10, fontWeight: 700, fill: '#71717a'}}
                    />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Products by Neighborhood */}
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-zinc-50 pb-4">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Package className="text-purple-500" size={16} /> Destaques por Bairro
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase text-zinc-400">O produto mais pedido em cada local</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-50">
                {neighborhoodProductStats.length === 0 ? (
                  <div className="p-12 text-center text-zinc-400 font-bold uppercase text-[10px]">Aguardando dados geográficos</div>
                ) : (
                  neighborhoodProductStats.map((item, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-[10px] font-black text-zinc-500">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-zinc-900 leading-tight">{item.neighborhood}</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.product}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-purple-50 text-purple-600 border-0 text-[10px] font-black uppercase px-2 py-0.5">
                        {item.sales} und
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Household status demographics */}
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-zinc-50 pb-4">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Users className="text-rose-500" size={16} /> Perfil Familiar
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase text-zinc-400">Composição do público (Casal vs Solteiro)</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={relationshipStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {relationshipStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#f43f5e', '#fbbf24', '#94a3b8'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {relationshipStats.map((d, i) => (
                  <div key={d.name} className="flex justify-between items-center p-2 rounded-xl bg-zinc-50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#f43f5e', '#fbbf24', '#94a3b8'][i % 3] }} />
                      <span className="text-[10px] font-black uppercase text-zinc-600">{d.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-zinc-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Keep the original gender demographics but styled similarly */}
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-zinc-50 pb-4">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Users className="text-amber-500" size={16} /> Perfil por Gênero
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase text-zinc-400">Distribuição entre Homens e Mulheres</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={demographics}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {demographics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {demographics.map((d, i) => (
                  <div key={d.name} className="flex justify-between items-center p-2 rounded-xl bg-zinc-50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-black uppercase text-zinc-600">{d.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-zinc-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
         {/* Top Selling Products */}
         <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
           <CardHeader className="border-b border-zinc-50 pb-4">
             <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
               <Package className="text-indigo-500" size={16} /> Mais Vendidos
             </CardTitle>
             <CardDescription className="text-[10px] font-bold uppercase text-zinc-400">Produtos destaque do período</CardDescription>
           </CardHeader>
           <CardContent className="p-0">
             <div className="divide-y divide-zinc-50">
               {topProducts.length === 0 ? (
                 <div className="p-12 text-center text-zinc-400 font-bold uppercase text-[10px]">Sem dados de venda no período</div>
               ) : (
                 topProducts.map((p, i) => (
                   <div key={p.name} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                     <div className="flex items-center gap-4">
                       <span className="text-xl font-black italic text-zinc-200">#{i + 1}</span>
                       <div>
                         <p className="font-black uppercase text-xs text-zinc-800">{p.name}</p>
                         <p className="text-[10px] text-zinc-400 font-bold uppercase">{p.sales} Unidades vendidas</p>
                       </div>
                     </div>
                     <Badge className="bg-indigo-50 text-indigo-600 border-0 font-black text-[9px] uppercase">Top Seller</Badge>
                   </div>
                 ))
               )}
             </div>
           </CardContent>
         </Card>
 
         {/* Quick Actions / Alerts */}
         <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
           <CardHeader className="border-b border-zinc-50 pb-4">
             <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
               <BarChart3 className="text-primary" size={16} /> Insights de Negócio
             </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-4">
             <div className="p-4 bg-zinc-900 rounded-3xl text-white relative overflow-hidden group cursor-pointer">
               <div className="absolute -right-4 -bottom-4 bg-white/10 w-24 h-24 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
               <h4 className="font-black uppercase italic tracking-tighter text-lg mb-1">Pico de Acesso: Sábado 18h</h4>
               <p className="text-xs text-zinc-400 font-medium">Prepare sua logística de entrega para o período de maior demanda.</p>
             </div>
             <div className="p-4 bg-zinc-50 rounded-3xl border border-zinc-100 relative overflow-hidden group cursor-pointer">
               <h4 className="font-black uppercase italic tracking-tighter text-lg mb-1 text-zinc-800">Público Feminino (55%)</h4>
               <p className="text-xs text-zinc-500 font-medium">Campanhas focadas em Hortifruti e Limpeza performam melhor.</p>
             </div>
             {lowStockProducts.length > 0 ? (
               <div className="p-4 bg-amber-50 rounded-3xl border border-amber-100 relative overflow-hidden group cursor-pointer" onClick={() => window.location.hash = '#products'}>
                 <h4 className="font-black uppercase italic tracking-tighter text-lg mb-1 text-amber-900">
                   {lowStockProducts.length} {lowStockProducts.length === 1 ? 'Item com' : 'Itens com'} Baixo Estoque
                 </h4>
                 <p className="text-xs text-amber-700 font-medium">
                   {lowStockProducts.map(p => `${p.name} (${p.stock} un)`).join(', ')}... Reponha agora!
                 </p>
               </div>
             ) : (
               <div className="p-4 bg-green-50 rounded-3xl border border-green-100 relative overflow-hidden group cursor-pointer">
                 <h4 className="font-black uppercase italic tracking-tighter text-lg mb-1 text-green-900">Estoque em Dia</h4>
                 <p className="text-xs text-green-700 font-medium">Todos os seus principais produtos estão com bons níveis de estoque.</p>
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     </div>
   )
 }