 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Loader2, Save, Palette, Globe, Image as ImageIcon } from 'lucide-react'
 import { toast } from '@/lib/toast'
 
 export function StoreSettingsManager() {
   const [settings, setSettings] = useState<any>({
     site_name: '',
     logo_url: '',
     colors: { primary: '#ef4444', secondary: '#facc15' },
     address: '',
     whatsapp: '',
     opening_hours: '',
     instagram_url: '',
     facebook_url: '',
     store_description: ''
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
         if (item.key === 'address') newSettings.address = item.value
         if (item.key === 'whatsapp') newSettings.whatsapp = item.value
         if (item.key === 'opening_hours') newSettings.opening_hours = item.value
         if (item.key === 'instagram_url') newSettings.instagram_url = item.value
         if (item.key === 'facebook_url') newSettings.facebook_url = item.value
         if (item.key === 'store_description') newSettings.store_description = item.value
       })
       setSettings(newSettings)
     }
     setIsLoading(false)
   }
 
   const handleSave = async () => {
     if (!settings.site_name.trim()) return toast.error('Nome do site é obrigatório');
     
     // Basic URL validation
     if (settings.logo_url && !settings.logo_url.startsWith('http')) {
       return toast.error('URL da logomarca inválida');
     }
 
     setIsSaving(true)
     try {
       const updates = [
         { key: 'site_name', value: settings.site_name },
         { key: 'logo_url', value: settings.logo_url },
         { key: 'color_palette', value: settings.colors },
         { key: 'address', value: settings.address },
         { key: 'whatsapp', value: settings.whatsapp },
         { key: 'opening_hours', value: settings.opening_hours },
         { key: 'instagram_url', value: settings.instagram_url },
         { key: 'facebook_url', value: settings.facebook_url },
         { key: 'store_description', value: settings.store_description }
       ];
 
       const { error } = await supabase.from('store_settings').upsert(updates, { onConflict: 'key' });
       
       if (error) throw error;
 
       toast.success('Configurações salvas com sucesso!');
       fetchSettings();
     } catch (error) {
       console.error(error)
       toast.error('Erro ao salvar configurações')
     } finally {
       setIsSaving(false)
     }
   }
 
   if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
 
     return (
       <div className="space-y-6 pb-20">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Identidade */}
           <Card className="border-zinc-200 shadow-sm">
             <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 rounded-t-xl">
               <CardTitle className="flex items-center gap-2 text-zinc-800">
                 <Globe className="h-5 w-5 text-blue-500" />
                 Identidade da Loja
               </CardTitle>
               <CardDescription>Configure o nome, descrição e marca da sua loja</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4 pt-6">
               <div className="space-y-2">
                 <label className="text-xs font-black uppercase text-zinc-500">Nome do Site</label>
                 <Input 
                   value={settings.site_name}
                   onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                   placeholder="Ex: Supermercado Central"
                   className="rounded-xl border-zinc-200 focus:ring-primary"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black uppercase text-zinc-500">Descrição Curta</label>
                 <Input 
                   value={settings.store_description}
                   onChange={(e) => setSettings({ ...settings, store_description: e.target.value })}
                   placeholder="Ex: O melhor preço da região"
                   className="rounded-xl border-zinc-200 focus:ring-primary"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black uppercase text-zinc-500">URL da Logomarca</label>
                 <Input 
                   value={settings.logo_url}
                   onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                   placeholder="https://exemplo.com/logo.png"
                   className="rounded-xl border-zinc-200 focus:ring-primary"
                 />
                 {settings.logo_url && (
                   <div className="mt-2 p-4 border rounded-2xl bg-zinc-50 flex justify-center shadow-inner">
                     <img src={settings.logo_url} alt="Logo Preview" className="h-16 object-contain drop-shadow-md" />
                   </div>
                 )}
               </div>
             </CardContent>
           </Card>
   
           {/* Cores */}
           <Card className="border-zinc-200 shadow-sm">
             <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 rounded-t-xl">
               <CardTitle className="flex items-center gap-2 text-zinc-800">
                 <Palette className="h-5 w-5 text-purple-500" />
                 Visual e Cores
               </CardTitle>
               <CardDescription>Personalize a identidade visual da interface</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4 pt-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase text-zinc-500">Cor Primária</label>
                   <div className="flex gap-2">
                     <Input 
                       type="color" 
                       className="w-12 h-10 p-1 rounded-lg cursor-pointer"
                       value={settings.colors.primary}
                       onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                     />
                     <Input 
                       value={settings.colors.primary}
                       onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                       className="rounded-xl border-zinc-200"
                     />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase text-zinc-500">Cor Secundária</label>
                   <div className="flex gap-2">
                     <Input 
                       type="color" 
                       className="w-12 h-10 p-1 rounded-lg cursor-pointer"
                       value={settings.colors.secondary}
                       onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                     />
                     <Input 
                       value={settings.colors.secondary}
                       onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                       className="rounded-xl border-zinc-200"
                     />
                   </div>
                 </div>
               </div>
               <div className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50 space-y-3 shadow-inner">
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Preview de Componentes</p>
                 <div className="flex flex-wrap gap-2">
                   <div className="px-4 py-2 rounded-xl text-white text-xs font-black uppercase shadow-lg" style={{ backgroundColor: settings.colors.primary }}>Botão Principal</div>
                   <div className="px-4 py-2 rounded-xl text-zinc-900 text-xs font-black uppercase shadow-sm border border-zinc-200" style={{ backgroundColor: settings.colors.secondary }}>Botão Secundário</div>
                 </div>
               </div>
             </CardContent>
           </Card>
 
           {/* Contato e Endereço */}
           <Card className="border-zinc-200 shadow-sm md:col-span-2">
             <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 rounded-t-xl">
               <CardTitle className="flex items-center gap-2 text-zinc-800">
                 <ImageIcon className="h-5 w-5 text-green-500" />
                 Informações de Contato e Localização
               </CardTitle>
               <CardDescription>Dados que serão exibidos no rodapé e página de contato</CardDescription>
             </CardHeader>
             <CardContent className="pt-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-zinc-500">WhatsApp de Contato</label>
                     <Input 
                       value={settings.whatsapp}
                       onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                       placeholder="Ex: 5511999999999"
                       className="rounded-xl border-zinc-200"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-zinc-500">Horário de Funcionamento</label>
                     <Input 
                       value={settings.opening_hours}
                       onChange={(e) => setSettings({ ...settings, opening_hours: e.target.value })}
                       placeholder="Ex: Seg a Sex: 08h às 20h"
                       className="rounded-xl border-zinc-200"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-zinc-500">Endereço Completo</label>
                     <Input 
                       value={settings.address}
                       onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                       placeholder="Rua Exemplo, 123 - Bairro - Cidade/UF"
                       className="rounded-xl border-zinc-200"
                     />
                   </div>
                 </div>
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-zinc-500">Instagram (URL)</label>
                     <Input 
                       value={settings.instagram_url}
                       onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                       placeholder="https://instagram.com/sualoja"
                       className="rounded-xl border-zinc-200"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black uppercase text-zinc-500">Facebook (URL)</label>
                     <Input 
                       value={settings.facebook_url}
                       onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                       placeholder="https://facebook.com/sualoja"
                       className="rounded-xl border-zinc-200"
                     />
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
   
         <div className="flex justify-end sticky bottom-4 z-10">
           <Button onClick={handleSave} disabled={isSaving} size="lg" className="w-full md:w-auto rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-tighter">
             {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
             Salvar Alterações da Loja
           </Button>
         </div>
       </div>
     )
 }