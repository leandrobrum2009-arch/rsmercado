import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
 import { Loader2, LogIn, UserPlus, AlertCircle, Phone, MapPin, Users, User } from 'lucide-react'

export function AuthForm() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
   const [password, setPassword] = useState('')
   const [fullName, setFullName] = useState('')
   const [whatsapp, setWhatsapp] = useState('')
   const [householdStatus, setHouseholdStatus] = useState('')
   const [address, setAddress] = useState('')
   const [neighborhood, setNeighborhood] = useState('')
   const [neighborhoods, setNeighborhoods] = useState<any[]>([])
   const [isSignUp, setIsSignUp] = useState(false)
   const [errorMsg, setErrorMsg] = useState('')
   const [resending, setResending] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
     const fetchNeighborhoods = async () => {
       const { data } = await supabase.from('delivery_neighborhoods').select('*').eq('active', true).order('name')
       setNeighborhoods(data || [])
     }
     fetchNeighborhoods()
   }, [])
 
   useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

   const handleAuth = async (e: React.FormEvent) => {
     e.preventDefault()
     
     if (isSignUp) {
       if (!fullName || !whatsapp || !householdStatus || !address || !neighborhood) {
         setErrorMsg('Por favor, preencha todos os campos do cadastro.')
         return
       }
     }
 
     setLoading(true)
     setErrorMsg('')
     
     try {
       if (isSignUp) {
         const { data: authData, error } = await supabase.auth.signUp({ 
           email, 
           password,
           options: {
             data: { 
               full_name: fullName,
               whatsapp: whatsapp,
               household_status: householdStatus
             }
           }
         })
         if (error) throw error
 
         if (authData?.user) {
           const userId = authData.user.id
           
           await supabase
             .from('profiles')
             .upsert({
               id: userId,
               full_name: fullName,
               whatsapp: whatsapp,
               household_status: householdStatus
             })
 
           await supabase
             .from('user_addresses')
             .insert({
               user_id: userId,
               street: address,
               neighborhood: neighborhood,
               number: 'S/N', 
               city: 'Ibiúna',
               state: 'SP',
               is_default: true,
               label: 'Principal'
             })
         }
        alert('CADASTRO REALIZADO!\n\nUm e-mail de confirmação foi enviado. Por favor, verifique sua caixa de entrada (e pasta de spam) para ativar sua conta antes de tentar entrar.')
        alert('CADASTRO REALIZADO!\n\nUm e-mail de confirmação foi enviado. Se não chegar em 2 minutos, use a opção "Esqueci minha senha" para ativar seu acesso.')
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
      } else if (msg.toLowerCase().includes('apikey') || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('api inválida') || msg.toLowerCase().includes('failed to fetch')) {
        msg = 'ERRO DE CONFIGURAÇÃO (API INVÁLIDA): As chaves de conexão com o banco de dados (Supabase) não foram encontradas ou são inválidas. Por favor, verifique as "Configurações do Projeto" no Lovable.'
      }

      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('DIGITE SEU E-MAIL PRIMEIRO para receber o link de recuperação.')
      return
    }
    setResetting(true)
    setErrorMsg('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/profile`,
      })
      if (error) throw error
      alert('LINK ENVIADO!\n\nVerifique seu e-mail (incluindo spam) para redefinir sua senha.')
      setCountdown(60)
    } catch (error: any) {
      console.error('Reset error:', error)
      setErrorMsg('ERRO AO ENVIAR: ' + (error.message || 'Verifique se o e-mail está correto.'))
    } finally {
      setResetting(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 ring-1 ring-black/5">
      <CardHeader className="bg-zinc-50/50 border-b pb-6">
        <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">
          {isSignUp ? 'Criar Nova Conta' : 'Acessar Minha Conta'}
        </CardTitle>
         <CardDescription className="font-medium">
           {isSignUp ? 'Cadastre-se para gerenciar sua loja.' : 'Informe suas credenciais de acesso.'}
         </CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border-2 border-red-200 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-black leading-relaxed">{errorMsg}</p>
            </div>
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
          
          <Button 
            type="submit" 
            className="w-full h-14 text-base font-black shadow-lg rounded-xl transition-all active:scale-[0.98] bg-primary hover:bg-primary/90" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isSignUp ? <UserPlus className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />)}
            {isSignUp ? 'CADASTRAR AGORA' : 'ENTRAR NO SISTEMA'}
          </Button>

          {!isSignUp && (
            <button 
              type="button" 
              onClick={handleResetPassword}
              disabled={resetting || countdown > 0}
              className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors disabled:opacity-50"
            >
              {resetting ? 'ENVIANDO...' : countdown > 0 ? `AGUARDE ${countdown}s` : 'ESQUECI MINHA SENHA / RECUPERAR ACESSO'}
            </button>
          )}

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
          
           {isSignUp && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="font-bold text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1">
                     <User size={12} className="text-primary" /> Nome Completo
                   </Label>
                   <Input 
                     placeholder="Seu nome completo" 
                     value={fullName}
                     onChange={(e) => setFullName(e.target.value)}
                     className="h-12 rounded-xl bg-gray-50 border-gray-200"
                     required={isSignUp}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label className="font-bold text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1">
                     <Phone size={12} className="text-primary" /> WhatsApp
                   </Label>
                   <Input 
                     placeholder="(00) 00000-0000" 
                     value={whatsapp}
                     onChange={(e) => setWhatsapp(e.target.value)}
                     className="h-12 rounded-xl bg-gray-50 border-gray-200"
                     required={isSignUp}
                   />
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label className="font-bold text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1">
                   <Users size={12} className="text-primary" /> Com quem você mora?
                 </Label>
                 <Select value={householdStatus} onValueChange={setHouseholdStatus} required={isSignUp}>
                   <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200">
                     <SelectValue placeholder="Selecione uma opção" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="alone">Moro sozinho(a)</SelectItem>
                     <SelectItem value="couple">Casal</SelectItem>
                     <SelectItem value="family">Família em casa</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
 
               <div className="space-y-2">
                 <Label className="font-bold text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1">
                   <MapPin size={12} className="text-primary" /> Endereço de Entrega
                 </Label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input 
                     placeholder="Rua e número" 
                     value={address}
                     onChange={(e) => setAddress(e.target.value)}
                     className="h-12 rounded-xl bg-gray-50 border-gray-200"
                     required={isSignUp}
                   />
                   <Select value={neighborhood} onValueChange={setNeighborhood} required={isSignUp}>
                     <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200">
                       <SelectValue placeholder="Bairro" />
                     </SelectTrigger>
                     <SelectContent>
                       {neighborhoods.map(n => (
                         <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               </div>
               <div className="relative py-2">
                 <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                 <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-white px-4 text-gray-400">Dados de Acesso</span></div>
               </div>
             </div>
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
