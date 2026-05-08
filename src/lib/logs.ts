 import { supabase } from "./supabase";
 
 export type LogEventType = 
   | 'login_attempt' 
   | 'registration_attempt' 
   | 'payment_attempt' 
   | 'profile_update'
   | 'password_reset_request'
   | 'admin_access';
 
 export interface LogDetails {
   [key: string]: any;
 }
 
 export const logAttempt = async (
   event_type: LogEventType,
   status: 'success' | 'failure',
   details: LogDetails = {}
 ) => {
   try {
     const { data: { session } } = await supabase.auth.getSession();
     
     // Clean sensitive data from details if any
     const safeDetails = { ...details };
     delete safeDetails.password;
     delete safeDetails.token;
 
     const { error } = await supabase
       .from('security_logs')
       .insert({
         user_id: session?.user?.id || null,
         event_type,
         status,
         details: safeDetails,
         user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
         ip_address: 'client-side' // IP is better captured by Supabase server-side fields if configured
       });
 
     if (error) console.error('Error recording security log:', error);
   } catch (err) {
     console.error('Failed to log security event:', err);
   }
 };