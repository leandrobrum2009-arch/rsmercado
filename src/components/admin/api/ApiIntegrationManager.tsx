import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/lib/toast'
import { Copy, KeyRound, Loader2, Plus, Trash2, Webhook, ScrollText, RefreshCw, ExternalLink } from 'lucide-react'

const ALL_PERMISSIONS = [
  'products:read', 'products:write', 'products:delete',
  'categories:read', 'categories:write', 'categories:delete',
  'stock:write', 'prices:write',
  'images:write', 'images:delete',
]

const ALL_EVENTS = [
  'product.created', 'product.updated', 'product.deleted',
  'stock.updated', 'stock.bulk_updated',
  'price.updated', 'price.bulk_updated',
  'image.created', 'image.updated', 'image.deleted',
]

function genKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'rsk_live_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function genSecret(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const DOCS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-v1/docs`

export function ApiIntegrationManager() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API & Integrações</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie chaves de API, webhooks e logs de uso da API REST v1.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={DOCS_URL} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> Abrir Documentação (Swagger)
          </a>
        </Button>
      </div>

      <Tabs defaultValue="keys" className="w-full">
        <TabsList>
          <TabsTrigger value="keys"><KeyRound className="h-4 w-4 mr-2" /> API Keys</TabsTrigger>
          <TabsTrigger value="hooks"><Webhook className="h-4 w-4 mr-2" /> Webhooks</TabsTrigger>
          <TabsTrigger value="logs"><ScrollText className="h-4 w-4 mr-2" /> Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="keys" className="mt-4"><ApiKeysTab /></TabsContent>
        <TabsContent value="hooks" className="mt-4"><WebhooksTab /></TabsContent>
        <TabsContent value="logs" className="mt-4"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// =================== API KEYS ===================
