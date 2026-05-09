 import { useState, useEffect } from 'react';
 import { supabase } from '@/lib/supabase';
 import { motion, AnimatePresence } from 'framer-motion';
 import { ShoppingBag, Users, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';
 
 interface Notification {
   id: string;
   type: 'purchase' | 'viewers' | 'stock' | 'level' | 'delivered';
   message: string;
   icon: any;
 }
 
 export function SocialProofNotifications() {
   const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
   const [isEnabled, setIsEnabled] = useState(false);
   const [config, setConfig] = useState<any>(null);
 
   useEffect(() => {
     const fetchConfig = async () => {
       const { data } = await supabase.from('store_settings').select('*').eq('key', 'social_proof_settings').maybeSingle();
       if (data && data.value) {
         setConfig(data.value);
         setIsEnabled(data.value.enabled);
       } else {
         // Default config
         const defaultConfig = {
           enabled: true,
           interval: 15000,
           show_purchases: true,
           show_viewers: true,
           show_stock: true,
           show_levels: true,
           show_delivered: true
         };
         setConfig(defaultConfig);
         setIsEnabled(true);
       }
     };
     fetchConfig();
   }, []);
 
   useEffect(() => {
     if (!isEnabled || !config) return;
 
     const fetchRandomNotification = async () => {
       const types = [];
       if (config.show_purchases) types.push('purchase');
       if (config.show_viewers) types.push('viewers');
       if (config.show_stock) types.push('stock');
       if (config.show_levels) types.push('level');
       if (config.show_delivered) types.push('delivered');
 
       if (types.length === 0) return;
 
       const selectedType = types[Math.floor(Math.random() * types.length)];
 
       let notification: Notification | null = null;
 
       try {
         switch (selectedType) {
           case 'purchase': {
             const { data: orders } = await supabase
               .from('orders')
               .select('id, profiles(full_name), delivery_address')
               .order('created_at', { ascending: false })
               .limit(5);
             
             if (orders && orders.length > 0) {
               const order = orders[Math.floor(Math.random() * orders.length)];
               const name = (order.profiles as any)?.full_name || 'Alguém';
               const neighborhood = (order.delivery_address as any)?.neighborhood || 'da região';
               notification = {
                 id: Math.random().toString(),
                 type: 'purchase',
                 message: `${name} acabou de fazer uma compra no bairro ${neighborhood}`,
                 icon: ShoppingBag
               };
             } else {
               // Fallback to simulated if no orders
               const names = ['Fernanda Lima', 'Jorge Libra', 'Marina Silva', 'Roberto Carlos'];
               const neighborhoods = ['Centro', 'Jardins', 'Vila Nova', 'Barra'];
               notification = {
                 id: Math.random().toString(),
                 type: 'purchase',
                 message: `${names[Math.floor(Math.random() * names.length)]} acabou de fazer uma compra no bairro ${neighborhoods[Math.floor(Math.random() * neighborhoods.length)]}`,
                 icon: ShoppingBag
               };
             }
             break;
           }
           case 'viewers': {
             const viewersCount = Math.floor(Math.random() * 20) + 5;
             notification = {
               id: Math.random().toString(),
               type: 'viewers',
               message: `${viewersCount} pessoas visualizando produtos no site agora`,
               icon: Users
             };
             break;
           }
           case 'stock': {
             const { data: products } = await supabase
               .from('products')
               .select('name, stock')
               .lt('stock', 10)
               .gt('stock', 0)
               .limit(10);
             
             if (products && products.length > 0) {
               const prod = products[Math.floor(Math.random() * products.length)];
               notification = {
                 id: Math.random().toString(),
                 type: 'stock',
                 message: `Este produto "${prod.name}" está acabando! Restam apenas ${prod.stock} unidades.`,
                 icon: AlertTriangle
               };
             }
             break;
           }
           case 'level': {
             const names = ['Jorge Libra', 'Marina Silva', 'Roberto Carlos', 'Ana Paula', 'Carlos Eduardo'];
             const levels = ['Bronze', 'Prata', 'Ouro', 'Diamante'];
             const name = names[Math.floor(Math.random() * names.length)];
             const level = levels[Math.floor(Math.random() * levels.length)];
             notification = {
               id: Math.random().toString(),
               type: 'level',
               message: `${name} subiu para o nível ${level}!`,
               icon: TrendingUp
             };
             break;
           }
           case 'delivered': {
             const names = ['Fernanda Lima', 'Ricardo Oliveira', 'Patrícia Souza', 'Marcos Santos'];
             const name = names[Math.floor(Math.random() * names.length)];
             notification = {
               id: Math.random().toString(),
               type: 'delivered',
               message: `${name} já recebeu suas compras em casa!`,
               icon: CheckCircle2
             };
             break;
           }
         }
       } catch (err) {
         console.error('Error fetching social proof:', err);
       }
 
       if (notification) {
         setCurrentNotification(notification);
         setTimeout(() => setCurrentNotification(null), 5000);
       }
     };
 
     const interval = setInterval(fetchRandomNotification, config.interval || 15000);
     // Initial call
     setTimeout(fetchRandomNotification, 3000);
 
     return () => clearInterval(interval);
   }, [isEnabled, config]);
 
   if (!isEnabled || !currentNotification) return null;
 
   return (
     <div className="fixed bottom-20 left-4 z-[100] pointer-events-none md:bottom-6">
       <AnimatePresence>
         {currentNotification && (
           <motion.div
             initial={{ opacity: 0, x: -50, scale: 0.8 }}
             animate={{ opacity: 1, x: 0, scale: 1 }}
             exit={{ opacity: 0, x: -50, scale: 0.8 }}
             className="bg-white/95 backdrop-blur-sm border border-zinc-100 shadow-2xl rounded-2xl p-4 max-w-[280px] pointer-events-auto flex items-start gap-3"
           >
             <div className={`p-2 rounded-xl shrink-0 ${
               currentNotification.type === 'purchase' ? 'bg-green-100 text-green-600' :
               currentNotification.type === 'viewers' ? 'bg-blue-100 text-blue-600' :
               currentNotification.type === 'stock' ? 'bg-orange-100 text-orange-600' :
               currentNotification.type === 'level' ? 'bg-purple-100 text-purple-600' :
               'bg-teal-100 text-teal-600'
             }`}>
               <currentNotification.icon size={20} />
             </div>
             <div>
               <p className="text-xs font-bold text-zinc-800 leading-tight">
                 {currentNotification.message}
               </p>
               <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                 agora mesmo
               </p>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
 }