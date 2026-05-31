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
  FileText,
  Printer,
  CheckSquare,
  Square,
  Filter,
  Package
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  supplier_products?: { product_id: string }[]
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
      const { data: suppliersData } = await supabase.from('suppliers').select('*, supplier_brands(*)').order('name')
      const { data: ordersData } = await supabase.from('purchase_orders').select('*, suppliers(name, whatsapp, phone, address, contact_person), purchase_order_items(*, products(name))').order('created_at', { ascending: false })
      const { data: productsData } = await supabase.from('products').select('id, name, brand').order('name')
      setSuppliers(suppliersData || [])
      setOrders(ordersData || [])
      setProducts(productsData || [])
    } catch (error) { toast.error('Erro ao carregar dados') } finally { setLoading(false) }
  }

  const handleAddSupplier = async () => {
    if (!newSupplier.name) return toast.error('Nome é obrigatório')
    try {
      const { error } = await supabase.from('suppliers').insert([newSupplier])
      if (error) throw error
      toast.success('Fornecedor cadastrado!')
      setIsAddingSupplier(false)
      fetchData()
    } catch (error: any) { toast.error('Erro: ' + error.message) }
  }

  const handleAddOrder = async () => {
    if (!newOrder.supplier_id) return toast.error('Selecione um fornecedor')
    try {
      const total = newOrder.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
      const { data: order, error: orderError } = await supabase.from('purchase_orders').insert([{ supplier_id: newOrder.supplier_id, notes: newOrder.notes, total_amount: total, status: 'quotation_pending' }]).select().single()
      if (orderError) throw orderError
      await supabase.from('purchase_order_items').insert(newOrder.items.map(item => ({ ...item, purchase_order_id: order.id })))
      toast.success('Solicitação criada!')
      setIsAddingOrder(false)
      setNewOrder({ supplier_id: '', notes: '', items: [] })
      fetchData()
    } catch (error: any) { toast.error('Erro: ' + error.message) }
  }

  const handleRegisterReceipt = async (orderId: string, items: any[]) => {
    try {
      for (const item of items) {
        await supabase.from('purchase_order_items').update({ received_quantity: item.received_quantity, defective_quantity: item.defective_quantity, expiry_date: item.expiry_date }).eq('id', item.id)
        if (item.received_quantity > 0 && item.product_id) {
          const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single()
          await supabase.from('products').update({ stock: (prod?.stock || 0) + item.received_quantity }).eq('id', item.product_id)
        }
      }
      await supabase.from('purchase_orders').update({ status: 'delivered', actual_delivery_date: new Date().toISOString() }).eq('id', orderId)
      toast.success('Recebimento registrado!')
      setIsViewingOrder(false)
      fetchData()
    } catch (error: any) { toast.error('Erro: ' + error.message) }
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
            {suppliers.map(supplier => (
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

      <Dialog open={isAddingSupplier} onOpenChange={setIsAddingSupplier}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">Nome Fantasia</Label>
              <Input value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">WhatsApp</Label>
              <Input value={newSupplier.whatsapp} onChange={e => setNewSupplier({...newSupplier, whatsapp: e.target.value})} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">Contato</Label>
              <Input value={newSupplier.contact_person} onChange={e => setNewSupplier({...newSupplier, contact_person: e.target.value})} className="h-12 rounded-xl" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddSupplier} className="rounded-xl font-black uppercase tracking-wider text-xs bg-primary">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingOrder} onOpenChange={setIsAddingOrder}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Nova Solicitação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label className="text-[10px] font-black uppercase text-zinc-400">Fornecedor</Label>
            <Select onValueChange={val => setNewOrder({...newOrder, supplier_id: val})}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => setNewOrder({...newOrder, items: [...newOrder.items, { product_id: '', quantity: 1, unit_price: 0 }]})} className="w-full">Adicionar Item</Button>
            {newOrder.items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <Select onValueChange={val => { const items = [...newOrder.items]; items[idx].product_id = val; setNewOrder({...newOrder, items}) }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Produto" /></SelectTrigger>
                  <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" className="w-20" placeholder="Qtd" onChange={e => { const items = [...newOrder.items]; items[idx].quantity = parseFloat(e.target.value); setNewOrder({...newOrder, items}) }} />
                <Input type="number" className="w-24" placeholder="Preço" onChange={e => { const items = [...newOrder.items]; items[idx].unit_price = parseFloat(e.target.value); setNewOrder({...newOrder, items}) }} />
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={handleAddOrder} className="bg-zinc-900 rounded-xl font-black uppercase text-xs">Criar Solicitação</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewingOrder} onOpenChange={setIsViewingOrder}>
        <DialogContent className="max-w-4xl rounded-[40px] p-0 overflow-hidden">
          {selectedOrder && (
            <div className="flex flex-col">
              <div className="bg-zinc-900 text-white p-8 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-black uppercase italic italic tracking-tighter">Pedido #{selectedOrder.id.substring(0,6)}</h2>
                  <Button variant="outline" className="text-white border-white/20" onClick={() => window.print()}><Printer size={16} className="mr-2" /> Imprimir</Button>
                </div>
                <p className="text-xs uppercase font-bold text-zinc-400">Fornecedor: {selectedOrder.suppliers?.name}</p>
              </div>
              <div className="p-8 space-y-6">
                {selectedOrder.purchase_order_items?.map((item, idx) => (
                  <div key={idx} className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1"><p className="text-xs font-black uppercase">{(item as any).products?.name || 'Item'}</p></div>
                    <div className="space-y-1"><Label className="text-[8px] uppercase text-zinc-400">Recebido</Label><Input type="number" defaultValue={item.received_quantity} onChange={e => { const items = [...selectedOrder.purchase_order_items!]; items[idx].received_quantity = parseFloat(e.target.value); setSelectedOrder({...selectedOrder, purchase_order_items: items}) }} /></div>
                    <div className="space-y-1"><Label className="text-[8px] uppercase text-zinc-400">Defeitos</Label><Input type="number" defaultValue={item.defective_quantity} onChange={e => { const items = [...selectedOrder.purchase_order_items!]; items[idx].defective_quantity = parseFloat(e.target.value); setSelectedOrder({...selectedOrder, purchase_order_items: items}) }} /></div>
                    <div className="space-y-1"><Label className="text-[8px] uppercase text-zinc-400">Validade</Label><Input type="date" defaultValue={item.expiry_date} onChange={e => { const items = [...selectedOrder.purchase_order_items!]; items[idx].expiry_date = e.target.value; setSelectedOrder({...selectedOrder, purchase_order_items: items}) }} /></div>
                  </div>
                ))}
                <Button className="w-full h-14 bg-zinc-900 rounded-3xl font-black uppercase text-xs" onClick={() => handleRegisterReceipt(selectedOrder.id, selectedOrder.purchase_order_items!)}>Finalizar Recebimento e Atualizar Estoque</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
