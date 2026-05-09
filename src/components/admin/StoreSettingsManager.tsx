 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
    import { Loader2, Save, Palette, Globe, Image as ImageIcon, Upload, Play, Instagram, Trash2, Plus, Type, ArrowUp, ArrowDown, TrendingUp, ShoppingBag, AlertTriangle, PhoneCall, MessageSquare, Smartphone } from 'lucide-react'
 import { toast } from '@/lib/toast'
 
    import { Badge } from '@/components/ui/badge'
    import { Switch } from '@/components/ui/switch'

 
   const ALLOWED_SP_PLACEHOLDERS = ['name', 'neighborhood', 'count', 'product', 'stock', 'level'];
 
   const validateSPPlaceholders = (text: string) => {
     const found = text.match(/\{[a-zA-Z0-9_]+\}/g) || [];
     const invalid = found.filter(p => !ALLOWED_SP_PLACEHOLDERS.includes(p.replace(/[\{\}]/g, '')));
     return invalid;
   };
 
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
     instagram_post_count: '6',
     instagram_items: [],
     admin_whatsapp: '',
     social_proof: {
       enabled: true,
       interval: 15000,
       show_purchases: true,
       show_viewers: true,
        show_stock: true,
        show_levels: true,
        show_delivered: true,
        purchase_template: '{name} acabou de fazer uma compra no bairro {neighborhood}',
        viewers_template: '{count} pessoas visualizando produtos no site agora',
        stock_template: 'Este produto "{product}" está acabando! Restam apenas {stock} unidades.',
         level_template: '{name} subiu para o nível {level}!',
         delivered_template: '{name} já recebeu suas compras em casa!',
         payment_template: 'Pagamento confirmado para o pedido de {name}!',
         show_payments: true,
         time_template: 'agora mesmo'
      },
      notifications: {
        sms_enabled: false,
        sms_provider: 'twilio',
        sms_api_key: '',
        sms_api_secret: '',
        sms_from: '',
        call_enabled: false,
        call_provider: 'totalvoice',
        call_api_key: '',
        call_admin_phone: '',
        call_tts_message: 'Você recebeu um novo pedido no Supermercado!'
      }
    })
   const [isLoading, setIsLoading] = useState(true)
   const [isSaving, setIsSaving] = useState(false)
    const [uploading, setUploading] = useState<string | boolean>(false)
 
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
            window.location.href = '/admin-fix';
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
             if (item.key === 'points_multiplier' || item.key === 'points_ratio') {
               const val = item.value;
               newSettings.points_ratio = (val && typeof val === 'object') ? (val.points_per_real || val.multiplier) : val;
             }
             if (item.key === 'instagram_post_count') newSettings.instagram_post_count = item.value;
             if (item.key === 'instagram_items') newSettings.instagram_items = item.value;
               if (item.key === 'admin_whatsapp') newSettings.admin_whatsapp = item.value;
               if (item.key === 'social_proof_settings') newSettings.social_proof = { ...newSettings.social_proof, ...item.value };
               if (item.key === 'external_notification_config') newSettings.notifications = { ...newSettings.notifications, ...item.value };
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

    const addInstagramItem = () => {
      const newItem = { id: Date.now(), type: 'post', url: '', thumbnail: '', likes: '0', comments: '0' };
      setSettings({ ...settings, instagram_items: [...(settings.instagram_items || []), newItem] });
    };
  
    const removeInstagramItem = (id: number) => {
      setSettings({ ...settings, instagram_items: (settings.instagram_items || []).filter((item: any) => item.id !== id) });
    };
  
    const updateInstagramItem = (id: number, field: string, value: string) => {
      let updatedValue = value;
      let additionalFields = {};

      // Auto-extract thumbnail from Instagram URL
      if (field === 'url' && value.includes('instagram.com/')) {
        try {
          // Extract the path (e.g., /p/CODE/ or /reel/CODE/)
          const urlObj = new URL(value);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          if (pathParts.length >= 2 && (pathParts[0] === 'p' || pathParts[0] === 'reels' || pathParts[0] === 'reel' || pathParts[0] === 'stories')) {
            const postId = pathParts[1];
            const baseUrl = `https://www.instagram.com/p/${postId}/`;
            // Suggest the media URL as thumbnail
            additionalFields = { 
              thumbnail: `${baseUrl}media/?size=l`,
              type: pathParts[0] === 'reels' || pathParts[0] === 'reel' ? 'reel' : 
                    pathParts[0] === 'stories' ? 'story' : 'post'
            };
          }
        } catch (e) {
          console.error('Invalid URL for thumbnail extraction:', e);
        }
      }

      setSettings({ 
        ...settings, 
        instagram_items: (settings.instagram_items || []).map((item: any) => 
          item.id === id ? { ...item, [field]: updatedValue, ...additionalFields } : item
        ) 
      });
    };
  
    const moveInstagramItem = (id: number, direction: 'up' | 'down') => {
      const newItems = [...(settings.instagram_items || [])];
      const index = newItems.findIndex(item => item.id === id);
      if (index === -1) return;
      
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newItems.length) return;
      
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      setSettings({ ...settings, instagram_items: newItems });
    };

    const handleInstagramThumbnailUpload = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(`insta-${id}`)
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `insta-${id}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `instagram/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)

        updateInstagramItem(id, 'thumbnail', publicUrl)
        toast.success('Capa enviada com sucesso!')
      } catch (error: any) {
        toast.error('Erro no upload: ' + error.message)
      } finally {
        setUploading(false)
      }
    }

     const handleSave = async () => {
      // Validate social proof templates
      const spTemplates = [
        settings.social_proof?.purchase_template,
        settings.social_proof?.viewers_template,
        settings.social_proof?.stock_template,
        settings.social_proof?.level_template,
        settings.social_proof?.delivered_template,
        settings.social_proof?.payment_template
      ];
 
      for (const t of spTemplates) {
        if (t) {
          const invalid = validateSPPlaceholders(t);
          if (invalid.length > 0) {
            return toast.error(`Placeholder(s) inválidos no balão: ${invalid.join(', ')}`);
          }
        }
      }
 
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
          { key: 'points_multiplier', value: { points_per_real: parseFloat(settings.points_ratio) || 0.5 } },
           { key: 'instagram_post_count', value: settings.instagram_post_count },
           { key: 'instagram_items', value: settings.instagram_items || [] },
            { key: 'admin_whatsapp', value: settings.admin_whatsapp },
            { key: 'social_proof_settings', value: settings.social_proof },
            { key: 'external_notification_config', value: settings.notifications }
          ];
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
                          disabled={!!uploading}
                       />
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          <label 
                            htmlFor="logo-upload" 
                            className="flex-1 w-full flex flex-col items-center justify-center gap-2 p-6 border-4 border-dashed border-zinc-200 rounded-3xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all bg-white group"
                          >
                            {!!uploading ? (
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
                   <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-3">
                       <Input 
                         type="number" 
                         step="0.1"
                         value={settings.points_ratio}
                         onChange={(e) => setSettings({ ...settings, points_ratio: e.target.value })}
                         placeholder="Ex: 0.5"
                         className="rounded-xl border-zinc-200 w-24 font-bold"
                       />
                       <p className="text-[10px] text-zinc-500 font-bold italic">
                         Cada R$ 1,00 gasto gera {settings.points_ratio || 0} pontos.
                       </p>
                     </div>
                     <p className="text-[9px] text-zinc-400 font-medium">
                       Configuração atual: R$ 5,00 = {(parseFloat(settings.points_ratio) * 5).toFixed(1)} pontos.
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
 
            {/* Efeitos e Prova Social */}
            <Card className="border-zinc-200 shadow-sm md:col-span-2 overflow-hidden">
              <CardHeader className="bg-zinc-900 border-b border-zinc-800">
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="p-2 bg-yellow-400 rounded-lg text-black">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  Efeitos e Prova Social (Gatilhos de Venda)
                </CardTitle>
                <CardDescription className="text-zinc-400">Ative notificações flutuantes para aumentar a confiança dos clientes</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl mb-6">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-black uppercase text-zinc-800">Status do Recurso</h4>
                    <p className="text-[10px] font-medium text-zinc-500">Ative ou desative todas as notificações flutuantes no site.</p>
                  </div>
                  <button 
                    onClick={() => setSettings({ ...settings, social_proof: { ...settings.social_proof, enabled: !settings.social_proof.enabled } })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${settings.social_proof?.enabled ? 'bg-green-500' : 'bg-zinc-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.social_proof?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-zinc-500">Intervalo entre notificações (ms)</label>
                    <Input 
                      type="number"
                      value={settings.social_proof?.interval}
                      onChange={(e) => setSettings({ ...settings, social_proof: { ...settings.social_proof, interval: parseInt(e.target.value) } })}
                      className="rounded-xl border-zinc-200"
                    />
                    <p className="text-[10px] text-zinc-400 font-bold italic">Padrão: 15000 (15 segundos)</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-zinc-500 block mb-2">Tipos de Balões Ativos</label>
                    
                    {[
                      { id: 'show_purchases', label: 'Compras Recentes', desc: 'Fernanda acabou de comprar...' },
                      { id: 'show_viewers', label: 'Pessoas Online', desc: '10 pessoas visualizando agora...' },
                      { id: 'show_stock', label: 'Estoque Baixo', desc: 'Restam apenas 5 unidades...' },
                       { id: 'show_levels', label: 'Subida de Nível', desc: 'Jorge subiu para o nível Ouro...' },
                       { id: 'show_delivered', label: 'Entrega Realizada', desc: 'Marina já recebeu em casa...' },
                       { id: 'show_payments', label: 'Pagamento Confirmado', desc: 'Pagamento confirmado para Fernanda...' }
                    ].map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 border border-zinc-100 rounded-xl hover:bg-zinc-50 transition-colors">
                        <input 
                          type="checkbox"
                          checked={settings.social_proof?.[item.id]}
                          onChange={(e) => setSettings({ ...settings, social_proof: { ...settings.social_proof, [item.id]: e.target.checked } })}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="text-[11px] font-black uppercase text-zinc-800">{item.label}</p>
                          <p className="text-[10px] text-zinc-400 italic">Ex: {item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                   <div className="space-y-4">
                     <label className="text-xs font-black uppercase text-zinc-500 block mb-2">Personalizar Mensagens</label>
                     <div className="space-y-3">
                        {[
                          { id: 'purchase_template', label: 'Compra Realizada', placeholder: '{name} comprou em {neighborhood}' },
                          { id: 'viewers_template', label: 'Pessoas Online', placeholder: '{count} pessoas vendo agora' },
                          { id: 'stock_template', label: 'Estoque Baixo', placeholder: 'Restam {stock} de {product}' },
                          { id: 'level_template', label: 'Novo Nível', placeholder: '{name} agora é {level}' },
                          { id: 'delivered_template', label: 'Recebido em Casa', placeholder: '{name} recebeu o pedido' },
                          { id: 'payment_template', label: 'Pagamento Confirmado', placeholder: 'Pagamento de {name} confirmado' }
                        ].map(item => {
                          const invalid = validateSPPlaceholders(settings.social_proof?.[item.id] || '');
                          return (
                            <div key={item.id} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">{item.label}</label>
                                {invalid.length > 0 && (
                                  <Badge variant="destructive" className="text-[7px] px-1 py-0 h-3 animate-pulse uppercase">Inválido: {invalid[0]}</Badge>
                                )}
                              </div>
                              <Input 
                                value={settings.social_proof?.[item.id]}
                                onChange={(e) => setSettings({ ...settings, social_proof: { ...settings.social_proof, [item.id]: e.target.value } })}
                                placeholder={item.placeholder}
                                className={`rounded-xl border ${invalid.length > 0 ? 'border-red-500 bg-red-50' : 'border-zinc-200'} h-9 text-xs transition-all`}
                              />
                            </div>
                          );
                        })}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase">Texto do Tempo (ex: agora mesmo)</label>
                          <Input 
                            value={settings.social_proof?.time_template}
                            onChange={(e) => setSettings({ ...settings, social_proof: { ...settings.social_proof, time_template: e.target.value } })}
                            placeholder="agora mesmo"
                            className="rounded-xl border-zinc-200 h-9 text-xs"
                          />
                        </div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="mt-8 p-6 bg-zinc-900 rounded-3xl text-white shadow-2xl">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                     <div>
                       <div className="flex items-center gap-2 mb-4">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Dica de Configuração</span>
                       </div>
                       <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
                         Use os <span className="text-yellow-400 font-bold">placeholders</span> entre chaves para que o sistema preencha automaticamente com dados reais:
                       </p>
                       <div className="grid grid-cols-2 gap-2">
                         <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-[10px]">
                           <span className="text-yellow-400 font-mono">{"{name}"}</span>: Nome do cliente
                         </div>
                         <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-[10px]">
                           <span className="text-yellow-400 font-mono">{"{neighborhood}"}</span>: Bairro
                         </div>
                         <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-[10px]">
                           <span className="text-yellow-400 font-mono">{"{count}"}</span>: Quantidade
                         </div>
                         <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-[10px]">
                           <span className="text-yellow-400 font-mono">{"{product}"}</span>: Nome do produto
                         </div>
                         <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-[10px]">
                           <span className="text-yellow-400 font-mono">{"{stock}"}</span>: Unidades em estoque
                         </div>
                         <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-[10px]">
                           <span className="text-yellow-400 font-mono">{"{level}"}</span>: Nível de fidelidade
                         </div>
                       </div>
                     </div>
                     <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                       <p className="text-[10px] font-black uppercase text-zinc-400 mb-4 tracking-widest">Exemplo no Site</p>
                       <div className="bg-white rounded-2xl p-4 flex items-start gap-3 shadow-xl">
                         <div className="p-2 bg-green-100 text-green-600 rounded-xl">
                           <ShoppingBag size={20} />
                         </div>
                         <div>
                           <p className="text-xs font-bold text-zinc-800 leading-tight">
                             {(settings.social_proof?.purchase_template || '{name} acabou de fazer uma compra no bairro {neighborhood}')
                               .replace('{name}', 'Fernanda Lima')
                               .replace('{neighborhood}', 'Centro')}
                           </p>
                           <p className="text-[9px] text-zinc-400 mt-1 font-medium">agora mesmo</p>
                         </div>
                       </div>
                     </div>
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
                      <label className="text-xs font-black uppercase text-zinc-500">WhatsApp de Contato (Público)</label>
                      <Input 
                        value={settings.whatsapp}
                        onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                        placeholder="Ex: 5511999999999"
                        className="rounded-xl border-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-zinc-500">WhatsApp do Gestor (Privado)</label>
                      <Input 
                        value={settings.admin_whatsapp}
                        onChange={(e) => setSettings({ ...settings, admin_whatsapp: e.target.value })}
                        placeholder="Ex: 5511999999999"
                        className="rounded-xl border-zinc-200"
                      />
                      <p className="text-[9px] text-zinc-400 font-bold uppercase">Receberá alertas automáticos de novos pedidos.</p>
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
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-zinc-500">Posts Instagram (Dashboard)</label>
                      <Input 
                        type="number"
                        value={settings.instagram_post_count}
                        onChange={(e) => setSettings({ ...settings, instagram_post_count: e.target.value })}
                        className="rounded-xl border-zinc-200 w-24"
                      />
                    </div>
                 </div>
               </div>
             </CardContent>
            </Card>

             {/* Instagram Feed Content */}
             <Card className="border-zinc-200 shadow-sm md:col-span-2">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 rounded-t-xl">
                <CardTitle className="flex items-center gap-2 text-zinc-800">
                  <Instagram className="h-5 w-5 text-pink-600" />
                  Conteúdo do Feed Instagram
                </CardTitle>
                <CardDescription>Adicione Posts, Reels e Stories para aparecer no seu feed (use links do Unsplash ou links diretos de imagens)</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(settings.instagram_items || []).map((item: any) => (
                    <div key={item.id} className="p-4 border border-zinc-100 rounded-[24px] bg-white shadow-sm space-y-3 relative group">
                      <div className="absolute -top-2 -right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button 
                          onClick={() => removeInstagramItem(item.id)}
                          className="bg-red-500 text-white p-1.5 rounded-full shadow-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          onClick={() => moveInstagramItem(item.id, 'up')}
                          className="bg-zinc-800 text-white p-1.5 rounded-full shadow-lg"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button 
                          onClick={() => moveInstagramItem(item.id, 'down')}
                          className="bg-zinc-800 text-white p-1.5 rounded-full shadow-lg"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      
                      <div className="aspect-[9/16] bg-zinc-100 rounded-2xl overflow-hidden relative">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                            <ImageIcon size={32} />
                            <span className="text-[10px] font-black uppercase">Sem Imagem</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-lg">
                          {item.type === 'reel' ? <Play size={12} className="text-pink-600" /> : 
                           item.type === 'story' ? <Type size={12} className="text-pink-600" /> :
                           <Instagram size={12} className="text-pink-600" />}
                        </div>
                      </div>
  
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Tipo</label>
                            <select 
                              value={item.type}
                              onChange={(e) => updateInstagramItem(item.id, 'type', e.target.value)}
                              className="w-full text-[10px] font-bold h-8 border rounded-lg px-2 bg-zinc-50 outline-none focus:ring-1 focus:ring-pink-500"
                            >
                              <option value="post">Post</option>
                              <option value="reel">Reel</option>
                              <option value="story">Story</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Curtidas</label>
                            <Input 
                              value={item.likes}
                              onChange={(e) => updateInstagramItem(item.id, 'likes', e.target.value)}
                              className="h-8 text-[10px] font-bold"
                              placeholder="Ex: 1.2k"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest flex justify-between items-center">
                            <span>Imagem de Capa</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const suggestions = [
                                    'https://images.unsplash.com/photo-1542838132-92c53300491e',
                                    'https://images.unsplash.com/photo-1578916171728-46686eac8d58',
                                    'https://images.unsplash.com/photo-1601598851547-4302969d0614',
                                    'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8',
                                    'https://images.unsplash.com/photo-1543168256-418811576931'
                                  ];
                                  const random = suggestions[Math.floor(Math.random() * suggestions.length)];
                                  updateInstagramItem(item.id, 'thumbnail', random + '?q=80&w=400');
                                }}
                                className="text-pink-600 hover:underline"
                              >
                                Sugerir
                              </button>
                              <label className="cursor-pointer text-blue-600 hover:underline flex items-center gap-1">
                                {uploading === `insta-${item.id}` ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  onChange={(e) => handleInstagramThumbnailUpload(item.id, e)}
                                  disabled={uploading === `insta-${item.id}`}
                                />
                                Subir Foto
                              </label>
                            </div>
                          </label>
                          <Input 
                            value={item.thumbnail}
                            onChange={(e) => updateInstagramItem(item.id, 'thumbnail', e.target.value)}
                            className="h-8 text-[10px]"
                            placeholder="Link da imagem ou faça upload"
                          />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest flex justify-between">
                             URL do Destino
                             <span className="text-[8px] text-pink-500 font-bold">Auto-importa foto</span>
                           </label>
                           <div className="flex gap-1">
                             <Input 
                               value={item.url}
                               onChange={(e) => updateInstagramItem(item.id, 'url', e.target.value)}
                               className="h-8 text-[10px] flex-1"
                               placeholder="https://instagram.com/p/..."
                             />
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={addInstagramItem}
                    className="aspect-[9/16] border-4 border-dashed border-zinc-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-zinc-400 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 transition-all group"
                  >
                    <div className="bg-zinc-50 p-4 rounded-full group-hover:bg-white shadow-inner group-hover:shadow-md transition-all">
                      <Plus size={32} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Novo Item</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Notificações (SMS e Ligações) */}
            <Card className="border-zinc-200 shadow-sm md:col-span-2">
              <CardHeader className="bg-zinc-900 text-white border-b border-zinc-100 rounded-t-xl">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Notificações Críticas (SMS e Ligações)
                </CardTitle>
                <CardDescription className="text-zinc-400">Habilite avisos por SMS ou Ligação para o proprietário em novos pedidos</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* SMS Settings */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-black uppercase italic tracking-tighter">Notificações por SMS</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Avisar via mensagem de texto</p>
                        </div>
                      </div>
                      <Switch 
                        checked={settings.notifications?.sms_enabled} 
                        onCheckedChange={(val) => setSettings({
                          ...settings, 
                          notifications: { ...settings.notifications, sms_enabled: val }
                        })} 
                      />
                    </div>

                    {settings.notifications?.sms_enabled && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500">Provedor SMS</label>
                          <Select 
                            value={settings.notifications?.sms_provider} 
                            onValueChange={(val) => setSettings({
                              ...settings, 
                              notifications: { ...settings.notifications, sms_provider: val }
                            })}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="twilio">Twilio</SelectItem>
                              <SelectItem value="zenvia">Zenvia</SelectItem>
                              <SelectItem value="custom">Custom Webhook</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500">API Key / Token</label>
                          <Input 
                            type="password"
                            value={settings.notifications?.sms_api_key}
                            onChange={(e) => setSettings({
                              ...settings, 
                              notifications: { ...settings.notifications, sms_api_key: e.target.value }
                            })}
                            className="rounded-xl h-10"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Call Settings */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-black uppercase italic tracking-tighter">Notificações por Ligação</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Receber chamada automática</p>
                        </div>
                      </div>
                      <Switch 
                        checked={settings.notifications?.call_enabled} 
                        onCheckedChange={(val) => setSettings({
                          ...settings, 
                          notifications: { ...settings.notifications, call_enabled: val }
                        })} 
                      />
                    </div>

                    {settings.notifications?.call_enabled && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500">API Token (TotalVoice/Zenvia)</label>
                          <Input 
                            type="password"
                            value={settings.notifications?.call_api_key}
                            onChange={(e) => setSettings({
                              ...settings, 
                              notifications: { ...settings.notifications, call_api_key: e.target.value }
                            })}
                            className="rounded-xl h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500">Telefone do Proprietário</label>
                          <Input 
                            value={settings.notifications?.call_admin_phone}
                            onChange={(e) => setSettings({
                              ...settings, 
                              notifications: { ...settings.notifications, call_admin_phone: e.target.value }
                            })}
                            placeholder="Ex: 5511999999999"
                            className="rounded-xl h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500">Mensagem de Voz (TTS)</label>
                          <Input 
                            value={settings.notifications?.call_tts_message}
                            onChange={(e) => setSettings({
                              ...settings, 
                              notifications: { ...settings.notifications, call_tts_message: e.target.value }
                            })}
                            className="rounded-xl h-10"
                          />
                        </div>
                      </div>
                    )}
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