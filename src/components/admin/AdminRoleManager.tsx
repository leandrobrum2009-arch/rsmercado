 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
 import { ShieldCheck, Loader2, Shield, Save, X, Lock } from 'lucide-react'
 import { Button } from '@/components/ui/button'
 import { Checkbox } from '@/components/ui/checkbox'
 import { toast } from '@/lib/toast'
 import { Badge } from '@/components/ui/badge'
 
 export function AdminRoleManager() {
   const [admins, setAdmins] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [isSaving, setIsSaving] = useState(false)
   const [editingAdmin, setEditingAdmin] = useState<any>(null)
  const [isColumnMissing, setIsColumnMissing] = useState(false)
 
   const availablePermissions = [
     { id: 'dashboard', label: 'Dashboard', group: 'Geral' },
     { id: 'delivery_report', label: 'Relatório de Entregas', group: 'Relatórios' },
     { id: 'orders', label: 'Pedidos', group: 'Vendas' },
     { id: 'products', label: 'Produtos', group: 'Vendas' },
     { id: 'offers', label: 'Ofertas', group: 'Vendas' },
     { id: 'customers', label: 'Clientes', group: 'Vendas' },
     { id: 'categories', label: 'Categorias', group: 'Vendas' },
     { id: 'loyalty', label: 'Fidelidade & Bairros', group: 'Vendas' },
     { id: 'layout', label: 'Layout Home', group: 'Vendas' },
     { id: 'importer', label: 'Importação', group: 'Vendas' },
     { id: 'banners', label: 'Banners', group: 'Marketing' },
     { id: 'flyers', label: 'Encartes', group: 'Marketing' },
     { id: 'recipes', label: 'Receitas', group: 'Marketing' },
     { id: 'notifications', label: 'Notificações', group: 'Marketing' },
     { id: 'alerts', label: 'Alertas', group: 'Marketing' },
     { id: 'settings', label: 'Configurações Loja', group: 'Sistêmico' },
     { id: 'whatsapp', label: 'WhatsApp', group: 'Sistêmico' },
     { id: 'webhooks', label: 'Webhooks', group: 'Sistêmico' },
   ]
 
   useEffect(() => {
     fetchAdmins()
   }, [])
 
   const fetchAdmins = async () => {
     setLoading(true)
     try {
       const { data, error } = await supabase
         .from('user_roles')
         .select('*, profiles(full_name, email)')
         .eq('role', 'admin')
       
       if (error) {
         if (error.message.includes('column "permissions" does not exist')) {
           setIsColumnMissing(true)
         }
         throw error
       }
        setAdmins(data || [])
     } catch (err: any) {
       console.error('Error fetching admins:', err)
       toast.error('Erro ao carregar administradores')
     } finally {
       setLoading(false)
     }
   }
 
   const handleSavePermissions = async () => {
     if (!editingAdmin) return
     setIsSaving(true)
     try {
       const { error } = await supabase
         .from('user_roles')
         .update({ permissions: editingAdmin.permissions || [] })
         .eq('id', editingAdmin.id)
 
       if (error) throw error
       toast.success('Permissões atualizadas com sucesso!')
       setEditingAdmin(null)
       fetchAdmins()
     } catch (err: any) {
       console.error('Error saving permissions:', err)
       toast.error('Erro ao salvar permissões')
     } finally {
       setIsSaving(false)
     }
   }
 
   const togglePermission = (permId: string) => {
     if (!editingAdmin) return
     const currentPerms = editingAdmin.permissions || []
     const newPerms = currentPerms.includes(permId)
       ? currentPerms.filter((p: string) => p !== permId)
       : [...currentPerms, permId]
     
     setEditingAdmin({ ...editingAdmin, permissions: newPerms })
   }
 
   if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
 
   return (
     <div className="space-y-6">
       <div className="flex items-center gap-4 mb-4">
         <div className="bg-zinc-900 p-3 rounded-lg text-white shadow-lg">
           <Lock size={24} />
         </div>
         <div>
           <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">Permissões de Admin</h2>
           <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Controle o que cada administrador pode acessar</p>
         </div>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {isColumnMissing && (
            <div className="lg:col-span-12 bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
              <p className="text-red-800 text-xs font-black uppercase">Erro: Estrutura de Banco de Dados Ausente</p>
              <p className="text-red-600 text-[10px] font-bold mt-1">
                A coluna 'permissions' não foi encontrada na tabela 'user_roles'. 
                Por favor, execute o script SQL de migração no painel do Supabase.
              </p>
            </div>
          )}
         <Card className="lg:col-span-5 border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
           <CardHeader className="bg-zinc-900 text-white">
             <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
               <Shield size={16} /> Administradores Ativos
             </CardTitle>
           </CardHeader>
           <CardContent className="p-0">
             <div className="divide-y divide-zinc-100">
               {admins.map((admin) => (
                 <button
                   key={admin.id}
                   onClick={() => setEditingAdmin(admin)}
                   className={`w-full p-4 flex items-center justify-between text-left transition-colors ${editingAdmin?.id === admin.id ? 'bg-zinc-50' : 'hover:bg-zinc-50/50'}`}
                 >
                   <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-full ${admin.profiles?.email === 'leandrobrum2009@gmail.com' ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-500'}`}>
                       <ShieldCheck size={16} />
                     </div>
                     <div>
                       <p className="font-black uppercase text-[10px] text-zinc-900">{admin.profiles?.full_name || 'Usuário Admin'}</p>
                       <p className="text-[9px] font-bold text-zinc-400">{admin.profiles?.email}</p>
                     </div>
                   </div>
                   <Badge variant="outline" className="text-[8px] font-black uppercase">
                     {(admin.permissions || []).length} Permissões
                   </Badge>
                 </button>
               ))}
             </div>
           </CardContent>
         </Card>
 
         <Card className="lg:col-span-7 border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
           <CardHeader className="bg-zinc-100 border-b">
             <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
               <Lock size={16} className="text-zinc-600" /> 
               {editingAdmin ? `Editando: ${editingAdmin.profiles?.full_name}` : 'Selecione um admin para editar'}
             </CardTitle>
           </CardHeader>
           <CardContent className="p-6">
             {!editingAdmin ? (
               <div className="text-center p-12 text-zinc-400">
                 <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
                 <p className="text-[10px] font-black uppercase tracking-widest">Nenhum administrador selecionado</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {editingAdmin.profiles?.email === 'leandrobrum2009@gmail.com' && (
                   <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3">
                     <ShieldCheck className="text-amber-600 h-5 w-5" />
                     <p className="text-[9px] font-black uppercase text-amber-800 leading-tight">
                       SUPER ADMIN: Este perfil possui acesso total por padrão.
                     </p>
                   </div>
                 )}
 
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {['Relatórios', 'Vendas', 'Marketing', 'Sistêmico', 'Geral'].map(group => (
                     <div key={group} className="space-y-3">
                       <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b pb-1">{group}</h4>
                       <div className="space-y-2">
                         {availablePermissions.filter(p => p.group === group).map(perm => (
                           <div key={perm.id} className="flex items-center space-x-2">
                             <Checkbox 
                               id={perm.id} 
                               checked={editingAdmin.permissions?.includes(perm.id)}
                               onCheckedChange={() => togglePermission(perm.id)}
                               disabled={editingAdmin.profiles?.email === 'leandrobrum2009@gmail.com'}
                             />
                             <label 
                               htmlFor={perm.id} 
                               className="text-[10px] font-bold uppercase text-zinc-600 cursor-pointer select-none"
                             >
                               {perm.label}
                             </label>
                           </div>
                         ))}
                       </div>
                     </div>
                   ))}
                 </div>
 
                 <div className="pt-6 border-t flex justify-end gap-3">
                   <Button variant="ghost" onClick={() => setEditingAdmin(null)} className="rounded-xl text-[10px] font-black uppercase">
                     Cancelar
                   </Button>
                   <Button 
                     onClick={handleSavePermissions} 
                     disabled={isSaving || editingAdmin.profiles?.email === 'leandrobrum2009@gmail.com'}
                     className="bg-zinc-900 rounded-xl px-8 text-[10px] font-black uppercase h-10"
                   >
                     {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                     Salvar Permissões
                   </Button>
                 </div>
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     </div>
   )
 }