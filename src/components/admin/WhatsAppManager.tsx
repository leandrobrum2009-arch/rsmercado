 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
 import { Loader2, Send, MessageSquare, ShieldCheck, AlertTriangle, Calendar, Clock, Trash2, CheckCircle, Filter, Users, FileText, Plus, ShieldAlert, Zap, ListChecks, Tag, Eye, Search } from 'lucide-react'
 import { toast } from '@/lib/toast'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
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
   const [targetSegment, setTargetSegment] = useState('all')
   const [targetCoupon, setTargetCoupon] = useState('')
   const [availableCoupons, setAvailableCoupons] = useState<string[]>([])
   const [campaigns, setCampaigns] = useState<any[]>([])
   const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
   const [activeHistoryTab, setActiveHistoryTab] = useState<'campaigns' | 'logs' | 'auto'>('campaigns')
   const [autoTemplates, setAutoTemplates] = useState<any>({
     loyalty_redeem: '',
     points_earned: '',
     status_update: '',
     promotion: '',
     order: '',
     order_summary: '',
     flyer_share: ''
   })
   const [templates, setTemplates] = useState<any[]>([])
   const [newTemplate, setNewTemplate] = useState({ name: '', content: '' })
    const [isSavingTemplate, setIsSavingTemplate] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [customerSearch, setCustomerSearch] = useState('')
    const [customersList, setCustomersList] = useState<any[]>([])

  const suggestedTemplates = [
    { 
      name: '🚀 Ofertas da Semana', 
      content: '📢 *O NOVO ENCARTE CHEGOU!* 📢\n\nOlá {{nome}}! Confira as melhores ofertas que preparamos para você esta semana.\n\n🛒 Acesse agora: ' + window.location.origin + '\n\n*RS Supermercado - Qualidade e Preço Baixo!*' 
    },
    { 
      name: '🥩 Promoção Açougue', 
      content: '🥩 *DIA DE CHURRASCO!* 🥩\n\nOlá {{nome}}, as melhores carnes com os melhores preços estão aqui. Venha conferir nossa seleção especial de hoje.\n\n📍 ' + window.location.origin + '\n\n*Aproveite enquanto durarem os estoques!*' 
    },
    { 
      name: '🎁 Cupom de Desconto', 
      content: '🎁 *UM PRESENTE PRA VOCÊ!* 🎁\n\nOi {{nome}}! Use o cupom *VOLTEI5* e ganhe 5% de desconto na sua próxima compra pelo site.\n\n👉 Compre aqui: ' + window.location.origin + '\n\n*Válido por tempo limitado!*' 
    },
    { 
      name: '🕒 Horário Especial', 
      content: '🕒 *AVISO IMPORTANTE* 🕒\n\nInformamos que hoje estaremos abertos em horário especial: das 08h às 18h.\n\nAntecipe suas compras! 🛒' 
    }
  ]

   const fetchTemplates = async () => {
     const { data } = await supabase.from('whatsapp_templates').select('*').order('name')
     setTemplates(data || [])
   }
 
   const handleSaveTemplate = async () => {
     if (!newTemplate.name || !newTemplate.content) return toast.error('Preencha nome e conteúdo do modelo')
     setIsSavingTemplate(true)
     const { error } = await supabase.from('whatsapp_templates').insert(newTemplate)
     if (error) toast.error('Erro ao salvar modelo')
     else {
       toast.success('Modelo salvo!')
       setNewTemplate({ name: '', content: '' })
       fetchTemplates()
     }
     setIsSavingTemplate(false)
   }
 
   const deleteTemplate = async (id: string) => {
     const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id)
     if (error) toast.error('Erro ao excluir modelo')
     else {
       toast.success('Modelo excluído')
       fetchTemplates()
     }
   }
 
 
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
 
      const segmentLabels: Record<string, string> = {
        all: 'TODOS os clientes',
        new: 'novos clientes (30 dias)',
        vip: 'clientes VIP (+500 pts)',
        active: 'clientes ativos (compras recentes)',
        inactive: 'clientes inativos (sem compras recentes)',
        coupon: `quem usou o cupom "${targetCoupon}"`
      }

      const confirmMsg = `Deseja enviar esta mensagem para ${segmentLabels[targetSegment] || 'o segmento selecionado'} AGORA?`
 
     if (!confirm(confirmMsg)) return
     
     setIsBlasting(true)
     try {
        let customers: any[] = []
         const baseQuery = supabase.from('profiles').select('id, whatsapp, full_name').not('whatsapp', 'is', null).eq('accept_marketing', true)

        if (targetSegment === 'all') {
          const { data } = await baseQuery
          customers = data || []
        } else if (targetSegment === 'new') {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          const { data } = await baseQuery.gt('created_at', thirtyDaysAgo)
          customers = data || []
        } else if (targetSegment === 'vip') {
          const { data } = await baseQuery.gt('points_balance', 500)
          customers = data || []
        } else if (targetSegment === 'coupon') {
          const { data: orderUsers } = await supabase.from('orders').select('user_id').eq('coupon_code', targetCoupon)
          const userIds = Array.from(new Set(orderUsers?.map(o => o.user_id).filter(Boolean)))
          if (userIds.length > 0) {
            const { data } = await baseQuery.in('id', userIds)
            customers = data || []
          }
        } else if (targetSegment === 'active' || targetSegment === 'inactive') {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          const { data: recentOrders } = await supabase.from('orders').select('user_id').gt('created_at', thirtyDaysAgo)
          const activeUserIds = Array.from(new Set(recentOrders?.map(o => o.user_id).filter(Boolean)))
          
          if (targetSegment === 'active') {
            if (activeUserIds.length > 0) {
              const { data } = await baseQuery.in('id', activeUserIds)
              customers = data || []
            }
          } else {
            const { data } = await baseQuery.not('id', 'in', `(${activeUserIds.join(',')})`)
            customers = data || []
          }
        }
       
       if (!customers || customers.length === 0) {
          toast.error('Nenhum cliente encontrado para este segmento')
          setIsBlasting(false)
         return
       }
 
       const { data: campaign, error: campaignError } = await supabase.from('whatsapp_campaigns').insert({
         message: blastMessage,
         status: 'processing',
         total_recipients: customers.length,
          target_audience: targetSegment === 'coupon' ? `coupon:${targetCoupon}` : targetSegment
       }).select().single()
 
       if (campaignError) throw campaignError
 
       let count = 0
        for (const customer of customers) {
          const personalizedMessage = blastMessage.replace(/{{nome}}/g, customer.full_name?.split(' ')[0] || 'Cliente')
          const result = await sendWhatsAppMessage(customer.whatsapp, personalizedMessage)
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

    const fetchLogs = async () => {
      setLoadingLogs(true)
      try {
        const { data } = await supabase
          .from('whatsapp_logs')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(50)
        setLogs(data || [])
      } catch (e) {
        console.error('Error fetching logs:', e)
      } finally {
        setLoadingLogs(false)
      }
    }

   const fetchAutoTemplates = async () => {
     const { data } = await supabase.from('store_settings').select('value').eq('key', 'whatsapp_templates').maybeSingle()
     if (data?.value) setAutoTemplates(data.value)
   }
 
   const handleSaveAutoTemplates = async () => {
     const { error } = await supabase.from('store_settings').upsert({ key: 'whatsapp_templates', value: autoTemplates }, { onConflict: 'key' })
     if (error) toast.error('Erro ao salvar modelos automáticos')
     else toast.success('Modelos automáticos salvos!')
   }
 
    useEffect(() => {
      fetchConfig()
      fetchCampaigns()
       fetchLogs()
      fetchCoupons()
      fetchTemplates()
      fetchRecentCustomers()
     fetchAutoTemplates()
    }, [])
 
    const fetchRecentCustomers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, whatsapp')
        .not('whatsapp', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)
      setCustomersList(data || [])
    }
 
    const filteredCustomersList = customersList.filter(c => 
      c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.whatsapp?.includes(customerSearch)
    )

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
            <CardContent className="p-6 space-y-6 flex-1">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2">
                  <FileText size={12} /> Usar Modelo Salvo
                </Label>
                <select 
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs font-bold bg-white"
                  onChange={(e) => {
                    const template = templates.find(t => t.id === e.target.value)
                    if (template) setBlastMessage(template.content)
                  }}
                >
                  <option value="">Selecione um modelo...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2">
                    <Users size={12} /> Segmento de Público
                  </Label>
                  <select 
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs font-bold bg-white"
                    value={targetSegment}
                    onChange={(e) => setTargetSegment(e.target.value)}
                  >
                    <option value="all">Todos os Clientes</option>
                    <option value="new">Novos (30 dias)</option>
                    <option value="vip">Clientes VIP (+500 pts)</option>
                    <option value="active">Ativos (Compraram recentemente)</option>
                    <option value="inactive">Inativos (Sem compras recentes)</option>
                    <option value="coupon">Por Cupom Específico</option>
                  </select>
                </div>

                {targetSegment === 'coupon' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2">
                      <Tag size={12} /> Selecione o Cupom
                    </Label>
                    <select 
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs font-bold bg-white"
                      value={targetCoupon}
                      onChange={(e) => setTargetCoupon(e.target.value)}
                    >
                      <option value="">Escolha um cupom...</option>
                      {availableCoupons.map(cp => (
                        <option key={cp} value={cp}>{cp}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
 
             <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-zinc-500">Mensagem para todos os clientes</Label>
                <div className="relative">
                  <textarea 
                    className="w-full h-32 p-4 rounded-2xl border border-zinc-200 text-sm focus:ring-green-500 outline-none"
                    placeholder="Ex: Olá {{nome}}! 🚀 Super Oferta de hoje..."
                    value={blastMessage}
                    onChange={(e) => setBlastMessage(e.target.value)}
                  />
                   <div className="absolute bottom-4 right-4 flex gap-1">
                     <button 
                       type="button"
                       onClick={() => setBlastMessage(prev => prev + ' {{nome}} ')}
                       className="bg-zinc-100 hover:bg-zinc-200 text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-zinc-200 transition-colors"
                     >
                       + Nome
                     </button>
                     <button 
                       type="button"
                       onClick={() => setBlastMessage(prev => prev + ' {{data}} ')}
                       className="bg-zinc-100 hover:bg-zinc-200 text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-zinc-200 transition-colors"
                     >
                       + Data
                     </button>
                   </div>
                </div>
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
 
              <div className="flex gap-2 mt-2">
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="flex-1 h-12 rounded-2xl border-2 border-green-200 font-black uppercase italic"
                      disabled={!blastMessage || !config.enabled}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-[#e5ddd5] border-none p-0 overflow-hidden rounded-[2rem]">
                    <div className="bg-[#075e54] p-4 text-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-300 shrink-0" />
                      <div>
                        <h3 className="font-bold text-sm">RS Supermercado</h3>
                        <p className="text-[10px] opacity-80">Online</p>
                      </div>
                    </div>
                    <div className="p-4 min-h-[300px] flex flex-col gap-4">
                      <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%] self-start relative">
                        <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent" />
                         <div className="text-sm whitespace-pre-wrap">
                           {blastMessage
                             ? blastMessage
                                 .replace(/{{nome}}/g, 'Leandro')
                                 .replace(/{{empresa}}/g, 'Supermercado RS')
                                 .replace(/{{data}}/g, new Date().toLocaleDateString())
                             : 'Sua mensagem aparecerá aqui...'}
                         </div>
                        <p className="text-[9px] text-zinc-400 text-right mt-1">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-zinc-200">
                       <Button 
                         onClick={() => {
                           setIsPreviewOpen(false)
                           handleBlast()
                         }}
                         className="w-full bg-[#25d366] hover:bg-[#128c7e] text-white font-black uppercase rounded-xl h-12"
                         disabled={isBlasting}
                       >
                         {isBlasting ? (
                           <Loader2 className="animate-spin mr-2" />
                         ) : scheduledDate ? (
                           <Calendar className="mr-2 h-4 w-4" />
                         ) : (
                           <Send className="mr-2 h-4 w-4" />
                         )}
                         {scheduledDate 
                           ? `Confirmar Agendamento (${new Date(scheduledDate).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})})` 
                           : 'Confirmar e Enviar Agora'}
                       </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  onClick={handleBlast} 
                  disabled={isBlasting || !config.enabled} 
                  className="flex-[2] bg-green-600 hover:bg-green-700 font-black uppercase italic h-12 rounded-2xl shadow-xl shadow-green-100"
                >
                  {isBlasting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                  {!config.enabled 
                    ? 'Ative a API' 
                    : scheduledDate 
                      ? 'Agendar' 
                      : 'Enviar Agora'}
                </Button>
              </div>
           </CardContent>
         </Card>
 
        <Card className="border-zinc-200 shadow-lg overflow-hidden flex flex-col">
          <CardHeader className="bg-zinc-100 border-b p-0">
            <div className="flex border-b">
              <button
                onClick={() => setActiveHistoryTab('campaigns')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeHistoryTab === 'campaigns' ? 'bg-white text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <Clock size={14} /> Campanhas
              </button>
               <button
                 onClick={() => setActiveHistoryTab('logs')}
                 className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeHistoryTab === 'logs' ? 'bg-white text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
               >
                 <ListChecks size={14} /> Histórico (Logs)
               </button>
               <button
                 onClick={() => setActiveHistoryTab('auto')}
                 className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeHistoryTab === 'auto' ? 'bg-white text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
               >
                 <Zap size={14} /> Automáticas
               </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            {activeHistoryTab === 'campaigns' ? (
              loadingCampaigns ? (
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
              )
            ) : (
              loadingLogs ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-zinc-300" /></div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center text-zinc-400">
                  <ListChecks className="mx-auto mb-2 opacity-20" size={48} />
                  <p className="text-xs font-bold uppercase">Nenhum log individual</p>
                </div>
              ) : (
                <div className="divide-y">
                  {logs.map(log => (
                    <div key={log.id} className="p-4 hover:bg-zinc-50 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-zinc-900">{log.phone}</span>
                        <span className="text-[9px] font-bold text-zinc-400">{new Date(log.sent_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 italic line-clamp-1">"{log.message_text}"</p>
                    </div>
                  ))}
                </div>
              )
             ) : (
               <div className="p-6 space-y-6">
                 <div className="space-y-4">
                   <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-xs">
                     <AlertTriangle className="flex-shrink-0" />
                     <p>Use placeholders como <span className="font-mono font-bold text-red-600">{`{customer_name}`}</span>, <span className="font-mono font-bold text-red-600">{`{order_id}`}</span>, <span className="font-mono font-bold text-red-600">{`{status}`}</span> para dados dinâmicos.</p>
                   </div>
 
                   {[
                     { id: 'order', label: 'Pedido Recebido', placeholder: 'Confirmação inicial' },
                     { id: 'status_update', label: 'Mundança de Status', placeholder: 'Enviado ao trocar status' },
                     { id: 'order_summary', label: 'Resumo do Pedido', placeholder: 'Lista de itens e total' },
                     { id: 'points_earned', label: 'Pontos Ganhos', placeholder: 'Ao entregar pedido' },
                     { id: 'loyalty_redeem', label: 'Resgate de Prêmio', placeholder: 'Confirmação de troca' },
                     { id: 'promotion', label: 'Oferta do Produto', placeholder: 'Enviado pelo OfferManager' },
                     { id: 'flyer_share', label: 'Compartilhar Encarte', placeholder: 'No FlyerCreator' }
                   ].map((item) => (
                     <div key={item.id} className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-zinc-500">{item.label}</Label>
                       <textarea 
                         className="w-full h-24 p-3 rounded-xl border border-zinc-200 text-xs focus:ring-green-500 outline-none"
                         value={autoTemplates[item.id]}
                         onChange={(e) => setAutoTemplates({...autoTemplates, [item.id]: e.target.value})}
                         placeholder={`Modelo para ${item.label.toLowerCase()}...`}
                       />
                     </div>
                   ))}
 
                   <Button 
                     onClick={handleSaveAutoTemplates}
                     className="w-full bg-green-600 hover:bg-green-700 font-black uppercase italic"
                   >
                     Salvar Modelos Automáticos
                   </Button>
                 </div>
               </div>
             )}
           </CardContent>
         </Card>
         </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="border-zinc-200 shadow-lg overflow-hidden flex flex-col">
           <CardHeader className="bg-zinc-100 border-b">
             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-zinc-800">
               <FileText size={16} /> Criar Novo Modelo
             </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2 mb-2">
                {suggestedTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewTemplate({ name: t.name, content: t.content })}
                    className="text-[9px] font-black uppercase bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-lg transition-colors"
                  >
                    + {t.name.split(' ')[1]}
                  </button>
                ))}
              </div>
             <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-zinc-500">Nome do Modelo</Label>
               <Input 
                 placeholder="Ex: Oferta de Fim de Semana" 
                 value={newTemplate.name}
                 onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
               />
             </div>
             <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-zinc-500">Conteúdo da Mensagem</Label>
               <textarea 
                 className="w-full h-32 p-4 rounded-2xl border border-zinc-200 text-sm focus:ring-green-500 outline-none"
                 placeholder="Sua mensagem aqui..."
                 value={newTemplate.content}
                 onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
               />
             </div>
             <Button 
               onClick={handleSaveTemplate} 
               disabled={isSavingTemplate} 
               className="w-full bg-zinc-900 text-white font-black uppercase italic h-12 rounded-2xl"
             >
               {isSavingTemplate ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
               Salvar Modelo de Mensagem
             </Button>
           </CardContent>
         </Card>
 
         <Card className="border-zinc-200 shadow-lg overflow-hidden flex flex-col">
           <CardHeader className="bg-zinc-100 border-b">
             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-zinc-800">
               <FileText size={16} /> Meus Modelos
             </CardTitle>
           </CardHeader>
           <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
             {templates.length === 0 ? (
               <div className="p-12 text-center text-zinc-400">
                 <FileText className="mx-auto mb-2 opacity-20" size={48} />
                 <p className="text-xs font-bold uppercase">Nenhum modelo salvo</p>
               </div>
             ) : (
               <div className="divide-y">
                 {templates.map(t => (
                   <div key={t.id} className="p-4 hover:bg-zinc-50 transition-colors">
                     <div className="flex justify-between items-start mb-1">
                       <p className="font-black uppercase text-xs tracking-tight">{t.name}</p>
                       <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-300 hover:text-red-500" onClick={() => deleteTemplate(t.id)}>
                         <Trash2 size={14} />
                       </Button>
                     </div>
                     <p className="text-xs text-zinc-500 font-medium line-clamp-2 italic">"{t.content}"</p>
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
          <div className="pt-4 border-t space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-500" /> Segurança e Automatização
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div>
                  <p className="text-xs font-black uppercase">Bloquear Reenvio Automático</p>
                  <p className="text-[10px] text-zinc-500 font-bold">Evita enviar a mesma mensagem 2x (24h)</p>
                </div>
                <Switch 
                  checked={config.prevent_duplicates} 
                  onCheckedChange={(val) => setConfig({...config, prevent_duplicates: val})} 
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div>
                  <p className="text-xs font-black uppercase">Avisar Status do Pedido</p>
                  <p className="text-[10px] text-zinc-500 font-bold">Envia Whats ao mudar status do pedido</p>
                </div>
                <Switch 
                  checked={config.notify_order_status !== false} 
                  onCheckedChange={(val) => setConfig({...config, notify_order_status: val})} 
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div>
                  <p className="text-xs font-black uppercase">Avisar Admin (Novo Pedido)</p>
                  <p className="text-[10px] text-zinc-500 font-bold">Notifica o admin sobre novas vendas</p>
                </div>
                <Switch 
                  checked={config.notify_new_order_admin !== false} 
                  onCheckedChange={(val) => setConfig({...config, notify_new_order_admin: val})} 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-zinc-400">Janela de Bloqueio (Horas)</Label>
                <Input 
                  type="number"
                  value={config.duplicate_cooldown_hours || 24}
                  onChange={(e) => setConfig({...config, duplicate_cooldown_hours: parseInt(e.target.value)})}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 bg-zinc-900 text-white font-black uppercase italic rounded-2xl shadow-xl shadow-zinc-200 mt-4">
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
            Salvar Configurações de WhatsApp
          </Button>
        </CardContent>
      </Card>
       <Card className="border-zinc-200 shadow-sm">
         <CardHeader className="bg-zinc-50 border-b py-3 px-4">
           <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
             <Zap size={14} className="text-amber-500" /> Teste Rápido Individual
           </CardTitle>
         </CardHeader>
         <CardContent className="p-4 space-y-4">
           <div className="space-y-2">
             <Label className="text-[10px] font-black uppercase text-zinc-500">1. Selecionar Usuário para Teste</Label>
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
               <Input 
                 placeholder="Buscar por nome ou celular..." 
                 value={customerSearch}
                 onChange={(e) => setCustomerSearch(e.target.value)}
                 className="pl-10 text-xs h-9"
               />
             </div>
             
             {customerSearch && (
               <div className="max-h-32 overflow-y-auto border rounded-xl bg-white divide-y shadow-inner">
                 {filteredCustomersList.length === 0 ? (
                   <p className="p-3 text-[10px] text-zinc-400 text-center">Nenhum cliente encontrado</p>
                 ) : (
                   filteredCustomersList.map(customer => (
                     <button
                       key={customer.id}
                       onClick={() => {
                         setTestPhone(customer.whatsapp)
                         setCustomerSearch(customer.full_name)
                       }}
                       className={`w-full p-2 text-left text-[10px] flex items-center justify-between hover:bg-zinc-50 transition-colors ${testPhone === customer.whatsapp ? 'bg-green-50 font-bold' : ''}`}
                     >
                       <div>
                         <p className="uppercase">{customer.full_name}</p>
                         <p className="text-zinc-500">{customer.whatsapp}</p>
                       </div>
                       {testPhone === customer.whatsapp && <CheckCircle className="h-3 w-3 text-green-600" />}
                     </button>
                   ))
                 )}
               </div>
             )}
           </div>

           <div className="flex gap-2">
             <div className="flex-1 space-y-1">
               <Label className="text-[10px] font-black uppercase text-zinc-400">2. Confirmar Número</Label>
               <Input 
                 placeholder="Ex: 5511999999999" 
                 value={testPhone}
                 onChange={(e) => setTestPhone(e.target.value)}
                 className="h-10 text-xs"
               />
             </div>
             <Button 
               variant="outline" 
               onClick={handleTest}
               disabled={!testPhone}
               className="mt-auto h-10 border-2 font-black uppercase text-[10px] px-6"
             >
               <Send className="mr-2 h-4 w-4" /> Enviar Teste
             </Button>
           </div>
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
