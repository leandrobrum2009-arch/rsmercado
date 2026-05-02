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
      if (msg === 'email rate limit exceeded') {
        msg = 'LIMITE DE TENTATIVAS EXCEDIDO: O Supabase bloqueou novos cadastros temporariamente por segurança. Por favor, aguarde de 5 a 10 minutos ou use um e-mail diferente.'
      } else if (msg.includes('confirm your email')) {
        msg = 'E-MAIL NÃO CONFIRMADO: Por favor, verifique seu e-mail e clique no link de ativação antes de fazer login.'
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
        <div className="absolute -top-12 left-0 right-0 bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10px] font-bold text-amber-800 leading-tight shadow-sm">
          💡 SE O LINK DO E-MAIL DER ERRO: Não se preocupe, isso ocorre por causa do redirecionamento. Apenas volte aqui e faça login manualmente com seu e-mail e senha.
        </div>
        <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">
          {isSignUp ? 'Criar Nova Conta' : 'Acessar Minha Conta'}
        </CardTitle>
        <CardDescription className="font-medium">
          {isSignUp ? 'Cadastre-se para gerenciar sua loja.' : 'Informe suas credenciais de acesso.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100 flex gap-3 animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
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
          
          <Button type="submit" className="w-full h-12 text-sm font-black shadow-lg rounded-xl transition-all active:scale-[0.98]" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isSignUp ? <UserPlus className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />)}
            {isSignUp ? 'CADASTRAR AGORA' : 'ENTRAR NO SISTEMA'}
          </Button>
          
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
