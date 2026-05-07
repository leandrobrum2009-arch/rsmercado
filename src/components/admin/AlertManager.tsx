 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Bell, Send, Trash2, AlertCircle, Eye } from 'lucide-react'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
 import { toast } from '@/lib/toast'
 import { Badge } from '@/components/ui/badge'
 
 export function AlertManager() {
   const [alerts, setAlerts] = useState<any[]>([])
    const [message, setMessage] = useState('')
    const [targetUrl, setTargetUrl] = useState('')
   const [type, setType] = useState('info')
   const [loading, setLoading] = useState(false)
   const [isPreviewOpen, setIsPreviewOpen] = useState(false)
 
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
        .insert({ message, type, is_active: true, target_url: targetUrl || null })
      
      if (error) {
        console.error(error)
        toast.error('Erro ao criar alerta. Tente executar o script de reparo.')
      } else {
        toast.success('Alerta enviado em tempo real!')
        setMessage('')
        setTargetUrl('')
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">Mensagem do Alerta</label>
              <Input 
                placeholder="Ex: Estamos abertos hoje até as 22h! 🕒" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">Link de Destino (Opcional)</label>
              <Input 
                placeholder="Ex: /promocoes ou https://..." 
                value={targetUrl} 
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
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
             <div className="mt-auto flex gap-2">
               <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                 <DialogTrigger asChild>
                   <Button 
                     variant="outline"
                     className="font-black uppercase text-[10px] h-10 px-4"
                     disabled={!message}
                   >
                     <Eye className="mr-2 h-4 w-4" /> Preview
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-xl">
                   <DialogHeader>
                     <DialogTitle className="uppercase font-black italic">Preview do Alerta</DialogTitle>
                   </DialogHeader>
                   <div className="py-12 bg-zinc-100 rounded-xl border-2 border-dashed border-zinc-300 flex flex-col items-center gap-6">
                     <div className="w-full px-4">
                       <p className="text-[10px] font-black uppercase text-zinc-500 mb-2 text-center">Como aparecerá no topo da loja:</p>
                       <div className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-500 ${
                         type === 'danger' ? 'bg-red-600 text-white' :
                         type === 'warning' ? 'bg-yellow-400 text-yellow-900' :
                         type === 'success' ? 'bg-green-500 text-white' :
                         'bg-blue-600 text-white'
                       }`}>
                         <AlertCircle className="h-4 w-4 shrink-0" />
                         <span className="text-xs font-black uppercase tracking-wider">{message || 'Sua mensagem de alerta aparecerá aqui!'}</span>
                       </div>
                     </div>
                     
                     <div className="w-48 h-24 bg-white rounded-lg shadow-inner border border-zinc-200 relative overflow-hidden flex flex-col items-center p-2">
                        <div className={`w-full h-2 rounded-t ${
                          type === 'danger' ? 'bg-red-600' :
                          type === 'warning' ? 'bg-yellow-400' :
                          type === 'success' ? 'bg-green-500' :
                          'bg-blue-600'
                        }`} />
                        <div className="w-full flex-1 flex flex-col gap-1 pt-2">
                           <div className="w-full h-1 bg-zinc-100 rounded" />
                           <div className="w-3/4 h-1 bg-zinc-100 rounded" />
                           <div className="w-1/2 h-1 bg-zinc-100 rounded" />
                        </div>
                        <p className="absolute bottom-1 text-[8px] font-bold text-zinc-400">Contexto na Loja</p>
                     </div>
                   </div>
                   <DialogFooter>
                     <Button 
                       onClick={() => {
                         setIsPreviewOpen(false)
                         createAlert()
                       }}
                       className="w-full gap-2 bg-zinc-900 font-black uppercase text-xs"
                       disabled={loading}
                     >
                       <Send className="h-4 w-4" /> {loading ? 'Enviando...' : 'Confirmar e Publicar'}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>

               <Button 
                 onClick={createAlert} 
                 disabled={loading} 
                 className="bg-zinc-900 font-black uppercase text-[10px] h-10 px-6"
               >
                 <Send className="mr-2 h-4 w-4" /> Enviar
               </Button>
             </div>
         </div>
 
         <div className="space-y-3">
           <h4 className="text-[10px] font-black uppercase text-zinc-400">Alertas Recentes</h4>
           {alerts.map(a => (
             <div key={a.id} className="flex items-center justify-between p-3 border rounded-xl bg-zinc-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.is_active ? 'bg-green-500 animate-pulse' : 'bg-zinc-300'}`} />
                  <div>
                    <p className="text-xs font-bold text-zinc-800">{a.message}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <Badge variant="outline" className="text-[8px] uppercase">{a.type}</Badge>
                      {a.target_url && (
                        <span className="text-[8px] font-black text-blue-500 uppercase flex items-center gap-1">
                          <Eye size={8} /> Link: {a.target_url}
                        </span>
                      )}
                    </div>
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