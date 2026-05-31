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
  MessageSquare, 
  ClipboardList, 
  Trash2, 
  Search,
  PackageCheck,
  History,
  FileText
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
  suppliers?: { name: string, whatsapp: string, phone: string, address: string, contact_person: string }
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
    name: '', contact_person: '', phone: '', whatsapp: '', email: '', address: '', notes: '', is_active: true
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
        .select('*, supplier_brands(*)')
        .order('name')
      
      const { data: ordersData } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name, whatsapp, phone, address, contact_person), purchase_order_items(*, products(name))')
        .order('created_at', { ascending: false })

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, brand')
        .order('name')

      setSuppliers(suppliersData || [])
      setOrders(ordersData || [])
      setProducts(productsData || [])
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
      toast.success('Fornecedor cadastrado!')
      setIsAddingSupplier(false)
      fetchData()
    } catch (error: any) {
      toast.error('Erro ao cadastrar fornecedor: ' + error.message)
    }
  }

  const handleAddOrder = async () => {
    if (!newOrder.supplier_id) return toast.error('Selecione um fornecedor')
    if (newOrder.items.length === 0) return toast.error('Adicione ao menos um item')

    try {
      const total = newOrder.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert([{ supplier_id: newOrder.supplier_id, notes: newOrder.notes, total_amount: total, status: 'quotation_pending' }])
        .select()
        .single()

      if (orderError) throw orderError

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(newOrder.items.map(item => ({ ...item, purchase_order_id: order.id })))

      if (itemsError) throw itemsError

      toast.success('Solicitação criada!')
      setIsAddingOrder(false)
      setNewOrder({ supplier_id: '', notes: '', items: [] })
      fetchData()
    } catch (error: any) {
      toast.error('Erro ao criar: ' + error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string, color: string }> = {
      'quotation_pending': { label: 'Cotação Pendente', color: 'bg-amber-100 text-amber-700' },
      'approved': { label: 'Aprovada', color: 'bg-blue-100 text-blue-700' },
      'delivered': { label: 'Entregue', color: 'bg-green-100 text-green-700' }
    }
    const s = statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
    return <Badge className={s.color}>{s.label}</Badge>
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 p-3 rounded-2xl text-white shadow-lg"><Users size={24} /></div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900 leading-none">Suprimentos</h2>
            <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mt-1">Gestão de Fornecedores e Compras</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddingSupplier(true)} className="rounded-xl font-black uppercase tracking-wider text-xs bg-primary shadow-lg shadow-primary/20"><Plus className="mr-2 h-4 w-4" /> Fornecedor</Button>
          <Button onClick={() => setIsAddingOrder(true)} className="rounded-xl font-black uppercase tracking-wider text-xs bg-zinc-900 shadow-lg shadow-black/20"><ClipboardList className="mr-2 h-4 w-4" /> Solicitação</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-100 p-1 rounded-2xl h-auto mb-6">
          <TabsTrigger value="suppliers" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">
            <Users className="w-4 h-4 mr-2" /> Fornecedores
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">
            <History className="w-4 h-4 mr-2" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(supplier => (
              <Card key={supplier.id} className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white group">
                <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-4">
                  <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-zinc-900">{supplier.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-zinc-400">Contato: {supplier.contact_person}</p>
                    <p className="text-[10px] font-black uppercase text-zinc-400">Wpp: {supplier.whatsapp}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-50">
                    {supplier.supplier_brands?.map(b => <Badge key={b.id} variant="outline" className="text-[8px] font-bold uppercase">{b.brand_name}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Pedido</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Fornecedor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Total</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="text-xs font-bold text-zinc-900">#{order.id.substring(0,6)}</TableCell>
                    <TableCell className="text-xs font-bold">{order.suppliers?.name}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-xs font-black">R$ {order.total_amount?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setIsViewingOrder(true); }}>Conferir</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
