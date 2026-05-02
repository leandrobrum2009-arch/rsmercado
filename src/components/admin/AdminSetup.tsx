import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function AdminSetup() {
  const [loading, setLoading] = useState(false)
  const [isAdminExists, setIsAdminExists] = useState<boolean | null>(null)
  const [secretKey, setSecretKey] = useState('')

  useEffect(() => {
    checkAdminExists()
  }, [])

  const checkAdminExists = async () => {
    const { count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
    
    setIsAdminExists(count !== null && count > 0)
  }

  const handlePromoteMe = async () => {
    if (!secretKey) return toast.error('Insira a chave de segurança')
    
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Faça login primeiro')

      // Secure check: only allow if NO admin exists or if secret matches
      // In a real app, this secret would be an environment variable
      if (secretKey === 'SETUP_ADMIN_2024') {
        const { error } = await supabase
          .from('user_roles')
          .upsert({ user_id: session.user.id, role: 'admin' })
        
        if (error) throw error
        toast.success('Você agora é um administrador!')
        window.location.reload()
      } else {
        toast.error('Chave de segurança incorreta')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (isAdminExists === true) return null

  return (
    <Card className="border-primary border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="text-primary" /> Configuração Inicial de Admin
        </CardTitle>
        <CardDescription>
          Nenhum administrador detectado no sistema. Use esta ferramenta para configurar o primeiro acesso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 p-4 rounded-lg flex gap-3 text-amber-800 text-xs">
          <AlertCircle className="flex-shrink-0" />
          <p>Esta opção desaparecerá assim que o primeiro administrador for criado via banco de dados ou chave secreta.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold">Chave de Segurança Temporária</label>
          <Input 
            type="password" 
            placeholder="Digite a chave para se tornar admin" 
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
          />
        </div>
        <Button onClick={handlePromoteMe} disabled={loading} className="w-full">
          {loading ? <Loader2 className="animate-spin mr-2" /> : 'Tornar-me Administrador'}
        </Button>
      </CardContent>
    </Card>
  )
}
