import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Edit, Trash2, Image as ImageIcon, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { SmartImage } from '@/components/ui/SmartImage'

export function ProductManagement() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', old_price: '', category_id: '', image_url: '', stock: '0'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: prodData } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false })
    const { data: catData } = await supabase.from('categories').select('*').order('name')
    setProducts(prodData || [])
    setCategories(catData || [])
    setIsLoading(false)
  }

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category_id) {
      return toast.error('Nome, preço e categoria são obrigatórios')
    }
    
    setIsSubmitting(true)
    const { error } = await supabase.from('products').insert([newProduct])
    setIsSubmitting(false)
    
    if (error) toast.error('Erro ao adicionar produto')
    else {
      toast.success('Produto adicionado!')
      setNewProduct({ name: '', description: '', price: '', old_price: '', category_id: '', image_url: '', stock: '0' })
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Produto excluído!')
      fetchData()
    }
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Catálogo de Produtos</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Produto</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome do Produto</Label>
                <Input value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Preço Atual</Label>
                <Input type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Preço Antigo (Opcional)</Label>
                <Input type="number" step="0.01" value={newProduct.old_price} onChange={(e) => setNewProduct({...newProduct, old_price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select onValueChange={(val) => setNewProduct({...newProduct, category_id: val})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estoque</Label>
                <Input type="number" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>URL da Imagem</Label>
                <div className="flex gap-2">
                  <Input value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})} />
                  <Button variant="outline" size="icon"><ImageIcon className="w-4 h-4" /></Button>
                </div>
              </div>
              <Button onClick={handleAddProduct} disabled={isSubmitting} className="w-full col-span-2">
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Salvar Produto'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="relative">
                  <SmartImage 
                    src={p.image_url} 
                    tableName="products" 
                    itemId={p.id} 
                    className="w-10 h-10 object-cover rounded" 
                  />
                  {p.has_media_error && (
                    <div className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5">
                      <AlertTriangle size={8} />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.categories?.name}</TableCell>
                <TableCell>R$ {Number(p.price).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
