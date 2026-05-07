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
            exit={{ height: 0, opacity: 0, y: -20 }}
            className={`${bgColors[alert.type] || 'bg-zinc-900'} text-white relative overflow-hidden shadow-lg z-[100] md:relative`}
          >
            <div className="container mx-auto px-4 py-4 md:py-3.5 flex flex-col md:flex-row items-center md:justify-between gap-4 relative z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm shadow-inner ring-1 ring-white/30 flex-shrink-0 animate-pulse">
                  <Icon size={24} className="animate-bounce md:w-[18px] md:h-[18px] text-white" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">
                      Aviso Importante
                    </span>
                    <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
                  </div>
                  <p className="text-[13px] md:text-sm font-black uppercase tracking-tight italic leading-tight break-words">
                    {alert.message}
                  </p>
                </div>
                <button 
                  onClick={() => setAlert(null)}
                  className="p-2.5 hover:bg-white/20 active:scale-90 rounded-2xl transition-all border border-white/10 backdrop-blur-md md:hidden bg-black/10"
                >
                  <X size={24} />
                </button>
              </div>
              <button 
                onClick={() => setAlert(null)}
                className="p-2 hover:bg-white/20 active:bg-white/30 rounded-xl transition-all border border-white/10 backdrop-blur-md hidden md:block"
              >
                <X size={20} />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 bg-white/40 shadow-[0_0_15px_rgba(255,255,255,0.7)]" style={{ width: '100%' }} />
          </motion.div>
        )}
      </AnimatePresence>
    )
 }