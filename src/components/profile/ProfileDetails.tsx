 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { Loader2, Save, User, Calendar, Users, Camera } from 'lucide-react'
 import { toast } from '@/lib/toast'
 
 export function ProfileDetails({ profile, onUpdate }: { profile: any, onUpdate: () => void }) {
   const [loading, setLoading] = useState(false)
   const [formData, setFormData] = useState({
     full_name: profile?.full_name || '',
     birth_date: profile?.birth_date || '',
     gender: profile?.gender || '',
     household_status: profile?.household_status || '',
     avatar_url: profile?.avatar_url || ''
   })
 
   const handleSave = async () => {
     if (!formData.birth_date) return toast.error('Data de nascimento é obrigatória para promoções!')
     
     setLoading(true)
     const { error } = await supabase
       .from('profiles')
       .update(formData)
       .eq('id', profile.id)
 
     setLoading(false)
     if (error) {
       toast.error('Erro ao atualizar perfil')
     } else {
       toast.success('Perfil atualizado!')
       onUpdate()
     }
   }
 
   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (!file) return
 
     setLoading(true)
     const fileExt = file.name.split('.').pop()
     const fileName = `${profile.id}/${Math.random()}.${fileExt}`
     const filePath = `${fileName}`
 
     const { error: uploadError, data } = await supabase.storage
       .from('avatars')
       .upload(filePath, file, { upsert: true })
 
     if (uploadError) {
       toast.error('Erro ao subir foto: ' + uploadError.message)
       setLoading(false)
       return
     }
 
     const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
     setFormData({ ...formData, avatar_url: publicUrl })
     setLoading(false)
     toast.success('Foto carregada!')
   }
 
   return (
     <Card className="bg-white border-2 border-zinc-100 shadow-xl overflow-hidden">
       <CardHeader className="bg-zinc-50 border-b">
         <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
           <User className="text-primary" /> Dados Pessoais
         </CardTitle>
         <CardDescription className="text-[10px] font-bold uppercase text-zinc-400">Complete seu cadastro para receber descontos</CardDescription>
       </CardHeader>
       <CardContent className="p-6 space-y-6">
         <div className="flex flex-col items-center mb-6">
           <div className="relative group">
             <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 bg-zinc-100">
               {formData.avatar_url ? (
                 <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-zinc-300">
                   <User size={40} />
                 </div>
               )}
             </div>
             <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
               <Camera size={16} />
               <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
             </label>
           </div>
         </div>
 
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-zinc-500">Nome Completo</label>
             <Input 
               value={formData.full_name} 
               onChange={e => setFormData({ ...formData, full_name: e.target.value })}
               className="border-zinc-200 h-12"
             />
           </div>
 
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-zinc-500">Data de Nascimento <span className="text-red-500">*</span></label>
             <div className="relative">
               <Input 
                 type="date"
                 value={formData.birth_date} 
                 onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                 className="border-zinc-200 h-12 pl-10"
               />
               <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
             </div>
           </div>
 
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-zinc-500">Sexo</label>
             <Select 
               value={formData.gender} 
               onValueChange={val => setFormData({ ...formData, gender: val })}
             >
               <SelectTrigger className="h-12 border-zinc-200">
                 <SelectValue placeholder="Selecione" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="woman">Mulher</SelectItem>
                 <SelectItem value="man">Homem</SelectItem>
                 <SelectItem value="other">Outro / Prefiro não dizer</SelectItem>
               </SelectContent>
             </Select>
           </div>
 
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-zinc-500">Situação Familiar</label>
             <div className="relative">
               <Select 
                 value={formData.household_status} 
                 onValueChange={val => setFormData({ ...formData, household_status: val })}
               >
                 <SelectTrigger className="h-12 border-zinc-200 pl-10">
                   <SelectValue placeholder="Selecione" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="alone">Moro sozinho(a)</SelectItem>
                   <SelectItem value="couple">Casal</SelectItem>
                   <SelectItem value="family">Família em casa</SelectItem>
                 </SelectContent>
               </Select>
               <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10" size={18} />
             </div>
           </div>
         </div>
 
         <Button 
           onClick={handleSave} 
           className="w-full h-14 bg-zinc-900 hover:bg-black text-white font-black uppercase tracking-widest mt-4"
           disabled={loading}
         >
           {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
           Salvar Alterações
         </Button>
       </CardContent>
     </Card>
   )
 }