function ApiKeysTab() {
  const [keys, setKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<string[]>(['products:read'])
  const [allowedIps, setAllowedIps] = useState('')
  const [rateLimit, setRateLimit] = useState(60)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('api_keys' as any)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar API Keys: ' + error.message)
    setKeys((data as any) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!name.trim()) return toast.error('Informe um nome para a chave')
    if (permissions.length === 0) return toast.error('Selecione ao menos uma permissão')
    setCreating(true)
    try {
      const key = genKey()
      const key_hash = await sha256(key)
      const ips = allowedIps.split(',').map(s => s.trim()).filter(Boolean)
      const { error } = await supabase.from('api_keys' as any).insert({
        name: name.trim(),
        key_hash,
        key_prefix: key.slice(0, 16),
        permissions,
        allowed_ips: ips,
        rate_limit_per_min: rateLimit,
      })
      if (error) throw error
      setRevealedKey(key)
      setName(''); setAllowedIps(''); setPermissions(['products:read']); setRateLimit(60)
      load()
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    } finally { setCreating(false) }
  }

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('api_keys' as any).update({ is_active: !current }).eq('id', id)
    if (error) return toast.error(error.message)
    setKeys(keys.map(k => k.id === id ? { ...k, is_active: !current } : k))
  }

  const remove = async (id: string) => {
    if (!confirm('Remover esta chave permanentemente?')) return
    const { error } = await supabase.from('api_keys' as any).delete().eq('id', id)
    if (error) return toast.error(error.message)
    setKeys(keys.filter(k => k.id !== id))
    toast.success('Chave removida')
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a área de transferência')
  }

  const togglePerm = (p: string) => {
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  return (
    <div className="space-y-6">
      {revealedKey && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-base text-green-900">Sua nova API Key</CardTitle>
            <CardDescription className="text-green-800">
              Copie agora. Por segurança, ela <strong>não será exibida novamente</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <code className="flex-1 p-3 rounded bg-white border text-xs break-all">{revealedKey}</code>
            <Button size="icon" variant="outline" onClick={() => copy(revealedKey)}><Copy className="h-4 w-4" /></Button>
            <Button variant="ghost" onClick={() => setRevealedKey(null)}>Ocultar</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova API Key</CardTitle>
          <CardDescription>Gere uma chave para integração externa (ERP, PDV, marketplace).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome / Descrição</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: ERP Bling" />
            </div>
            <div className="space-y-2">
              <Label>Rate limit (req/min)</Label>
              <Input type="number" min={1} max={10000} value={rateLimit} onChange={e => setRateLimit(parseInt(e.target.value) || 60)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>IPs permitidos (opcional, separados por vírgula)</Label>
            <Input value={allowedIps} onChange={e => setAllowedIps(e.target.value)} placeholder="200.10.20.30, 200.10.20.31" />
          </div>
          <div className="space-y-2">
            <Label>Permissões (escopos)</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMISSIONS.map(p => (
                <button key={p} type="button" onClick={() => togglePerm(p)}
                  className={`px-3 py-1 rounded-full border text-xs font-medium transition ${permissions.includes(p) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={create} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Gerar API Key
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Chaves existentes</CardTitle>
          <Button variant="ghost" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma chave criada ainda.</p>
          ) : (
            <div className="space-y-3">
              {keys.map(k => (
                <div key={k.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong>{k.name}</strong>
                      {!k.is_active && <Badge variant="secondary">Inativa</Badge>}
                      <Badge variant="outline">{k.rate_limit_per_min}/min</Badge>
                    </div>
                    <code className="text-xs text-muted-foreground">{k.key_prefix}…</code>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(k.permissions || []).map((p: string) => (
                        <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                      ))}
                    </div>
                    {k.last_used_at && <p className="text-xs text-muted-foreground mt-1">Último uso: {new Date(k.last_used_at).toLocaleString('pt-BR')}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={k.is_active} onCheckedChange={() => toggleActive(k.id, k.is_active)} />
                    <Button variant="ghost" size="icon" onClick={() => remove(k.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =================== WEBHOOKS ===================
function WebhooksTab() {
  const [hooks, setHooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(['product.created'])
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('api_webhooks' as any).select('*').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setHooks((data as any) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!name.trim() || !url.trim()) return toast.error('Nome e URL são obrigatórios')
    if (!/^https?:\/\//.test(url)) return toast.error('URL inválida')
    if (events.length === 0) return toast.error('Selecione ao menos um evento')
    setCreating(true)
    try {
      const { error } = await supabase.from('api_webhooks' as any).insert({
        name: name.trim(), url: url.trim(), events, secret: genSecret(),
      })
      if (error) throw error
      setName(''); setUrl(''); setEvents(['product.created'])
      toast.success('Webhook criado')
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally { setCreating(false) }
  }

  const toggle = async (id: string, current: boolean) => {
    const { error } = await supabase.from('api_webhooks' as any).update({ is_active: !current }).eq('id', id)
    if (error) return toast.error(error.message)
    setHooks(hooks.map(h => h.id === id ? { ...h, is_active: !current } : h))
  }

  const remove = async (id: string) => {
    if (!confirm('Remover webhook?')) return
    const { error } = await supabase.from('api_webhooks' as any).delete().eq('id', id)
    if (error) return toast.error(error.message)
    setHooks(hooks.filter(h => h.id !== id))
  }

  const toggleEvent = (e: string) => setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo Webhook</CardTitle>
          <CardDescription>
            Receba notificações via POST assinadas com HMAC‑SHA256 (header <code>X-Webhook-Signature</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: ERP Bling - Produtos" />
            </div>
            <div className="space-y-2">
              <Label>URL do endpoint</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://erp.exemplo.com/webhook" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Eventos</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(e => (
                <button key={e} type="button" onClick={() => toggleEvent(e)}
                  className={`px-3 py-1 rounded-full border text-xs font-medium ${events.includes(e) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={create} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Criar Webhook
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Webhooks ativos</CardTitle>
          <Button variant="ghost" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : hooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum webhook configurado.</p>
          ) : (
            <div className="space-y-3">
              {hooks.map(h => (
                <div key={h.id} className="flex flex-col md:flex-row gap-3 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong>{h.name}</strong>
                      {!h.is_active && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                    <code className="text-xs text-muted-foreground break-all">{h.url}</code>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(h.events || []).map((e: string) => (
                        <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                      ))}
                    </div>
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Secret (HMAC)</summary>
                      <code className="block mt-1 p-2 bg-muted rounded break-all">{h.secret}</code>
                    </details>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={h.is_active} onCheckedChange={() => toggle(h.id, h.is_active)} />
                    <Button variant="ghost" size="icon" onClick={() => remove(h.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =================== LOGS ===================
function LogsTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, errors: 0, avgMs: 0 })

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('api_key_logs' as any)
      .select('*, api_keys(name)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) toast.error(error.message)
    const rows = (data as any) || []
    setLogs(rows)
    const total = rows.length
    const errors = rows.filter((r: any) => (r.status_code || 0) >= 400).length
    const avgMs = total ? Math.round(rows.reduce((s: number, r: any) => s + (r.duration_ms || 0), 0) / total) : 0
    setStats({ total, errors, avgMs })
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Últimas 200 req</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Erros (4xx/5xx)</p><p className="text-2xl font-bold text-red-600">{stats.errors}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Tempo médio</p><p className="text-2xl font-bold">{stats.avgMs} ms</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Logs de requisição</CardTitle>
          <Button variant="ghost" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma requisição registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-2">Quando</th><th>Key</th><th>Método</th><th>Path</th><th>Status</th><th>ms</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                      <td className="text-xs">{l.api_keys?.name || '—'}</td>
                      <td className="text-xs font-mono">{l.method}</td>
                      <td className="text-xs font-mono break-all">{l.path}</td>
                      <td><Badge variant={l.status_code >= 400 ? 'destructive' : 'outline'}>{l.status_code}</Badge></td>
                      <td className="text-xs">{l.duration_ms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}