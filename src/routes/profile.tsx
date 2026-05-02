import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'
import { AdminSetup } from '@/components/admin/AdminSetup'
 import { ProfileDetails } from '@/components/profile/ProfileDetails'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, LogOut, ShieldCheck, ShoppingBag, ChefHat, Wrench } from 'lucide-react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [savedRecipesCount, setSavedRecipesCount] = useState(0)

  const checkSession = async () => {
    console.log('Checking session...');
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      setSession(data.session);
      console.log('Session status:', data.session ? 'Logged in' : 'Logged out');
      
      if (data.session) {
        const userId = data.session.user.id;
        let { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (!profileData && !error) {
           console.log('Profile not found, creating...');
           const { data: newProfile, error: createError } = await supabase
             .from('profiles')
             .insert({ id: userId, full_name: data.session.user.email?.split('@')[0] })
             .select()
             .maybeSingle();
           if (!createError) profileData = newProfile;
        }
        setProfile(profileData);

        try {
          const { count } = await supabase
            .from('user_recipes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          setSavedRecipesCount(count || 0);
        } catch (e) {
          console.log('User recipes table might not exist yet');
        }
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };
 
   useEffect(() => {
     setIsClient(true)
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
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center mb-10 p-10 bg-white rounded-3xl shadow-xl border-t-8 border-primary">
         <div className="flex items-center gap-6">
           <Avatar className="w-28 h-28 ring-8 ring-primary/5">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-black">
                 {session.user.email?.substring(0, 2).toUpperCase()}
               </AvatarFallback>
             )}
           </Avatar>
           <div>
             <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{profile?.full_name || 'USUÁRIO'}</h1>
             <p className="text-gray-400 font-bold text-xs tracking-widest">{session.user.email}</p>
           </div>
         </div>
       </div>
 
       <ProfileDetails profile={profile} onUpdate={checkSession} />
 
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

        <Card className="hover:shadow-2xl cursor-pointer transition-all border-2 border-transparent hover:border-green-600 active:scale-[0.98] group bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black text-green-600 uppercase tracking-widest">Meus Pedidos</CardTitle>
            <ShoppingBag size={24} className="text-green-600 group-hover:rotate-12 transition-transform" />
          </CardHeader>
          <CardContent><p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Histórico de compras e entregas.</p></CardContent>
        </Card>

        <Card 
          className="hover:shadow-lg cursor-pointer transition-all border-2 border-transparent hover:border-zinc-400 active:scale-[0.98] group bg-zinc-100" 
          onClick={() => window.location.href = '/admin-fix'}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Suporte / Reparo</CardTitle>
            <Wrench size={16} className="text-zinc-600" />
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Corrigir problemas de acesso ou dados.</p>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-lg cursor-pointer transition-all border-2 border-transparent hover:border-red-500 active:scale-[0.98] group bg-zinc-50" 
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
