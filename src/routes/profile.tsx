 import { LoyaltyStatus } from '@/components/profile/LoyaltyStatus'
 import { createFileRoute, Link } from '@tanstack/react-router'
 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { AuthForm } from '@/components/auth/AuthForm'
 import { AdminSetup } from '@/components/admin/AdminSetup'
 import { Button } from '@/components/ui/button'
 import { ProfileDetails } from '@/components/profile/ProfileDetails'
 import { AddressManager } from '@/components/profile/AddressManager'
 import { OrderTracking } from '@/components/profile/OrderTracking'
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { Avatar, AvatarFallback } from '@/components/ui/avatar'
 import { Loader2, LogOut, ShieldCheck, ShoppingBag, ChefHat, Wrench, Search, Phone, ArrowRight, Info } from 'lucide-react'
 import { Input } from '@/components/ui/input'
 import { toast } from '@/lib/toast'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

 function ProfilePage() {
   const [session, setSession] = useState<any>(null)
   const [profile, setProfile] = useState<any>(null)
   const [loading, setLoading] = useState(true)
   const [error, setError] = useState<string | null>(null)
   const [isClient, setIsClient] = useState(false)
   const [savedRecipesCount, setSavedRecipesCount] = useState(0)
   const [lookupPhone, setLookupPhone] = useState('')
   const [guestOrders, setGuestOrders] = useState<any[]>([])
   const [isSearching, setIsSearching] = useState(false)
   const handleOrderLookup = async (e: React.FormEvent) => {
     e.preventDefault()
     if (!lookupPhone) return
     setIsSearching(true)
     try {
       const { data, error } = await supabase
         .from('orders')
         .select('*')
         .eq('customer_phone', lookupPhone)
         .order('created_at', { ascending: false })
       if (error) throw error
       setGuestOrders(data || [])
       if (data && data.length > 0) {
         toast.success(`${data.length} pedidos encontrados!`)
       } else {
         toast.info('Nenhum pedido encontrado para este WhatsApp.')
       }
     } catch (err: any) {
       toast.error('Erro ao buscar pedidos: ' + err.message)
     } finally {
       setIsSearching(false)
     }
   }
 

   const checkSession = async () => {
     console.log('Checking session...');
     const timeoutId = setTimeout(() => {
       if (loading) {
         console.warn('Session check is taking too long...');
         setLoading(false);
         setError('A conexão está lenta. Tente recarregar a página.');
       }
     }, 10000);

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
     } catch (err: any) {
       console.error('Profile load error:', err);
        setError('Não foi possível carregar seu perfil. Por favor, verifique sua conexão ou tente novamente mais tarde.');
     } finally {
       clearTimeout(timeoutId);
       setLoading(false);
     }
   };
 
   useEffect(() => {
     setIsClient(true)
     checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.id);
      setSession(session);
      if (!session) {
        setProfile(null);
        setLoading(false);
      } else {
        // Se o estado mudou para logado e não temos o perfil, buscamos
        if (!profile || profile.id !== session.user.id) {
          setLoading(true);
          await checkSession();
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
        <p className="text-muted-foreground font-medium uppercase tracking-tighter">Carregando seus dados...</p>
      </div>
    )
  }

   if (!session) {
     return (
       <div className="container mx-auto px-4 py-12 flex flex-col items-center min-h-[80vh] space-y-12">
         <div className="text-center">
           <h1 className="text-4xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">Minha Conta</h1>
           <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Acesse seus pedidos e benefícios</p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl">
           <div className="space-y-6">
             <AuthForm />
           </div>
           
           <div className="space-y-6">
             <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
               <CardHeader className="bg-zinc-900 text-white p-6">
                 <CardTitle className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                   <ShoppingBag className="text-primary" /> Já fez um pedido?
                 </CardTitle>
                 <p className="text-[10px] font-bold uppercase opacity-60">Consulte seus pedidos sem precisar de senha</p>
               </CardHeader>
               <CardContent className="p-6 space-y-4">
                 <form onSubmit={handleOrderLookup} className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-zinc-400">WhatsApp do Pedido</label>
                     <div className="relative">
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                       <Input 
                         placeholder="(00) 00000-0000" 
                         value={lookupPhone}
                         onChange={(e) => setLookupPhone(e.target.value)}
                         className="pl-12 h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
                       />
                     </div>
                   </div>
                   <Button 
                    type="submit" 
                    disabled={isSearching}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800"
                   >
                     {isSearching ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
                     BUSCAR PEDIDOS
                   </Button>
                 </form>
 
                 {guestOrders.length > 0 && (
                   <div className="space-y-3 pt-4 border-t">
                     <p className="text-[10px] font-black uppercase text-zinc-400">Pedidos Encontrados:</p>
                     {guestOrders.map(order => (
                       <Link 
                        key={order.id} 
                        to="/track/$orderId" 
                        params={{ orderId: order.id }}
                        className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-primary transition-colors group"
                       >
                         <div>
                           <p className="font-black text-[10px] uppercase text-zinc-400">#{order.id.substring(0, 8)}</p>
                           <p className="font-bold text-xs text-zinc-900">{new Date(order.created_at).toLocaleDateString()}</p>
                         </div>
                         <div className="text-right flex items-center gap-3">
                           <span className="text-xs font-black text-green-600">R$ {parseFloat(order.total_amount).toFixed(2)}</span>
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-zinc-300 group-hover:bg-primary group-hover:text-white transition-all">
                             <ArrowRight size={14} />
                           </div>
                         </div>
                       </Link>
                     ))}
                   </div>
                 )}
               </CardContent>
             </Card>
 
             <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-6 flex gap-4">
               <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                 <Info size={24} />
               </div>
               <div>
                 <h4 className="font-black uppercase text-xs text-amber-900 mb-1">Dica para o Interior</h4>
                 <p className="text-[10px] font-medium text-amber-700 leading-tight">
                   Não precisa se preocupar com e-mail ou senha! Use o campo acima para ver seus pedidos apenas com seu WhatsApp. 
                   Ou faça seu pedido direto no carrinho clicando em "Digitação Rápida".
                 </p>
               </div>
             </div>
           </div>
         </div>
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
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{profile?.full_name || 'USUÁRIO'}</h1>
                  <p className="text-gray-400 font-bold text-xs tracking-widest">{session.user.email}</p>
                </div>
                 <div 
                   className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 rounded-2xl text-white shadow-xl shadow-amber-200 cursor-pointer hover:scale-105 transition-transform"
                   onClick={() => window.location.href = '/loyalty'}
                 >
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Meus Pontos</p>
                  <div className="flex items-center gap-2">
                   <span className="text-3xl font-black">{profile?.points_balance || 0}</span>
                    <span className="text-[10px] font-bold uppercase">PTS</span>
                  </div>
                  <div className="mt-2 text-[9px] font-bold uppercase bg-white/20 py-1 px-2 rounded-lg backdrop-blur-sm">
                   Cliente {profile?.points_balance > 1000 ? 'VIP Platinum' : profile?.points_balance > 500 ? 'VIP Ouro' : 'Bronze'}
                  </div>
                </div>
              </div>
            </div>
         </div>
       </div>
 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <OrderTracking userId={session.user.id} />
            <ProfileDetails profile={profile} onUpdate={checkSession} />
            <AddressManager userId={session.user.id} />
          </div>
          
           <div className="space-y-6">
             <LoyaltyStatus userId={session.user.id} />
             <AdminSetup />
           </div>
        </div>

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
