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
   const [key, setKey] = useState('SETUP_ADMIN_2024') // Pre-filled for convenience if they are on this route
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
         email_to_confirm: email,
         secret_key: key
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
     if (key !== 'SETUP_ADMIN_2024') {

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
           {status && <p className="text-center font-bold text-sm mt-4 text-red-600">{status}</p>}
           
           {(status.includes('logado') || status.includes('e-mail')) && (
             <div className="mt-6 p-4 bg-amber-50 rounded-xl border-2 border-amber-200 animate-in fade-in slide-in-from-bottom-4">
               <p className="text-xs font-black text-amber-900 mb-3 uppercase tracking-tight">⚠️ PROBLEMAS COM E-MAIL?</p>
               <p className="text-[11px] text-amber-800 mb-4 leading-relaxed font-medium">
                 Se o link do e-mail não funciona, você pode confirmar sua conta manualmente no painel do Supabase rodando este código no <b>SQL Editor</b>:
               </p>
               <div className="relative group">
                 <pre className="bg-zinc-900 text-green-400 p-4 rounded-lg text-[10px] font-mono overflow-x-auto mb-4 border-l-4 border-green-500 shadow-lg">
                   {`UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW() 
WHERE email = 'SEU_EMAIL_AQUI';`}
                 </pre>
               </div>
               <p className="text-[10px] text-amber-700 italic font-bold">
                 * Substitua SEU_EMAIL_AQUI pelo seu e-mail de cadastro.
               </p>
             </div>
           )}
           
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
