 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
   import { Bell, Send, Trash2, AlertCircle, Eye, Settings2, Volume2, Sparkles, Smartphone, BellRing, Save, Loader2, History as HistoryIcon, RefreshCcw, Play } from 'lucide-react'
    const testSound = () => {
      const audio = new Audio(panelSettings.notification_sound_url)
      audio.volume = (panelSettings.order_sound_volume || 80) / 100
      audio.play().catch(e => {
        console.error('Audio play failed:', e)
        toast.error('Erro ao tocar som. Verifique se o navegador bloqueou o áudio.')
      })
      toast.info('Testando som de notificação...')
    }

 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
 import { Switch } from '@/components/ui/switch'
 import { Slider } from '@/components/ui/slider'
 import { cn } from '@/lib/utils'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
 import { toast } from '@/lib/toast'
 import { Badge } from '@/components/ui/badge'
 
 export function AlertManager() {
    const [alerts, setAlerts] = useState<any[]>([])
    const [alertLogs, setAlertLogs] = useState<any[]>([])
    const [message, setMessage] = useState('')
    const [targetUrl, setTargetUrl] = useState('')
    const [duration, setDuration] = useState('10')
    const [shimmerSpeed, setShimmerSpeed] = useState('2.0')
   const [type, setType] = useState('info')
   const [loading, setLoading] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    const [panelSettings, setPanelSettings] = useState<any>({
      order_sound_enabled: true,
      order_visual_pulse: true,
      order_sound_volume: 80,
      low_stock_alerts: true,
      low_stock_threshold: 5,
      notification_sound_url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
    })

    useEffect(() => {
      const fetchPanelSettings = async () => {
        const { data } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'panel_alert_config')
          .maybeSingle()
        
        if (data?.value) {
          setPanelSettings(data.value)
        }
      }
      fetchPanelSettings()
    }, [])

    const savePanelSettings = async () => {
      setLoading(true)
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          key: 'panel_alert_config',
          value: panelSettings,
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        toast.error('Erro ao salvar configurações do painel')
      } else {
        toast.success('Configurações do painel salvas!')
      }
      setLoading(false)
    }
    useEffect(() => {
      fetchAlerts()
      fetchAlertLogs()
    }, [])
  
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('store_alerts')
        .select('*')
        .order('created_at', { ascending: false })
      setAlerts(data || [])
    }

    const fetchAlertLogs = async () => {
      const { data } = await supabase
        .from('alert_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setAlertLogs(data || [])
    }
 
    const createAlert = async () => {
      if (!message) return
      setLoading(true)
        const alertData = { 
          message, 
          type, 
          is_active: true, 
          target_url: targetUrl || null,
          duration_seconds: parseInt(duration),
          shimmer_speed_seconds: parseFloat(shimmerSpeed)
        }

        const { error } = await supabase
          .from('store_alerts')
          .insert(alertData)
       
       if (error) {
         console.error(error)
         toast.error('Erro ao criar alerta. Tente executar o script de reparo.')
       } else {
         // Log the action
         try {
           await supabase.from('alert_logs').insert({
             message,
             type,
             target_url: targetUrl || null
           });
         } catch (e) {
           console.warn('History log failed:', e);
         }
         toast.success('Alerta enviado em tempo real!')
         setMessage('')
         setTargetUrl('')
         fetchAlerts()
         fetchAlertLogs()
       }
      setLoading(false)
    }
 
   const toggleAlert = async (id: string, current: boolean) => {
     const { error } = await supabase
       .from('store_alerts')
       .update({ is_active: !current })
       .eq('id', id)
     if (!error) fetchAlerts()
   }
 
   const deleteAlert = async (id: string) => {
     const { error } = await supabase.from('store_alerts').delete().eq('id', id)
     if (!error) fetchAlerts()
   }
 
    return (
      <div className="space-y-6">
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 rounded-2xl bg-zinc-100 p-1 mb-6">
            <TabsTrigger value="live" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-black uppercase text-[10px] italic">
              <BellRing className="mr-2 h-3.5 w-3.5" /> Alertas Ativos
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-black uppercase text-[10px] italic">
              <HistoryIcon className="mr-2 h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
            <TabsTrigger value="panel" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-black uppercase text-[10px] italic">
              <Settings2 className="mr-2 h-3.5 w-3.5" /> Config. Painel
            </TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="mt-0 outline-none">
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-zinc-800 text-white p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <HistoryIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Histórico de Envios</CardTitle>
                    <CardDescription className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                      Registro permanente de todos os alertas publicados
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Registros de Log</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={fetchAlertLogs}
                      className="h-8 text-[10px] font-black uppercase"
                    >
                      <RefreshCcw className="mr-2 h-3 w-3" /> Atualizar
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {alertLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-2xl bg-zinc-50/30">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-2 rounded-lg",
                            log.type === 'danger' ? 'bg-red-100 text-red-600' :
                            log.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                            log.type === 'success' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-600'
                          )}>
                            <AlertCircle size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800">{log.message}</p>
                            <div className="flex gap-2 items-center mt-1">
                              <span className="text-[8px] font-black uppercase text-zinc-400">
                                {new Date(log.created_at).toLocaleString('pt-BR')}
                              </span>
                              {log.target_url && (
                                <span className="text-[8px] font-bold text-blue-400">→ {log.target_url}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {alertLogs.length === 0 && (
                      <div className="py-12 text-center bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Nenhum log de histórico encontrado</p>
                        <p className="text-[9px] text-zinc-300 mt-1 italic">Tente criar um novo alerta ou rodar o script de reparo</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="live" className="mt-0 outline-none">
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-red-600 text-white p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Alertas AO VIVO</CardTitle>
                    <CardDescription className="text-red-100 text-[10px] font-bold uppercase tracking-widest">
                      Avisos imediatos no topo da loja
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">Mensagem do Alerta</label>
              <Input 
                placeholder="Ex: Estamos abertos hoje até as 22h! 🕒" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">Link de Destino (Opcional)</label>
              <Input 
                placeholder="Ex: /promocoes ou https://..." 
                value={targetUrl} 
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">Duração da Barra (s)</label>
              <Input 
                type="number"
                value={duration} 
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">Velocidade do Brilho (s)</label>
              <Input 
                type="number"
                step="0.1"
                value={shimmerSpeed} 
                onChange={(e) => setShimmerSpeed(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-40 space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">Estilo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Azul (Info)</SelectItem>
                  <SelectItem value="warning">Amarelo (Aviso)</SelectItem>
                  <SelectItem value="danger">Vermelho (Urgente)</SelectItem>
                  <SelectItem value="success">Verde (Sucesso)</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="mt-auto flex gap-2">
               <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                 <DialogTrigger asChild>
                   <Button 
                     variant="outline"
                     className="font-black uppercase text-[10px] h-10 px-4"
                     disabled={!message}
                   >
                     <Eye className="mr-2 h-4 w-4" /> Preview
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-xl">
                   <DialogHeader>
                     <DialogTitle className="uppercase font-black italic">Preview do Alerta</DialogTitle>
                   </DialogHeader>
                   <div className="py-12 bg-zinc-100 rounded-xl border-2 border-dashed border-zinc-300 flex flex-col items-center gap-6">
                     <div className="w-full px-4">
                       <p className="text-[10px] font-black uppercase text-zinc-500 mb-2 text-center">Como aparecerá no topo da loja:</p>
                       <div className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-500 ${
                         type === 'danger' ? 'bg-red-600 text-white' :
                         type === 'warning' ? 'bg-yellow-400 text-yellow-900' :
                         type === 'success' ? 'bg-green-500 text-white' :
                         'bg-blue-600 text-white'
                       }`}>
                         <AlertCircle className="h-4 w-4 shrink-0" />
                         <span className="text-xs font-black uppercase tracking-wider">{message || 'Sua mensagem de alerta aparecerá aqui!'}</span>
                       </div>
                     </div>
                     
                     <div className="w-48 h-24 bg-white rounded-lg shadow-inner border border-zinc-200 relative overflow-hidden flex flex-col items-center p-2">
                        <div className={`w-full h-2 rounded-t ${
                          type === 'danger' ? 'bg-red-600' :
                          type === 'warning' ? 'bg-yellow-400' :
                          type === 'success' ? 'bg-green-500' :
                          'bg-blue-600'
                        }`} />
                        <div className="w-full flex-1 flex flex-col gap-1 pt-2">
                           <div className="w-full h-1 bg-zinc-100 rounded" />
                           <div className="w-3/4 h-1 bg-zinc-100 rounded" />
                           <div className="w-1/2 h-1 bg-zinc-100 rounded" />
                        </div>
                        <p className="absolute bottom-1 text-[8px] font-bold text-zinc-400">Contexto na Loja</p>
                     </div>
                   </div>
                   <DialogFooter>
                     <Button 
                       onClick={() => {
                         setIsPreviewOpen(false)
                         createAlert()
                       }}
                       className="w-full gap-2 bg-zinc-900 font-black uppercase text-xs"
                       disabled={loading}
                     >
                       <Send className="h-4 w-4" /> {loading ? 'Enviando...' : 'Confirmar e Publicar'}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>

               <Button 
                 onClick={createAlert} 
                 disabled={loading} 
                 className="bg-zinc-900 font-black uppercase text-[10px] h-10 px-6"
               >
                 <Send className="mr-2 h-4 w-4" /> Enviar
               </Button>
             </div>
         </div>
 
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Alertas Recentes</h4>
                    <Badge variant="outline" className="text-[8px]">{alerts.length} ALERTAS</Badge>
                  </div>
                  <div className="space-y-3">
                    {alerts.map(a => (
                      <div key={a.id} className="group flex items-center justify-between p-4 border rounded-2xl bg-zinc-50/50 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.is_active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-zinc-300'}`} />
                          <div>
                            <p className="text-sm font-bold text-zinc-800 tracking-tight">{a.message}</p>
                            <div className="flex gap-2 items-center mt-1.5">
                              <Badge className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 border-0",
                                a.type === 'danger' ? 'bg-red-100 text-red-600' :
                                a.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                a.type === 'success' ? 'bg-green-100 text-green-700' :
                                'bg-blue-100 text-blue-600'
                              )}>{a.type}</Badge>
                              {a.target_url && (
                                <span className="text-[8px] font-black text-blue-500 uppercase flex items-center gap-1">
                                  <Eye size={10} /> Link: {a.target_url}
                                </span>
                              )}
                              <span className="text-[8px] font-bold text-zinc-400 uppercase italic">
                                {new Date(a.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleAlert(a.id, a.is_active)} 
                            className="h-8 text-[10px] font-black uppercase hover:bg-zinc-100"
                          >
                            {a.is_active ? 'Pausar' : 'Ativar'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteAlert(a.id)} 
                            className="h-8 w-8 text-zinc-300 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {alerts.length === 0 && (
                      <div className="py-12 text-center bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Nenhum alerta enviado recentemente</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="panel" className="mt-0 outline-none">
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-zinc-900 text-white p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Settings2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Avisos do Painel</CardTitle>
                    <CardDescription className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                      Configure como o administrador recebe notificações
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Pedidos e Som */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Volume2 className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-sm font-black uppercase italic tracking-tighter">Novos Pedidos</h3>
                    </div>
                    
                    <div className="space-y-6 bg-zinc-50 p-6 rounded-[32px] border border-zinc-100">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-black uppercase italic tracking-tighter text-zinc-800">Alerta Sonoro</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Tocar som ao receber pedido</p>
                        </div>
                        <Switch 
                          checked={panelSettings.order_sound_enabled}
                          onCheckedChange={(val) => setPanelSettings({...panelSettings, order_sound_enabled: val})}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-black uppercase italic tracking-tighter text-zinc-800">Destaque Visual</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Fazer o menu pulsar e brilhar</p>
                        </div>
                        <Switch 
                          checked={panelSettings.order_visual_pulse}
                          onCheckedChange={(val) => setPanelSettings({...panelSettings, order_visual_pulse: val})}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-black uppercase text-zinc-500">Volume do Alerta ({panelSettings.order_sound_volume}%)</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={testSound}
                            className="h-7 px-2 text-[8px] font-black uppercase flex gap-1 hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Play size={10} /> Testar Agora
                          </Button>
                        </div>
                        <Slider 
                          value={[panelSettings.order_sound_volume]} 
                          max={100} 
                          step={1} 
                          onValueChange={([val]) => setPanelSettings({...panelSettings, order_sound_volume: val})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estoque e Insights */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Sparkles className="h-5 w-5 text-amber-600" />
                      </div>
                      <h3 className="text-sm font-black uppercase italic tracking-tighter">Estoque e Insights</h3>
                    </div>

                    <div className="space-y-6 bg-zinc-50 p-6 rounded-[32px] border border-zinc-100">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-black uppercase italic tracking-tighter text-zinc-800">Alertas de Estoque</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Notificar produtos acabando</p>
                        </div>
                        <Switch 
                          checked={panelSettings.low_stock_alerts}
                          onCheckedChange={(val) => setPanelSettings({...panelSettings, low_stock_alerts: val})}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black uppercase text-zinc-500">Limite Crítico de Unidades ({panelSettings.low_stock_threshold})</p>
                        </div>
                        <Slider 
                          value={[panelSettings.low_stock_threshold]} 
                          max={20} 
                          step={1} 
                          onValueChange={([val]) => setPanelSettings({...panelSettings, low_stock_threshold: val})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={savePanelSettings} 
                    disabled={loading}
                    className="h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-wider text-xs shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Configurações do Painel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }