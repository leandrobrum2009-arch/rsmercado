 import { supabase } from './supabase'
 
 export interface NotificationConfig {
   sms_enabled: boolean;
   sms_provider: 'twilio' | 'zenvia' | 'custom';
   sms_api_key: string;
   sms_api_secret?: string;
   sms_from?: string;
   
   call_enabled: boolean;
   call_provider: 'twilio' | 'totalvoice' | 'custom';
   call_api_key: string;
   call_admin_phone: string;
   call_tts_message: string;
 }
 
 export const getNotificationConfig = async (): Promise<NotificationConfig | null> => {
   const { data } = await supabase
     .from('store_settings')
     .select('value')
     .eq('key', 'external_notification_config')
     .maybeSingle();
   
   return data?.value as NotificationConfig || null;
 }
 
 export const sendSMS = async (to: string, message: string) => {
   const config = await getNotificationConfig();
   if (!config || !config.sms_enabled || !config.sms_api_key) {
     console.log('SMS disabled or not configured:', message);
     return { success: false, reason: 'disabled' };
   }
 
   console.log(`Sending SMS to ${to}: ${message}`);
   
   // Mocking API call - in a real scenario, we would use fetch() to the provider's API
   // Example for Twilio:
   // const auth = btoa(`${config.sms_api_key}:${config.sms_api_secret}`);
   // await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.sms_api_key}/Messages.json`, {
   //   method: 'POST',
   //   headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
   //   body: new URLSearchParams({ To: to, From: config.sms_from || '', Body: message })
   // });
 
   return { success: true };
 }
 
 export const makeNotificationCall = async (to: string, message?: string) => {
   const config = await getNotificationConfig();
   if (!config || !config.call_enabled || !config.call_api_key) {
     console.log('Call notification disabled or not configured');
     return { success: false, reason: 'disabled' };
   }
 
   const phone = to || config.call_admin_phone;
   const tts = message || config.call_tts_message || 'Você recebeu um novo pedido no Supermercado!';
 
   console.log(`Making notification call to ${phone} with message: ${tts}`);
   
   // Mocking Voice API call
   // Example for TotalVoice/Zenvia:
   // await fetch('https://api.totalvoice.com.br/tts', {
   //   method: 'POST',
   //   headers: { 'Access-Token': config.call_api_key },
   //   body: JSON.stringify({ numero_destino: phone, mensagem: tts })
   // });
 
   return { success: true };
 }