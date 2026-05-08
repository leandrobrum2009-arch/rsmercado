import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/lib/toast'
 import { Loader2, Plus, MapPin, Trash2, Home, User, Phone, Info, CheckCircle, Circle } from 'lucide-react'

export function AddressManager({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addresses, setAddresses] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [neighborhoodList, setNeighborhoodList] = useState<any[]>([])
  const [formData, setFormData] = useState({
    recipient_name: '',
    contact_phone: '',
    street: '',
    number: '',
    neighborhood: '',
     city: 'Ibiúna',
     state: 'SP',
    zip_code: '',
    reference_point: '',
    observations: '',
    label: 'Casa'
  })

  useEffect(() => {
    fetchAddresses()
    fetchNeighborhoods()
  }, [userId])

  const fetchNeighborhoods = async () => {
    const { data } = await supabase.from('delivery_neighborhoods').select('name').eq('active', true).order('name')
    if (data) setNeighborhoodList(data)
  }

   const fetchAddresses = async () => {
     try {
       const { data, error } = await supabase
         .from('user_addresses')
         .select('*')
         .eq('user_id', userId)
         .order('is_default', { ascending: false })
         .order('created_at', { ascending: false })
 
       if (error) throw error
       setAddresses(data || [])
     } catch (error: any) {
       console.error('Error fetching addresses:', error)
     } finally {
       setLoading(false)
     }
   }

   const handleSave = async () => {
     if (!formData.recipient_name || !formData.street || !formData.neighborhood) {
       return toast.error('Por favor, preencha os campos obrigatórios (Nome, Rua e Bairro)')
     }
 
     setSaving(true)
     try {
       const isFirstAddress = addresses.length === 0;
       
       const { error } = await supabase
         .from('user_addresses')
         .insert([{ 
           ...formData, 
           user_id: userId,
           is_default: isFirstAddress // First address is default by default
         }])
 
       if (error) throw error
       
       toast.success('Endereço salvo com sucesso!')
       setShowForm(false)
       setFormData({
         recipient_name: '',
         contact_phone: '',
         street: '',
         number: '',
         neighborhood: '',
         city: 'Ibiúna',
         state: 'SP',
         zip_code: '',
         reference_point: '',
         observations: '',
         label: 'Casa'
       })
       fetchAddresses()
     } catch (error: any) {
        console.error('Save error details:', error)
        toast.error('Erro ao salvar endereço. Por favor, verifique os dados e tente novamente.')
     } finally {
       setSaving(false)
     }
   }
 
   const handleSetDefault = async (id: string) => {
     try {
       // Remove default from all
       await supabase
         .from('user_addresses')
         .update({ is_default: false })
         .eq('user_id', userId)
 
       // Set new default
       const { error } = await supabase
         .from('user_addresses')
         .update({ is_default: true })
         .eq('id', id)
 
       if (error) throw error
       toast.success('Endereço padrão atualizado!')
       fetchAddresses()
     } catch (error: any) {
       toast.error('Erro ao definir padrão: ' + error.message)
     }
   }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este endereço?')) return

    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Endereço excluído!')
      fetchAddresses()
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message)
    }
  }

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>

  return (
    <Card className="bg-white border-2 border-zinc-100 shadow-xl overflow-hidden">
      <CardHeader className="bg-zinc-50 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
            <MapPin className="text-primary" /> Endereços de Entrega
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase text-zinc-400">Gerencie seus locais de recebimento</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="rounded-xl font-bold uppercase text-[10px]">
          {showForm ? 'Cancelar' : <><Plus size={14} className="mr-1" /> Novo</>}
        </Button>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {showForm && (
          <div className="bg-zinc-50 p-4 rounded-2xl border-2 border-dashed border-zinc-200 space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-500">Pessoa que vai receber *</Label>
                <div className="relative">
                  <Input 
                    value={formData.recipient_name}
                    onChange={e => setFormData({...formData, recipient_name: e.target.value})}
                    placeholder="Nome completo"
                    className="pl-9"
                  />
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-500">Telefone de contato *</Label>
                <div className="relative">
                  <Input 
                    value={formData.contact_phone}
                    onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                    placeholder="Ex: 24 99999-8888"
                    className="pl-9"
                  />
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-500">Endereço / Rua *</Label>
                <div className="relative">
                  <Input 
                    value={formData.street}
                    onChange={e => setFormData({...formData, street: e.target.value})}
                    placeholder="Rua, Estrada, etc"
                    className="pl-9"
                  />
                  <Home size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-500">Número</Label>
                <Input 
                  value={formData.number}
                  onChange={e => setFormData({...formData, number: e.target.value})}
                  placeholder="S/N ou nº"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-500">Bairro *</Label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm"
                  value={formData.neighborhood}
                  onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                >
                  <option value="">Selecione um bairro</option>
                  {neighborhoodList.map(n => (
                    <option key={n.name} value={n.name}>{n.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-500">CEP (Opcional - Área Rural)</Label>
                <Input 
                  value={formData.zip_code}
                  onChange={e => setFormData({...formData, zip_code: e.target.value})}
                  placeholder="27175-000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-500">Ponto de Referência</Label>
              <div className="relative">
                <Input 
                  value={formData.reference_point}
                  onChange={e => setFormData({...formData, reference_point: e.target.value})}
                  placeholder="Perto do mercado, em frente à igreja..."
                  className="pl-9"
                />
                <Info size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-500">Observações de Entrega</Label>
              <Input 
                value={formData.observations}
                onChange={e => setFormData({...formData, observations: e.target.value})}
                placeholder="Ex: Deixar na portaria, entrar pelo portão lateral"
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl font-black uppercase tracking-widest">
              {saving ? <Loader2 className="animate-spin mr-2" /> : 'Salvar Endereço'}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {addresses.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 border-2 border-dashed rounded-2xl">
              <MapPin className="mx-auto mb-2 opacity-20" size={32} />
              <p className="text-[10px] font-bold uppercase">Nenhum endereço cadastrado</p>
            </div>
          ) : (
            addresses.map((addr) => (
              <div key={addr.id} className="p-4 rounded-2xl border-2 border-zinc-50 hover:border-primary/20 transition-all group flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xs uppercase tracking-tight">{addr.recipient_name}</span>
                    <span className="bg-zinc-100 text-[8px] font-bold px-2 py-0.5 rounded uppercase">{addr.label}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium">
                    {addr.street}, {addr.number} - {addr.neighborhood}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {addr.city}, {addr.state} {addr.zip_code ? ` - CEP: ${addr.zip_code}` : ''}
                  </p>
                  {(addr.reference_point || addr.observations) && (
                    <div className="mt-2 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                      {addr.reference_point && (
                        <p className="text-[9px] text-zinc-600 font-bold uppercase flex items-center gap-1">
                          <Info size={10} /> Ref: {addr.reference_point}
                        </p>
                      )}
                      {addr.observations && (
                        <p className="text-[9px] text-zinc-500 font-medium mt-0.5">
                          Obs: {addr.observations}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                 <div className="flex flex-col gap-2">
                   {addr.is_default ? (
                     <div className="bg-green-100 text-green-600 p-2 rounded-xl" title="Endereço Padrão">
                       <CheckCircle size={16} />
                     </div>
                   ) : (
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       onClick={() => handleSetDefault(addr.id)} 
                       className="text-zinc-300 hover:text-green-500 hover:bg-green-50"
                       title="Definir como padrão"
                     >
                       <Circle size={16} />
                     </Button>
                   )}
                   <Button variant="ghost" size="icon" onClick={() => handleDelete(addr.id)} className="text-zinc-400 hover:text-red-500 hover:bg-red-50">
                     <Trash2 size={16} />
                   </Button>
                 </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
