 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Loader2, Save, Palette, Globe, Image as ImageIcon } from 'lucide-react'
 import { toast } from '@/lib/toast'
 
 export function StoreSettingsManager() {
   const [settings, setSettings] = useState<any>({
     site_name: 'Minha Loja',
     logo_url: '',
     colors: { primary: '#ef4444', secondary: '#facc15' }
   })
   const [isLoading, setIsLoading] = useState(true)
   const [isSaving, setIsSaving] = useState(false)
 
   useEffect(() => {
     fetchSettings()
   }, [])
 
   const fetchSettings = async () => {
     setIsLoading(true)
     const { data } = await supabase.from('store_settings').select('*')
     
     if (data) {
       const newSettings = { ...settings }
       data.forEach(item => {
         if (item.key === 'site_name') newSettings.site_name = item.value
         if (item.key === 'logo_url') newSettings.logo_url = item.value
         if (item.key === 'color_palette') newSettings.colors = item.value
       })
       setSettings(newSettings)
     }
     setIsLoading(false)
   }
 
   const handleSave = async () => {
     setIsSaving(true)
     try {
       await Promise.all([
         supabase.from('store_settings').upsert({ key: 'site_name', value: settings.site_name }, { onConflict: 'key' }),
         supabase.from('store_settings').upsert({ key: 'logo_url', value: settings.logo_url }, { onConflict: 'key' }),
         supabase.from('store_settings').upsert({ key: 'color_palette', value: settings.colors }, { onConflict: 'key' })
       ])
       toast.success('Configurações salvas com sucesso!')
     } catch (error) {
       console.error(error)
       toast.error('Erro ao salvar configurações')
     } finally {
       setIsSaving(false)
     }
   }
 
   if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
 
   return (
     <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Globe className="h-5 w-5 text-blue-500" />
               Identidade do Site
             </CardTitle>
             <CardDescription>Configure o nome e a marca da sua loja</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-2">
               <label className="text-sm font-medium">Nome do Site</label>
               <Input 
                 value={settings.site_name}
                 onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                 placeholder="Ex: Supermercado Central"
               />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-medium">URL da Logomarca</label>
               <div className="flex gap-2">
                 <Input 
                   value={settings.logo_url}
                   onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                   placeholder="https://exemplo.com/logo.png"
                 />
               </div>
               {settings.logo_url && (
                 <div className="mt-2 p-2 border rounded bg-gray-50 flex justify-center">
                   <img src={settings.logo_url} alt="Logo Preview" className="h-12 object-contain" />
                 </div>
               )}
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Palette className="h-5 w-5 text-purple-500" />
               Paleta de Cores
             </CardTitle>
             <CardDescription>Personalize as cores principais da interface</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium">Cor Primária</label>
                 <div className="flex gap-2">
                   <Input 
                     type="color" 
                     className="w-12 h-10 p-1"
                     value={settings.colors.primary}
                     onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                   />
                   <Input 
                     value={settings.colors.primary}
                     onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                   />
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium">Cor Secundária</label>
                 <div className="flex gap-2">
                   <Input 
                     type="color" 
                     className="w-12 h-10 p-1"
                     value={settings.colors.secondary}
                     onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                   />
                   <Input 
                     value={settings.colors.secondary}
                     onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                   />
                 </div>
               </div>
             </div>
             <div className="p-4 rounded-lg border bg-gray-50 space-y-2">
               <p className="text-xs font-bold text-gray-500 uppercase">Preview</p>
               <div className="flex gap-2">
                 <div className="px-4 py-2 rounded text-white text-xs font-bold" style={{ backgroundColor: settings.colors.primary }}>BOTÃO PRIMÁRIO</div>
                 <div className="px-4 py-2 rounded text-gray-800 text-xs font-bold" style={{ backgroundColor: settings.colors.secondary }}>BOTÃO SECUNDÁRIO</div>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
       <div className="flex justify-end">
         <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
           {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
           Salvar Todas as Configurações
         </Button>
       </div>
     </div>
   )
 }