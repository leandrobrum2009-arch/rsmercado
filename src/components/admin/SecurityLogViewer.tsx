 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Badge } from '@/components/ui/badge'
 import { Shield, Clock, User, Info, Search, RefreshCcw } from 'lucide-react'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 
 export function SecurityLogViewer() {
   const [logs, setLogs] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [filter, setFilter] = useState('')
 
   const fetchLogs = async () => {
     setLoading(true)
     try {
       const { data, error } = await supabase
         .from('security_logs')
         .select('*')
         .order('created_at', { ascending: false })
         .limit(50)
 
       if (error) throw error
       setLogs(data || [])
     } catch (err) {
       console.error('Error fetching security logs:', err)
     } finally {
       setLoading(false)
     }
   }
 
   useEffect(() => {
     fetchLogs()
   }, [])
 
   const filteredLogs = logs.filter(log => 
     log.event_type.toLowerCase().includes(filter.toLowerCase()) ||
     log.status.toLowerCase().includes(filter.toLowerCase()) ||
     JSON.stringify(log.details).toLowerCase().includes(filter.toLowerCase())
   )
 
   const getStatusBadge = (status: string) => {
     if (status === 'success') return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">SUCESSO</Badge>
     return <Badge variant="destructive">FALHA</Badge>
   }
 
   const getEventTypeLabel = (type: string) => {
     const labels: Record<string, string> = {
       'login_attempt': 'Tentativa de Login',
       'registration_attempt': 'Cadastro',
       'payment_attempt': 'Pagamento/Checkout',
       'profile_update': 'Atualização de Perfil',
       'password_reset_request': 'Reset de Senha',
       'admin_access': 'Acesso Administrativo'
     }
     return labels[type] || type
   }
 
   return (
     <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-900">Logs de Atividade</h2>
           <p className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Monitoramento de segurança e tentativas</p>
         </div>
         <Button onClick={fetchLogs} variant="outline" size="sm" className="h-10 rounded-xl gap-2">
           <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
           Atualizar
         </Button>
       </div>
 
       <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
         <Input 
           placeholder="Filtrar logs por tipo, status ou detalhe..." 
           className="h-12 pl-10 rounded-2xl border-zinc-200"
           value={filter}
           onChange={e => setFilter(e.target.value)}
         />
       </div>
 
       <Card className="border-0 shadow-xl rounded-[32px] overflow-hidden bg-white">
         <CardContent className="p-0">
           <div className="divide-y divide-zinc-50">
             {loading && logs.length === 0 ? (
               <div className="p-12 text-center text-zinc-400 uppercase font-black tracking-widest text-[10px]">
                 Carregando registros de auditoria...
               </div>
             ) : filteredLogs.length === 0 ? (
               <div className="p-12 text-center text-zinc-400 uppercase font-black tracking-widest text-[10px]">
                 Nenhum log encontrado para o filtro aplicado.
               </div>
             ) : (
               filteredLogs.map((log) => (
                 <div key={log.id} className="p-6 hover:bg-zinc-50/50 transition-colors">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex items-start gap-4">
                       <div className={`p-3 rounded-2xl ${log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                         <Shield size={24} />
                       </div>
                       <div className="space-y-1">
                         <div className="flex items-center gap-2">
                           <span className="font-black text-sm uppercase tracking-tight text-zinc-900">{getEventTypeLabel(log.event_type)}</span>
                           {getStatusBadge(log.status)}
                         </div>
                         <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                           <span className="flex items-center gap-1"><Clock size={12} /> {new Date(log.created_at).toLocaleString('pt-BR')}</span>
                           {log.user_id && <span className="flex items-center gap-1"><User size={12} /> Usuário Logado</span>}
                         </div>
                       </div>
                     </div>
                     
                     <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 max-w-md w-full">
                        <p className="text-[9px] font-black uppercase text-zinc-400 mb-1 flex items-center gap-1">
                          <Info size={10} /> Detalhes Técnicos
                        </p>
                        <pre className="text-[10px] font-mono text-zinc-600 whitespace-pre-wrap break-all overflow-hidden max-h-20">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                     </div>
                   </div>
                 </div>
               ))
             )}
           </div>
         </CardContent>
       </Card>
     </div>
   )
 }