import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Trophy, Gift, Target, MapPin, Plus, Trash2, Save, Loader2, Coins } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LoyaltyManager() {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<any>({ points_per_real: 1 })
  const [neighborhoods, setNeighborhoods] = useState<any[]>([])
  const [newNeighborhood, setNewNeighborhood] = useState({ name: '', fee: '' })
  const [rewards, setRewards] = useState<any[]>([])
  const [challenges, setChallenges] = useState<any[]>([])

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
      fee: parseFloat(newNeighborhood.fee) || 0
    })
    if (error) toast.error('Erro ao adicionar bairro: ' + error.message)
    else {
      toast.success('Bairro adicionado!')
      setNewNeighborhood({ name: '', fee: '' })
      fetchData()
    }
    setLoading(false)
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
          <TabsTrigger value="rewards" className="rounded-lg font-bold uppercase text-[10px]">Recompensas</TabsTrigger>
          <TabsTrigger value="challenges" className="rounded-lg font-bold uppercase text-[10px]">Desafios</TabsTrigger>
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
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <MapPin size={16} /> Bairros de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex gap-4 p-4 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                <div className="flex-1 space-y-1">
                  <Input 
                    placeholder="Nome do Bairro" 
                    value={newNeighborhood.name}
                    onChange={e => setNewNeighborhood({...newNeighborhood, name: e.target.value})}
                    className="border-white"
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Input 
                    type="number" 
                    placeholder="Taxa R$" 
                    value={newNeighborhood.fee}
                    onChange={e => setNewNeighborhood({...newNeighborhood, fee: e.target.value})}
                    className="border-white"
                  />
                </div>
                <Button onClick={addNeighborhood} className="bg-green-600 hover:bg-green-700 text-white px-6 rounded-xl font-black uppercase text-[10px]">
                  <Plus size={16} />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {neighborhoods.map(n => (
                  <div key={n.id} className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-black uppercase text-xs text-zinc-900">{n.name}</p>
                      <p className="font-bold text-[10px] text-green-600">R$ {parseFloat(n.fee).toFixed(2)}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteNeighborhood(n.id)} className="text-zinc-300 hover:text-red-500">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-zinc-100">
             <Gift className="w-12 h-12 mx-auto text-zinc-200 mb-4" />
             <p className="text-zinc-400 font-bold uppercase text-[10px]">Gestão de prêmios por pontos em breve</p>
          </div>
        </TabsContent>

        <TabsContent value="challenges">
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-zinc-100">
             <Target className="w-12 h-12 mx-auto text-zinc-200 mb-4" />
             <p className="text-zinc-400 font-bold uppercase text-[10px]">Gestão de desafios semanais em breve</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
