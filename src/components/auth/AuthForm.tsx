import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/lib/toast'
import { Loader2, LogIn, UserPlus, AlertCircle } from 'lucide-react'

export function AuthForm() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
   const [isSignUp, setIsSignUp] = useState(false)
   const [errorMsg, setErrorMsg] = useState('')
   const [resending, setResending] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: email.split('@')[0] }
          }
        })
        if (error) throw error
        alert('CADASTRO REALIZADO!\n\nUm e-mail de confirmação foi enviado. Por favor, verifique sua caixa de entrada (e pasta de spam) para ativar sua conta antes de tentar entrar.')
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.reload()
      }
    } catch (error: any) {
      console.error('Auth Error:', error)
      let msg = error.message || 'Erro na autenticação'
      if (msg === 'email rate limit exceeded' || msg.includes('rate limit')) {
        msg = 'LIMITE DE TENTATIVAS EXCEDIDO: O sistema bloqueou novas tentativas por 10 minutos por segurança. \n\nSE VOCÊ JÁ SE CADASTROU: Não tente cadastrar de novo! Vá direto em "ATIVAR MINHA CONTA AGORA" abaixo para liberar seu acesso sem precisar do e-mail.'
       } else if (msg.toLowerCase().includes('confirm your email') || msg.toLowerCase().includes('email_not_confirmed')) {
          msg = 'ERRO: SEU E-MAIL AINDA NÃO FOI ATIVADO.'
       } else if (msg.includes('Invalid login credentials')) {
        msg = 'DADOS INCORRETOS: E-mail ou senha inválidos. Verifique os dados ou confirme se já ativou sua conta pelo e-mail.'
      }
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 ring-1 ring-black/5">
      <CardHeader className="bg-zinc-50/50 border-b pb-6 relative">
         <div 
           className="absolute -top-20 left-0 right-0 bg-green-600 text-white p-4 rounded-xl text-[12px] font-black leading-tight shadow-2xl z-20 animate-bounce border-4 border-white cursor-pointer"
           onClick={() => window.location.href = '/admin-fix'}
         >
           🔓 NÃO CONSEGUE ENTRAR? CLIQUE AQUI! <br/>
           <span className="text-[10px] opacity-90 uppercase">Ativação instantânea sem precisar de e-mail</span>
         </div>
        <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">
          {isSignUp ? 'Criar Nova Conta' : 'Acessar Minha Conta'}
        </CardTitle>
         <CardDescription className="font-medium">
           {isSignUp ? 'Cadastre-se para gerenciar sua loja.' : 'Informe suas credenciais de acesso.'}
         </CardDescription>
         {errorMsg === 'ERRO: SEU E-MAIL AINDA NÃO FOI ATIVADO.' && (
           <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl animate-bounce">
             <p className="text-xs font-black text-red-700 uppercase mb-2">🚨 PROBLEMAS COM O E-MAIL?</p>
             <p className="text-[10px] text-red-600 font-bold leading-tight mb-3">
               Se você já clicou no link e ele não funcionou (tentou abrir no localhost), você pode ativar sua conta agora mesmo sem precisar do e-mail:
             </p>
             <Button 
               variant="destructive" 
               className="w-full text-[10px] font-black h-8"
               onClick={() => window.location.href = '/admin-fix'}
             >
               ATIVAR MINHA CONTA AGORA
             </Button>
           </div>
         )}
      </CardHeader>
      <CardContent className="pt-8">
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border-2 border-red-200 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-black leading-relaxed">{errorMsg}</p>
            </div>
            {errorMsg.includes('LIMITE') && (
              <Button 
                variant="destructive" 
                className="w-full text-[10px] font-black h-10 bg-red-600 animate-pulse"
                onClick={() => window.location.href = '/admin-fix'}
              >
                JÁ TENHO CADASTRO? ATIVAR ACESSO AGORA
              </Button>
            )}
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold text-xs uppercase tracking-widest text-gray-500">E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all font-medium"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" title="Mínimo 6 caracteres" className="font-bold text-xs uppercase tracking-widest text-gray-500">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-all font-medium"
              required
            />
          </div>
          
           <Button type="submit" className="w-full h-14 text-base font-black shadow-lg rounded-xl transition-all active:scale-[0.98] bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isSignUp ? <UserPlus className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />)}
            {isSignUp ? 'CADASTRAR AGORA' : 'ENTRAR NO SISTEMA'}
          </Button>

          {errorMsg.includes('E-MAIL') && (
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-12 border-2 border-amber-200 text-amber-700 font-bold rounded-xl hover:bg-amber-50"
              onClick={async () => {
                if (!email) return toast.error('Digite seu e-mail primeiro');
                setResending(true);
                const { error } = await supabase.auth.resend({ type: 'signup', email });
                setResending(false);
                if (error) toast.error(error.message);
                else alert('E-mail reenviado! Verifique sua caixa de entrada.');
              }}
              disabled={resending}
            >
              {resending ? <Loader2 className="animate-spin mr-2" /> : 'REENVIAR E-MAIL DE ATIVAÇÃO'}
            </Button>
          )}
          
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-white px-4 text-gray-400">Ou</span></div>
          </div>

          <Button 
            type="button" 
            variant="ghost" 
            className="w-full h-12 font-bold rounded-xl text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors" 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
          >
            {isSignUp ? 'JÁ TENHO UMA CONTA' : 'NÃO TENHO CONTA (CADASTRAR)'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
