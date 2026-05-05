 import { supabase } from './supabase'
 
 const VAPID_PUBLIC_KEY = 'BDE6...'; // User should replace this with a real VAPID public key
 
 function urlBase64ToUint8Array(base64String: string) {
   const padding = '='.repeat((4 - base64String.length % 4) % 4);
   const base64 = (base64String + padding)
     .replace(/\-/g, '+')
     .replace(/_/g, '/');
 
   const rawData = window.atob(base64);
   const outputArray = new Uint8Array(rawData.length);
 
   for (let i = 0; i < rawData.length; ++i) {
     outputArray[i] = rawData.charCodeAt(i);
   }
   return outputArray;
 }
 
 export async function subscribeToPush() {
   try {
     const registration = await navigator.serviceWorker.ready;
     
     // Check if we already have a subscription
     let subscription = await registration.pushManager.getSubscription();
     
     if (!subscription) {
       subscription = await registration.pushManager.subscribe({
         userVisibleOnly: true,
         applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
       });
     }
 
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return;
 
     const subJson = subscription.toJSON();
     
     const { error } = await supabase
       .from('push_subscriptions')
       .upsert({
         user_id: user.id,
         endpoint: subJson.endpoint,
         p256dh: subJson.keys?.p256dh,
         auth: subJson.keys?.auth
       });
 
     if (error) throw error;
     return true;
   } catch (error) {
     console.error('Error subscribing to push:', error);
     return false;
   }
 }
 
 export async function registerServiceWorker() {
   if ('serviceWorker' in navigator) {
     try {
       await navigator.serviceWorker.register('/sw.js');
       console.log('Service Worker registered');
     } catch (error) {
       console.error('Service Worker registration failed:', error);
     }
   }
 }