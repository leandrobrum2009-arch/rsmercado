import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/lib/toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, User, Phone, MapPin, Plus, Trash2, Camera, Calendar, Users } from 'lucide-react'

export function ProfileEditor({ profile, onUpdate }: { profile: any, onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    whatsapp: profile.whatsapp || '',
    avatar_url: profile.avatar_url || '',
    birthday: profile.birthday || '',
    gender: profile.gender || '',
    family_status: profile.family_status || ''
  })
  const [addresses, setAddresses] = useState<any[]>([])
  const [showAddressForm, setShowShowAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: ''
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      return toast.error('A imagem deve ter no máximo 2MB')
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Math.random()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setFormData({ ...formData, avatar_url: publicUrl })
      toast.success('Foto carregada! Salve as alterações para confirmar.')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao subir foto. Verifique se o bucket "avatars" existe.')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!formData.full_name.trim()) return toast.error('Nome é obrigatório')

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
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-primary/20 overflow-hidden bg-gray-100 flex items-center justify-center">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Toque na câmera para mudar a foto</p>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Data de Nascimento
              </Label>
              <Input 
                type="date"
                value={formData.birthday} 
                onChange={(e) => setFormData({...formData, birthday: e.target.value})} 
              />
            </div>
            <div className="grid gap-2">
              <Label>Sexo</Label>
              <Select 
                value={formData.gender} 
                onValueChange={(val) => setFormData({...formData, gender: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro / Prefiro não dizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Composição Familiar
            </Label>
            <Select 
              value={formData.family_status} 
              onValueChange={(val) => setFormData({...formData, family_status: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Como você mora hoje?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mora sozinho">Mora sozinho(a)</SelectItem>
                <SelectItem value="Casal">Casal</SelectItem>
                <SelectItem value="Família com crianças">Família com crianças</SelectItem>
                <SelectItem value="Família apenas adultos">Família apenas adultos</SelectItem>
              </SelectContent>
            </Select>
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
