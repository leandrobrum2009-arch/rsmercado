import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { toast } from '@/lib/toast'

export function AdminSetup() {
  const [loading, setLoading] = useState(false)
  const [isAdminExists, setIsAdminExists] = useState<boolean | null>(null)
  const [secretKey, setSecretKey] = useState('ADMIN_RS_2024')

  useEffect(() => {
    checkAdminExists()
  }, [])

  const checkAdminExists = async () => {
    try {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
      
      if (error) {
        console.error('Role check error:', error)
        // If table doesn't exist, we might get an error.
        setIsAdminExists(false)
        return
      }
      
      setIsAdminExists(count !== null && count > 0)
    } catch (err) {
      console.error('Role check catch:', err)
      setIsAdminExists(false)
    }
  }

  const handlePromoteMe = async () => {
    if (!secretKey) return toast.error('Insira a chave de segurança')
    
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Faça login primeiro')

       const { data, error } = await supabase.rpc('promote_to_admin', { secret_key: secretKey })
       
       if (error) throw error
       
       if (data.success) {
         toast.success(data.message)
         alert('ACESSO LIBERADO!\n\n' + data.message + '. A página será atualizada.')
         window.location.reload()
       } else {
         toast.error(data.message)
       }
    } catch (error: any) {
      console.error('Setup error:', error)
      toast.error(error.message || 'Erro ao processar acesso')
      alert('ERRO NO BANCO:\n\n' + (error.message || 'Verifique se você rodou o script SQL no painel do Supabase.'))
    } finally {
      setLoading(false)
    }
  }

  if (isAdminExists === true) return null

  return (
    <Card className="border-primary border-4 shadow-2xl bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-black italic uppercase">
          <ShieldCheck className="text-primary h-8 w-8" /> Ativar Acesso Master
        </CardTitle>
        <CardDescription className="text-gray-900 font-bold">
          Configuração de segurança para o primeiro administrador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-white p-4 rounded-xl border-2 border-primary/20 flex gap-4 text-gray-700 shadow-sm">
          <AlertCircle className="flex-shrink-0 text-amber-500 h-6 w-6" />
          <p className="text-xs font-medium leading-relaxed">
            Se você já se cadastrou e confirmou seu e-mail, digite a chave de segurança abaixo para liberar as ferramentas administrativas.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Chave de Segurança</label>
          <Input 
            type="password" 
            placeholder="Digite a chave mestre..." 
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            className="h-14 text-lg font-mono border-2 border-gray-200 focus:border-primary transition-all"
          />
        </div>
        <Button onClick={handlePromoteMe} disabled={loading} className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter">
          {loading ? <Loader2 className="animate-spin mr-2" /> : 'Liberar Área Administrativa'}
        </Button>
      </CardContent>
    </Card>
  )
}
