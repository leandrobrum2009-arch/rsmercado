 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
  import { Loader2, Send, MessageSquare, ShieldCheck, AlertTriangle, Calendar, Clock, Trash2, CheckCircle, Filter, Users } from 'lucide-react'
import { toast } from '@/lib/toast'
import { getWhatsAppConfig, saveWhatsAppConfig, WhatsAppConfig, sendWhatsAppMessage } from '@/lib/whatsapp'

export function WhatsAppManager() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    apiKey: '',
    instanceId: '',
    apiUrl: 'https://api.evolution-api.com',
    enabled: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsAdding] = useState(false)
   const [testPhone, setTestPhone] = useState('')
   const [blastMessage, setBlastMessage] = useState('')
   const [isBlasting, setIsBlasting] = useState(false)
   const [scheduledDate, setScheduledDate] = useState('')
   const [targetCoupon, setTargetCoupon] = useState('all')
   const [availableCoupons, setAvailableCoupons] = useState<string[]>([])
   const [campaigns, setCampaigns] = useState<any[]>([])
   const [loadingCampaigns, setLoadingCampaigns] = useState(true)
 
   const fetchCampaigns = async () => {
     setLoadingCampaigns(true)
     try {
       const { data } = await supabase
         .from('whatsapp_campaigns')
         .select('*')
         .order('created_at', { ascending: false })
       setCampaigns(data || [])
     } catch (e) {
       console.error('Error fetching campaigns:', e)
     } finally {
       setLoadingCampaigns(false)
     }
   }
 
   const deleteCampaign = async (id: string) => {
     const { error } = await supabase.from('whatsapp_campaigns').delete().eq('id', id)
     if (error) toast.error('Erro ao excluir campanha')
     else {
       toast.success('Campanha excluída')
       fetchCampaigns()
     }
   }
 
   const fetchCoupons = async () => {
     const { data } = await supabase.from('orders').select('coupon_code').not('coupon_code', 'is', null)
     if (data) {
       const unique = Array.from(new Set(data.map((o: any) => o.coupon_code).filter(Boolean))) as string[]
       setAvailableCoupons(unique)
     }
   }
 
   const handleBlast = async () => {
     if (!blastMessage) return toast.error('Digite a mensagem para o envio em massa')
     
     if (scheduledDate) {
       setIsBlasting(true)
       const { error } = await supabase.from('whatsapp_campaigns').insert({
         message: blastMessage,
         status: 'scheduled',
         scheduled_for: new Date(scheduledDate).toISOString(),
         target_audience: targetCoupon === 'all' ? 'all' : `coupon:${targetCoupon}`
       })
       
       if (error) toast.error('Erro ao agendar envio: ' + error.message)
       else {
         toast.success('Envio agendado com sucesso!')
         setBlastMessage('')
         setScheduledDate('')
         fetchCampaigns()
       }
       setIsBlasting(false)
       return
     }
 
     const confirmMsg = targetCoupon === 'all' 
       ? 'Deseja enviar esta mensagem para TODOS os clientes cadastrados AGORA?' 
       : `Deseja enviar para os clientes que usaram o cupom "${targetCoupon}"?`
 
     if (!confirm(confirmMsg)) return
     
     setIsBlasting(true)
     try {
       let customerQuery = supabase.from('profiles').select('id, whatsapp').not('whatsapp', 'is', null)
       
       if (targetCoupon !== 'all') {
         const { data: orderUsers } = await supabase.from('orders').select('user_id').eq('coupon_code', targetCoupon)
         const userIds = Array.from(new Set(orderUsers?.map(o => o.user_id).filter(Boolean)))
         if (userIds.length === 0) {
           toast.error('Nenhum cliente encontado para este cupom')
           setIsBlasting(false)
           return
         }
         customerQuery = customerQuery.in('id', userIds)
       }
 
       const { data: customers } = await customerQuery
       
       if (!customers || customers.length === 0) {
         toast.error('Nenhum cliente com WhatsApp encontrado')
         return
       }
 
       const { data: campaign, error: campaignError } = await supabase.from('whatsapp_campaigns').insert({
         message: blastMessage,
         status: 'processing',
         total_recipients: customers.length,
         target_audience: targetCoupon === 'all' ? 'all' : `coupon:${targetCoupon}`
       }).select().single()
 
       if (campaignError) throw campaignError
 
       let count = 0
       for (const customer of customers) {
         const result = await sendWhatsAppMessage(customer.whatsapp, blastMessage)
         if (result.success) count++
         await new Promise(resolve => setTimeout(resolve, 800))
       }
       
       await supabase.from('whatsapp_campaigns').update({
         status: 'sent',
         sent_count: count
       }).eq('id', campaign.id)
 
       toast.success(`${count} mensagens enviadas com sucesso!`)
       setBlastMessage('')
       fetchCampaigns()
     } catch (error: any) {
       toast.error('Erro no envio em massa: ' + error.message)
     } finally {
       setIsBlasting(false)
     }
   }

   useEffect(() => {
     fetchConfig()
     fetchCampaigns()
     fetchCoupons()
   }, [])

  const fetchConfig = async () => {
    const data = await getWhatsAppConfig()
    if (data) setConfig(data)
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsAdding(true)
    const { error } = await saveWhatsAppConfig(config)
    setIsAdding(false)
    
    if (error) toast.error('Erro ao salvar configuração')
    else toast.success('Configuração de WhatsApp salva!')
  }

  const handleTest = async () => {
    if (!testPhone) return toast.error('Digite um número para teste')
    toast.info('Enviando mensagem de teste...')
    const result = await sendWhatsAppMessage(testPhone, '🚀 *Teste de Notificação* - Seu sistema está conectado!')
    
    if (result.success) {
      if (result.method === 'browser') {
        toast.success('Link aberto no navegador (Modo Manual)')
      } else {
        toast.success('Mensagem enviada com sucesso via API!')
      }
    } else {
      const errorMsg = result.result?.message || result.result?.error || 'Erro desconhecido';
      toast.error(`Falha na API: ${errorMsg} (Status: ${result.status})`);
      console.error('WhatsApp Test Error:', result);
    }
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

   return (
     <div className="space-y-8">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="border-green-200 shadow-lg overflow-hidden flex flex-col">
           <CardHeader className="bg-green-600 text-white">
             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
               <Send size={16} /> Mala Direta (Envio em Massa)
             </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-4 flex-1">
             <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2">
                 <Filter size={12} /> Segmentar por Cupom
               </Label>
               <select 
                 className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs font-bold bg-white"
                 value={targetCoupon}
                 onChange={(e) => setTargetCoupon(e.target.value)}
               >
                 <option value="all">Todos os Clientes</option>
                 {availableCoupons.map(cp => (
                   <option key={cp} value={cp}>Quem usou cupom: {cp}</option>
                 ))}
               </select>
               {targetCoupon !== 'all' && (
                 <p className="text-[9px] text-zinc-500 font-bold italic">
                   Filtrando clientes que já finalizaram pedidos usando este código.
                 </p>
               )}
             </div>
 
             <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-zinc-500">Mensagem para todos os clientes</Label>
               <textarea 
                 className="w-full h-32 p-4 rounded-2xl border border-zinc-200 text-sm focus:ring-green-500 outline-none"
                 placeholder="Ex: 🚀 Super Oferta de hoje: Arroz Tio João 5kg por apenas R$ 24,90! Venha conferir no site: https://sualoja.com"
                 value={blastMessage}
                 onChange={(e) => setBlastMessage(e.target.value)}
               />
             </div>
 
             <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2">
                 <Calendar size={12} /> Agendar Envio (Opcional)
               </Label>
               <Input 
                 type="datetime-local" 
                 className="rounded-xl"
                 value={scheduledDate}
                 onChange={(e) => setScheduledDate(e.target.value)}
               />
             </div>
 
             <Button 
               onClick={handleBlast} 
               disabled={isBlasting || !config.enabled} 
               className="w-full bg-green-600 hover:bg-green-700 font-black uppercase italic h-12 rounded-2xl shadow-xl shadow-green-100 mt-2"
             >
               {isBlasting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
               {!config.enabled 
                 ? 'Ative a API para usar Mala Direta' 
                 : scheduledDate 
                   ? 'Agendar Envio em Massa' 
                   : 'Disparar para todos agora'}
             </Button>
           </CardContent>
         </Card>
 
         <Card className="border-zinc-200 shadow-lg overflow-hidden flex flex-col">
           <CardHeader className="bg-zinc-100 border-b">
             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-zinc-800">
               <Clock size={16} /> Campanhas e Agendamentos
             </CardTitle>
           </CardHeader>
           <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
             {loadingCampaigns ? (
               <div className="flex justify-center p-8"><Loader2 className="animate-spin text-zinc-300" /></div>
             ) : campaigns.length === 0 ? (
               <div className="p-12 text-center text-zinc-400">
                 <Send className="mx-auto mb-2 opacity-20" size={48} />
                 <p className="text-xs font-bold uppercase">Nenhuma campanha enviada</p>
               </div>
             ) : (
               <div className="divide-y">
                 {campaigns.map(c => (
                   <div key={c.id} className="p-4 hover:bg-zinc-50 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                         {c.status === 'sent' && <CheckCircle size={14} className="text-green-600" />}
                         {c.status === 'scheduled' && <Calendar size={14} className="text-blue-600" />}
                         {c.status === 'processing' && <Loader2 size={14} className="text-amber-500 animate-spin" />}
                         <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                           c.status === 'sent' ? 'bg-green-100 text-green-700' : 
                           c.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 
                           'bg-amber-100 text-amber-700'
                         }`}>
                           {c.status === 'sent' ? 'Enviado' : c.status === 'scheduled' ? 'Agendado' : 'Processando'}
                         </span>
                       </div>
                       <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-300 hover:text-red-500" onClick={() => deleteCampaign(c.id)}>
                         <Trash2 size={14} />
                       </Button>
                     </div>
                     <p className="text-xs text-zinc-700 font-medium line-clamp-2 mb-2 italic">"{c.message}"</p>
                     <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase">
                       <span>{new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       {c.status === 'sent' && <span>{c.sent_count}/{c.total_recipients} envios</span>}
                       {c.status === 'scheduled' && <span className="text-blue-600 flex items-center gap-1"><Clock size={10} /> {new Date(c.scheduled_for).toLocaleDateString()} {new Date(c.scheduled_for).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="text-green-600" /> 
                Configuração da API WhatsApp
              </CardTitle>
              <CardDescription>Conecte seu sistema a uma API de envio automático (ex: Evolution API).</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={config.enabled} 
                onCheckedChange={(val) => setConfig({...config, enabled: val})} 
              />
              <Label>Ativar API</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!config.enabled && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-800 text-sm">
              <AlertTriangle className="flex-shrink-0" />
              <p>A API está desativada. O sistema usará o modo <strong>Manual (wa.me)</strong> para abrir o WhatsApp no navegador ao enviar notificações.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg md:col-span-2 flex gap-3 text-blue-800 text-xs">
              <ShieldCheck className="flex-shrink-0" />
              <div>
                <p className="font-bold uppercase mb-1">Dica de Configuração:</p>
                <p>Se estiver usando <strong>Evolution API</strong>, certifique-se de que a <strong>API URL</strong> não termina com barra e que a <strong>API Key</strong> é o token correto da instância ou o Global Token.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input 
                placeholder="https://sua-api.com" 
                value={config.apiUrl}
                onChange={(e) => setConfig({...config, apiUrl: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Instance ID</Label>
              <Input 
                placeholder="Ex: Supermercado_Main" 
                value={config.instanceId}
                onChange={(e) => setConfig({...config, instanceId: e.target.value})}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>API Key / Token</Label>
              <Input 
                type="password"
                placeholder="Ex: apikey_123... ou token_abc..." 
                value={config.apiKey}
                onChange={(e) => setConfig({...config, apiKey: e.target.value})}
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Teste de Envio</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input 
            placeholder="Seu celular (com DDD)" 
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
          />
          <Button variant="outline" onClick={handleTest}>
            <Send className="mr-2 h-4 w-4" /> Testar
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-zinc-50 border-zinc-200">
        <CardContent className="pt-6 text-sm text-zinc-600">
          <h4 className="font-bold mb-2">Como configurar?</h4>
          <p className="mb-2">1. Recomendamos o uso da <strong>Evolution API</strong> (open source).</p>
          <p className="mb-2">2. Crie uma instância e conecte seu QR Code.</p>
          <p>3. Insira os dados acima para que o sistema possa enviar cupons e avisos de pedidos automaticamente.</p>
        </CardContent>
      </Card>
    </div>
  )
}
