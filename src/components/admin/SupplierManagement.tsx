import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Plus, 
  Phone, 
  Mail, 
  Search, 
  Trash2, 
  Edit, 
  MessageSquare, 
  ClipboardList, 
  Truck, 
  AlertCircle,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  PackageCheck,
  History
} from 'lucide-react'
import { toast } from '@/lib/toast'

interface Supplier {
  id: string
  name: string
  contact_person: string
  phone: string
  whatsapp: string
  email: string
  address: string
  notes: string
  is_active: boolean
  supplier_brands?: { id: string, brand_name: string }[]
}

interface Product {
  id: string
  name: string
  brand: string
}

interface PurchaseOrderItem {
  id?: string
  product_id?: string
  brand_name?: string
  quantity: number
  unit_price: number
  received_quantity: number
  defective_quantity: number
  expiry_date?: string
}

interface PurchaseOrder {
  id: string
  supplier_id: string
  status: string
  total_amount: number
  delivery_date: string
  actual_delivery_date: string
  payment_status: string
  notes: string
  created_at: string
  suppliers?: { name: string, whatsapp: string, phone: string }
  purchase_order_items?: PurchaseOrderItem[]
}

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddingSupplier, setIsAddingSupplier] = useState(false)
  const [isAddingOrder, setIsAddingOrder] = useState(false)
  const [isViewingOrder, setIsViewingOrder] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('suppliers')

  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '',
    contact_person: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    notes: '',
    is_active: true
  })

  const [newOrder, setNewOrder] = useState({
    supplier_id: '',
    notes: '',
    items: [] as any[]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')
      
      const { data: ordersData } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name)')
        .order('created_at', { ascending: false })

      setSuppliers(suppliersData || [])
      setOrders(ordersData || [])
    } catch (error) {
      console.error('Error fetching supplier data:', error)
      toast.error('Erro ao carregar dados dos fornecedores')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSupplier = async () => {
    if (!newSupplier.name) return toast.error('Nome é obrigatório')
    
    try {
      const { error } = await supabase.from('suppliers').insert([newSupplier])
      if (error) throw error
      toast.success('Fornecedor cadastrado com sucesso!')
      setIsAddingSupplier(false)
      fetchData()
    } catch (error: any) {
      toast.error('Erro ao cadastrar fornecedor: ' + error.message)
    }
  }

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Deseja realmente remover este fornecedor?')) return
    
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id)
      if (error) throw error
      toast.success('Fornecedor removido')
      fetchData()
    } catch (error: any) {
      toast.error('Erro ao remover fornecedor: ' + error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string, color: string }> = {
      'quotation_pending': { label: 'Cotação Pendente', color: 'bg-amber-100 text-amber-700' },
      'approved': { label: 'Cotação Aprovada', color: 'bg-blue-100 text-blue-700' },
      'ordered': { label: 'Pedido Realizado', color: 'bg-indigo-100 text-indigo-700' },
      'shipped': { label: 'Em Trânsito', color: 'bg-purple-100 text-purple-700' },
      'delivered': { label: 'Entregue', color: 'bg-green-100 text-green-700' },
      'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-700' }
    }
    const s = statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
    return <Badge className={s.color}>{s.label}</Badge>
  }

  const handleWhatsAppOrder = (supplier: Supplier) => {
    const phone = supplier.whatsapp || supplier.phone
    if (!phone) return toast.error('Telefone não cadastrado')
    
    const text = encodeURIComponent(`Olá ${supplier.contact_person || supplier.name}, gostaria de solicitar uma cotação/pedido para o mercado...`)
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 p-3 rounded-2xl text-white shadow-lg">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900 leading-none">Gestão de Fornecedores</h2>
            <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mt-1">Cotações, Estoque e Suprimentos</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => setIsAddingSupplier(true)}
            className="rounded-xl font-black uppercase tracking-wider text-xs bg-primary shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
          </Button>
          <Button 
            onClick={() => setIsAddingOrder(true)}
            className="rounded-xl font-black uppercase tracking-wider text-xs bg-zinc-900 shadow-lg shadow-black/20"
          >
            <ClipboardList className="mr-2 h-4 w-4" /> Nova Cotação/Pedido
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-100 p-1 rounded-2xl h-auto mb-6">
          <TabsTrigger value="suppliers" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">
            <Users className="w-4 h-4 mr-2" /> Fornecedores
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">
            <History className="w-4 h-4 mr-2" /> Histórico de Pedidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4 animate-in fade-in duration-500">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
            <Input 
              placeholder="Buscar fornecedores..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-2xl border-zinc-200 bg-white font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(supplier => (
              <Card key={supplier.id} className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white hover:scale-[1.02] transition-all group">
                <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Fornecedor</p>
                      <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-zinc-900">{supplier.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-primary rounded-xl" onClick={() => handleWhatsAppOrder(supplier)}>
                        <MessageSquare size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600 rounded-xl" onClick={() => handleDeleteSupplier(supplier.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Contato</p>
                      <p className="text-xs font-bold text-zinc-700">{supplier.contact_person || 'Não informado'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">WhatsApp</p>
                      <p className="text-xs font-bold text-zinc-700">{supplier.whatsapp || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Endereço</p>
                    <p className="text-xs font-bold text-zinc-700 line-clamp-1">{supplier.address || 'Não informado'}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 animate-in fade-in duration-500">
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow className="border-zinc-100">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400">ID / Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Fornecedor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Entrega Prevista</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Valor Total</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id} className="border-zinc-50 hover:bg-zinc-50/50">
                    <TableCell className="py-4">
                      <p className="text-[10px] font-black text-zinc-400 uppercase">#{order.id.substring(0,8)}</p>
                      <p className="text-xs font-bold text-zinc-900">{new Date(order.created_at).toLocaleDateString()}</p>
                    </TableCell>
                    <TableCell className="font-bold text-xs uppercase italic tracking-tighter">{order.suppliers?.name}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-xs font-bold text-zinc-600">
                      {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Não agendada'}
                    </TableCell>
                    <TableCell className="font-black text-sm text-zinc-900">R$ {order.total_amount?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-primary">
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para Adicionar Fornecedor */}
      <Dialog open={isAddingSupplier} onOpenChange={setIsAddingSupplier}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Novo Fornecedor</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Cadastre um novo parceiro de suprimentos</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">Nome da Empresa / Fantasia</Label>
              <Input 
                value={newSupplier.name}
                onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                className="h-12 rounded-xl border-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">Pessoa de Contato</Label>
              <Input 
                value={newSupplier.contact_person}
                onChange={e => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                className="h-12 rounded-xl border-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">WhatsApp</Label>
              <Input 
                value={newSupplier.whatsapp}
                onChange={e => setNewSupplier({ ...newSupplier, whatsapp: e.target.value })}
                className="h-12 rounded-xl border-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">E-mail</Label>
              <Input 
                value={newSupplier.email}
                onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                className="h-12 rounded-xl border-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">Telefone Fixo</Label>
              <Input 
                value={newSupplier.phone}
                onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                className="h-12 rounded-xl border-zinc-200"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">Endereço Completo</Label>
              <Input 
                value={newSupplier.address}
                onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
                className="h-12 rounded-xl border-zinc-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddingSupplier(false)} className="rounded-xl font-bold uppercase text-[10px]">Cancelar</Button>
            <Button onClick={handleAddSupplier} className="rounded-xl font-black uppercase tracking-wider text-xs bg-primary">Salvar Fornecedor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
