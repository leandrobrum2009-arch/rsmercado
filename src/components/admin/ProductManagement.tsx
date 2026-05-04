import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Edit, Trash2, Image as ImageIcon, AlertTriangle, Upload, SearchCheck, Zap, Eye, EyeOff, ShoppingBag, CheckCircle, Database } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'
import { Switch } from '@/components/ui/switch'
export function ProductManagement() {
  const seedInitialData = async () => {
    if (!confirm('Deseja carregar produtos iniciais no banco de dados?')) return
    setIsLoading(true)
    try {
      // Ensure categories exist
      const categoriesToCreate = [
        { name: 'Hortifruti', slug: 'hortifruti' },
        { name: 'Padaria', slug: 'padaria' },
        { name: 'Carnes', slug: 'acougue' },
        { name: 'Bebidas', slug: 'bebidas' },
        { name: 'Limpeza', slug: 'limpeza' }
      ]

      const { data: catData, error: catError } = await supabase.from('categories').upsert(categoriesToCreate, { onConflict: 'slug' }).select()
      if (catError) throw catError

      const hortiId = catData.find(c => c.slug === 'hortifruti')?.id
      const padariaId = catData.find(c => c.slug === 'padaria')?.id

      const productsToSeed = [
        { name: 'Banana Nanica 1kg', price: 5.99, category_id: hortiId, is_approved: true, is_available: true, image_url: 'https://images.unsplash.com/photo-1571771894821-ad9902510f57?q=80&w=300' },
        { name: 'Pão Francês Unidade', price: 0.95, category_id: padariaId, is_approved: true, is_available: true, image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=300' },
        { name: 'Maçã Gala 1kg', price: 12.90, category_id: hortiId, is_approved: true, is_available: true, image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=300' }
      ]

      const { error: prodError } = await supabase.from('products').insert(productsToSeed)
      if (prodError) throw prodError

      toast.success('Produtos iniciais carregados com sucesso!')
      fetchData()
    } catch (err) {
      console.error('Seed error:', err)
      toast.error('Erro ao carregar dados iniciais. Verifique as permissões do banco.')
    } finally {
      setIsLoading(false)
    }
  }

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
   const [newProduct, setNewProduct] = useState({
     name: '', description: '', price: '', old_price: '', category_id: '', image_url: '', stock: '0', is_available: true, points_value: '0', brand: ''
   })
  const [uploading, setUploading] = useState(false)

   const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
 
   useEffect(() => {
     const checkAdmin = async () => {
       const { data, error } = await supabase.rpc('is_admin')
       if (!error) setIsAdmin(data)
       fetchData()
     }
     checkAdmin()
   }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Using a broader query to debug visibility
      console.log('Fetching products for admin...');
      
       const { data: prodData, error: prodError } = await supabase
         .from('products')
         .select('*, categories(name)')
         .order('created_at', { ascending: false })
       
       if (prodError) {
         console.error('Fetch products error:', prodError);
         if (prodError.code === '42501') {
           // RLS Error - likely not an admin or policy missing
           console.warn('RLS error fetching products. User might not be admin.');
         }
         
         const { data: retryData, error: retryError } = await supabase
           .from('products')
           .select('id, name, price, image_url, stock')
           .order('created_at', { ascending: false })
           
         if (!retryError) {
           setProducts(retryData || [])
         } else {
           toast.error('Erro de permissão ao acessar o catálogo.')
         }
       } else {
         setProducts(prodData || [])
       }
      
      const { data: catData, error: catError } = await supabase.from('categories').select('*').order('name')
      if (catError) console.error('Fetch categories error:', catError)
      
      setCategories(catData || [])
    } catch (err) {
      console.error('Fetch error:', err)
      toast.error('Erro de conexão com o banco de dados.')
    }
    setIsLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileName}`

      const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath)

      setNewProduct({ ...newProduct, image_url: publicUrl })
      toast.success('Imagem carregada com sucesso!')
    } catch (error: any) {
      toast.error('Erro no upload: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category_id) {
      return toast.error('Nome, preço e categoria são obrigatórios')
    }
    
    setIsSubmitting(true)
     const productToInsert: any = {
       name: newProduct.name,
       description: newProduct.description,
       price: Number(newProduct.price),
       old_price: newProduct.old_price ? Number(newProduct.old_price) : null,
       category_id: newProduct.category_id,
       image_url: newProduct.image_url,
       stock: parseInt(newProduct.stock) || 0,
       points_value: parseInt(newProduct.points_value) || 0,
       brand: newProduct.brand
     };

    let { error } = await supabase.from('products').insert([productToInsert])
    
    if (error && error.message.includes('column')) {
       console.warn('Minimal insert fallback');
       // Try to remove potentially missing columns
       const { name, price, category_id, image_url, description } = productToInsert;
       const { error: retryError } = await supabase.from('products').insert([{ name, price, category_id, image_url, description }]);
       error = retryError;
    }
    setIsSubmitting(false)
    
    if (error) {
      console.error('Add product error:', error)
      toast.error('Falha ao salvar produto. Verifique sua conexão e permissões.')
    } else {
       toast.success('Produto adicionado!')
       setNewProduct({ name: '', description: '', price: '', old_price: '', category_id: '', image_url: '', stock: '0', is_available: true, points_value: '0', brand: '' })
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

  const toggleAvailability = async (id: string, current: boolean) => {
    const { error } = await supabase.from('products').update({ is_available: !current }).eq('id', id)
    if (error) toast.error('Erro ao atualizar disponibilidade')
    else {
      setProducts(products.map(p => p.id === id ? { ...p, is_available: !current } : p))
      toast.success(current ? 'Produto ocultado' : 'Produto visível')
    }
  }

  const approveAll = async () => {
    if (!confirm('Deseja publicar todos os produtos importados?')) return
    setIsLoading(true)
    const { error } = await supabase
      .from('products')
      .update({ is_approved: true })
      .eq('is_approved', false)
    
    if (error) toast.error('Erro ao aprovar produtos')
    else {
      toast.success('Todos os produtos foram publicados!')
      fetchData()
    }
    setIsLoading(false)
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

   return (
     <div className="space-y-4">
       {isAdmin === false && (
         <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center gap-4 mb-4">
           <AlertTriangle className="text-amber-600 h-6 w-6" />
           <div className="flex-1">
             <p className="text-sm font-black uppercase text-amber-900">Acesso Restrito Detectado</p>
             <p className="text-[10px] text-amber-700 font-bold">Seu usuário não tem permissão de administrador no banco de dados. O gerenciamento de produtos pode falhar.</p>
           </div>
           <Button size="sm" variant="outline" className="border-amber-600 text-amber-600 font-bold text-[10px]" onClick={() => window.location.href = '/admin-fix'}>CORRIGIR AGORA</Button>
         </div>
       )}
 
       <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-xl font-semibold uppercase font-black italic">Catálogo de Produtos</h2>
        <div className="flex gap-2 items-center">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={seedInitialData} 
              className="border-zinc-300 text-zinc-600 hover:bg-zinc-50 font-black uppercase text-[10px]"
            >
              <Database className="mr-2 h-4 w-4" /> Semear Dados
            </Button>
            <Button 
              variant="outline" 
              onClick={approveAll} 
              className="border-green-600 text-green-600 hover:bg-green-50 font-black uppercase text-[10px]"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Publicar Tudo
            </Button>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-zinc-900 font-black uppercase text-xs"><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle className="font-black uppercase">Cadastrar Produto</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-4">
                 <div className="space-y-2 col-span-2 md:col-span-1">
                   <Label className="text-[10px] uppercase font-bold">Nome do Produto</Label>
                   <Input value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                 </div>
                 <div className="space-y-2 col-span-2 md:col-span-1">
                   <Label className="text-[10px] uppercase font-bold">Marca</Label>
                   <Input value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} />
                 </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label className="text-[10px] uppercase font-bold">Preço Atual</Label>
                  <Input type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label className="text-[10px] uppercase font-bold">Valor em Pontos (Opcional)</Label>
                  <Input type="number" value={newProduct.points_value} onChange={(e) => setNewProduct({...newProduct, points_value: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Categoria</Label>
                  <Select onValueChange={(val) => setNewProduct({...newProduct, category_id: val})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 col-span-2 py-2">
                  <Switch checked={newProduct.is_available} onCheckedChange={(checked) => setNewProduct({...newProduct, is_available: checked})} />
                  <Label className="font-bold">Disponível para venda na loja</Label>
                </div>
                <Button onClick={handleAddProduct} disabled={isSubmitting} className="w-full col-span-2 bg-zinc-900 font-black uppercase">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Salvar Produto'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border-2 border-zinc-100 rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50">
               <TableRow>
                 <TableHead className="text-[10px] font-black uppercase">Imagem</TableHead>
                 <TableHead className="text-[10px] font-black uppercase">Nome</TableHead>
                 <TableHead className="text-[10px] font-black uppercase">Marca</TableHead>
                 <TableHead className="text-[10px] font-black uppercase text-center">Preço</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-center">Venda Online</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <ShoppingBag className="h-12 w-12 opacity-20" />
                      <p className="font-bold uppercase text-xs">Nenhum produto cadastrado no catálogo</p>
                      <p className="text-[10px]">Use a aba de <strong>Importação</strong> para buscar novos produtos ou adicione manualmente.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <SmartImage src={p.image_url} tableName="products" itemId={p.id} className="w-10 h-10 object-cover rounded shadow-sm" />
                </TableCell>
                 <TableCell className="font-bold text-xs uppercase">
                   <div className="flex flex-col">
                     <span>{p.name}</span>
                     {p.brand && <span className="text-[9px] text-zinc-400 font-normal">{p.brand}</span>}
                   </div>
                 </TableCell>
                 <TableCell className="text-xs uppercase font-medium">{p.brand || '-'}</TableCell>
                <TableCell className="text-center font-black">R$ {Number(p.price).toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <Switch checked={p.is_available} onCheckedChange={() => toggleAvailability(p.id, p.is_available)} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-500">
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
