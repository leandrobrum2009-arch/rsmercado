 import { useState } from 'react'
 import { supabase } from '@/lib/supabase'
 import { MessageSquare, Star, Send, Loader2 } from 'lucide-react'
 import { Button } from '@/components/ui/button'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
 import { toast } from '@/lib/toast'
 import { Textarea } from '@/components/ui/textarea'
 
 export function FeedbackButton() {
   const [isOpen, setIsOpen] = useState(false)
   const [rating, setRating] = useState(0)
   const [comment, setComment] = useState('')
   const [loading, setLoading] = useState(false)
 
   const handleSubmit = async () => {
     if (rating === 0 && !comment) {
       toast.error('Por favor, dê uma nota ou escreva um comentário.')
       return
     }
 
     setLoading(true)
     const { data: { user } } = await supabase.auth.getUser()
     
     const { error } = await supabase
       .from('app_feedback')
       .insert({
         user_id: user?.id || null,
         rating,
         comment,
         page_url: window.location.pathname
       })
 
     if (error) {
       toast.error('Erro ao enviar feedback.')
     } else {
       toast.success('Feedback enviado com sucesso! Obrigado.')
       setIsOpen(false)
       setRating(0)
       setComment('')
     }
     setLoading(false)
   }
 
   return (
     <Dialog open={isOpen} onOpenChange={setIsOpen}>
       <DialogTrigger asChild>
         <button className="fixed bottom-20 right-4 z-40 bg-zinc-900 text-white p-3.5 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all md:bottom-6 group overflow-hidden border-2 border-white/20">
            <div className="absolute inset-0 bg-primary/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            <div className="absolute -top-1 -right-1 flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </div>
            <div className="absolute inset-0 bg-primary/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            <MessageSquare size={20} className="relative z-10" />
         </button>
       </DialogTrigger>
       <DialogContent className="max-w-[90vw] md:max-w-md rounded-3xl border-0 shadow-2xl p-6">
         <DialogHeader>
           <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
             <Star className="text-primary fill-primary" /> O que você achou?
           </DialogTitle>
           <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Seu feedback nos ajuda a melhorar!</p>
         </DialogHeader>
 
         <div className="py-6 space-y-6">
           <div className="flex flex-col items-center gap-3">
             <p className="text-[10px] font-black uppercase text-zinc-500">Dê uma nota</p>
             <div className="flex gap-2">
               {[1, 2, 3, 4, 5].map((s) => (
                 <button
                   key={s}
                   onClick={() => setRating(s)}
                   className={`p-1.5 transition-all ${rating >= s ? 'text-amber-400 scale-110' : 'text-zinc-200'}`}
                 >
                   <Star size={32} className={rating >= s ? 'fill-amber-400' : ''} />
                 </button>
               ))}
             </div>
           </div>
 
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-zinc-500">Seu Comentário</label>
             <Textarea 
               placeholder="Diga o que você mais gostou ou o que podemos melhorar..."
               value={comment}
               onChange={(e) => setComment(e.target.value)}
               className="min-h-[120px] rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white resize-none font-medium"
             />
           </div>
         </div>
 
         <DialogFooter>
           <Button 
             onClick={handleSubmit}
             disabled={loading}
             className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-zinc-900 hover:bg-black transition-all"
           >
             {loading ? <Loader2 className="animate-spin" /> : <Send className="mr-2" size={18} />}
             ENVIAR FEEDBACK
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   )
 }