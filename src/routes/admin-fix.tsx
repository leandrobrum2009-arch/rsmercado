import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/admin-fix')({
  component: AdminFix,
})

function AdminFix() {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const handleFix = async () => {
    if (key !== 'SETUP_ADMIN_2024') {
       setStatus('Chave incorreta')
       return
    }

    setLoading(true)
    setStatus('Verificando sessão...')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setStatus('ERRO: Você precisa estar logado! Vá em /profile primeiro.')
        return
      }

      setStatus('Concedendo acesso admin...')
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: session.user.id, role: 'admin' })

      if (error) throw error

      setStatus('SUCESSO! Você agora é admin. Redirecionando...')
      setTimeout(() => window.location.href = '/admin', 2000)
    } catch (err: any) {
      setStatus('ERRO: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-20 flex justify-center">
      <Card className="w-full max-w-md border-4 border-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Recuperar Acesso Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">Use esta página apenas se o botão de admin não aparecer no seu perfil após o cadastro.</p>
          <Input 
            type="password" 
            placeholder="Chave Mestre" 
            value={key} 
            onChange={e => setKey(e.target.value)} 
          />
          <Button onClick={handleFix} className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : 'ATIVAR ADMIN AGORA'}
          </Button>
          {status && <p className="text-center font-bold text-sm mt-4 text-primary">{status}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
