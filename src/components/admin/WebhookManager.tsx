import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Trash2, Globe, Activity, Shield } from 'lucide-react'
import { toast } from '@/lib/toast'

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    event_type: 'order.created',
    secret: ''
  })

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    setLoading(true)
    const { data } = await supabase.from('webhooks').select('*').order('created_at', { ascending: false })
    setWebhooks(data || [])
    setLoading(false)
  }

  const handleAddWebhook = async () => {
    if (!newWebhook.url) return toast.error('URL é obrigatória')
    
    setIsAdding(true)
    const { error } = await supabase.from('webhooks').insert([newWebhook])
    setIsAdding(false)
    
    if (error) toast.error('Erro ao adicionar webhook')
    else {
      toast.success('Webhook cadastrado!')
      setNewWebhook({ url: '', event_type: 'order.created', secret: '' })
      fetchWebhooks()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('webhooks').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Webhook removido')
      fetchWebhooks()
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" /> Webhooks de Pedidos
          </CardTitle>
          <CardDescription>Configure URLs para receber notificações automáticas sobre novos pedidos ou mudanças de status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>URL do Endpoint</Label>
              <Input 
                placeholder="https://seu-servidor.com/webhook" 
                value={newWebhook.url}
                onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Evento</Label>
              <Select value={newWebhook.event_type} onValueChange={(val) => setNewWebhook({...newWebhook, event_type: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order.created">Novo Pedido (order.created)</SelectItem>
                  <SelectItem value="order.status_updated">Status Alterado (order.status_updated)</SelectItem>
                  <SelectItem value="inventory.low">Estoque Baixo (inventory.low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chave Secreta (Opcional)</Label>
              <Input 
                placeholder="secret_token_123" 
                value={newWebhook.secret}
                onChange={(e) => setNewWebhook({...newWebhook, secret: e.target.value})}
              />
            </div>
          </div>
          <Button onClick={handleAddWebhook} disabled={isAdding} className="w-full">
            {isAdding ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
            Cadastrar Webhook
          </Button>
        </CardContent>
      </Card>

      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((hook) => (
              <TableRow key={hook.id}>
                <TableCell className="max-w-[300px] truncate font-mono text-xs">{hook.url}</TableCell>
                <TableCell>
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">{hook.event_type}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase">
                    <Activity size={10} /> Ativo
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(hook.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {webhooks.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum webhook configurado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
