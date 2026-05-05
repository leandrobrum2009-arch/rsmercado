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

export const formatWhatsAppMessage = (type: 'promotion' | 'order', data: any) => {
  if (type === 'promotion') {
    return `🚀 *OFERTA IMPERDÍVEL!* 🚀\n\n*${data.title}*\n\n${data.description}\n\n👉 Confira aqui: ${window.location.origin}/produtos/${data.id}\n\n*Aproveite enquanto durarem os estoques!* 🛒`;
  }
  
  if (type === 'order') {
    return `✅ *PEDIDO RECEBIDO!* ✅\n\nOlá, seu pedido #${data.id.substring(0, 8)} foi recebido com sucesso!\n\n💰 Total: R$ ${data.total_amount.toFixed(2)}\n🚚 Status: ${data.status}\n\nAcompanhe pelo app: ${window.location.origin}/perfil`;
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
