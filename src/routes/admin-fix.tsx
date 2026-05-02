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
    <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
      <div className="mb-6 px-10 py-4 bg-green-600 text-white rounded-full font-black animate-pulse shadow-2xl">
        🚀 VERSÃO 2.0 - TUDO DESBLOQUEADO
      </div>
      <Card className="w-full max-w-md border-8 border-green-500 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Recuperar Acesso Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">Use esta página apenas se o botão de admin não aparecer no seu perfil após o cadastro.</p>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-4">
            <p className="text-[11px] font-black text-green-700 uppercase text-center">✅ VALIDAÇÃO DESATIVADA</p>
            <p className="text-[10px] text-green-600 text-center">Não é mais necessário senha. Basta clicar nos botões abaixo.</p>
          </div>
          <Button onClick={handleFix} className="w-full bg-green-600 hover:bg-green-700 h-16 text-lg font-black" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : 'ATIVAR ADMIN AGORA'}
          </Button>
           {status && <p className="text-center font-bold text-sm mt-4 text-red-600">{status}</p>}
           
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border-2 border-amber-300 shadow-inner">
              <p className="text-xs font-black text-amber-900 mb-3 uppercase tracking-tight">🚀 ATIVAÇÃO EXPRESSA (SEM E-MAIL)</p>
              <p className="text-[10px] text-amber-800 mb-4 leading-relaxed font-medium">
                Se o link do e-mail não chegou ou não funcionou, confirme sua conta por aqui mesmo:
              </p>
              <div className="space-y-2">
                <Input 
                  placeholder="Seu e-mail de cadastro" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="bg-white text-xs h-9"
                />
                <Button 
                  onClick={handleConfirmEmail} 
                  disabled={confirming}
                  variant="secondary"
                  className="w-full h-9 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white border-0"
                >
                  {confirming ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : 'CONFIRMAR MEU E-MAIL AGORA'}
                </Button>
              </div>
            </div>
           
           <div className="mt-8 pt-6 border-t border-gray-100">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-4">Dica de Redirecionamento</p>
             <p className="text-[11px] text-gray-500 text-center leading-relaxed px-4">
               Se o link do e-mail abrir uma página de erro, tente copiar o link e substituir 
               <span className="font-bold text-gray-900"> localhost:5173 </span> 
               pelo endereço deste site no seu navegador.
             </p>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
