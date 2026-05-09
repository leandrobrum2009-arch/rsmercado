import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Trophy, Gift, Target, MapPin, Plus, Trash2, Save, Loader2, Coins, Upload, MapIcon, X } from 'lucide-react'
 import { Badge } from '@/components/ui/badge'
 import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LoyaltyManager() {
  const [loading, setLoading] = useState(false)
    const DEFAULT_SETTINGS = {
      points_per_real: 1,
      signup_bonus: 100,
      min_points_redemption: 500,
      tiers: [
        { name: 'Bronze', min_points: 0, color: '#cd7f32', benefits: 'Ganhe pontos em todas as compras' },
        { name: 'Ouro', min_points: 500, color: '#ffd700', benefits: 'Descontos exclusivos e prioridade' },
        { name: 'Platinum', min_points: 1000, color: '#e5e4e2', benefits: 'Frete grátis e brindes especiais' }
      ]
    }
    const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS)
  const [neighborhoods, setNeighborhoods] = useState<any[]>([])
   const [newNeighborhood, setNewNeighborhood] = useState({ name: '', fee: '', active: true })
   const [rewards, setRewards] = useState<any[]>([])
    const [challenges, setChallenges] = useState<any[]>([])
    const [tierStats, setTierStats] = useState<Record<string, number>>({})
   const [newReward, setNewReward] = useState({ title: '', description: '', points_cost: '', reward_type: 'product' })
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', points_reward: '', requirement_type: 'total_amount', start_date: '', end_date: '' })
  const [editingFee, setEditingFee] = useState<{ id: string, fee: string } | null>(null)

   const importNeighborhoods = async () => {
     setLoading(true)
     const list = [
        { name: 'Acampamento', fee: 15.00, active: true },
        { name: 'Àgua Quente', fee: 10.00, active: true },
        { name: 'Barra da Tijuca', fee: 25.00, active: true },
        { name: 'Batume', fee: 10.00, active: true },
        { name: 'Canjiquinha', fee: 10.00, active: true },
        { name: 'Morro agudo', fee: 10.00, active: true },
        { name: 'Mottas', fee: 15.00, active: true },
        { name: 'Rua dos mudos', fee: 10.00, active: true },
        { name: 'Santa rosa', fee: 20.00, active: true },
        { name: 'São Lourenço', fee: 25.00, active: true },
        { name: 'Serra do capim', fee: 20.00, active: true },
        { name: 'Soledade', fee: 10.00, active: true }
     ]
 
     const { error } = await supabase.from('delivery_neighborhoods').upsert(list, { onConflict: 'name' })
     if (error) toast.error('Erro ao importar: ' + error.message)
     else {
       toast.success('Bairros importados com sucesso!')
       fetchData()
     }
     setLoading(false)
   }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Settings
      const { data: settingsData, error: sErr } = await supabase.from('store_settings').select('*').eq('key', 'points_multiplier').maybeSingle()
      if (!sErr && settingsData) {
        const val = settingsData.value
        if (typeof val === 'object' && val !== null) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...val,
            tiers: val.tiers || DEFAULT_SETTINGS.tiers
          })
        } else {
          setSettings({ ...DEFAULT_SETTINGS, points_per_real: parseFloat(val) || 0.5 })
        }
      }

      // Fetch Neighborhoods
      const { data: nData, error: nErr } = await supabase.from('delivery_neighborhoods').select('*').order('name');
      if (!nErr) setNeighborhoods(nData || []);
      else console.error('Error fetching neighborhoods:', nErr);

      // Fetch Rewards
      const { data: rData, error: rErr } = await supabase.from('loyalty_rewards').select('*').order('points_cost');
      if (!rErr) setRewards(rData || []);
      else console.error('Error fetching rewards:', rErr);

      // Fetch Challenges
      const { data: cData, error: cErr } = await supabase.from('weekly_challenges').select('*').order('start_date', { ascending: false });
      if (!cErr) setChallenges(cData || []);
      else console.error('Error fetching challenges:', cErr);

      // Fetch Tier Stats
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('loyalty_points');
      if (!pErr && profiles) {
        const stats: Record<string, number> = {};
        profiles.forEach(p => {
          const points = p.loyalty_points || 0;
          const tiers = settings?.tiers || DEFAULT_SETTINGS.tiers;
          const tier = [...tiers]
            .sort((a, b) => b.min_points - a.min_points)
            .find(t => points >= t.min_points);
          if (tier) {
            stats[tier.name] = (stats[tier.name] || 0) + 1;
          }
        });
        setTierStats(stats);
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('store_settings').upsert({
        key: 'points_multiplier',
        value: settings
      })
      if (error) {
        console.error('Error saving settings:', error)
        toast.error('Erro ao salvar configurações: ' + error.message)
      } else {
        toast.success('Configurações salvas!')
      }
    } catch (err: any) {
      console.error('Catch saving settings:', err)
      toast.error('Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const addNeighborhood = async () => {
    if (!newNeighborhood.name) {
      toast.error('Informe o nome do bairro');
      return;
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('delivery_neighborhoods').insert({
        name: newNeighborhood.name,
        fee: parseFloat(newNeighborhood.fee) || 0,
        active: newNeighborhood.active
      })

      if (error) {
        console.error('Error adding neighborhood:', error);
        toast.error('Erro ao adicionar bairro: ' + error.message);
      } else {
        toast.success('Bairro adicionado!');
        setNewNeighborhood({ name: '', fee: '', active: true });
        fetchData();
      }
    } catch (err: any) {
      console.error('Catch adding neighborhood:', err);
      toast.error('Erro ao processar: ' + err.message);
    } finally {
      setLoading(false)
    }
  }
 
    const toggleNeighborhoodStatus = async (id: string, currentStatus: boolean) => {
      const { error } = await supabase.from('delivery_neighborhoods').update({ active: !currentStatus }).eq('id', id)
      if (error) {
        console.error('Error toggling neighborhood status:', error)
        toast.error('Erro ao atualizar status: ' + error.message)
      } else {
        fetchData()
      }
    }

    const updateNeighborhoodFee = async (id: string, fee: string) => {
      const { error } = await supabase.from('delivery_neighborhoods').update({ fee: parseFloat(fee) || 0 }).eq('id', id)
      if (error) {
        console.error('Error updating neighborhood fee:', error)
        toast.error('Erro ao atualizar taxa: ' + error.message)
      } else {
        toast.success('Taxa atualizada!')
        setEditingFee(null)
        fetchData()
      }
    }

  const deleteNeighborhood = async (id: string) => {
    const { error } = await supabase.from('delivery_neighborhoods').delete().eq('id', id)
    if (error) toast.error('Erro ao remover')
    else fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-zinc-900 p-3 rounded-lg text-white shadow-lg">
          <Trophy size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">Gestão de Fidelidade & Entregas</h2>
          <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Configure pontos, recompensas e taxas de entrega</p>
        </div>
      </div>

      <Tabs defaultValue="levels" className="w-full">
         <TabsList className="bg-zinc-100 p-1 rounded-xl mb-6 flex overflow-x-auto no-scrollbar">
            <TabsTrigger value="levels" className="rounded-lg font-bold uppercase text-[10px] flex-1">Níveis de Fidelidade</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg font-bold uppercase text-[10px] flex-1">Regras de Pontos</TabsTrigger>
           <TabsTrigger value="rewards" className="rounded-lg font-bold uppercase text-[10px] flex-1">Catálogo de Troca</TabsTrigger>
           <TabsTrigger value="challenges" className="rounded-lg font-bold uppercase text-[10px] flex-1">Missões</TabsTrigger>
           <TabsTrigger value="neighborhoods" className="rounded-lg font-bold uppercase text-[10px] flex-1">Entregas</TabsTrigger>
         </TabsList>
         <TabsContent value="rewards">
           <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
             <CardHeader className="bg-zinc-900 text-white">
               <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Gift size={16} /> Catálogo de Trocas (Pontos)
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-500">Título / Cupom</label>
                   <Input placeholder="Ex: R$ 20,00 de desconto" value={newReward.title} onChange={e => setNewReward({...newReward, title: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-500">Custo em Pontos</label>
                   <Input type="number" placeholder="1000" value={newReward.points_cost} onChange={e => setNewReward({...newReward, points_cost: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-zinc-500">Tipo</label>
                   <select className="w-full h-10 px-3 rounded-lg border-zinc-200 bg-white text-xs font-bold" value={newReward.reward_type} onChange={e => setNewReward({...newReward, reward_type: e.target.value})}>
                     <option value="coupon">Cupom de Desconto</option>
                     <option value="product">Produto Grátis</option>
                   </select>
                 </div>
                  <Button onClick={async () => {
                    if (!newReward.title || !newReward.points_cost) {
                      toast.error('Informe o título e o custo em pontos');
                      return;
                    }
                    setLoading(true);
                    try {
                      const { error } = await supabase.from('loyalty_rewards').insert({
                        title: newReward.title,
                        points_cost: parseInt(newReward.points_cost),
                        reward_type: newReward.reward_type,
                        active: true
                      });
                      if (!error) {
                        toast.success('Recompensa adicionada!');
                        setNewReward({ title: '', description: '', points_cost: '', reward_type: 'product' });
                        fetchData();
                      } else {
                        console.error('Error adding reward:', error);
                        toast.error('Erro ao adicionar: ' + error.message);
                      }
                    } catch (err: any) {
                      toast.error('Erro: ' + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }} disabled={loading} className="mt-auto bg-zinc-900 font-black uppercase text-[10px] h-10 rounded-xl">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Adicionar'}
                  </Button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {rewards.map(r => (
                   <div key={r.id} className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between shadow-sm">
                     <div>
                       <p className="font-black uppercase text-xs">{r.title}</p>
                       <p className="font-bold text-[10px] text-amber-600">{r.points_cost} PONTOS</p>
                       <Badge variant="outline" className="text-[8px] uppercase mt-1">{r.reward_type}</Badge>
                     </div>
                     <Button variant="ghost" size="icon" onClick={async () => {
                       await supabase.from('loyalty_rewards').delete().eq('id', r.id);
                       fetchData();
                     }} className="text-zinc-300 hover:text-red-500">
                       <Trash2 size={16} />
                     </Button>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
         </TabsContent>
 
         <TabsContent value="challenges">
           <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
             <CardHeader className="bg-zinc-900 text-white">
               <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Target size={16} /> Missões e Desafios Semanais
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                 <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-bold">Título da Missão</Label>
                   <Input placeholder="Ex: Super Compra da Semana" value={newChallenge.title} onChange={e => setNewChallenge({...newChallenge, title: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-bold">Prêmio (Pontos)</Label>
                   <Input type="number" placeholder="500" value={newChallenge.points_reward} onChange={e => setNewChallenge({...newChallenge, points_reward: e.target.value})} />
                 </div>
                 <div className="space-y-2 col-span-2">
                   <Label className="text-[10px] uppercase font-bold">Descrição do Objetivo</Label>
                   <Input placeholder="Ex: Faça um pedido acima de R$ 150,00" value={newChallenge.description} onChange={e => setNewChallenge({...newChallenge, description: e.target.value})} />
                 </div>
                  <Button onClick={async () => {
                    if (!newChallenge.title || !newChallenge.points_reward) {
                      toast.error('Informe o título e o prêmio do desafio');
                      return;
                    }
                    setLoading(true);
                    try {
                      const { error } = await supabase.from('weekly_challenges').insert({
                        title: newChallenge.title,
                        description: newChallenge.description,
                        points_reward: parseInt(newChallenge.points_reward),
                        requirement_type: newChallenge.requirement_type || 'total_amount',
                        start_date: new Date().toISOString(),
                        end_date: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
                        active: true
                      });
                      if (!error) {
                        toast.success('Desafio criado!');
                        setNewChallenge({ title: '', description: '', points_reward: '', requirement_type: 'total_amount', start_date: '', end_date: '' });
                        fetchData();
                      } else {
                        console.error('Error creating challenge:', error);
                        toast.error('Erro ao criar desafio: ' + error.message);
                      }
                    } catch (err: any) {
                      toast.error('Erro: ' + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }} disabled={loading} className="col-span-2 bg-zinc-900 font-black uppercase text-[10px] h-10 rounded-xl">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Publicar Desafio'}
                  </Button>
               </div>
               <div className="space-y-4">
                 {challenges.map(c => (
                   <div key={c.id} className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between shadow-sm">
                     <div className="flex items-center gap-4">
                       <div className="bg-amber-100 p-3 rounded-full text-amber-600"><Target size={20} /></div>
                       <div>
                         <p className="font-black uppercase text-sm">{c.title}</p>
                         <p className="text-xs text-zinc-500">{c.description}</p>
                         <p className="font-bold text-[10px] text-green-600">PRÊMIO: {c.points_reward} PONTOS</p>
                       </div>
                     </div>
                     <Button variant="ghost" size="icon" onClick={async () => {
                       await supabase.from('weekly_challenges').delete().eq('id', c.id);
                       fetchData();
                     }} className="text-zinc-300 hover:text-red-500">
                       <Trash2 size={16} />
                     </Button>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
         </TabsContent>

        <TabsContent value="settings">
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-zinc-900 text-white">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Coins size={16} /> Multiplicador de Pontos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Pontos por cada R$ 1,00 gasto</label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={settings.points_per_real} 
                      onChange={e => setSettings({...settings, points_per_real: parseFloat(e.target.value)})}
                      className="h-10 border-zinc-200 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Bônus de Cadastro (Pontos)</label>
                    <Input 
                      type="number" 
                      value={settings.signup_bonus} 
                      onChange={e => setSettings({...settings, signup_bonus: parseInt(e.target.value)})}
                      className="h-10 border-zinc-200 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Mínimo para Resgate</label>
                    <Input 
                      type="number" 
                      value={settings.min_points_redemption} 
                      onChange={e => setSettings({...settings, min_points_redemption: parseInt(e.target.value)})}
                      className="h-10 border-zinc-200 font-bold"
                    />
                  </div>
                </div>

              </div>
              <Button onClick={saveSettings} className="bg-zinc-900 text-white font-black uppercase text-[10px] h-12 px-8 rounded-xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels">
           <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
             <CardHeader className="bg-zinc-900 text-white">
               <div className="flex justify-between items-center">
                 <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <Trophy size={16} /> Níveis e Categorias de Clientes
                 </CardTitle>
                 <Button 
                   onClick={() => {
                     const newTiers = [...(settings.tiers || [])];
                     newTiers.push({ name: 'Novo Nível', min_points: 0, color: '#94a3b8', benefits: '' });
                     setSettings({...settings, tiers: newTiers});
                   }} 
                   variant="outline" 
                   size="sm" 
                   className="h-8 text-[10px] font-black uppercase border-zinc-200"
                 >
                   <Plus size={14} className="mr-2" /> Adicionar Nível
                 </Button>
               </div>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {(settings.tiers || []).sort((a: any, b: any) => a.min_points - b.min_points).map((tier: any, i: number) => (
                   <div key={i} className="p-6 bg-white border border-zinc-100 rounded-[32px] shadow-sm space-y-4 relative group transition-all hover:shadow-md">
                     <button 
                       onClick={() => {
                         const newTiers = settings.tiers.filter((_: any, index: number) => index !== i);
                         setSettings({...settings, tiers: newTiers});
                       }}
                       className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       <Trash2 size={16} />
                     </button>

                     <div className="flex items-center gap-3">
                       <div className="relative">
                         <div 
                           className="w-10 h-10 rounded-2xl shadow-inner flex items-center justify-center text-white" 
                           style={{ backgroundColor: tier.color }}
                         >
                           <Trophy size={20} />
                         </div>
                         <input 
                           type="color" 
                           className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                           value={tier.color}
                           onChange={e => {
                             const newTiers = [...settings.tiers];
                             const actualIndex = settings.tiers.indexOf(tier);
                             newTiers[actualIndex].color = e.target.value;
                             setSettings({...settings, tiers: newTiers});
                           }}
                         />
                       </div>
                       <div className="flex-1">
                         <Input 
                           className="h-8 text-xs font-black uppercase border-none bg-zinc-50 rounded-xl px-3 focus-visible:ring-primary/20" 
                           value={tier.name}
                           onChange={e => {
                             const newTiers = [...settings.tiers];
                             const actualIndex = settings.tiers.indexOf(tier);
                             newTiers[actualIndex].name = e.target.value;
                             setSettings({...settings, tiers: newTiers});
                           }}
                         />
                         <p className="text-[8px] font-bold text-zinc-400 uppercase ml-3 mt-0.5">
                           {tierStats[tier.name] || 0} Clientes neste nível
                         </p>
                       </div>
                     </div>
                     
                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1">
                         <Coins size={12} /> Pontos Mínimos
                       </label>
                       <Input 
                         type="number" 
                         className="h-10 text-sm font-bold rounded-xl border-zinc-100" 
                         value={tier.min_points}
                         onChange={e => {
                           const newTiers = [...settings.tiers];
                           const actualIndex = settings.tiers.indexOf(tier);
                           newTiers[actualIndex].min_points = parseInt(e.target.value) || 0;
                           setSettings({...settings, tiers: newTiers});
                         }}
                       />
                     </div>

                     <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase text-zinc-400">Benefícios e Vantagens</label>
                       <textarea 
                         className="w-full text-xs font-medium p-3 rounded-xl border border-zinc-100 bg-zinc-50 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                         placeholder="Liste as vantagens deste nível..."
                         value={tier.benefits || ''}
                         onChange={e => {
                           const newTiers = [...settings.tiers];
                           const actualIndex = settings.tiers.indexOf(tier);
                           newTiers[actualIndex].benefits = e.target.value;
                           setSettings({...settings, tiers: newTiers});
                         }}
                       />
                     </div>
                   </div>
                 ))}

                 {(!settings.tiers || settings.tiers.length === 0) && (
                    <div className="col-span-full py-12 text-center text-zinc-400">
                      <Trophy size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhum nível configurado</p>
                      <Button 
                        variant="link" 
                        className="text-primary text-[10px] font-black uppercase mt-2"
                        onClick={() => setSettings({...settings, tiers: DEFAULT_SETTINGS.tiers})}
                      >
                        Carregar Padrões
                      </Button>
                    </div>
                 )}
               </div>

               <div className="pt-6 border-t flex justify-end">
                 <Button onClick={saveSettings} className="bg-zinc-900 text-white font-black uppercase text-[10px] h-12 px-10 rounded-2xl shadow-xl shadow-zinc-200" disabled={loading}>
                   {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Salvar Todos os Níveis
                 </Button>
               </div>
             </CardContent>
           </Card>
         </TabsContent>

        <TabsContent value="neighborhoods">
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-zinc-900 text-white">
               <div className="flex justify-between items-center">
                 <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <MapPin size={16} /> Bairros de Entrega
                 </CardTitle>
                 <Button onClick={importNeighborhoods} variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase border-zinc-200">
                   <Upload size={14} className="mr-2" /> Importar Lista
                 </Button>
               </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               <div className="flex flex-col md:flex-row gap-4 p-4 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                 <div className="flex-1 space-y-2">
                   <label className="text-[10px] font-black uppercase text-zinc-500">Nome do Bairro</label>
                  <Input 
                    placeholder="Nome do Bairro" 
                    value={newNeighborhood.name}
                    onChange={e => setNewNeighborhood({...newNeighborhood, name: e.target.value})}
                    className="border-white"
                  />
                </div>
                 <div className="w-full md:w-32 space-y-2">
                   <label className="text-[10px] font-black uppercase text-zinc-500">Taxa R$</label>
                  <Input 
                    type="number" 
                    placeholder="Taxa R$" 
                    value={newNeighborhood.fee}
                    onChange={e => setNewNeighborhood({...newNeighborhood, fee: e.target.value})}
                    className="border-white"
                  />
                </div>
                 <div className="w-full md:w-32 space-y-2">
                   <label className="text-[10px] font-black uppercase text-zinc-500">Status</label>
                   <select 
                     className="w-full h-10 px-3 rounded-lg border-white bg-white text-xs font-bold"
                     value={newNeighborhood.active ? 'true' : 'false'}
                     onChange={e => setNewNeighborhood({...newNeighborhood, active: e.target.value === 'true'})}
                   >
                     <option value="true">Ativo</option>
                     <option value="false">Pausado</option>
                   </select>
                 </div>
                 <Button onClick={addNeighborhood} className="mt-auto bg-green-600 hover:bg-green-700 text-white px-6 h-10 rounded-xl font-black uppercase text-[10px]">
                  <Plus size={16} />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {neighborhoods.map(n => (
                    <div key={n.id} className={`p-4 bg-white border ${n.active ? 'border-zinc-100' : 'border-red-100 bg-red-50/30'} rounded-2xl flex items-center justify-between shadow-sm group`}>
                      <div className="flex-1">
                        <p className={`font-black uppercase text-xs ${n.active ? 'text-zinc-900' : 'text-zinc-400'}`}>{n.name}</p>
                        {editingFee?.id === n.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-zinc-400">R$</span>
                            <Input 
                              type="number" 
                              className="h-7 w-20 text-[10px] font-bold" 
                              value={editingFee?.fee || ''} 
                              onChange={e => setEditingFee(prev => prev ? {...prev, fee: e.target.value} : null)}
                              autoFocus
                            />
                            <Button size="icon" className="h-7 w-7 bg-green-600" onClick={() => editingFee && updateNeighborhoodFee(n.id, editingFee.fee)}>
                              <Save size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingFee(null)}>
                              <X size={12} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[10px] text-green-600">R$ {parseFloat(n.fee).toFixed(2)}</p>
                            <button 
                              onClick={() => setEditingFee({ id: n.id, fee: n.fee.toString() })}
                              className="opacity-0 group-hover:opacity-100 text-[8px] font-black uppercase text-zinc-400 hover:text-primary transition-opacity"
                            >
                              Editar Taxa
                            </button>
                          </div>
                        )}
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1 inline-block ${n.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {n.active ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleNeighborhoodStatus(n.id, n.active)} 
                          title={n.active ? "Pausar" : "Ativar"}
                          className={n.active ? "text-zinc-400 hover:text-amber-500" : "text-zinc-400 hover:text-green-500"}
                        >
                          {n.active ? <MapIcon size={16} /> : <Plus size={16} />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteNeighborhood(n.id)} className="text-zinc-300 hover:text-red-500">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
