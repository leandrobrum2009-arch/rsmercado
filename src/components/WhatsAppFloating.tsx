 import { useState, useEffect } from 'react'
 import { MessageCircle } from 'lucide-react'
 import { supabase } from '@/lib/supabase'
 
 export function WhatsAppFloating() {
   const [whatsapp, setWhatsapp] = useState('')
   const [isVisible, setIsVisible] = useState(false)
 
   useEffect(() => {
     const fetchSettings = async () => {
       const { data } = await supabase
         .from('store_settings')
         .select('value')
         .eq('key', 'whatsapp')
         .maybeSingle()
       
       if (data?.value) {
         setWhatsapp(data.value.replace(/\D/g, ''))
         setIsVisible(true)
       }
     }
     fetchSettings()
   }, [])
 
   if (!isVisible || !whatsapp) return null
 
   const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Gostaria de suporte com meu pedido.')}`
 
   return (
     <a 
       href={whatsappUrl}
       target="_blank"
       rel="noopener noreferrer"
       className="fixed bottom-36 right-4 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all md:bottom-24 group border-4 border-white animate-bounce-slow overflow-visible"
     >
       <div className="absolute -top-12 right-0 bg-white text-zinc-900 px-3 py-1.5 rounded-xl shadow-xl text-[10px] font-black uppercase tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-zinc-100 flex items-center gap-2">
         <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
         Fale Conosco agora!
         <div className="absolute -bottom-1 right-5 w-2 h-2 bg-white rotate-45 border-r border-b border-zinc-100" />
       </div>
 
       <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
       
       <MessageCircle size={28} className="relative z-10 drop-shadow-md" />
     </a>
   )
 }