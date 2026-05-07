 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { MessageSquare, Star, Trash2, Calendar, Link as LinkIcon } from 'lucide-react'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Badge } from '@/components/ui/badge'
 import { formatDistanceToNow } from 'date-fns'
 import { ptBR } from 'date-fns/locale'
 
 export function FeedbackManager() {
   const [feedbacks, setFeedbacks] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
 
   useEffect(() => {
     fetchFeedback()
   }, [])
 
   const fetchFeedback = async () => {
     const { data, error } = await supabase
       .from('app_feedback')
       .select('*')
       .order('created_at', { ascending: false })
     
     if (!error) setFeedbacks(data || [])
     setLoading(false)
   }
 
   const deleteFeedback = async (id: string) => {
     const { error } = await supabase.from('app_feedback').delete().eq('id', id)
     if (!error) fetchFeedback()
   }
 
   return (
     <Card>
       <CardHeader className="bg-zinc-900 text-white rounded-t-xl">
         <div className="flex items-center gap-2">
           <MessageSquare className="h-5 w-5 text-primary" />
           <div>
             <CardTitle className="text-xl font-black italic uppercase">Feedback dos Usuários</CardTitle>
             <CardDescription className="text-zinc-400 text-xs font-bold uppercase">
               Veja o que seus clientes estão achando do sistema
             </CardDescription>
           </div>
         </div>
       </CardHeader>
       <CardContent className="p-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {feedbacks.length === 0 ? (
             <div className="col-span-full py-12 text-center text-zinc-400 font-bold uppercase text-[10px]">
               Nenhum feedback recebido ainda.
             </div>
           ) : (
             feedbacks.map((f) => (
               <div key={f.id} className="bg-zinc-50 border rounded-2xl p-4 space-y-3 relative group">
                 <div className="flex justify-between items-start">
                   <div className="flex gap-0.5">
                     {[1, 2, 3, 4, 5].map((s) => (
                       <Star key={s} size={14} className={f.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'} />
                     ))}
                   </div>
                   <button 
                     onClick={() => deleteFeedback(f.id)}
                     className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
                 
                 <p className="text-sm font-medium text-zinc-800 leading-relaxed italic">
                   "{f.comment || 'Sem comentário.'}"
                 </p>
 
                 <div className="pt-3 border-t flex flex-wrap gap-3 items-center text-[9px] font-black uppercase text-zinc-400">
                   <div className="flex items-center gap-1">
                     <Calendar size={12} />
                     {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: ptBR })}
                   </div>
                   <div className="flex items-center gap-1">
                     <LinkIcon size={12} />
                     {f.page_url}
                   </div>
                 </div>
               </div>
             ))
           )}
         </div>
       </CardContent>
     </Card>
   )
 }