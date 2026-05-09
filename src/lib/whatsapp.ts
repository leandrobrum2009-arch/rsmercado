 import { supabase } from './supabase'

 export interface WhatsAppConfig {
   apiKey: string;
   instanceId: string;
   apiUrl: string;
   enabled: boolean;
   notify_order_status?: boolean; // Default true
   notify_new_order_admin?: boolean; // Default true
   prevent_duplicates?: boolean; // Prevent sending same message twice
   duplicate_cooldown_hours?: number; // Hours to wait before allowed to resend
 }
 export const generateMessageHash = (message: string) => {
   // Simple hash for content comparison
   let hash = 0;
   for (let i = 0; i < message.length; i++) {
     const char = message.charCodeAt(i);
     hash = ((hash << 5) - hash) + char;
     hash |= 0; 
   }
   return hash.toString();
 }
 
 export const checkDuplicateMessage = async (phone: string, message: string, hours: number = 24) => {
   const cleanPhone = phone.replace(/\D/g, '');
   const hash = generateMessageHash(message);
   const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
 
   const { data, error } = await supabase
     .from('whatsapp_logs')
     .select('id')
     .eq('phone', cleanPhone)
     .eq('message_hash', hash)
     .gt('sent_at', cutoff)
     .maybeSingle();
 
   return !!data;
 }
 
 export const logSentMessage = async (phone: string, message: string, campaignId?: string) => {
   const cleanPhone = phone.replace(/\D/g, '');
   const hash = generateMessageHash(message);
   
   await supabase.from('whatsapp_logs').insert({
     phone: cleanPhone,
    message_text: message,
     message_hash: hash,
     campaign_id: campaignId || null
   });
 }
 

export const getWhatsAppConfig = async (): Promise<WhatsAppConfig | null> => {
  const { data } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'whatsapp_config')
    .single();
  
  return data?.value as WhatsAppConfig || null;
}

