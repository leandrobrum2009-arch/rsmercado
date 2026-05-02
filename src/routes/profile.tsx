import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'
import { AdminSetup } from '@/components/admin/AdminSetup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, LogOut, ShieldCheck, ShoppingBag, ChefHat } from 'lucide-react'
  const [savedRecipesCount, setSavedRecipesCount] = useState(0)
        if (data.session) {
          const { count } = await supabase
            .from('user_recipes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', data.session.user.id)
          setSavedRecipesCount(count || 0)
        }
        <Card 
          className="hover:shadow-2xl cursor-pointer transition-all border-2 border-transparent hover:border-amber-500 active:scale-[0.98] group bg-white"
          onClick={() => window.location.href = '/recipes'}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black text-amber-500 uppercase tracking-widest">Minhas Receitas</CardTitle>
            <ChefHat size={24} className="text-amber-500 group-hover:rotate-12 transition-transform" />
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
              {savedRecipesCount} receitas salvas no seu painel.
            </p>
          </CardContent>
        </Card>


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
    
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)
        
        if (data.session) {
          const userId = data.session.user.id;
          let { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
          
          if (error && error.code === 'PGRST116') {
             // Profile missing, try to create it manually as fallback to the trigger
             const { data: newProfile, error: createError } = await supabase
               .from('profiles')
               .insert({ id: userId, full_name: data.session.user.email?.split('@')[0] })
               .select()
               .single()
             
             if (!createError) profileData = newProfile
          }
          
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Profile load error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!isClient || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
        <p className="text-muted-foreground font-medium uppercase tracking-tighter">Carregando seus dados...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center min-h-[80vh]">
        <div className="mb-14 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">Bem-vindo à SuperLoja</h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Ofertas exclusivas e pontos de fidelidade</p>
        </div>
        <AuthForm />
        <button 
          onClick={() => window.location.reload()} 
          className="mt-8 text-[10px] font-black text-gray-400 hover:text-primary transition-colors uppercase tracking-widest border-b border-gray-200"
        >
          Já ativei meu e-mail? Clique para atualizar
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center mb-10 p-10 bg-white rounded-3xl shadow-xl border-t-8 border-primary">
        <Avatar className="w-28 h-28 mb-4 ring-8 ring-primary/5">
          <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-black">
            {session.user.email?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{profile?.full_name || 'USUÁRIO'}</h1>
        <p className="text-gray-400 font-bold text-xs mb-6 tracking-widest">{session.user.email}</p>
        
        <div className="flex gap-4">
          <div className="bg-amber-100 text-amber-700 px-8 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-inner border border-amber-200">
            PONTOS: {profile?.points_balance || 0}
          </div>
          <div className="bg-green-100 text-green-700 px-8 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-inner border border-green-200">
            NÍVEL: {profile?.loyalty_tier?.toUpperCase() || 'BRONZE'}
          </div>
        </div>
      </div>

      <AdminSetup />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        <Card 
          className="hover:shadow-2xl cursor-pointer transition-all border-2 border-transparent hover:border-primary active:scale-[0.98] group bg-white" 
          onClick={() => window.location.href = '/admin'}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black text-primary uppercase tracking-widest">Painel Administrativo</CardTitle>
            <ShieldCheck size={24} className="text-primary group-hover:rotate-12 transition-transform" />
          </CardHeader>
          <CardContent><p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Gestão completa da sua loja virtual.</p></CardContent>
        </Card>

        <Card className="hover:shadow-2xl cursor-pointer transition-all border-2 border-transparent hover:border-green-600 active:scale-[0.98] group bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black text-green-600 uppercase tracking-widest">Meus Pedidos</CardTitle>
            <ShoppingBag size={24} className="text-green-600 group-hover:rotate-12 transition-transform" />
          </CardHeader>
          <CardContent><p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Histórico de compras e entregas.</p></CardContent>
        </Card>

        <Card 
          className="md:col-span-2 hover:shadow-lg cursor-pointer transition-all border-2 border-transparent hover:border-red-500 active:scale-[0.98] group bg-zinc-50" 
          onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black text-red-500 uppercase tracking-widest">Sair da Conta</CardTitle>
            <LogOut size={16} className="text-red-500" />
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
