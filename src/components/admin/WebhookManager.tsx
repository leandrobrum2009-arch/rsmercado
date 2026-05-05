import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Webhook, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Save
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface WebhookData {
  id: string
  url: string
  event_type: string
  is_active: boolean
  secret?: string
  created_at: string
}

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    event_type: 'order.created',
    is_active: true
  })

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWebhooks(data || [])
    } catch (error: any) {
      console.error('Error fetching webhooks:', error)
      toast.error('Erro ao carregar webhooks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newWebhook.url) {
      toast.error('A URL é obrigatória')
      return
    }

    setIsAdding(true)
    try {
      const { error } = await supabase
        .from('webhooks')
        .insert([newWebhook])

      if (error) throw error
      
      toast.success('Webhook adicionado com sucesso!')
      setNewWebhook({ url: '', event_type: 'order.created', is_active: true })
      fetchWebhooks()
    } catch (error: any) {
      console.error('Error adding webhook:', error)
      toast.error('Erro ao adicionar webhook')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Webhook removido')
      setWebhooks(webhooks.filter(w => w.id !== id))
    } catch (error: any) {
      console.error('Error deleting webhook:', error)
      toast.error('Erro ao remover webhook')
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      
      setWebhooks(webhooks.map(w => 
        w.id === id ? { ...w, is_active: !currentStatus } : w
      ))
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Webhooks de Integração</h2>
        <p className="text-muted-foreground">
          Configure endpoints para receber notificações automáticas sobre eventos da sua loja.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo Webhook</CardTitle>
          <CardDescription>Adicione uma URL para receber payloads de eventos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL do Endpoint</Label>
              <Input 
                id="url"
                placeholder="https://seu-servidor.com/webhook" 
                value={newWebhook.url}
                onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event">Evento</Label>
              <Select 
                value={newWebhook.event_type} 
                onValueChange={(val) => setNewWebhook({...newWebhook, event_type: val})}
              >
                <SelectTrigger id="event">
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order.created">Pedido Criado</SelectItem>
                  <SelectItem value="order.status_updated">Status de Pedido Alterado</SelectItem>
                  <SelectItem value="customer.registered">Novo Cliente Registrado</SelectItem>
                  <SelectItem value="product.stock_low">Estoque Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={isAdding} className="w-full md:w-auto">
            {isAdding ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            Adicionar Webhook
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {webhooks.length === 0 ? (
          <Card className="bg-zinc-50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Webhook className="h-12 w-12 mb-4 opacity-20" />
              <p>Nenhum webhook configurado.</p>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id} className={!webhook.is_active ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${webhook.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    <Webhook className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-zinc-900 truncate max-w-[200px] md:max-w-md">{webhook.url}</p>
                      <span className="text-[10px] font-black uppercase bg-zinc-100 px-2 py-0.5 rounded text-zinc-500 tracking-wider">
                        {webhook.event_type}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Criado em {new Date(webhook.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-4">
                    <Switch 
                      checked={webhook.is_active} 
                      onCheckedChange={() => toggleStatus(webhook.id, webhook.is_active)}
                    />
                    <Label className="text-xs">{webhook.is_active ? 'Ativo' : 'Inativo'}</Label>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(webhook.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="bg-blue-50 border-blue-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
            <AlertCircle className="h-4 w-4" />
            Informação Técnica
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-700 space-y-2">
          <p>Webhooks enviam uma requisição <strong>POST</strong> JSON para a URL configurada sempre que o evento ocorre.</p>
          <p>Exemplo de Payload:</p>
          <pre className="bg-white/50 p-2 rounded border border-blue-200 overflow-x-auto">
            {JSON.stringify({
              event: "order.created",
              timestamp: new Date().toISOString(),
              data: { id: "ord_123...", total: 150.50 }
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
