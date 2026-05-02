import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, LogIn, UserPlus } from 'lucide-react'

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
      console.log('Auth request:', { email, isSignUp })
      
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: email.split('@')[0]
            }
          }
        })
        if (error) throw error
        console.log('Signup data:', data)
        toast.success('Cadastro realizado! Verifique seu e-mail.')
        alert('Cadastro realizado com sucesso! Verifique seu e-mail para ativar a conta.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        console.log('Signin data:', data)
        toast.success('Login realizado!')
        window.location.reload()
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      setErrorMsg(error.message || 'Erro na autenticação')
      toast.error(error.message || 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-black">{isSignUp ? 'Criar Nova Conta' : 'Acessar Conta'}</CardTitle>
        <CardDescription>
          {isSignUp ? 'Preencha os dados para começar.' : 'Digite seu e-mail e senha cadastrados.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200 text-sm font-bold">
            ERRO: {errorMsg === 'email rate limit exceeded' ? 'Muitas tentativas. Aguarde 5 minutos.' : errorMsg}
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail Profissional</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha (mínimo 6 caracteres)</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
              required
            />
          </div>
          
          <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isSignUp ? <UserPlus className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />)}
            {isSignUp ? 'CADASTRAR AGORA' : 'ENTRAR NO SISTEMA'}
          </Button>
          
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">Ou</span></div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-12 font-bold border-2" 
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'JÁ TENHO UMA CONTA' : 'NÃO TENHO CONTA (CADASTRAR)'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
