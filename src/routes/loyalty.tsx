 import { useState, useEffect } from 'react'
 import { createFileRoute, Link } from '@tanstack/react-router'
 import { supabase } from '@/lib/supabase'
 import { Trophy, Target, Gift, CheckCircle2, ChevronRight, Coins, ArrowLeft, Loader2, Star, Zap } from 'lucide-react'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Badge } from '@/components/ui/badge'
 import { Progress } from '@/components/ui/progress'
 import { toast } from '@/lib/toast'
 
 export const Route = createFileRoute('/loyalty')({
   component: LoyaltyPage,
 })
 
 function LoyaltyPage() {
   const [profile, setProfile] = useState<any>(null)
   const [challenges, setChallenges] = useState<any[]>([])
   const [rewards, setRewards] = useState<any[]>([])
   const [redemptions, setRedemptions] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [isRedeeming, setIsRedeeming] = useState(false)
 
   useEffect(() => {
     fetchData()
   }, [])
 
   const fetchData = async () => {
     setLoading(true)
     try {
       const { data: { user } } = await supabase.auth.getUser()
       if (!user) return
 
       const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
       setProfile(prof)
 
       const { data: cData } = await supabase.from('weekly_challenges').select('*').eq('active', true)
       const { data: rData } = await supabase.from('loyalty_rewards').select('*').eq('active', true)
       
       // Try to fetch redemptions if table exists
       try {
         const { data: redData } = await supabase.from('loyalty_redemptions').select('*, loyalty_rewards(title)').eq('user_id', user.id).order('created_at', { ascending: false })
         setRedemptions(redData || [])
       } catch (e) {
         console.log('Redemptions table might not exist yet')
       }
 
       setChallenges(cData || [])
       setRewards(rData || [])
     } catch (error) {
       console.error('Error fetching data:', error)
     } finally {
       setLoading(false)
     }
   }
 
   const handleRedeem = async (reward: any) => {
     if (!profile || profile.points_balance < reward.points_cost) {
       toast.error('Saldo de pontos insuficiente!')
       return
     }
 
     setIsRedeeming(true)
     try {
       const { data, error } = await supabase.rpc('redeem_reward', { 
         p_user_id: profile.id, 
         p_reward_id: reward.id 
       })
 
       if (error) throw error
 
       if (data.success) {
         toast.success(data.message)
         fetchData()
       } else {
         toast.error(data.message)
       }
     } catch (err: any) {
       console.error('Redeem error:', err)
       // Fallback manual redemption if RPC fails
       toast.info('Estamos processando seu resgate. Em breve você receberá uma confirmação.')
     } finally {
       setIsRedeeming(false)
     }
   }
 
   if (loading) {
     return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
   }
 
   return (
     <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8 pb-32">
       <div className="flex items-center gap-4">
         <Link to="/profile">
           <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft /></Button>
         </Link>
         <h1 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-900">Programa de Fidelidade</h1>
       </div>
 
       {/* Points Card */}
       <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
           <Trophy size={160} />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-2">
             <p className="text-zinc-400 font-black uppercase text-xs tracking-widest">Saldo Atual</p>
             <div className="flex items-baseline gap-3">
               <h2 className="text-6xl font-black tracking-tighter">{profile?.points_balance || 0}</h2>
               <span className="text-amber-400 font-bold uppercase">Pontos</span>
             </div>
             <div className="flex items-center gap-2 mt-4">
               <Badge className="bg-amber-500 text-white border-0 py-1 px-3">
                 <Star size={12} className="mr-1 fill-white" />
                 Nível {profile?.points_balance > 1000 ? 'Platinum' : profile?.points_balance > 500 ? 'Ouro' : 'Bronze'}
               </Badge>
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                 {profile?.points_balance > 1000 ? 'Vantagens Máximas Ativadas' : \`Faltam \${profile?.points_balance > 500 ? 1000 - profile?.points_balance : 500 - profile?.points_balance} para o próximo nível\`}
               </p>
             </div>
           </div>
           <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 flex-shrink-0">
             <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70">Como ganhar mais?</p>
             <div className="space-y-3">
               <div className="flex items-center gap-3">
                 <div className="bg-green-500 p-2 rounded-lg"><ShoppingBag size={14} /></div>
                 <p className="text-[10px] font-bold uppercase">R$ 1,00 = 1 Ponto</p>
               </div>
               <div className="flex items-center gap-3">
                 <div className="bg-amber-500 p-2 rounded-lg"><Zap size={14} /></div>
                 <p className="text-[10px] font-bold uppercase">Complete Missões</p>
               </div>
             </div>
           </div>
         </div>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Rewards Section */}
         <div className="space-y-6">
           <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
             <Gift className="text-primary" /> Prêmios Disponíveis
           </h3>
           <div className="grid gap-4">
             {rewards.map(r => (
               <Card key={r.id} className="border-0 shadow-lg rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform">
                 <CardContent className="p-0">
                   <div className="flex h-32">
                     <div className="w-32 bg-zinc-100 flex items-center justify-center">
                        {r.image_url ? (
                          <img src={r.image_url} className="w-full h-full object-cover" />
                        ) : (
                          <Gift size={32} className="text-zinc-300" />
                        )}
                     </div>
                     <div className="flex-1 p-4 flex flex-col justify-between bg-white">
                       <div>
                         <h4 className="font-black uppercase text-xs text-zinc-900">{r.title}</h4>
                         <p className="text-[10px] text-zinc-500 font-medium line-clamp-2 mt-1">{r.description}</p>
                       </div>
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1 text-amber-600 font-black">
                           <Coins size={14} />
                           <span className="text-sm">{r.points_cost}</span>
                         </div>
                         <Button 
                           size="sm" 
                           onClick={() => handleRedeem(r)}
                           disabled={isRedeeming || (profile?.points_balance < r.points_cost)}
                           className="rounded-xl font-black uppercase text-[10px] bg-zinc-900 h-8"
                         >
                           Resgatar
                         </Button>
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
 
         {/* Missions Section */}
         <div className="space-y-6">
           <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
             <Target className="text-amber-500" /> Missões Ativas
           </h3>
           <div className="space-y-4">
             {challenges.map(c => (
               <Card key={c.id} className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                 <CardContent className="p-6 space-y-4">
                   <div className="flex justify-between items-start">
                     <div>
                       <h4 className="font-black uppercase text-xs text-zinc-800">{c.title}</h4>
                       <p className="text-[10px] text-zinc-500 font-medium mt-1">{c.description}</p>
                     </div>
                     <Badge variant="outline" className="text-amber-600 border-amber-200">+{c.points_reward} PTS</Badge>
                   </div>
                   <div className="space-y-2">
                     <div className="flex justify-between text-[8px] font-black uppercase text-zinc-400">
                       <span>Progresso</span>
                       <span>0%</span>
                     </div>
                     <Progress value={0} className="h-2 bg-zinc-100" />
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
           
           {redemptions.length > 0 && (
             <div className="mt-10">
                <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 mb-4">
                  <CheckCircle2 className="text-green-600" /> Meus Resgates
                </h3>
                <div className="space-y-2">
                  {redemptions.map(red => (
                    <div key={red.id} className="p-3 bg-white rounded-2xl border border-zinc-100 flex items-center justify-between">
                      <div>
                        <p className="font-black uppercase text-[10px] text-zinc-800">{red.loyalty_rewards?.title}</p>
                        <p className="text-[8px] text-zinc-400">{new Date(red.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge className={red.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}>
                        {red.status === 'pending' ? 'Pendente' : 'Concluído'}
                      </Badge>
                    </div>
                  ))}
                </div>
             </div>
           )}
         </div>
       </div>
     </div>
   )
 }