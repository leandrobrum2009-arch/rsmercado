// Forced Route Refresh
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'
import { AdminSetup } from '@/components/admin/AdminSetup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, LogOut, ShieldCheck, ShoppingBag } from 'lucide-react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Check initial session
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)
        
        if (data.session) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single()
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Profile load error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!isClient || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
        <p className="text-muted-foreground font-medium animate-pulse">Carregando seu perfil...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center min-h-[80vh]">
        <div className="mb-14 text-center">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Bem-vindo à SuperLoja</h1>
          <p className="text-gray-500">Crie sua conta para aproveitar ofertas exclusivas e acumular pontos.</p>
        </div>
        <AuthForm />
        <button 
          onClick={() => window.location.reload()} 
          className="mt-8 text-xs font-bold text-gray-400 hover:text-primary transition-colors uppercase tracking-widest"
        >
          Já ativei meu e-mail? Clique aqui para atualizar
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center mb-10 p-8 bg-white rounded-3xl shadow-sm border">
        <Avatar className="w-24 h-24 mb-4 ring-4 ring-primary/10">
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-black">
            {session.user.email?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-3xl font-black text-gray-900">{profile?.full_name || session.user.email?.split('@')[0]}</h1>
        <p className="text-gray-500 text-sm mb-4">{session.user.email}</p>
        
        <div className="flex gap-3">
          <div className="bg-amber-100 text-amber-700 px-6 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-inner border border-amber-200/50">
            PONTOS: {profile?.points_balance || 0}
          </div>
          <div className="bg-green-100 text-green-700 px-6 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-inner border border-green-200/50">
            NÍVEL: {profile?.loyalty_tier?.toUpperCase() || 'BRONZE'}
          </div>
        </div>
      </div>

      <AdminSetup />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="hover:shadow-lg cursor-pointer transition-all border-2 border-transparent hover:border-primary active:scale-[0.98] group" 
          onClick={() => window.location.href = '/admin'}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-black text-primary uppercase tracking-wider">Painel Administrativo</CardTitle>
            <ShieldCheck size={20} className="text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground font-medium">Gestão de produtos, categorias e pedidos.</p></CardContent>
        </Card>

        <Card className="hover:shadow-lg cursor-pointer transition-all border-2 border-transparent hover:border-green-600 active:scale-[0.98] group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-black text-green-600 uppercase tracking-wider">Meus Pedidos</CardTitle>
            <ShoppingBag size={20} className="text-green-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground font-medium">Histórico de compras e rastreamento.</p></CardContent>
        </Card>

        <Card 
          className="md:col-span-2 hover:shadow-lg cursor-pointer transition-all border-2 border-transparent hover:border-red-500 active:scale-[0.98] group" 
          onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-black text-red-500 uppercase tracking-wider">Encerrar Sessão</CardTitle>
            <LogOut size={20} className="text-red-500 group-hover:translate-x-1 transition-transform" />
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground font-medium">Sair da sua conta com segurança.</p></CardContent>
        </Card>
      </div>
    </div>
  )
}
