import { supabase } from './supabase'

export interface WhatsAppConfig {
  apiKey: string;
  instanceId: string;
  apiUrl: string;
  enabled: boolean;
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

export const sendWhatsAppMessage = async (phone: string, message: string) => {
  const config = await getWhatsAppConfig();
  
  if (!config || !config.enabled || !config.apiKey) {
    // Fallback: Click to chat link
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    return { success: true, method: 'browser' };
  }

  try {
    // This is a generic implementation for Evolution API or similar
    const response = await fetch(`${config.apiUrl}/message/sendText/${config.instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey
      },
      body: JSON.stringify({
        number: `55${phone.replace(/\D/g, '')}`,
        text: message
      })
    });

    const result = await response.json();
    return { success: response.ok, result, method: 'api' };
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    return { success: false, error };
  }
}
