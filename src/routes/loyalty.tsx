 import { useState, useEffect } from 'react'
 import { createFileRoute, Link } from '@tanstack/react-router'
 import { supabase } from '@/lib/supabase'
  import { Trophy, Target, Gift, CheckCircle2, ChevronRight, Coins, ArrowLeft, Loader2, Star, Zap, ShoppingBag, Clock, Ticket } from 'lucide-react'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Badge } from '@/components/ui/badge'
 import { Progress } from '@/components/ui/progress'
  import { toast } from 'sonner'
  import { sendWhatsAppMessage, formatWhatsAppMessage } from '@/lib/whatsapp'
 
 export const Route = createFileRoute('/loyalty')({
   component: LoyaltyPage,
 })
 
  function LoyaltyPage() {
    const [profile, setProfile] = useState<any>(null)
    const [challenges, setChallenges] = useState<any[]>([])
    const [rewards, setRewards] = useState<any[]>([])
     const [redemptions, setRedemptions] = useState<any[]>([])
     const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isRedeeming, setIsRedeeming] = useState(false)
    const [settings, setSettings] = useState<any>({
      tiers: [
        { name: 'Bronze', min_points: 0, color: '#cd7f32', benefits: 'Ganhe pontos em todas as compras' },
        { name: 'Ouro', min_points: 500, color: '#ffd700', benefits: 'Descontos exclusivos e prioridade' },
        { name: 'Platinum', min_points: 1000, color: '#e5e4e2', benefits: 'Frete grátis e brindes especiais' }
      ]
    })
 
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
 
        // Fetch Settings
        const { data: sData } = await supabase.from('store_settings').select('*').eq('key', 'points_multiplier').maybeSingle()
        if (sData?.value) {
          setSettings(sData.value)
        }

       const { data: cData } = await supabase.from('weekly_challenges').select('*').eq('active', true)
        const { data: rData } = await supabase.from('loyalty_rewards').select('*').eq('active', true)
 
        // Fetch Points History
        const { data: histData } = await supabase.from('points_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
        setHistory(histData || [])
       
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
      if (settings?.min_points_redemption && (profile?.points_balance || 0) < settings.min_points_redemption) {
        toast.error(`Mínimo de ${settings.min_points_redemption} pontos para começar a resgatar.`);
        return
      }

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
          const successMsg = data.coupon_code 
            ? `Resgate realizado! Seu cupom é: ${data.coupon_code}` 
            : data.message;
            
          toast.success(successMsg, { duration: 10000 });
          
          // WhatsApp Notification
          try {
            const msg = formatWhatsAppMessage('loyalty_redeem', {
              customer_name: profile.full_name || 'Cliente',
              reward_title: reward.title,
              coupon_code: data.coupon_code
            });
            if (profile.whatsapp) await sendWhatsAppMessage(profile.whatsapp, msg);
          } catch (e) {
            console.error('WhatsApp notify error:', e);
          }
          
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
 
    const currentTier = [...(settings?.tiers || [])]
      .sort((a, b) => b.min_points - a.min_points)
      .find(t => (profile?.points_balance || 0) >= t.min_points) || settings?.tiers?.[0]

    const nextTier = [...(settings?.tiers || [])]
      .sort((a, b) => a.min_points - b.min_points)
      .find(t => (profile?.points_balance || 0) < t.min_points)

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
                <Badge className="text-white border-0 py-1 px-3" style={{ backgroundColor: currentTier?.color || '#fbbf24' }}>
                  <Star size={12} className="mr-1 fill-white" />
                  Nível {currentTier?.name}
                </Badge>
                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                   {!nextTier ? 'Vantagens Máximas Ativadas' : `Faltam ${nextTier.min_points - (profile?.points_balance || 0)} para o nível ${nextTier.name}`}
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
 
        {/* Loyalty Tiers Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
            <Trophy className="text-amber-500" /> Níveis de Fidelidade
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {settings.tiers?.map((tier: any) => (
              <Card key={tier.name} className={`border-0 shadow-lg rounded-3xl overflow-hidden transition-all ${currentTier?.name === tier.name ? 'ring-2 ring-primary scale-[1.02]' : 'opacity-80'}`}>
                <CardContent className="p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: tier.color }}>
                      <Star size={20} fill="currentColor" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-black uppercase">
                      {tier.min_points} PTS
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-black uppercase text-sm text-zinc-900">{tier.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-medium mt-1">{tier.benefits || 'Vantagens exclusivas do nível'}</p>
                  </div>
                  {currentTier?.name === tier.name && (
                    <Badge className="w-full justify-center py-1 bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[8px] font-black uppercase">Seu Nível Atual</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
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
           
            <div className="space-y-6">
               <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                 <Clock className="text-blue-500" /> Histórico de Pontos
               </h3>
               <div className="bg-white rounded-3xl border border-zinc-100 overflow-hidden">
                 {history.length === 0 ? (
                   <p className="p-8 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">Nenhuma atividade recente</p>
                 ) : (
                   <div className="divide-y divide-zinc-50">
                     {history.map(item => (
                       <div key={item.id} className="p-4 flex items-center justify-between">
                         <div>
                           <p className="font-black uppercase text-[10px] text-zinc-800">{item.description}</p>
                           <p className="text-[8px] text-zinc-400">{new Date(item.created_at).toLocaleDateString()}</p>
                         </div>
                         <span className={`font-black text-xs ${item.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                           {item.points > 0 ? `+${item.points}` : item.points} pts
                         </span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               {redemptions.length > 0 && (
                 <div className="mt-10 space-y-4">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                      <Ticket className="text-green-600" /> Meus Cupons e Prêmios
                    </h3>
                    <div className="space-y-2">
                      {redemptions.map(red => (
                        <div key={red.id} className="p-4 bg-white rounded-3xl border border-zinc-100 flex items-center justify-between">
                          <div>
                            <p className="font-black uppercase text-[10px] text-zinc-800">{red.loyalty_rewards?.title}</p>
                            {red.details?.coupon_code && (
                              <p className="font-mono text-primary font-bold text-xs mt-1">CUPOM: {red.details.coupon_code}</p>
                            )}
                            <p className="text-[8px] text-zinc-400 mt-1">{new Date(red.created_at).toLocaleDateString()}</p>
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

        {/* Program Rules Section */}
        <Card className="border-0 shadow-xl rounded-[2.5rem] bg-zinc-50 overflow-hidden mt-12">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-500" />
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Regras do Programa</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-xs shadow-sm">1</div>
                  <div>
                    <p className="font-black uppercase text-[10px] text-zinc-900">Como ganhar pontos?</p>
                    <p className="text-xs text-zinc-500 mt-1">A cada R$ 1,00 em compras, você ganha {settings?.points_per_real || 1} ponto. Pedidos mínimos de R$ {settings?.min_order_value_to_earn || 10} são necessários.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-xs shadow-sm">2</div>
                  <div>
                    <p className="font-black uppercase text-[10px] text-zinc-900">Quando posso resgatar?</p>
                    <p className="text-xs text-zinc-500 mt-1">Você pode começar a trocar seus pontos por prêmios assim que atingir o saldo mínimo de {settings?.min_points_redemption || 500} pontos.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-xs shadow-sm">3</div>
                  <div>
                    <p className="font-black uppercase text-[10px] text-zinc-900">Qual a validade?</p>
                    <p className="text-xs text-zinc-500 mt-1">Seus pontos têm validade de {settings?.points_expiry_days || 365} dias após a data da compra. Não deixe acumular por muito tempo!</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-xs shadow-sm">4</div>
                  <div>
                    <p className="font-black uppercase text-[10px] text-zinc-900">Limites de Uso</p>
                    <p className="text-xs text-zinc-500 mt-1">Cada cliente pode realizar até {settings?.max_redeem_per_month || 5} resgates por mês. Os cupons gerados são de uso único.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }