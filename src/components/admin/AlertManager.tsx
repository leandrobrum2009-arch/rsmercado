 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Bell, Send, Trash2, AlertCircle } from 'lucide-react'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { toast } from '@/lib/toast'
 import { Badge } from '@/components/ui/badge'
 
 export function AlertManager() {
   const [alerts, setAlerts] = useState<any[]>([])
   const [message, setMessage] = useState('')
   const [type, setType] = useState('info')
   const [loading, setLoading] = useState(false)
 
   useEffect(() => {
     fetchAlerts()
   }, [])
 
   const fetchAlerts = async () => {
     const { data } = await supabase
       .from('store_alerts')
       .select('*')
       .order('created_at', { ascending: false })
     setAlerts(data || [])
   }
 
   const createAlert = async () => {
     if (!message) return
     setLoading(true)
     const { error } = await supabase
       .from('store_alerts')
       .insert({ message, type, is_active: true })
     
     if (error) toast.error('Erro ao criar alerta')
     else {
       toast.success('Alerta enviado em tempo real!')
       setMessage('')
       fetchAlerts()
     }
     setLoading(false)
   }
 
   const toggleAlert = async (id: string, current: boolean) => {
     const { error } = await supabase
       .from('store_alerts')
       .update({ is_active: !current })
       .eq('id', id)
     if (!error) fetchAlerts()
   }
 
   const deleteAlert = async (id: string) => {
     const { error } = await supabase.from('store_alerts').delete().eq('id', id)
     if (!error) fetchAlerts()
   }
 
   return (
     <Card>
       <CardHeader className="bg-red-600 text-white rounded-t-xl">
         <div className="flex items-center gap-2">
           <AlertCircle className="h-5 w-5" />
           <div>
             <CardTitle className="text-xl font-black italic uppercase">Alertas em Tempo Real</CardTitle>
             <CardDescription className="text-red-100 text-xs font-bold uppercase">
               Envie uma faixa de aviso imediata para todos os usuários
             </CardDescription>
           </div>
         </div>
       </CardHeader>
       <CardContent className="p-6 space-y-6">
         <div className="flex flex-col md:flex-row gap-4">
           <div className="flex-1 space-y-2">
             <label className="text-[10px] font-black uppercase text-zinc-500">Mensagem do Alerta</label>
             <Input 
               placeholder="Ex: Estamos abertos hoje até as 22h! 🕒" 
               value={message} 
               onChange={(e) => setMessage(e.target.value)}
             />
           </div>
           <div className="w-full md:w-40 space-y-2">
             <label className="text-[10px] font-black uppercase text-zinc-500">Estilo</label>
             <Select value={type} onValueChange={setType}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="info">Azul (Info)</SelectItem>
                 <SelectItem value="warning">Amarelo (Aviso)</SelectItem>
                 <SelectItem value="danger">Vermelho (Urgente)</SelectItem>
                 <SelectItem value="success">Verde (Sucesso)</SelectItem>
               </SelectContent>
             </Select>
           </div>
           <Button 
             onClick={createAlert} 
             disabled={loading} 
             className="mt-auto bg-zinc-900 font-black uppercase text-[10px] h-10 px-6"
           >
             <Send className="mr-2 h-4 w-4" /> Enviar
           </Button>
         </div>
 
         <div className="space-y-3">
           <h4 className="text-[10px] font-black uppercase text-zinc-400">Alertas Recentes</h4>
           {alerts.map(a => (
             <div key={a.id} className="flex items-center justify-between p-3 border rounded-xl bg-zinc-50">
               <div className="flex items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${a.is_active ? 'bg-green-500 animate-pulse' : 'bg-zinc-300'}`} />
                 <div>
                   <p className="text-xs font-bold text-zinc-800">{a.message}</p>
                   <Badge variant="outline" className="text-[8px] uppercase mt-1">{a.type}</Badge>
                 </div>
               </div>
               <div className="flex gap-2">
                 <Button variant="ghost" size="icon" onClick={() => toggleAlert(a.id, a.is_active)} className="text-zinc-400 hover:text-zinc-900">
                   {a.is_active ? 'Pausar' : 'Ativar'}
                 </Button>
                 <Button variant="ghost" size="icon" onClick={() => deleteAlert(a.id)} className="text-zinc-300 hover:text-red-500">
                   <Trash2 size={16} />
                 </Button>
               </div>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
   )
 }