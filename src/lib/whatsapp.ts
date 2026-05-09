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
 
  export const formatWhatsAppMessage = (type: WhatsAppMessageType, data: any) => {
    if (type === 'loyalty_redeem') {
      let text = `🎁 *PARABÉNS PELO RESGATE!* 🎁\n\nOlá *${data.customer_name}*,\n\nVocê acaba de resgatar: *${data.reward_title}*\n`;
      
      if (data.coupon_code) {
        text += `\n🎫 Seu cupom de desconto: *${data.coupon_code}*\n\nUse este código no seu próximo pedido para aproveitar seu desconto!`;
      } else {
        text += `\n🚀 Em breve entraremos em contato para combinar a entrega do seu prêmio.`;
      }
      
      return text + `\n\nContinue comprando e acumulando pontos! 🛒`;
    }
 
    if (type === 'points_earned') {
      return `⭐ *VOCÊ GANHOU PONTOS!* ⭐\n\nOlá *${data.customer_name}*,\n\nSeu pedido #${data.order_id.substring(0, 8)} foi entregue e você ganhou *${data.points} pontos* de fidelidade!\n\n💰 Saldo Atual: *${data.new_balance} pontos*\n\n📍 Confira seus prêmios aqui: ${window.location.origin}/loyalty\n\nObrigado por comprar conosco! 🛒`;
    }
 
   if (type === 'status_update') {
     const statusLabels: Record<string, string> = {
       pending: 'Aguardando Aprovação ⏳',
       approved: 'Pedido Aprovado ✅',
       collecting: 'Separando Produtos 🛒',
       collected: 'Pronto para Envio 📦',
       waiting_courier: 'Aguardando Entregador 🛵',
       out_for_delivery: 'Saiu para Entrega 🚚',
       delivered: 'Entregue com Sucesso 🏁',
       cancelled: 'Pedido Cancelado ❌'
     }
 
     return `Olá *${data.customer_name}*!\n\n🚀 O status do seu pedido #${data.id.substring(0, 8)} mudou para: *${statusLabels[data.status] || data.status}*\n\n📍 *Acompanhe em tempo real:* ${window.location.origin}/track/${data.id}\n\nAgradecemos a preferência! 🛒`;
   }
 
  if (type === 'promotion') {
    return `🚀 *OFERTA IMPERDÍVEL!* 🚀\n\n*${data.title}*\n\n${data.description}\n\n👉 Confira aqui: ${window.location.origin}/produtos/${data.id}\n\n*Aproveite enquanto durarem os estoques!* 🛒`;
  }
  
  if (type === 'order') {
    return `✅ *PEDIDO RECEBIDO!* ✅\n\nOlá, seu pedido #${data.id.substring(0, 8)} foi recebido com sucesso!\n\n💰 Total: R$ ${data.total_amount.toFixed(2)}\n🚚 Status: ${data.status}\n\n📍 *Rastreie seu pedido aqui:* ${window.location.origin}/track/${data.id}`;
  }

  if (type === 'order_summary') {
    let itemsText = (data.items || []).map((item: any) => `• ${item.quantity}x ${item.name || item.products?.name} - R$ ${(item.quantity * (item.unit_price || item.price)).toFixed(2)}`).join('\n');
    
    return `🛒 *RESUMO DO PEDIDO #${data.id.substring(0, 8)}*\n\n` +
           `👤 Cliente: *${data.customer_name}*\n` +
           `📍 Endereço: ${data.address}\n` +
           `💳 Pagamento: ${data.payment_method?.toUpperCase()}\n\n` +
           `📦 *Itens:*\n${itemsText}\n\n` +
           `💰 Subtotal: R$ ${data.subtotal?.toFixed(2)}\n` +
           `🚚 Entrega: R$ ${data.delivery_fee?.toFixed(2)}\n` +
           `⭐ *Total: R$ ${data.total_amount?.toFixed(2)}*\n\n` +
           `📍 Rastreio: ${window.location.origin}/track/${data.id}`;
  }

  return '';
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
