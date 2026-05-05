 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Loader2, Save, Palette, Globe, Image as ImageIcon, Upload } from 'lucide-react'
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
      store_description: '',
      points_ratio: '1',
      instagram_post_count: '6'
    })
   const [isLoading, setIsLoading] = useState(true)
   const [isSaving, setIsSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
 
   useEffect(() => {
     fetchSettings()
   }, [])
 
    const fetchSettings = async () => {
      setIsLoading(true)
       let data = null;
       let error = null;
       try {
         const response = await supabase.from('store_settings').select('*');
         data = response.data;
         error = response.error;
       } catch (err: any) {
         error = err;
       }

       if (error) {
         console.error('Error fetching settings:', error);
         const isMissingTable = error.message?.includes('relation "store_settings" does not exist') || 
                               error.message?.includes('schema cache') || 
                               error.message?.includes('404');

         if (isMissingTable) {
           toast.error(
             <div className="flex flex-col gap-2">
               <p>A tabela de configurações (store_settings) não foi encontrada.</p>
               <Button size="sm" onClick={() => window.location.href = '/admin-fix'} className="bg-red-600 text-[10px] font-black uppercase">
                 Reparar Banco de Dados
               </Button>
             </div>,
             { duration: 10000 }
           );
         }
         setIsLoading(false);
         return;
       }

       if (data) {
         const newSettings = { ...settings };
         data.forEach((item: any) => {
           if (item.key === 'site_name') newSettings.site_name = item.value;
           if (item.key === 'logo_url') newSettings.logo_url = item.value;
           if (item.key === 'color_palette') newSettings.colors = item.value;
           if (item.key === 'address') newSettings.address = item.value;
           if (item.key === 'whatsapp') newSettings.whatsapp = item.value;
           if (item.key === 'opening_hours') newSettings.opening_hours = item.value;
           if (item.key === 'instagram_url') newSettings.instagram_url = item.value;
           if (item.key === 'facebook_url') newSettings.facebook_url = item.value;
            if (item.key === 'store_description') newSettings.store_description = item.value;
            if (item.key === 'points_ratio') newSettings.points_ratio = item.value;
            if (item.key === 'instagram_post_count') newSettings.instagram_post_count = item.value;
          });
         setSettings(newSettings);
       }
       setIsLoading(false);
     };
 
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `store/${fileName}`

       // Try banners bucket, fallback to products
       let bucketName = 'banners';
       let uploadError = null;
       
       const { data: uploadData, error: firstError } = await supabase.storage
         .from(bucketName)
         .upload(filePath, file, { cacheControl: '3600', upsert: true })
       
       if (firstError) {
         bucketName = 'products';
         const { data: retryData, error: retryError } = await supabase.storage
           .from(bucketName)
           .upload(filePath, file, { cacheControl: '3600', upsert: true });
         uploadError = retryError;
       }
 
       if (uploadError) {
         throw new Error(`Erro no armazenamento: ${uploadError.message}`);
       }
 
       const { data: { publicUrl } } = supabase.storage
         .from(bucketName)
         .getPublicUrl(filePath)

        setSettings({ ...settings, logo_url: publicUrl })
        toast.success('Logomarca carregada com sucesso!')
      } catch (error: any) {
        toast.error('Erro no upload: ' + error.message)
      } finally {
        setUploading(false)
      }
    }

   const handleSave = async () => {
     if (!settings.site_name.trim()) return toast.error('Nome do site é obrigatório');
     
     setIsSaving(true)
     try {
       const { data: isAdmin } = await supabase.rpc('is_admin');
       const { data: { session } } = await supabase.auth.getSession();
       if (!isAdmin && session?.user?.email !== 'leandrobrum2009@gmail.com') {
         throw new Error('Sem permissão administrativa no banco de dados.');
       }

       const updates = [
         { key: 'site_name', value: settings.site_name },
         { key: 'logo_url', value: settings.logo_url },
         { key: 'color_palette', value: settings.colors },
         { key: 'address', value: settings.address },
         { key: 'whatsapp', value: settings.whatsapp },
         { key: 'opening_hours', value: settings.opening_hours },
         { key: 'instagram_url', value: settings.instagram_url },
         { key: 'facebook_url', value: settings.facebook_url },
          { key: 'store_description', value: settings.store_description },
          { key: 'points_ratio', value: settings.points_ratio },
          { key: 'instagram_post_count', value: settings.instagram_post_count }
        ];
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-zinc-500">Qtd de Posts Instagram</label>
                  <Input 
                    type="number"
                    min="1"
                    max="20"
                    value={settings.instagram_post_count}
                    onChange={(e) => setSettings({ ...settings, instagram_post_count: e.target.value })}
                    className="rounded-xl border-zinc-200 focus:ring-primary w-24"
                  />
                </div>
 
       const { error } = await supabase.from('store_settings').upsert(updates, { onConflict: 'key' });
       
       if (error) {
         console.error('Upsert error:', error);
         throw error;
       }
 
       toast.success('Configurações salvas com sucesso!');
       fetchSettings();
     } catch (error: any) {
       console.error('Save error:', error)
       toast.error('Erro ao salvar: ' + (error.message || 'Erro desconhecido'))
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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-zinc-500">Logomarca da Loja</label>
                   <div className="space-y-4">
                     <div className="relative group">
                       <input
                         type="file"
                         accept="image/*"
                         onChange={handleFileUpload}
                         className="hidden"
                         id="logo-upload"
                         disabled={uploading}
                       />
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          <label 
                            htmlFor="logo-upload" 
                            className="flex-1 w-full flex flex-col items-center justify-center gap-2 p-6 border-4 border-dashed border-zinc-200 rounded-3xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all bg-white group"
                          >
                            {uploading ? (
                              <Loader2 className="h-10 w-10 animate-spin text-green-600" />
                            ) : settings.logo_url ? (
                              <div className="flex flex-col items-center">
                                <img src={settings.logo_url} className="h-16 object-contain mb-2" alt="Logo" />
                                <div className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase">
                                  <Upload className="h-3 w-3" /> Alterar Arquivo
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div className="bg-zinc-100 p-4 rounded-2xl shadow-inner group-hover:bg-green-100 transition-colors">
                                  <Upload className="h-8 w-8 text-zinc-400 group-hover:text-green-600 transition-colors" />
                                </div>
                                <span className="text-sm font-black uppercase text-zinc-500 group-hover:text-green-600">
                                  Clique para Upload
                                </span>
                              </div>
                            )}
                            <p className="text-[10px] font-bold text-zinc-400 mt-1">PNG ou JPG (Máx 2MB)</p>
                          </label>

                          <div className="flex-1 w-full space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Ou Link Direto</label>
                            <Input 
                              value={settings.logo_url}
                              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                              placeholder="https://exemplo.com/logo.png"
                              className="rounded-xl border-zinc-200 focus:ring-primary h-12 bg-white"
                            />
                            <p className="text-[9px] text-zinc-400 font-medium italic leading-tight">
                              Se preferir, cole o link direto da sua logo hospedada em outro local.
                            </p>
                          </div>
                        </div>
                     </div>
                     
                     <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-black uppercase text-zinc-400">Ou use uma URL externa</label>
                       <Input 
                         value={settings.logo_url}
                         onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                         placeholder="https://exemplo.com/logo.png"
                         className="rounded-xl border-zinc-200 focus:ring-primary h-12"
                       />
                     </div>
                   </div>
                  </div>
                 {settings.logo_url && (
                   <div className="mt-2 p-4 border rounded-2xl bg-zinc-50 flex justify-center shadow-inner">
                     <img src={settings.logo_url} alt="Logo Preview" className="h-16 object-contain drop-shadow-md" />
                   </div>
                 )}
               </div>
             </CardContent>
           </Card>
   
            {/* Cores e Fidelidade */}
           <Card className="border-zinc-200 shadow-sm">
             <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 rounded-t-xl">
               <CardTitle className="flex items-center gap-2 text-zinc-800">
                 <Palette className="h-5 w-5 text-purple-500" />
                  Visual e Fidelidade
               </CardTitle>
                <CardDescription>Personalize o visual e as regras de pontos</CardDescription>
             </CardHeader>
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs font-black uppercase text-zinc-500">Programa de Pontos (Pontos por R$ 1,00)</label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      value={settings.points_ratio}
                      onChange={(e) => setSettings({ ...settings, points_ratio: e.target.value })}
                      placeholder="Ex: 1"
                      className="rounded-xl border-zinc-200 w-24"
                    />
                    <p className="text-[10px] text-zinc-500 font-bold italic">
                      Cada R$ 1,00 gasto gera {settings.points_ratio || 0} pontos.
                    </p>
                  </div>
                </div>
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