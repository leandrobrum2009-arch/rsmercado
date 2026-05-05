 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 
 export interface StoreSettings {
   site_name: string
   logo_url: string
   colors: { primary: string; secondary: string }
   address: string
   whatsapp: string
   opening_hours: string
   instagram_url: string
   facebook_url: string
    store_description: string
    instagram_post_count: string
  }
 
 const defaultSettings: StoreSettings = {
   site_name: 'Minha Loja',
   logo_url: '',
   colors: { primary: '#ef4444', secondary: '#facc15' },
   address: '',
   whatsapp: '',
   opening_hours: '',
   instagram_url: '',
   facebook_url: '',
    store_description: '',
    instagram_post_count: '6'
  }
 
 export function useStoreSettings() {
   const [settings, setSettings] = useState<StoreSettings>(defaultSettings)
   const [isLoading, setIsLoading] = useState(true)
 
   useEffect(() => {
     const fetchSettings = async () => {
       try {
         const { data, error } = await supabase.from('store_settings').select('*')
         if (error) throw error
 
         if (data && data.length > 0) {
           const newSettings = { ...defaultSettings }
           data.forEach(item => {
             if (item.key in newSettings) {
               (newSettings as any)[item.key] = item.value
             }
           })
           setSettings(newSettings)
         }
       } catch (error) {
         console.error('Error fetching store settings:', error)
       } finally {
         setIsLoading(false)
       }
     }
 
     fetchSettings()
   }, [])
 
   return { settings, isLoading }
 }