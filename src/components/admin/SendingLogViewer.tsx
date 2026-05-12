import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Clock, Phone, Info, Search, RefreshCcw, AlertCircle, CheckCircle2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'

export function SendingLogViewer() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching sending logs:', err)
      toast.error('Erro ao carregar logs de envio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter(log => 
    log.phone.toLowerCase().includes(filter.toLowerCase()) ||
    log.status.toLowerCase().includes(filter.toLowerCase()) ||
    log.message_text.toLowerCase().includes(filter.toLowerCase()) ||
    (log.error_message && log.error_message.toLowerCase().includes(filter.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 gap-1"><CheckCircle2 size={10} /> ENVIADO</Badge>
      case 'manual':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 gap-1"><Send size={10} /> MANUAL</Badge>
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertCircle size={10} /> ERRO</Badge>
      default:
        return <Badge variant="secondary">{status.toUpperCase()}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-900">Log de Envios</h2>
          <p className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Histórico de notificações enviadas via WhatsApp</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" className="h-10 rounded-xl gap-2 font-bold uppercase text-[10px]">
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <Input 
          placeholder="Filtrar por telefone, status ou conteúdo da mensagem..." 
          className="h-12 pl-10 rounded-2xl border-zinc-200 text-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <Card className="border-0 shadow-xl rounded-[32px] overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-50">
            {loading && logs.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 uppercase font-black tracking-widest text-[10px]">
                Carregando histórico de envios...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 uppercase font-black tracking-widest text-[10px]">
                Nenhum log de envio encontrado.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-2xl ${
                        log.status === 'sent' ? 'bg-green-50 text-green-600' : 
                        log.status === 'manual' ? 'bg-blue-50 text-blue-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        <MessageSquare size={24} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm uppercase tracking-tight text-zinc-900 flex items-center gap-1">
                            <Phone size={14} className="text-zinc-400" /> {log.phone}
                          </span>
                          {getStatusBadge(log.status)}
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1 ml-auto">
                            <Clock size={12} /> {new Date(log.sent_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        
                        <div className="bg-zinc-50/80 p-4 rounded-2xl border border-zinc-100/50">
                           <p className="text-xs text-zinc-700 leading-relaxed italic whitespace-pre-wrap">
                             "{log.message_text}"
                           </p>
                        </div>

                        {log.error_message && (
                          <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-lg border border-red-100 text-[10px] font-bold uppercase">
                            <AlertCircle size={14} />
                            Erro: {log.error_message}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[9px] font-black uppercase text-zinc-400 tracking-tighter">
                          <span>Método: {log.method?.toUpperCase() || 'N/A'}</span>
                          {log.order_id && (
                            <span className="flex items-center gap-1 text-primary">
                              - Pedido: #{log.order_id.substring(0, 8)}
                            </span>
                          )}
                          {log.campaign_id && <span>Campanha: {log.campaign_id.substring(0, 8)}</span>}
                          <span>Hash: {log.message_hash}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