export const saveWhatsAppConfig = async (config: WhatsAppConfig) => {
  const { error } = await supabase
    .from('store_settings')
    .upsert({ 
      key: 'whatsapp_config', 
      value: config,
      updated_at: new Date().toISOString()
    });
  
  return { error };
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

  export type WhatsAppMessageType = 'promotion' | 'order' | 'order_summary' | 'status_update' | 'loyalty_redeem' | 'points_earned';
 
   export const formatWhatsAppMessage = (type: WhatsAppMessageType, data: any, customTemplates?: any) => {
     const defaultTemplates: any = {
       loyalty_redeem: `🎁 *PARABÉNS PELO RESGATE!* 🎁\n\nOlá *{customer_name}*,\n\nVocê acaba de resgatar: *{reward_title}*\n{coupon_info}\n\nContinue comprando e acumulando pontos! 🛒`,
       points_earned: `⭐ *VOCÊ GANHOU PONTOS!* ⭐\n\nOlá *{customer_name}*,\n\nSeu pedido #{order_id} foi entregue e você ganhou *{points} pontos* de fidelidade!\n\n💰 Saldo Atual: *{new_balance} pontos*\n\n📍 Confira seus prêmios aqui: {loyalty_url}\n\nObrigado por comprar conosco! 🛒`,
       status_update: `Olá *{customer_name}*!\n\n🚀 O status do seu pedido #{order_id} mudou para: *{status}*\n\n📍 *Acompanhe em tempo real:* {track_url}\n\nAgradecemos a preferência! 🛒`,
       promotion: `🚀 *OFERTA IMPERDÍVEL!* 🚀\n\n*{title}*\n\n{description}\n\n👉 Confira aqui: {product_url}\n\n*Aproveite enquanto durarem os estoques!* 🛒`,
       order: `✅ *PEDIDO RECEBIDO!* ✅\n\nOlá, seu pedido #{order_id} foi recebido com sucesso!\n\n💰 Total: R$ {total_amount}\n🚚 Status: {status}\n\n📍 *Rastreie seu pedido aqui:* {track_url}`,
       order_summary: `🛒 *RESUMO DO PEDIDO #{order_id}*\n\n👤 Cliente: *{customer_name}*\n📍 Endereço: {address}\n💳 Pagamento: {payment_method}\n\n📦 *Itens:*\n{items}\n\n💰 Subtotal: R$ {subtotal}\n🚚 Entrega: R$ {delivery_fee}\n⭐ *Total: R$ {total_amount}*\n\n📍 Rastreio: {track_url}`,
       flyer_share: `🔥 *OFERTAS DO DIA - {site_name}* 🔥\n\n{product_list}\n\n🛒 *Peça agora pelo site:* {site_url}\n📦 *Entregamos na sua casa!*`
     };
 
     const template = customTemplates?.[type] || defaultTemplates[type];
     if (!template) return '';
 
     let message = template;
     const placeholders: any = {
       customer_name: data.customer_name || 'Cliente',
       order_id: data.id?.substring(0, 8) || data.order_id?.substring(0, 8) || 'N/A',
       points: data.points || 0,
       new_balance: data.new_balance || 0,
       loyalty_url: `${window.location.origin}/loyalty`,
       track_url: `${window.location.origin}/track/${data.id || data.order_id}`,
       reward_title: data.reward_title || '',
       coupon_info: data.coupon_code 
         ? `\n🎫 Seu cupom de desconto: *${data.coupon_code}*\n\nUse este código no seu próximo pedido para aproveitar seu desconto!`
         : `\n🚀 Em breve entraremos em contato para combinar a entrega do seu prêmio.`,
       coupon_code: data.coupon_code || '',
       status: (() => {
         const statusLabels: Record<string, string> = {
           pending: 'Aguardando Aprovação ⏳',
           approved: 'Pedido Aprovado ✅',
           collecting: 'Separando Produtos 🛒',
           collected: 'Pronto para Envio 📦',
           waiting_courier: 'Aguardando Entregador 🛵',
           out_for_delivery: 'Saiu para Entrega 🚚',
           delivered: 'Entregue com Sucesso 🏁',
           cancelled: 'Pedido Cancelado ❌'
         };
         return statusLabels[data.status] || data.status || '';
       })(),
       title: data.title || '',
       description: data.description || '',
       product_url: `${window.location.origin}/produtos/${data.id}`,
       total_amount: data.total_amount?.toFixed(2) || '0.00',
       subtotal: data.subtotal?.toFixed(2) || '0.00',
       delivery_fee: data.delivery_fee?.toFixed(2) || '0.00',
       address: data.address || '',
       payment_method: data.payment_method?.toUpperCase() || '',
       items: (data.items || []).map((item: any) => `• ${item.quantity}x ${item.name || item.products?.name} - R$ ${(item.quantity * (item.unit_price || item.price)).toFixed(2)}`).join('\n'),
       site_name: data.site_name || '',
       site_url: window.location.origin,
       product_list: data.product_list || ''
     };
 
     Object.entries(placeholders).forEach(([key, value]) => {
       message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
     });
 
     return message;
   }

 export const sendWhatsAppMessage = async (phone: string, message: string, campaignId?: string) => {
   const config = await getWhatsAppConfig();
   
   if (!config || !config.enabled || !config.apiKey) {
     const cleanPhone = phone.replace(/\D/g, '');
     const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
     if (typeof window !== 'undefined') window.open(url, '_blank');
     return { success: true, method: 'browser' };
   }
 
   if (config.prevent_duplicates) {
     const isDuplicate = await checkDuplicateMessage(phone, message, config.duplicate_cooldown_hours || 24);
     if (isDuplicate) return { success: false, error: 'Duplicate blocked', status: 429 };
   }
 
   try {
     const baseUrl = config.apiUrl.replace(/\/$/, '');
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 10000);
 
     const response = await fetch(`${baseUrl}/message/sendText/${config.instanceId}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'apikey': config.apiKey },
       body: JSON.stringify({
         number: `55${phone.replace(/\D/g, '')}`,
         text: message
       }),
       signal: controller.signal
     });
     
     clearTimeout(timeoutId);
     let result;
     try { result = await response.json(); } catch (e) { result = { message: 'Erro response' }; }
     
     if (response.ok) {
       await logSentMessage(phone, message, campaignId);
     }
     
     return { success: response.ok, result, status: response.status, method: 'api' };
   } catch (error) {
     console.error('WhatsApp API Error:', error);
     return { success: false, error };
   }
 }
