 import { useState } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Bell, Send, Users, User } from 'lucide-react'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Textarea } from '@/components/ui/textarea'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { toast } from '@/lib/toast'
 
 export function NotificationManager() {
   const [target, setTarget] = useState<'all' | 'specific'>('all')
   const [userId, setUserId] = useState('')
   const [title, setTitle] = useState('')
   const [message, setMessage] = useState('')
   const [type, setType] = useState('promo')
   const [loading, setLoading] = useState(false)
 
   const sendNotification = async () => {
     if (!title || !message) {
       toast.error('Preencha o título e a mensagem')
       return
     }
 
     setLoading(true)
     try {
       if (target === 'all') {
         // Call the postgres function we created earlier
         const { error } = await supabase.rpc('notify_all_users', {
           title,
           message,
           type
         })
         
         if (error) throw error
         toast.success('Notificação enviada para todos os usuários!')
       } else {
         if (!userId) {
           toast.error('Selecione um usuário')
           setLoading(false)
           return
         }
 
         const { error } = await supabase
           .from('notifications')
           .insert({
             user_id: userId,
             title,
             message,
             type
           })
 
         if (error) throw error
         toast.success('Notificação enviada para o usuário!')
       }
 
       setTitle('')
       setMessage('')
     } catch (error: any) {
       console.error('Error sending notification:', error)
       toast.error('Erro ao enviar: ' + error.message)
     } finally {
       setLoading(false)
     }
   }
 
   return (
     <Card>
       <CardHeader className="bg-zinc-900 text-white rounded-t-xl">
         <div className="flex items-center gap-2">
           <Bell className="h-5 w-5 text-primary" />
           <div>
             <CardTitle className="text-xl font-black italic uppercase">Gestor de Notificações</CardTitle>
             <CardDescription className="text-zinc-400 text-xs font-bold uppercase">
               Envie mensagens push e avisos para seus clientes
             </CardDescription>
           </div>
         </div>
       </CardHeader>
       <CardContent className="p-6 space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
             <div>
               <label className="text-xs font-black uppercase text-zinc-500 mb-2 block">Destinatário</label>
               <div className="flex gap-2">
                 <Button 
                   variant={target === 'all' ? 'default' : 'outline'} 
                   className="flex-1 gap-2 uppercase font-black text-xs"
                   onClick={() => setTarget('all')}
                 >
                   <Users className="h-4 w-4" /> Todos
                 </Button>
                 <Button 
                   variant={target === 'specific' ? 'default' : 'outline'} 
                   className="flex-1 gap-2 uppercase font-black text-xs"
                   onClick={() => setTarget('specific')}
                 >
                   <User className="h-4 w-4" /> Específico
                 </Button>
               </div>
             </div>
 
             {target === 'specific' && (
               <div>
                 <label className="text-xs font-black uppercase text-zinc-500 mb-2 block">ID do Usuário</label>
                 <Input 
                   placeholder="UUID do usuário" 
                   value={userId}
                   onChange={(e) => setUserId(e.target.value)}
                   className="font-mono text-xs"
                 />
               </div>
             )}
 
             <div>
               <label className="text-xs font-black uppercase text-zinc-500 mb-2 block">Tipo de Mensagem</label>
               <Select value={type} onValueChange={setType}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione o tipo" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="promo">Promoção / Encarte</SelectItem>
                   <SelectItem value="loyalty">Fidelidade / Pontos</SelectItem>
                   <SelectItem value="order_status">Status de Pedido</SelectItem>
                   <SelectItem value="admin_msg">Aviso Geral</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
 
           <div className="space-y-4">
             <div>
               <label className="text-xs font-black uppercase text-zinc-500 mb-2 block">Título da Notificação</label>
               <Input 
                 placeholder="Ex: Ofertas do dia! 🍳" 
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 className="font-bold"
               />
             </div>
 
             <div>
               <label className="text-xs font-black uppercase text-zinc-500 mb-2 block">Mensagem</label>
               <Textarea 
                 placeholder="Conteúdo da notificação..." 
                 value={message}
                 onChange={(e) => setMessage(e.target.value)}
                 rows={4}
               />
             </div>
 
             <Button 
               onClick={sendNotification} 
               disabled={loading}
               className="w-full gap-2 uppercase font-black italic shadow-lg shadow-primary/20"
             >
               <Send className="h-4 w-4" /> {loading ? 'Enviando...' : 'Enviar Agora'}
             </Button>
           </div>
         </div>
 
         <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 mt-4">
           <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Dicas de Uso</h4>
           <ul className="text-xs text-zinc-600 space-y-1">
             <li>• Use emojis para aumentar a taxa de visualização.</li>
             <li>• Seja breve e direto ao ponto.</li>
             <li>• Notificações de status de pedido são automáticas pelo sistema.</li>
             <li>• Use "Todos" apenas para promoções realmente relevantes.</li>
           </ul>
         </div>
       </CardContent>
     </Card>
   )
 }