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
  Package,
  Loader2
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/lib/toast'

interface Supplier {
  id: string
  name: string
  cnpj: string | null
  contact_person: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean | null
  supplier_brands?: { id: string, brand_name: string }[]
  supplier_products?: { product_id: string }[]
}

interface Product {
  id: string
  name: string
  brand: string | null
  category_id: string | null
}

interface Category {
  id: string
  name: string
}

interface PurchaseOrderItem {
  id?: string
  product_id?: string | null
  brand_name?: string | null
  quantity: number
  unit_price: number
  received_quantity: number | null
  defective_quantity: number | null
  expiry_date?: string | null
}

interface PurchaseOrder {
  id: string
  supplier_id: string | null
  status: string
  total_amount: number | null
  delivery_date: string | null
  actual_delivery_date: string | null
  payment_status: string | null
  notes: string | null
  created_at: string | null
  suppliers?: { name: string, whatsapp: string | null, phone: string | null, address: string | null, contact_person: string | null } | null
  purchase_order_items?: any[]
}

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddingSupplier, setIsAddingSupplier] = useState(false)
  const [isManagingProducts, setIsManagingProducts] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isAddingOrder, setIsAddingOrder] = useState(false)
  const [isViewingOrder, setIsViewingOrder] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('suppliers')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '', cnpj: '', contact_person: '', phone: '', whatsapp: '', email: '', address: '', notes: '', is_active: true
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
    console.log('SupplierManagement: Buscando dados...')
    try {
      const { data: suppliersData, error: sError } = await supabase
        .from('suppliers')
        .select(`
          *, 
          supplier_brands(*), 
          supplier_products(product_id)
        `)
        .order('name')
      
      if (sError) {
        console.error('Erro ao buscar fornecedores:', sError)
        if (sError.message.includes('schema cache') || sError.message.includes('could not find the table')) {
          toast.error('O sistema está atualizando o cache do banco de dados. Por favor, aguarde 5 segundos e recarregue a página.')
        } else {
          toast.error('Erro ao buscar fornecedores: ' + sError.message)
        }
      }

      const { data: ordersData, error: oError } = await supabase
        .from('purchase_orders')
        .select(`
          *, 
          suppliers(name, whatsapp, phone, address, contact_person), 
          purchase_order_items(*, products(name))
        `)
        .order('created_at', { ascending: false })
      
      if (oError) {
        console.error('Erro ao buscar pedidos:', oError)
        throw oError
      }

      const { data: productsData } = await supabase.from('products').select('id, name, brand, category_id').order('name')
      const { data: categoriesData } = await supabase.from('categories').select('id, name').order('name')
      
      setSuppliers((suppliersData as any) || [])
      setOrders((ordersData as any) || [])
      setProducts((productsData as any) || [])
      setCategories((categoriesData as any) || [])
      console.log('SupplierManagement: Dados carregados com sucesso:', (suppliersData as any)?.length, 'fornecedores encontrados.')
    } catch (error: any) { 
      console.error('SupplierManagement: Erro fatal no fetchData:', error)
      toast.error('Erro ao carregar dados: ' + (error.message || 'Erro desconhecido')) 
    } finally { 
      setLoading(false) 
    }
  }

  const handleAddSupplier = async () => {
    setSaveError(null)
    setIsSaving(true)
    console.log('Iniciando cadastro de fornecedor:', newSupplier)
    if (!newSupplier.name) {
      setIsSaving(false)
      return toast.error('Nome é obrigatório')
    }
    
    // Basic validation
    if (newSupplier.email && !newSupplier.email.includes('@')) {
      setIsSaving(false)
      return toast.error('E-mail inválido')
    }

    try {
      // Check if supplier with same name already exists
      const { data: existing, error: checkError } = await supabase
        .from('suppliers')
        .select('id')
        .ilike('name', newSupplier.name!)
        .maybeSingle()
      
      if (checkError) {
        console.error('Erro ao verificar fornecedor existente:', checkError)
      }

      if (existing) {
        return toast.error('Já existe um fornecedor com este nome')
      }

      // Filter out empty strings to avoid validation/format issues in DB
      const supplierData: any = {
        name: newSupplier.name,
        cnpj: newSupplier.cnpj || null,
        contact_person: newSupplier.contact_person || null,
        phone: newSupplier.phone || null,
        whatsapp: newSupplier.whatsapp || null,
        email: newSupplier.email || null,
        address: newSupplier.address || null,
        notes: newSupplier.notes || null,
        is_active: newSupplier.is_active ?? true
      }

      console.log('Enviando dados para o Supabase:', supplierData)
      const { data, error } = await supabase.from('suppliers').insert([supplierData]).select().single()
      
      if (error) {
        console.error('Erro detalhado do Supabase ao inserir:', error)
        let errorMsg = error.message
        if (error.message.includes('schema cache') || error.message.includes('could not find the table')) {
          errorMsg = 'Erro de sincronização. O cache do banco de dados está sendo atualizado.'
        } else if (error.code === '42501') {
          errorMsg = 'Acesso Negado: Você não tem permissão para realizar esta operação (RLS).'
        }
        setSaveError(errorMsg)
        toast.error(errorMsg)
        throw error
      }

      toast.success('Fornecedor cadastrado!')
      setIsAddingSupplier(false)
      setSaveError(null)
      setNewSupplier({ name: '', cnpj: '', contact_person: '', phone: '', whatsapp: '', email: '', address: '', notes: '', is_active: true })
      fetchData()
      
      // Auto-open product management for the new supplier
      if (data) {
        setSelectedSupplier(data as Supplier)
        setIsManagingProducts(true)
      }
    } catch (error: any) { 
      console.error('Erro ao cadastrar fornecedor:', error)
      const msg = error.message || 'Erro desconhecido'
      setSaveError(msg)
      toast.error('Erro ao cadastrar fornecedor: ' + msg) 
    } finally {
      setIsSaving(false)
    }
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
    } catch (error: any) { 
      console.error(error)
      toast.error('Erro ao criar solicitação: ' + (error.message || 'Erro desconhecido')) 
    }
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
    } catch (error: any) { 
      console.error(error)
      toast.error('Erro ao registrar recebimento: ' + (error.message || 'Erro desconhecido')) 
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

  const toggleProduct = async (supplierId: string, productId: string, isSelected: boolean) => {
    try {
      if (isSelected) {
        await supabase.from('supplier_products').delete().eq('supplier_id', supplierId).eq('product_id', productId)
      } else {
        await supabase.from('supplier_products').insert([{ supplier_id: supplierId, product_id: productId }])
      }
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao atualizar produto: ' + (error.message || 'Erro desconhecido'))
    }
  }

  const toggleCategoryProducts = async (supplierId: string, categoryId: string, selectAll: boolean) => {
    try {
      const categoryProducts = products.filter(p => p.category_id === categoryId)
      const supplierProductIds = suppliers.find(s => s.id === supplierId)?.supplier_products?.map(sp => sp.product_id) || []
      
      if (selectAll) {
        const toAdd = categoryProducts
          .filter(p => !supplierProductIds.includes(p.id))
          .map(p => ({ supplier_id: supplierId, product_id: p.id }))
        
        if (toAdd.length > 0) {
          await supabase.from('supplier_products').insert(toAdd)
        }
      } else {
        const toRemoveIds = categoryProducts
          .filter(p => supplierProductIds.includes(p.id))
          .map(p => p.id)
        
        if (toRemoveIds.length > 0) {
          await supabase.from('supplier_products').delete().eq('supplier_id', supplierId).in('product_id', toRemoveIds)
        }
      }
      fetchData()
      toast.success(selectAll ? 'Produtos adicionados!' : 'Produtos removidos!')
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao atualizar categoria: ' + (error.message || 'Erro desconhecido'))
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_person?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )


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

        <TabsContent value="suppliers" className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <Input 
              placeholder="Buscar fornecedor por nome ou contato..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-white border-zinc-100 shadow-sm focus:ring-zinc-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map(supplier => (
              <Card key={supplier.id} className="border-0 shadow-lg rounded-[32px] overflow-hidden bg-white group hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-zinc-900">{supplier.name}</CardTitle>
                      <p className="text-[10px] font-bold uppercase text-zinc-400 mt-1">{supplier.contact_person}</p>
                    </div>
                    <Badge variant={supplier.is_active ? "default" : "secondary"} className="rounded-full px-3 py-1 text-[8px] font-black uppercase">
                      {supplier.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-zinc-400">WhatsApp</p>
                      <p className="text-xs font-bold text-zinc-700">{supplier.whatsapp || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-zinc-400">E-mail</p>
                      <p className="text-xs font-bold text-zinc-700 truncate">{supplier.email || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-zinc-400">CNPJ</p>
                      <p className="text-xs font-bold text-zinc-700">{supplier.cnpj || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-zinc-400">Telefone</p>
                      <p className="text-xs font-bold text-zinc-700">{supplier.phone || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t border-zinc-50">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black uppercase text-zinc-400">Produtos</p>
                      <Badge variant="outline" className="text-[8px] font-bold">{supplier.supplier_products?.length || 0} itens</Badge>
                    </div>
                    <Button 
                      onClick={() => { setSelectedSupplier(supplier); setIsManagingProducts(true); }}
                      variant="outline" 
                      className="w-full rounded-2xl border-zinc-200 text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all font-black uppercase text-[10px] tracking-widest h-10"
                    >
                      <Package className="w-3 h-3 mr-2" /> Gerenciar Mix
                    </Button>
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
              <Label className="text-[10px] font-black uppercase text-zinc-400">Nome Fantasia *</Label>
              <Input value={newSupplier.name || ""} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="h-12 rounded-xl" placeholder="Ex: Nestlé" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">CNPJ</Label>
              <Input value={newSupplier.cnpj || ""} onChange={e => setNewSupplier({...newSupplier, cnpj: e.target.value})} className="h-12 rounded-xl" placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">Contato (Responsável)</Label>
              <Input value={newSupplier.contact_person || ""} onChange={e => setNewSupplier({...newSupplier, contact_person: e.target.value})} className="h-12 rounded-xl" placeholder="Nome do vendedor" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">WhatsApp</Label>
              <Input value={newSupplier.whatsapp || ""} onChange={e => setNewSupplier({...newSupplier, whatsapp: e.target.value})} className="h-12 rounded-xl" placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400">E-mail</Label>
              <Input type="email" value={newSupplier.email || ""} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} className="h-12 rounded-xl" placeholder="vendas@empresa.com" />
            </div>
            {saveError && (
              <div className="md:col-span-2 bg-red-50 border border-red-100 p-4 rounded-xl">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Erro ao Salvar</p>
                <p className="text-xs text-red-800 font-medium">{saveError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAddSupplier} 
              disabled={isSaving}
              className="rounded-xl font-black uppercase tracking-wider text-xs bg-primary"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
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
                  <SelectTrigger className="flex-1 rounded-xl h-11"><SelectValue placeholder="Produto" /></SelectTrigger>
                  <SelectContent>
                    {products
                      .filter(p => !newOrder.supplier_id || suppliers.find(s => s.id === newOrder.supplier_id)?.supplier_products?.some(sp => sp.product_id === p.id))
                      .map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
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
      <Dialog open={isManagingProducts} onOpenChange={setIsManagingProducts}>
        <DialogContent className="max-w-3xl rounded-[40px] p-0 overflow-hidden">
          {selectedSupplier && (
            <div className="flex flex-col h-[85vh]">
              <div className="bg-zinc-900 text-white p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-white/10 p-3 rounded-2xl"><Package size={24} /></div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Mix de Produtos</h2>
                    <p className="text-[10px] font-bold uppercase text-white/50 tracking-widest">{selectedSupplier.name}</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                    <Input 
                      placeholder="Filtrar produtos..." 
                      className="bg-white/5 border-white/10 text-white pl-10 h-11 rounded-xl focus:ring-white/20"
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white h-11 rounded-xl">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-8 flex-1 overflow-hidden flex flex-col gap-6">
                {selectedCategory !== 'all' && (
                  <div className="flex items-center justify-between bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-black uppercase text-zinc-600">
                        Ações para {categories.find(c => c.id === selectedCategory)?.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-[10px] font-black uppercase text-zinc-500 hover:text-green-600"
                        onClick={() => toggleCategoryProducts(selectedSupplier.id, selectedCategory, true)}
                      >
                        <CheckSquare className="w-3 h-3 mr-2" /> Marcar Todos
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-[10px] font-black uppercase text-zinc-500 hover:text-red-600"
                        onClick={() => toggleCategoryProducts(selectedSupplier.id, selectedCategory, false)}
                      >
                        <Square className="w-3 h-3 mr-2" /> Desmarcar Todos
                      </Button>
                    </div>
                  </div>
                )}

                <ScrollArea className="flex-1 pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {products
                      .filter(p => selectedCategory === 'all' || p.category_id === selectedCategory)
                      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(product => {
                        const isSelected = selectedSupplier.supplier_products?.some(sp => sp.product_id === product.id)
                        return (
                          <div 
                            key={product.id}
                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-zinc-900 border-zinc-900 text-white' 
                                : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300'
                            }`}
                            onClick={() => toggleProduct(selectedSupplier.id, product.id, !!isSelected)}
                          >
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleProduct(selectedSupplier.id, product.id, !!isSelected)}
                              className={isSelected ? 'border-white data-[state=checked]:bg-white data-[state=checked]:text-zinc-900' : ''}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black uppercase truncate">{product.name}</p>
                              <p className={`text-[8px] font-bold uppercase ${isSelected ? 'text-white/50' : 'text-zinc-400'}`}>
                                {categories.find(c => c.id === product.category_id)?.name || 'Sem categoria'}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </ScrollArea>
              </div>

              <div className="p-8 border-t border-zinc-100 flex justify-end">
                <Button 
                  onClick={() => setIsManagingProducts(false)}
                  className="rounded-2xl bg-zinc-900 h-12 px-8 font-black uppercase text-xs tracking-widest"
                >
                  Concluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
