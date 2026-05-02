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
    const [key, setKey] = useState('ADMIN_RS_2024') // Simplified key
   const [email, setEmail] = useState('')
   const [loading, setLoading] = useState(false)
   const [status, setStatus] = useState('')
   const [confirming, setConfirming] = useState(false)
    const handleConfirmEmail = async () => {
      if (!email) {
        setStatus('Digite o e-mail que deseja confirmar')
        return
      }
     setConfirming(true)
     setStatus('Confirmando e-mail...')
     try {
        const { data, error } = await supabase.rpc('confirm_user_email', { 
          email_to_confirm: email.trim().toLowerCase(),
          secret_key: 'ignorado'
        })
       if (error) throw error
       setStatus('E-mail confirmado com sucesso! Agora você pode fazer login.')
     } catch (err: any) {
       setStatus('Erro ao confirmar: ' + err.message)
     } finally {
       setConfirming(false)
     }
   }
 
    const handleFix = async () => {
      const trimmedKey = key.trim();

     setLoading(true)
     setStatus('Verificando sessão...')
     
     try {
       const { data: { session } } = await supabase.auth.getSession()
       if (!session) {
         setStatus('ERRO: Você precisa estar logado! Se o e-mail não confirmou, use o botão "Confirmar E-mail" abaixo primeiro.')
         return
       }
 
        setStatus('Concedendo privilégios de administrador...')
        const { data, error } = await supabase.rpc('promote_to_admin', { secret_key: 'ignorado' })
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
    <div className="container mx-auto px-4 py-10 flex flex-col items-center justify-center min-h-screen">
      <div className="mb-6 px-8 py-4 bg-green-600 text-white rounded-2xl font-black animate-pulse shadow-2xl text-center">
        🚀 RECUPERAÇÃO TOTAL ATIVADA <br/>
        <span className="text-[10px] opacity-80 uppercase tracking-widest">Não precisa mais de senha ou chaves</span>
      </div>
      
      <Card className="w-full max-w-md border-8 border-green-500 shadow-2xl overflow-hidden">
        <div className="bg-green-500 p-2 text-center text-white font-bold text-[10px] uppercase tracking-widest">
          Siga os passos abaixo na ordem
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Recuperar Acesso Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* STEP 1: Confirm Email */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">1</div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Ativar Conta (E-mail)</h3>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200 shadow-sm space-y-3">
              <p className="text-[10px] text-amber-800 font-bold leading-tight uppercase">
                Use isso se o e-mail não chegou ou deu erro
              </p>
              <Input 
                placeholder="Digite seu e-mail de cadastro" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="bg-white h-12 text-sm border-amber-300 focus:ring-amber-500"
              />
              <Button 
                onClick={handleConfirmEmail} 
                disabled={confirming}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest"
              >
                {confirming ? <Loader2 className="animate-spin mr-2" /> : 'CONFIRMAR E-MAIL AGORA'}
              </Button>
            </div>
          </div>

          {/* STEP 2: Get Admin */}
          <div className="space-y-4 border-t pt-8">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">2</div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Liberar Painel Admin</h3>
            </div>

            <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200 shadow-sm space-y-3 text-center">
              <p className="text-[10px] text-green-800 font-bold leading-tight uppercase mb-4">
                Primeiro faça login em seu perfil, depois volte aqui
              </p>
              <Button 
                onClick={handleFix} 
                disabled={loading}
                className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black text-lg uppercase tracking-tighter"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : 'LIBERAR ACESSO ADMIN'}
              </Button>
            </div>
          </div>

          {status && (
            <div className="p-4 bg-zinc-900 text-green-400 rounded-lg text-xs font-mono border-l-4 border-green-500 animate-in fade-in slide-in-from-bottom-2">
              {status}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
