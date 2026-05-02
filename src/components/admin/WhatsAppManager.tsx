import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Send, MessageSquare, ShieldCheck, AlertTriangle } from 'lucide-react'
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

  useEffect(() => {
    fetchConfig()
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
    <div className="space-y-6">
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
                placeholder="Insira sua chave de autenticação" 
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
