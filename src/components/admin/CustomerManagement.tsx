 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
  import { Users, Loader2, Search, Edit, Save, X, Plus, Trophy } from 'lucide-react'
  import { Input } from '@/components/ui/input'
  import { Button } from '@/components/ui/button'
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
  import { toast } from '@/lib/toast'
 
 export function CustomerManagement() {
    const [customers, setCustomers] = useState<any[]>([])
    const [loyaltySettings, setLoyaltySettings] = useState<any>(null)
    const [loading, setLoading] = useState(true)
   const [searchTerm, setSearchTerm] = useState('')
   const [editingCustomer, setEditingCustomer] = useState<any>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isAddingNew, setIsAddingNew] = useState(false)
    const [newCustomer, setNewCustomer] = useState({ full_name: '', whatsapp: '', loyalty_points: '0' })
   const handleAddCustomer = async () => {
     if (!newCustomer.full_name) return toast.error('Nome é obrigatório')
     setIsSaving(true)
     try {
       // Using a temporary ID or letting Supabase handle it if auth allows, 
       // but profiles are usually linked to auth.users. 
       // For a store owner adding a "manual" customer, we might need a separate table or 
       // just use the profiles table if they don't need login.
        const points = parseInt(newCustomer.loyalty_points) || 0;
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: crypto.randomUUID(), // Manual customer without auth account
            full_name: newCustomer.full_name,
            whatsapp: newCustomer.whatsapp,
            loyalty_points: points,
            points_balance: points
          })
 
       if (error) throw error
       toast.success('Novo cliente cadastrado!')
       setIsAddingNew(false)
       setNewCustomer({ full_name: '', whatsapp: '', loyalty_points: '0' })
       fetchCustomers()
     } catch (error: any) {
       toast.error('Erro ao cadastrar: ' + error.message)
     } finally {
       setIsSaving(false)
     }
   }
 
 
    useEffect(() => {
      fetchCustomers()
      fetchLoyaltySettings()
    }, [])

    const fetchLoyaltySettings = async () => {
      const { data } = await supabase.from('store_settings').select('value').eq('key', 'points_multiplier').maybeSingle()
      if (data?.value) setLoyaltySettings(data.value)
    }
 
   const fetchCustomers = async () => {
     setLoading(true)
     const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .order('created_at', { ascending: false })
     
     if (error) {
       console.error('Error fetching customers:', error)
       toast.error('Erro ao carregar clientes')
     } else {
       setCustomers(data || [])
     }
     setLoading(false)
   }
 
   const handleSave = async () => {
     if (!editingCustomer) return
     setIsSaving(true)
     try {
        const points = parseInt(editingCustomer.loyalty_points) || 0;
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: editingCustomer.full_name,
            whatsapp: editingCustomer.whatsapp,
            loyalty_points: points,
            points_balance: points
          })
         .eq('id', editingCustomer.id)
 
       if (error) throw error
       toast.success('Cliente atualizado com sucesso!')
       setEditingCustomer(null)
       fetchCustomers()
     } catch (error: any) {
       toast.error('Erro ao salvar: ' + error.message)
     } finally {
       setIsSaving(false)
     }
   }
 
   const filteredCustomers = customers.filter(c => 
     (c.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (c.whatsapp?.includes(searchTerm))
   )
 
   if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
 
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between">
         <CardTitle className="flex items-center gap-2">
           <Users className="text-primary" /> Gestão de Clientes
         </CardTitle>
          <div className="flex gap-2">
            <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
              <DialogTrigger asChild>
                <Button className="bg-zinc-900 font-black uppercase text-[10px]">
                  <Plus className="mr-2 h-4 w-4" /> Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-black uppercase italic">Novo Cadastro de Cliente</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase text-zinc-400">Insira os dados do novo cliente.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Nome Completo</label>
                    <Input 
                      value={newCustomer.full_name} 
                      onChange={e => setNewCustomer({...newCustomer, full_name: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500">WhatsApp</label>
                    <Input 
                      value={newCustomer.whatsapp} 
                      onChange={e => setNewCustomer({...newCustomer, whatsapp: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Pontos Iniciais</label>
                    <Input 
                      type="number"
                      value={newCustomer.loyalty_points} 
                      onChange={e => setNewCustomer({...newCustomer, loyalty_points: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddCustomer} disabled={isSaving} className="w-full font-black uppercase bg-zinc-900">
                    {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    Cadastrar Cliente
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Buscar cliente..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
       </CardHeader>
       <CardContent>
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Nome</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Nível / Pontos</TableHead>
               <TableHead>Data Cadastro</TableHead>
               <TableHead className="text-right">Ações</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {filteredCustomers.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                   Nenhum cliente encontrado.
                 </TableCell>
               </TableRow>
             ) : (
               filteredCustomers.map((customer) => (
                 <TableRow key={customer.id}>
                   <TableCell className="font-bold">{customer.full_name || 'Sem nome'}</TableCell>
                    <TableCell>{customer.whatsapp || 'Não informado'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const points = customer.loyalty_points || 0;
                          const tier = [...(loyaltySettings?.tiers || [])]
                            .sort((a, b) => b.min_points - a.min_points)
                            .find(t => points >= t.min_points);
                          
                          return tier ? (
                            <span 
                              className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white flex items-center gap-1 w-fit shadow-sm"
                              style={{ backgroundColor: tier.color }}
                            >
                              <Trophy size={8} /> {tier.name}
                            </span>
                          ) : null;
                        })()}
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg font-bold text-[10px] w-fit border border-amber-100">
                          {customer.loyalty_points || 0} pts
                        </span>
                      </div>
                    </TableCell>
                   <TableCell className="text-xs text-muted-foreground">
                     {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                   </TableCell>
                   <TableCell className="text-right">
                     <Button variant="ghost" size="icon" onClick={() => setEditingCustomer(customer)}>
                       <Edit className="h-4 w-4" />
                     </Button>
                   </TableCell>
                 </TableRow>
               ))
             )}
           </TableBody>
         </Table>
       </CardContent>
 
       <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
         <DialogContent className="max-w-md rounded-2xl">
           <DialogHeader>
             <DialogTitle className="font-black uppercase italic">Editar Cliente</DialogTitle>
             <DialogDescription className="text-[10px] font-bold uppercase text-zinc-400">
               Atualize os dados e pontos de fidelidade do cliente.
             </DialogDescription>
           </DialogHeader>
           {editingCustomer && (
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-zinc-500">Nome Completo</label>
                 <Input 
                   value={editingCustomer.full_name || ''} 
                   onChange={e => setEditingCustomer({...editingCustomer, full_name: e.target.value})}
                   className="rounded-xl"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-zinc-500">WhatsApp</label>
                 <Input 
                   value={editingCustomer.whatsapp || ''} 
                   onChange={e => setEditingCustomer({...editingCustomer, whatsapp: e.target.value})}
                   className="rounded-xl"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-zinc-500">Pontos de Fidelidade</label>
                 <Input 
                   type="number"
                   value={editingCustomer.loyalty_points || 0} 
                   onChange={e => setEditingCustomer({...editingCustomer, loyalty_points: e.target.value})}
                   className="rounded-xl"
                 />
               </div>
             </div>
           )}
           <DialogFooter className="gap-2">
             <Button variant="ghost" onClick={() => setEditingCustomer(null)} className="rounded-xl font-bold uppercase text-[10px]">
               <X className="mr-2 h-4 w-4" /> Cancelar
             </Button>
             <Button onClick={handleSave} disabled={isSaving} className="rounded-xl font-bold uppercase text-[10px] bg-zinc-900">
               {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
               Salvar Alterações
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </Card>
   )
 }