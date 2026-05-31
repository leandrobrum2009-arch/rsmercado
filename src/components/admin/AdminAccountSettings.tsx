import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Save, User, Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react'
import { toast } from '@/lib/toast'

export function AdminAccountSettings() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)
        setFormData(prev => ({ ...prev, email: authUser.email || '' }))
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()
        
        if (profileData) {
          setProfile(profileData)
          setFormData(prev => ({ ...prev, full_name: profileData.full_name || '' }))
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!formData.full_name) return toast.error('Nome é obrigatório')
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: formData.full_name })
        .eq('id', user.id)
      
      if (error) throw error
      toast.success('Nome atualizado com sucesso!')
      fetchUserData()
    } catch (err: any) {
      toast.error('Erro ao atualizar nome: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!formData.email) return toast.error('Email é obrigatório')
    if (formData.email === user.email) return toast.info('O email é o mesmo')
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: formData.email })
      if (error) throw error
      toast.success('Email atualizado! Verifique seu novo e-mail para confirmar a alteração.')
    } catch (err: any) {
      toast.error('Erro ao atualizar email: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!formData.newPassword) return toast.error('Senha é obrigatória')
    if (formData.newPassword !== formData.confirmPassword) return toast.error('As senhas não coincidem')
    if (formData.newPassword.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres')
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.newPassword })
      if (error) throw error
      toast.success('Senha atualizada com sucesso!')
      setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }))
    } catch (err: any) {
      toast.error('Erro ao atualizar senha: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4 mb-4">
          <div className="bg-zinc-900 p-3 rounded-lg text-white shadow-lg">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">Minha Conta</h2>
            <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Gerencie suas credenciais de acesso</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-zinc-900 text-white">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={16} /> Dados do Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Nome de Exibição</label>
                 <Input 
                   value={formData.full_name}
                   onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                   className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold uppercase text-[10px]"
                 />
               </div>
               <Button onClick={handleUpdateProfile} disabled={loading} className="w-full h-12 rounded-2xl font-black uppercase text-xs bg-primary shadow-lg shadow-primary/20">
                 {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save size={16} className="mr-2" />}
                 Atualizar Nome
               </Button>

               <div className="pt-4 border-t space-y-2">
                 <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Email de Acesso (Login)</label>
                 <Input 
                   type="email"
                   value={formData.email}
                   onChange={e => setFormData({ ...formData, email: e.target.value })}
                   className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold text-[10px]"
                 />
                 <p className="text-[9px] text-zinc-400 font-bold italic">* Alterar o e-mail exigirá confirmação no novo endereço.</p>
               </div>
               <Button onClick={handleUpdateEmail} disabled={loading} variant="outline" className="w-full h-12 rounded-2xl font-black uppercase text-xs border-2">
                 {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Mail size={16} className="mr-2" />}
                 Atualizar Email
               </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-zinc-100 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-zinc-600">
                <Lock size={16} /> Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Nova Senha</label>
                 <Input 
                   type="password"
                   value={formData.newPassword}
                   onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                   className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Confirmar Nova Senha</label>
                 <Input 
                   type="password"
                   value={formData.confirmPassword}
                   onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                   className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
                 />
               </div>
               <Button onClick={handleUpdatePassword} disabled={loading} className="w-full h-12 rounded-2xl font-black uppercase text-xs bg-zinc-900">
                 {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Lock size={16} className="mr-2" />}
                 Confirmar Nova Senha
               </Button>
            </CardContent>
          </Card>

          {user?.email === 'leandrobrum2009@gmail.com' && (
            <Card className="md:col-span-2 border-2 border-amber-200 bg-amber-50 shadow-xl rounded-[40px] overflow-hidden">
               <CardContent className="p-8 flex items-start gap-6">
                  <div className="p-4 bg-amber-100 rounded-3xl text-amber-600 shadow-inner">
                    <ShieldCheck size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-amber-900 leading-none">Administrador Total (Super Admin)</h3>
                    <p className="text-[11px] font-bold uppercase text-amber-700 leading-relaxed max-w-2xl">
                      Este e-mail ({user.email}) é reconhecido como o proprietário master do sistema. 
                      Você tem acesso total e irrevogável por padrão de segurança (Hardcoded Super Admin).
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-200/50 rounded-full text-[9px] font-black uppercase text-amber-800">
                      <AlertCircle size={12} /> Acesso Crítico Protegido
                    </div>
                  </div>
               </CardContent>
            </Card>
          )}
        </div>
    </div>
  )
}
