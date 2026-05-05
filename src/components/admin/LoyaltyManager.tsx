import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Trophy, Gift, Target, MapPin, Plus, Trash2, Save, Loader2, Coins, Upload, MapIcon } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LoyaltyManager() {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<any>({ points_per_real: 1 })
  const [neighborhoods, setNeighborhoods] = useState<any[]>([])
   const [newNeighborhood, setNewNeighborhood] = useState({ name: '', fee: '', active: true })
  const [rewards, setRewards] = useState<any[]>([])
   const [challenges, setChallenges] = useState<any[]>([])
 
   const importNeighborhoods = async () => {
     setLoading(true)
     const list = [
       { name: 'Acampamento', fee: 15.00, active: true },
       { name: 'Àgua Quente', fee: 10.00, active: true },
       { name: 'Barra da Tijuca', fee: 25.00, active: false },
       { name: 'Batume', fee: 10.00, active: true },
       { name: 'Botafogo', fee: 25.00, active: true },
       { name: 'Campinas', fee: 25.00, active: true },
       { name: 'Canjiquinha', fee: 10.00, active: true },
       { name: 'Morro agudo', fee: 10.00, active: true },
       { name: 'Mottas', fee: 15.00, active: true },
       { name: 'Rua dos mudos', fee: 10.00, active: true },
       { name: 'Santa rosa', fee: 20.00, active: true },
       { name: 'São Lourenço', fee: 25.00, active: true },
       { name: 'Serra do capim', fee: 20.00, active: true },
       { name: 'Soledade', fee: 0, active: true }
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
      const { data: settingsData } = await supabase.from('store_settings').select('*').eq('key', 'points_multiplier').maybeSingle()
      if (settingsData) setSettings(settingsData.value)

      const { data: nData } = await supabase.from('delivery_neighborhoods').select('*').order('name')
      setNeighborhoods(nData || [])

      const { data: rData } = await supabase.from('loyalty_rewards').select('*').order('points_cost')
      setRewards(rData || [])

      const { data: cData } = await supabase.from('weekly_challenges').select('*').order('start_date', { ascending: false })
      setChallenges(cData || [])
    } catch (error) {
      console.error('Error fetching loyalty data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    const { error } = await supabase.from('store_settings').upsert({
      key: 'points_multiplier',
      value: settings
    })
    if (error) toast.error('Erro ao salvar configurações')
    else toast.success('Configurações salvas!')
    setLoading(false)
  }

  const addNeighborhood = async () => {
    if (!newNeighborhood.name) return
    setLoading(true)
     const { error } = await supabase.from('delivery_neighborhoods').insert({
       name: newNeighborhood.name,
       fee: parseFloat(newNeighborhood.fee) || 0,
       active: newNeighborhood.active
     })
 
     if (error) toast.error('Erro ao adicionar bairro: ' + error.message)
     else {
       toast.success('Bairro adicionado!')
       setNewNeighborhood({ name: '', fee: '', active: true })
       fetchData()
     }
     setLoading(false)
   }
 
   const toggleNeighborhoodStatus = async (id: string, currentStatus: boolean) => {
     const { error } = await supabase.from('delivery_neighborhoods').update({ active: !currentStatus }).eq('id', id)
     if (error) toast.error('Erro ao atualizar status')
     else fetchData()
   }
 
  const deleteNeighborhood = async (id: string) => {
    const { error } = await supabase.from('delivery_neighborhoods').delete().eq('id', id)
    if (error) toast.error('Erro ao remover')
    else fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-zinc-900 p-3 rounded-2xl text-white shadow-lg">
          <Trophy size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">Gestão de Fidelidade & Entregas</h2>
          <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Configure pontos, recompensas e taxas de entrega</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="bg-zinc-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="settings" className="rounded-lg font-bold uppercase text-[10px]">Configurações</TabsTrigger>
          <TabsTrigger value="neighborhoods" className="rounded-lg font-bold uppercase text-[10px]">Bairros & Taxas</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-zinc-900 text-white">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Coins size={16} /> Multiplicador de Pontos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500">Pontos por cada R$ 1,00 gasto</label>
                  <Input 
                    type="number" 
                    value={settings.points_per_real} 
                    onChange={e => setSettings({...settings, points_per_real: parseInt(e.target.value)})}
                    className="h-12 border-zinc-200"
                  />
                </div>
              </div>
              <Button onClick={saveSettings} className="bg-zinc-900 text-white font-black uppercase text-[10px] h-12 px-8 rounded-xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Salvar Configurações
              </Button>
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
                   <div key={n.id} className={`p-4 bg-white border ${n.active ? 'border-zinc-100' : 'border-red-100 bg-red-50/30'} rounded-2xl flex items-center justify-between shadow-sm`}>
                     <div className="flex-1">
                       <p className={`font-black uppercase text-xs ${n.active ? 'text-zinc-900' : 'text-zinc-400'}`}>{n.name}</p>
                       <p className="font-bold text-[10px] text-green-600">R$ {parseFloat(n.fee).toFixed(2)}</p>
                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${n.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                         {n.active ? 'Ativo' : 'Pausado'}
                       </span>
                     </div>
                     <div className="flex gap-2">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => toggleNeighborhoodStatus(n.id, n.active)} 
                         className={n.active ? "text-zinc-400 hover:text-red-500" : "text-zinc-400 hover:text-green-500"}
                       >
                         <Save size={16} />
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
