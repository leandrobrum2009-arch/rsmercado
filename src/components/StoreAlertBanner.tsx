 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Bell, X, Info, AlertTriangle, CheckCircle } from 'lucide-react'
 import { motion, AnimatePresence } from 'framer-motion'
 
 export function StoreAlertBanner() {
   const [alert, setAlert] = useState<any>(null)
 
   useEffect(() => {
     const fetchAlert = async () => {
       const { data, error } = await supabase
         .from('store_alerts')
         .select('*')
         .eq('is_active', true)
         .order('created_at', { ascending: false })
         .limit(1)
         .maybeSingle()
 
       if (!error && data) {
         setAlert(data)
       }
     }
 
     fetchAlert()
 
     // Subscribe to alert changes
     const channel = supabase
       .channel('store-alerts')
       .on('postgres_changes', { 
         event: '*', 
         schema: 'public', 
         table: 'store_alerts' 
       }, () => {
         fetchAlert()
       })
       .subscribe()
 
     return () => {
       supabase.removeChannel(channel)
     }
   }, [])
 
   if (!alert) return null
 
   const bgColors: Record<string, string> = {
     info: 'bg-blue-600',
     warning: 'bg-amber-500',
     success: 'bg-green-600',
     danger: 'bg-red-600'
   }
 
   const Icons: Record<string, any> = {
     info: Info,
     warning: AlertTriangle,
     success: CheckCircle,
     danger: Bell
   }
 
   const Icon = Icons[alert.type] || Info
 
   return (
     <AnimatePresence>
       {alert && (
         <motion.div 
           initial={{ height: 0, opacity: 0 }}
           animate={{ height: 'auto', opacity: 1 }}
           exit={{ height: 0, opacity: 0 }}
           className={`${bgColors[alert.type] || 'bg-zinc-900'} text-white relative overflow-hidden`}
         >
           <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                 <Icon size={18} className="animate-pulse" />
               </div>
               <p className="text-xs md:text-sm font-black uppercase tracking-tight italic">
                 {alert.message}
               </p>
             </div>
             <button 
               onClick={() => setAlert(null)}
               className="p-1 hover:bg-white/10 rounded-lg transition-colors"
             >
               <X size={18} />
             </button>
           </div>
           <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-progress" style={{ width: '100%' }} />
         </motion.div>
       )}
     </AnimatePresence>
   )
 }