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
             initial={{ height: 0, opacity: 0, y: -20 }}
             animate={{ height: 'auto', opacity: 1, y: 0 }}
             exit={{ height: 0, opacity: 0, y: -20, scale: 0.95 }}
             drag="y"
             dragConstraints={{ top: 0, bottom: 0 }}
             dragElastic={{ top: 0.1, bottom: 0.1 }}
             onDragEnd={(_, info) => {
               if (info.offset.y < -50) {
                 setAlert(null);
               }
             }}
             className={`${bgColors[alert.type] || 'bg-zinc-900'} text-white relative overflow-hidden shadow-2xl z-[100] md:relative ${alert.type === 'danger' ? 'animate-pulse ring-4 ring-red-500/50 ring-inset' : ''} m-2 md:m-0 rounded-2xl md:rounded-none border-2 border-white/10 cursor-grab active:cursor-grabbing touch-none`}
           >
            <div className="container mx-auto px-4 py-4 md:py-3 flex flex-col md:flex-row items-center md:justify-between gap-3 relative z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-inner ring-2 ring-white/30 flex-shrink-0 animate-bounce">
                  <Icon size={28} className="md:w-[20px] md:h-[20px] text-white drop-shadow-lg" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 leading-none">
                      Aviso Importante
                    </span>
                    <span className="flex h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  </div>
                  <p className="text-[15px] md:text-sm font-black uppercase tracking-tight italic leading-[1.1] break-words drop-shadow-sm">
                    {alert.message}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between w-full md:w-auto gap-2 md:gap-4 mt-1 md:mt-0">
                <div className="md:hidden flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                   <div className="h-full bg-white/60 animate-[shimmer_2s_infinite] w-full" />
                </div>
                <button 
                  onClick={() => setAlert(null)}
                  className="p-3 md:p-2 bg-white/10 hover:bg-white/20 active:scale-90 rounded-2xl transition-all border border-white/20 backdrop-blur-md shadow-lg"
                >
                  <X size={24} className="md:w-[20px] md:h-[20px]" />
                </button>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 bg-white/30" style={{ width: '100%' }}>
               <div className="h-full bg-white/60 shadow-[0_0_15px_rgba(255,255,255,1)] animate-progress" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
 }