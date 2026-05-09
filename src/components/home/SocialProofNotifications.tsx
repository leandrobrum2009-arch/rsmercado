 import { useState, useEffect } from 'react';
 import { supabase } from '@/lib/supabase';
 import { motion, AnimatePresence } from 'framer-motion';
 import { ShoppingBag, Users, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';
 
 interface Notification {
   id: string;
    type: 'purchase' | 'viewers' | 'stock' | 'level' | 'delivered' | 'payment';
   message: string;
   icon: any;
 }
 
  export function SocialProofNotifications() {
    const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
    const [queue, setQueue] = useState<Notification[]>([]);
    const [shownIds, setShownIds] = useState<Set<string>>(new Set());
    const [isEnabled, setIsEnabled] = useState(false);
    const [config, setConfig] = useState<any>(null);
  
    const formatMessage = (template: string, data: Record<string, any>) => {
      let message = template;
      Object.entries(data).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, value);
      });
      return message;
    };
  
    const defaultConfig: any = {
      enabled: true,
      interval: 15000,
      show_purchases: true,
      show_viewers: true,
      show_stock: true,
      show_levels: true,
      show_delivered: true,
      purchase_template: '{name} acabou de fazer uma compra no bairro {neighborhood}',
      viewers_template: '{count} pessoas visualizando produtos no site agora',
      stock_template: 'Este produto "{product}" está acabando! Restam apenas {stock} unidades.',
      level_template: '{name} subiu para o nível {level}!',
      delivered_template: '{name} já recebeu suas compras em casa!',
      payment_template: 'Pagamento confirmado para o pedido de {name}!',
      show_payments: true,
      time_template: 'agora mesmo'
    };
  
    useEffect(() => {
      const fetchConfig = async () => {
        const { data: spData } = await supabase.from('store_settings').select('*').eq('key', 'social_proof_settings').maybeSingle();
        const { data: pointsData } = await supabase.from('store_settings').select('*').eq('key', 'points_multiplier').maybeSingle();
        
        let mergedConfig = { ...defaultConfig };
        
        if (spData && spData.value) {
          mergedConfig = { ...mergedConfig, ...spData.value };
        }
        
        if (pointsData && pointsData.value && pointsData.value.tiers) {
          mergedConfig.tiers = pointsData.value.tiers;
        }
  
        setConfig(mergedConfig);
        setIsEnabled(mergedConfig.enabled);
      };
      fetchConfig();
    }, []);
  
    const addToQueue = (notification: Notification) => {
      if (shownIds.has(notification.id)) return;
      
      setQueue(prev => {
        if (prev.length >= 5) return prev;
        return [...prev, notification];
      });
      
      setShownIds(prev => {
        const next = new Set(prev);
        next.add(notification.id);
        if (next.size > 50) {
          const firstKey = next.keys().next().value;
          if (firstKey !== undefined) next.delete(firstKey);
        }
        return next;
      });
    };

    useEffect(() => {
      if (queue.length > 0 && !currentNotification) {
        const next = queue[0];
        setCurrentNotification(next);
        setQueue(prev => prev.slice(1));
        
        const timer = setTimeout(() => {
          setCurrentNotification(null);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }, [queue, currentNotification]);
 
   useEffect(() => {
     if (!isEnabled || !config) return;
 
     // 1. Real-time Listeners
     const orderChannel = supabase
       .channel('social-proof-orders')
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
         if (!config.show_purchases) return;
         const order = payload.new;
         const name = order.customer_name || 'Alguém';
         const neighborhood = order.delivery_address?.neighborhood || 'da região';
         const template = config.purchase_template || '{name} acabou de fazer uma compra no bairro {neighborhood}';
         
          addToQueue({
            id: `order-${order.id}`,
           type: 'purchase',
           message: formatMessage(template, { name, neighborhood }),
           icon: ShoppingBag
         });
       })
       .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
         if (!config.show_delivered) return;
         if (payload.new.status === 'delivered' && payload.old.status !== 'delivered') {
           const order = payload.new;
           const name = order.customer_name || 'Alguém';
           const template = config.delivered_template || '{name} já recebeu suas compras em casa!';
           
           addToQueue({
             id: `delivered-${order.id}`,
             type: 'delivered',
             message: formatMessage(template, { name }),
             icon: CheckCircle2
            });
          }
          if (config.show_payments && payload.new.status === 'approved' && payload.old.status !== 'approved') {
            const order = payload.new;
            const name = order.customer_name || 'Alguém';
            const template = config.payment_template || 'Pagamento confirmado para o pedido de {name}!';
            
            addToQueue({
              id: `payment-${order.id}`,
              type: 'payment',
              message: formatMessage(template, { name }),
              icon: CheckCircle2
            });
          }
        })
       .subscribe();
 
     const profileChannel = supabase
       .channel('social-proof-profiles')
       .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, async (payload) => {
         if (!config.show_levels) return;
         
         const newPoints = payload.new.points_balance || 0;
         const oldPoints = payload.old.points_balance || 0;
         
         // Only check if points increased
         if (newPoints > oldPoints) {
           // Logic to detect tier change
           const tiers = config.tiers || [
             { name: 'Bronze', min_points: 0 },
             { name: 'Ouro', min_points: 500 },
             { name: 'Platinum', min_points: 1000 }
           ];
 
           const oldTier = tiers.filter((t: any) => oldPoints >= t.min_points).pop();
           const newTier = tiers.filter((t: any) => newPoints >= t.min_points).pop();
 
           if (newTier && oldTier && newTier.name !== oldTier.name) {
             const name = payload.new.full_name || 'Um cliente';
             const template = config.level_template || '{name} subiu para o nível {level}!';
             
             addToQueue({
               id: `level-${payload.new.id}-${newTier.name}`,
               type: 'level',
               message: formatMessage(template, { name, level: newTier.name }),
               icon: TrendingUp
             });
           }
         }
       })
       .subscribe();
 
     // 2. Fallback / Periodic simulated events
     const fetchRandomNotification = async () => {
       // Don't show random if one is already showing (to prioritize real events)
       if (queue.length > 0 || currentNotification) return;
 
       const types = [];
       if (config.show_purchases) types.push('purchase');
       if (config.show_viewers) types.push('viewers');
       if (config.show_stock) types.push('stock');
        if (config.show_levels) types.push('level');
        if (config.show_delivered) types.push('delivered');
          if (config.show_payments) types.push('payment');
          types.push('cart');
          types.push('wishlist');
          types.push('registration');
          types.push('coupon');
          types.push('share');
 
       if (types.length === 0) return;
 
       const selectedType = types[Math.floor(Math.random() * types.length)];
 
       try {
         switch (selectedType) {
            case 'purchase': {
              const firstNames = [
                'Ana', 'Beatriz', 'Carlos', 'Daniel', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 
                'Kelly', 'Lucas', 'Maria', 'Nicolas', 'Olivia', 'Paulo', 'Rafael', 'Sandra', 'Tiago', 'Vinicius', 
                'Wagner', 'Alice', 'Bruno', 'Camila', 'Diego', 'Elaine', 'Fabio', 'Gisele', 'Hugo', 'Isabel', 
                'Jonas', 'Katia', 'Leonardo', 'Marta', 'Nelson', 'Otavio', 'Paula', 'Renato', 'Simone', 'Tatiana',
                'Adriano', 'Aline', 'André', 'Bárbara', 'Caio', 'Clarice', 'Douglas', 'Erica', 'Felipe', 'Giovanna',
                'Heitor', 'Iara', 'Joaquim', 'Leticia', 'Marcelo', 'Natália', 'Otávio', 'Patrícia', 'Ruan', 'Sabrina',
                'Thais', 'Vitor', 'Yasmin', 'Zuleica', 'Bernardo', 'Catarina', 'Davi', 'Emanuel', 'Flávia', 'Gustavo',
                'Hilda', 'Isaac', 'Janaina', 'Kevin', 'Lorena', 'Murilo', 'Nayara', 'Osvaldo', 'Priscila', 'Raul',
                'Sueli', 'Túlio', 'Valentina', 'William', 'Xavier', 'Yago', 'Zilda', 'Antônio', 'Benedita', 'Cláudio'
              ];
              const lastNames = [
                'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 
                'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
                'Mendes', 'Moreira', 'Nunes', 'Teixeira', 'Cardoso', 'Freitas', 'Rocha', 'Machado', 'Pinto', 'Dias',
                'Castro', 'Duarte', 'Guimarães', 'Pinheiro', 'Moura', 'Andrade', 'Marques', 'Batista', 'Figueiredo', 'Campos'
              ];
              const neighborhoods = [
                'Centro', 'Jardins', 'Vila Nova', 'Barra', 'Mottas', 'Jardim América', 'Bela Vista', 'Santo Antônio', 
                'São Francisco', 'Parque das Flores', 'Alto da Serra', 'Boa Vista', 'Itamarati', 'Quitandinha', 
                'Cascatinha', 'Retiro', 'Carangola', 'Bingen', 'Corrêas', 'Araras', 'Itaipava', 'Nogueira', 'Posse',
                'Morin', 'Quarteirão Brasileiro', 'Castelânea', 'Valparaíso', 'Siméria', 'Sargento Boening', 'Vila Militar',
                'Caxambu', 'Fazenda Inglesa', 'Mosela', 'Duarte da Silveira', 'Capela', 'Secretário', 'Pedro do Rio'
              ];
              
              const first = firstNames[Math.floor(Math.random() * firstNames.length)];
              const last = lastNames[Math.floor(Math.random() * lastNames.length)];
              const name = `${first} ${last[0]}.`;
              const neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
              const templates = [
                '{name} acabou de fazer uma compra no bairro {neighborhood}',
                '{name} garantiu suas compras em {neighborhood}',
                'Novo pedido saindo para {name} em {neighborhood}',
                'Mais um cliente satisfeito: {name} de {neighborhood}',
                '{name} aproveitou as ofertas e pediu entrega em {neighborhood}'
              ];
              const template = templates[Math.floor(Math.random() * templates.length)];
              addToQueue({
                id: `sim-purch-${Math.random()}`,
                type: 'purchase',
                message: formatMessage(template, { name, neighborhood }),
                icon: ShoppingBag
              });
             break;
           }
           case 'viewers': {
             const viewersCount = Math.floor(Math.random() * 20) + 5;
             const template = config.viewers_template || '{count} pessoas visualizando produtos no site agora';
             addToQueue({
               id: `sim-${selectedType}-${Math.floor(Date.now() / 1000)}`,
               type: 'viewers',
               message: formatMessage(template, { count: viewersCount }),
               icon: Users
             });
             break;
           }
           case 'stock': {
             const { data: products } = await supabase
               .from('products')
               .select('name, stock')
               .lt('stock', 15)
               .gt('stock', 0)
               .limit(10);
             
             if (products && products.length > 0) {
               const prod = products[Math.floor(Math.random() * products.length)];
               const template = config.stock_template || 'Este produto "{product}" está acabando! Restam apenas {stock} unidades.';
               addToQueue({
                 id: `sim-${selectedType}-${Math.floor(Date.now() / 1000)}`,
                 type: 'stock',
                 message: formatMessage(template, { product: prod.name, stock: prod.stock }),
                 icon: AlertTriangle
               });
             }
             break;
           }
            case 'level': {
              const firstNames = ['Ana', 'Beatriz', 'Carlos', 'Daniel', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Kelly', 'Lucas', 'Maria', 'Nicolas', 'Olivia', 'Paulo', 'Rafael', 'Sandra', 'Tiago', 'Vinicius'];
              const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes'];
              const levels = ['Bronze', 'Prata', 'Ouro', 'Diamante', 'Platina', 'Safira', 'Esmeralda'];
              const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
             const level = levels[Math.floor(Math.random() * levels.length)];
             const template = config.level_template || '{name} subiu para o nível {level}!';
             addToQueue({
               id: `sim-${selectedType}-${Math.floor(Date.now() / 1000)}`,
               type: 'level',
               message: formatMessage(template, { name, level }),
               icon: TrendingUp
              });
              break;
            }
            case 'payment': {
              const firstNames = ['Ana', 'Beatriz', 'Carlos', 'Daniel', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Kelly', 'Lucas', 'Maria', 'Nicolas', 'Olivia', 'Paulo', 'Rafael', 'Sandra', 'Tiago', 'Vinicius'];
              const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes'];
              const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
              const template = config.payment_template || 'Pagamento confirmado para o pedido de {name}!';
              addToQueue({
                id: `sim-${selectedType}-${Math.floor(Date.now() / 1000)}`,
                type: 'payment',
                message: formatMessage(template, { name }),
                icon: CheckCircle2
              });
              break;
            }
            case 'delivered': {
              const firstNames = ['Ana', 'Beatriz', 'Carlos', 'Daniel', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Kelly', 'Lucas', 'Maria', 'Nicolas', 'Olivia', 'Paulo', 'Rafael', 'Sandra', 'Tiago', 'Vinicius'];
              const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes'];
              const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
              const template = config.delivered_template || '{name} já recebeu suas compras em casa!';
              addToQueue({
                id: `sim-${selectedType}-${Math.floor(Date.now() / 1000)}`,
                type: 'delivered',
                message: formatMessage(template, { name }),
                icon: CheckCircle2
              });
              break;
            }
            case 'cart': {
              const names = ['Ana', 'Beatriz', 'Carlos', 'Daniel', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia', 'Kelly', 'Lucas', 'Maria'];
              const name = names[Math.floor(Math.random() * names.length)];
              const products = ['Arroz Integral', 'Feijão Preto', 'Café Gourmet', 'Leite Integral', 'Azeite Extra Virgem', 'Pão de Forma', 'Detergente', 'Sabonete Líquido', 'Papel Higiênico', 'Frutas da Estação', 'Refrigerante 2L', 'Pão de Queijo', 'Frango Inteiro', 'Ovos Caipira', 'Manteiga'];
              const product = products[Math.floor(Math.random() * products.length)];
              const phrases = [
                `${name} adicionou ${product} ao carrinho!`,
                `${name} está levando ${product} agora mesmo.`,
                `${name} acabou de escolher ${product}.`,
                `Alguém de Petrópolis adicionou ${product} à cesta.`
              ];
              addToQueue({
                id: `sim-cart-${Math.random()}`,
                type: 'purchase',
                message: phrases[Math.floor(Math.random() * phrases.length)],
                icon: ShoppingBag
              });
              break;
            }
            case 'wishlist': {
              const names = ['Paulo', 'Rafael', 'Sandra', 'Tiago', 'Vinicius', 'Wagner', 'Alice', 'Bruno', 'Camila', 'Diego'];
              const name = names[Math.floor(Math.random() * names.length)];
              const products = ['Vinho Tinto', 'Chocolate Amargo', 'Queijo Brie', 'Cerveja Artesanal', 'Suco Natural', 'Iogurte Grego', 'Sorvete de Baunilha', 'Castanha de Caju', 'Camarão Congelado'];
              const product = products[Math.floor(Math.random() * products.length)];
              const phrases = [
                `${name} salvou ${product} nos favoritos!`,
                `${name} amou o produto: ${product}`,
                `${name} está de olho em ${product}.`,
                `Produto popular: ${product} foi favoritado agora.`
              ];
              addToQueue({
                id: `sim-wish-${Math.random()}`,
                type: 'level',
                message: phrases[Math.floor(Math.random() * phrases.length)],
                icon: TrendingUp
              });
              break;
            }
            case 'registration': {
              const names = ['Leticia', 'Marcelo', 'Natália', 'Otávio', 'Patrícia', 'Ruan', 'Sabrina', 'Thais', 'Vitor', 'Yasmin'];
              const name = names[Math.floor(Math.random() * names.length)];
              const phrases = [
                `${name} acabou de se cadastrar no site!`,
                `Boas-vindas para ${name}, novo cliente do Supermercado.`,
                `${name} agora faz parte da nossa comunidade.`,
                `Mais um cliente cadastrado no bairro Centro.`
              ];
              addToQueue({
                id: `sim-reg-${Math.random()}`,
                type: 'level',
                message: phrases[Math.floor(Math.random() * phrases.length)],
                icon: Users
              });
              break;
            }
            case 'coupon': {
              const names = ['Bernardo', 'Catarina', 'Davi', 'Emanuel', 'Flávia', 'Gustavo', 'Hilda', 'Isaac', 'Janaina'];
              const name = names[Math.floor(Math.random() * names.length)];
              const phrases = [
                `${name} economizou usando um cupom de desconto!`,
                `${name} aplicou o cupom PRIMEIRACOMPRA.`,
                `${name} garantiu 10% de desconto no pedido.`,
                `Cupom de desconto ativado por um cliente agora.`
              ];
              addToQueue({
                id: `sim-coupon-${Math.random()}`,
                type: 'payment',
                message: phrases[Math.floor(Math.random() * phrases.length)],
                icon: CheckCircle2
              });
              break;
            }
            case 'share': {
              const names = ['Kevin', 'Lorena', 'Murilo', 'Nayara', 'Osvaldo', 'Priscila', 'Raul', 'Sueli', 'Túlio'];
              const name = names[Math.floor(Math.random() * names.length)];
              const products = ['Picanha Maturata', 'Cerveja Especial', 'Nutella 350g', 'Papel Higiênico (Leve 12 Pague 11)'];
              const product = products[Math.floor(Math.random() * products.length)];
              const phrases = [
                `${name} compartilhou a oferta de ${product}!`,
                `${name} enviou o link de ${product} para um amigo.`,
                `${name} indicou o Supermercado no WhatsApp.`,
                `Oferta compartilhada: ${product} está fazendo sucesso.`
              ];
              addToQueue({
                id: `sim-share-${Math.random()}`,
                type: 'viewers',
                message: phrases[Math.floor(Math.random() * phrases.length)],
                icon: TrendingUp
              });
              break;
            }
         }
       } catch (err) {
         console.error('Error fetching social proof:', err);
       }
     };
 
     const interval = setInterval(fetchRandomNotification, config.interval || 15000);
     
     return () => {
       clearInterval(interval);
       supabase.removeChannel(orderChannel);
       supabase.removeChannel(profileChannel);
     };
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
                currentNotification.type === 'payment' ? 'bg-blue-100 text-blue-600' :
                'bg-teal-100 text-teal-600'
             }`}>
               <currentNotification.icon size={20} />
             </div>
             <div>
               <p className="text-xs font-bold text-zinc-800 leading-tight">
                 {currentNotification.message}
               </p>
                <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                  {currentNotification.id.startsWith('sim-') 
                    ? ['agora mesmo', 'neste momento', 'há 1 minuto', 'há 2 minutos'][Math.floor(Math.random() * 4)]
                    : config.time_template || 'agora mesmo'}
                </p>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
 }