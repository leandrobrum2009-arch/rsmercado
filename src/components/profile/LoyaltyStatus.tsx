 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
  import { Trophy, Target, Gift, CheckCircle2, ChevronRight, Coins, ArrowRight } from 'lucide-react'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Badge } from '@/components/ui/badge'
 import { Progress } from '@/components/ui/progress'
 import { toast } from '@/lib/toast'
 
 export function LoyaltyStatus({ userId }: { userId: string }) {
   const [challenges, setChallenges] = useState<any[]>([])
   const [rewards, setRewards] = useState<any[]>([])
   const [progress, setProgress] = useState<Record<string, any>>({})
   const [loading, setLoading] = useState(true)
 
   useEffect(() => {
     const fetchLoyaltyData = async () => {
       setLoading(true)
       try {
         const { data: cData } = await supabase
           .from('weekly_challenges')
           .select('*')
           .eq('active', true)
         
         const { data: rData } = await supabase
           .from('loyalty_rewards')
           .select('*')
           .eq('active', true)
 
         const { data: pData } = await supabase
           .from('user_challenge_progress')
           .select('*')
           .eq('user_id', userId)
 
         setChallenges(cData || [])
         setRewards(rData || [])
         
         const progMap: Record<string, any> = {}
         pData?.forEach(p => {
           progMap[p.challenge_id] = p
         })
         setProgress(progMap)
       } catch (error) {
         console.error('Error fetching loyalty data:', error)
       } finally {
         setLoading(false)
       }
     }
 
     fetchLoyaltyData()
   }, [userId])
 
    const handleClaimReward = async (reward: any) => {
      window.location.href = '/loyalty'
    }
 
   if (loading) return null
 
   return (
     <div className="space-y-6">
       {/* Weekly Challenges */}
       <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="text-amber-400" size={20} />
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Missões da Semana</CardTitle>
                <CardDescription className="text-zinc-400 text-[10px] font-bold">Cumpra os objetivos e ganhe pontos extras!</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-white hover:text-amber-400 font-bold uppercase text-[9px]" onClick={() => window.location.href = '/loyalty'}>
              Ver Tudo <ArrowRight size={12} className="ml-1" />
            </Button>
          </CardHeader>
         <CardContent className="p-6 space-y-4">
           {challenges.length === 0 ? (
             <p className="text-center text-zinc-400 text-xs py-4">Nenhuma missão disponível no momento.</p>
           ) : (
             challenges.map(c => {
               const userProg = progress[c.id]
               const isCompleted = userProg?.completed
               return (
                 <div key={c.id} className="p-4 rounded-2xl border-2 border-zinc-50 bg-zinc-50/50 space-y-3">
                   <div className="flex justify-between items-start">
                     <div>
                       <h4 className="font-black uppercase text-xs text-zinc-800">{c.title}</h4>
                       <p className="text-[10px] text-zinc-500 font-medium">{c.description}</p>
                     </div>
                     {isCompleted ? (
                       <Badge className="bg-green-100 text-green-600 border-0 flex gap-1"><CheckCircle2 size={12} /> Feito</Badge>
                     ) : (
                       <Badge variant="outline" className="text-amber-600 border-amber-200">+{c.points_reward} PTS</Badge>
                     )}
                   </div>
                   {!isCompleted && (
                     <div className="space-y-1">
                       <div className="flex justify-between text-[8px] font-black uppercase text-zinc-400">
                         <span>Progresso</span>
                         <span>0%</span>
                       </div>
                       <Progress value={0} className="h-1.5 bg-zinc-200" />
                     </div>
                   )}
                 </div>
               )
             })
           )}
         </CardContent>
       </Card>
 
       {/* Points Rewards */}
       <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
         <CardHeader className="bg-amber-500 text-white">
           <div className="flex items-center gap-2">
             <Gift size={20} />
             <div>
               <CardTitle className="text-sm font-black uppercase tracking-widest">Troca de Pontos</CardTitle>
               <CardDescription className="text-amber-100 text-[10px] font-bold">Use seus pontos para obter vantagens</CardDescription>
             </div>
           </div>
         </CardHeader>
         <CardContent className="p-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {rewards.map(r => (
               <div key={r.id} className="p-3 rounded-2xl border border-zinc-100 flex items-center justify-between group hover:border-amber-500 transition-colors cursor-pointer" onClick={() => handleClaimReward(r)}>
                 <div className="flex items-center gap-3">
                   <div className="bg-amber-100 p-2 rounded-xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                     <Coins size={16} />
                   </div>
                   <div>
                     <p className="font-black uppercase text-[10px] text-zinc-800">{r.title}</p>
                     <p className="text-[9px] font-bold text-amber-600">{r.points_cost} PONTOS</p>
                   </div>
                 </div>
                 <ChevronRight size={14} className="text-zinc-300 group-hover:text-amber-500" />
               </div>
             ))}
           </div>
         </CardContent>
       </Card>
     </div>
   )
 }