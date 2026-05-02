import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save, User, Phone, MapPin, Plus, Trash2 } from 'lucide-react'

export function ProfileEditor({ profile, onUpdate }: { profile: any, onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    whatsapp: profile.whatsapp || '',
    avatar_url: profile.avatar_url || ''
  })
  const [addresses, setAddresses] = useState<any[]>([])
  const [showAddressForm, setShowShowAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: ''
  })

  const handleUpdateProfile = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', profile.id)

    if (error) toast.error('Erro ao atualizar perfil')
    else {
      toast.success('Perfil atualizado!')
      onUpdate()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Meus Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome Completo</Label>
            <Input 
              value={formData.full_name} 
              onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
            />
          </div>
          <div className="grid gap-2">
            <Label>WhatsApp</Label>
            <Input 
              placeholder="(00) 00000-0000"
              value={formData.whatsapp} 
              onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} 
            />
          </div>
          <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Meus Endereços
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => toast.info('Funcionalidade em desenvolvimento')}>
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Você ainda não possui endereços cadastrados para entrega.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
