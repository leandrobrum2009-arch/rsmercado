 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
 import { Users, Loader2, Search } from 'lucide-react'
 import { Input } from '@/components/ui/input'
 
 export function CustomerManagement() {
   const [customers, setCustomers] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [searchTerm, setSearchTerm] = useState('')
 
   useEffect(() => {
     fetchCustomers()
   }, [])
 
   const fetchCustomers = async () => {
     const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .order('created_at', { ascending: false })
     
     if (error) {
       console.error('Error fetching customers:', error)
     } else {
       setCustomers(data || [])
     }
     setLoading(false)
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
         <div className="relative w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
           <Input 
             placeholder="Buscar cliente..." 
             className="pl-10"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
         </div>
       </CardHeader>
       <CardContent>
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Nome</TableHead>
               <TableHead>WhatsApp</TableHead>
               <TableHead>Pontos</TableHead>
               <TableHead>Data Cadastro</TableHead>
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
                     <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-bold text-xs">
                       {customer.loyalty_points || 0} pts
                     </span>
                   </TableCell>
                   <TableCell className="text-xs text-muted-foreground">
                     {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                   </TableCell>
                 </TableRow>
               ))
             )}
           </TableBody>
         </Table>
       </CardContent>
     </Card>
   )
 }