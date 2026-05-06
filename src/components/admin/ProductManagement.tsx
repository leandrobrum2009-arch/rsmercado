import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
 import { Save } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as LucideIcons from 'lucide-react'
import { Loader2, Plus, Edit, Trash2, Image as ImageIcon, AlertTriangle, Upload, SearchCheck, Zap, Eye, EyeOff, ShoppingBag, CheckCircle, Database, Tag, LayoutGrid, Instagram, Search, ExternalLink, Camera } from 'lucide-react'
import { SmartImage } from '@/components/ui/SmartImage'
 import { Switch } from '@/components/ui/switch'
 import { toast } from '@/lib/toast'
const getIconComponent = (name: string) => {
  // @ts-ignore
  return LucideIcons[name] || LucideIcons.ShoppingBag;
};

const CategoryIcon = ({ category, size = 16, className = "" }: { category: any, size?: number, className?: string }) => {
  if (!category) return <ShoppingBag size={size} className={className} />;
  
  if (category.icon_url) {
    return <img src={category.icon_url} className={`object-contain ${className}`} style={{ width: size, height: size }} alt="" />;
  }
  
  const [name, style] = (category.icon_name || "").split(":");
  const Icon = getIconComponent(name || category.name);
  const strokeWidth = style === 'bold' ? 2.5 : style === 'classic' ? 2.0 : style === 'thin' ? 1.0 : 1.5;
  
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
};

const parsePrice = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Replace comma with dot for Brazilian format
  const sanitized = value.replace(',', '.');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
};

export function ProductManagement() {
    const productBadges = [
      { id: 'OFERTA', label: 'Oferta', color: 'bg-red-600', animation: '' },
      { id: 'NOVO', label: 'Novo', color: 'bg-green-600', animation: '' },
      { id: 'RELAMPAGO', label: 'Piscando', color: 'bg-amber-500', animation: 'animate-pulse' },
      { id: 'EXCLUSIVO', label: 'Exclusivo', color: 'bg-purple-600', animation: '' },
      { id: 'DESTAQUE', label: 'Destaque', color: 'bg-blue-600', animation: 'animate-bounce' }
    ];
 
    const updateProductTags = async (productId: string, currentTags: string[], tagId: string) => {
      const isBadge = productBadges.some(b => b.id === tagId);
      let newTags = [...(currentTags || [])];
      
      // Remove other badges if this is a badge
      if (isBadge) {
        newTags = newTags.filter(t => !productBadges.some(b => b.id === t));
      }
  
      if (newTags.includes(tagId)) {
        newTags = newTags.filter(t => t !== tagId);
      } else {
        newTags.push(tagId);
      }
  
      const { error } = await supabase.from('products').update({ tags: newTags }).eq('id', productId);
      if (error) toast.error('Erro ao atualizar etiquetas');
      else {
        setProducts(products.map(p => p.id === productId ? { ...p, tags: newTags } : p));
        toast.success('Etiquetas atualizadas');
      }
    };
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
   const [searchQuery, setSearchQuery] = useState('')
   const [selectedBrand, setSelectedBrand] = useState('all')
   const [selectedCategory, setSelectedCategory] = useState('all')
   const [sortField, setSortField] = useState('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [isQuickEditOpen, setIsQuickEditOpen] = useState(false)
    const [quickEditCategory, setQuickEditCategory] = useState('all')
     const [quickEditData, setQuickEditData] = useState<Record<string, { price: string, old_price: string, stock: string }>>({})
    const handleQuickUpdate = async () => {
      setIsSubmitting(true)
      try {
        const updates = Object.entries(quickEditData).filter(([id, data]) => {
          const p = products.find(prod => prod.id === id);
          return p && (
            p.price.toString() !== data.price || 
            (p.old_price?.toString() || '') !== data.old_price || 
            (p.stock || 0).toString() !== data.stock
          );
        });

        for (const [id, data] of updates) {
          const price = parsePrice(data.price);
          const oldPrice = data.old_price ? parsePrice(data.old_price) : null;
          
          if (price <= 0) {
            toast.error(`O preço do produto ${products.find(p => p.id === id)?.name} deve ser maior que zero.`);
            setIsSubmitting(false);
            return;
          }

          await supabase.from('products').update({ 
            price: price, 
            old_price: oldPrice,
            stock: parseInt(data.stock) || 0
          }).eq('id', id)
        }
  
        toast.success('Produtos atualizados com sucesso!')
        setIsQuickEditOpen(false)
        fetchData()
      } catch (err) {
        toast.error('Erro ao atualizar produtos')
      } finally {
        setIsSubmitting(false)
      }
    }
 
   const filteredProducts = products
     .filter(p => {
       const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
       const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand
       const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory
       return matchesSearch && matchesBrand && matchesCategory
     })
     .sort((a, b) => {
       let valA = a[sortField] || ''
       let valB = b[sortField] || ''
       
       if (typeof valA === 'string') valA = valA.toLowerCase()
       if (typeof valB === 'string') valB = valB.toLowerCase()
       
       if (valA < valB) return sortOrder === 'asc' ? -1 : 1
       if (valA > valB) return sortOrder === 'asc' ? 1 : -1
       return 0
     })
 
   const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort()
 
  const [isSubmitting, setIsSubmitting] = useState(false)
    const [newProduct, setNewProduct] = useState({
       id: '', name: '', description: '', price: '', old_price: '', category_id: '', image_url: '', stock: '0', is_available: true, points_value: '0', brand: '', tags: ''
    })
    const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [imageSearchQuery, setImageSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [searching, setSearching] = useState(false)

   const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
 
  const performSearch = async () => {
    if (!imageSearchQuery.trim()) return;
    setSearching(true);
    try {
      const query = encodeURIComponent(imageSearchQuery + " fundo branco profissional oficial");
      const results = [
        `https://tse1.mm.bing.net/th?q=${query}&w=600&h=600&c=7&rs=1`,
        `https://tse2.mm.bing.net/th?q=${query}&w=600&h=600&c=7&rs=1`,
        `https://tse3.mm.bing.net/th?q=${query}&w=600&h=600&c=7&rs=1`,
        `https://tse4.mm.bing.net/th?q=${query}&w=600&h=600&c=7&rs=1`,
        `https://tse1.mm.bing.net/th?q=${encodeURIComponent(imageSearchQuery + " embalagem")}&w=600&h=600&c=7&rs=1`,
        `https://tse2.mm.bing.net/th?q=${encodeURIComponent(imageSearchQuery + " produto")}&w=600&h=600&c=7&rs=1`
      ];
      await new Promise(resolve => setTimeout(resolve, 800));
      setSearchResults(results);
    } catch (error) {
      toast.error('Erro ao buscar imagens');
    } finally {
      setSearching(false);
    }
  };

  const openImageSearch = () => {
    const brandPrefix = newProduct.brand ? `${newProduct.brand} ` : '';
    setImageSearchQuery(`${brandPrefix}${newProduct.name}`);
    setSearchDialogOpen(true);
    setSearchResults([]);
  };

  const selectImage = (url: string) => {
    setNewProduct({ ...newProduct, image_url: url });
    setSearchDialogOpen(false);
    toast.success('Imagem selecionada!');
  };

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

  const importFromInstagram = (url: string) => {
    if (!url.includes('instagram.com/')) {
      return toast.error('URL do Instagram inválida');
    }
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && (pathParts[0] === 'p' || pathParts[0] === 'reels' || pathParts[0] === 'reel' || pathParts[0] === 'stories')) {
        const postId = pathParts[1];
        const imageUrl = `https://www.instagram.com/p/${postId}/media/?size=l`;
        setNewProduct({ ...newProduct, image_url: imageUrl });
        toast.success('Imagem do Instagram capturada!');
      } else {
        toast.error('Não foi possível identificar o ID da postagem.');
      }
    } catch (e) {
      toast.error('Erro ao processar URL.');
    }
  };

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

    const handleSaveProduct = async () => {
      const price = parsePrice(newProduct.price);
      const oldPrice = newProduct.old_price ? parsePrice(newProduct.old_price) : null;

      if (!newProduct.name || !newProduct.category_id) {
        return toast.error('Nome e categoria são obrigatórios');
      }

      if (price <= 0) {
        return toast.error('O preço atual deve ser maior que zero');
      }
      
      setIsSubmitting(true)
      const productData: any = {
        name: newProduct.name,
        description: newProduct.description,
        price: price,
        old_price: oldPrice,
        category_id: newProduct.category_id,
        image_url: newProduct.image_url,
        stock: parseInt(newProduct.stock) || 0,
        points_value: parseInt(newProduct.points_value) || 0,
        brand: newProduct.brand,
        tags: newProduct.tags ? (Array.isArray(newProduct.tags) ? newProduct.tags : newProduct.tags.split(',').map(t => t.trim())) : []
      };
 
     let error;
     if (isEditing) {
       const { error: updateError } = await supabase
         .from('products')
         .update(productData)
         .eq('id', newProduct.id)
       error = updateError;
     } else {
       const { error: insertError } = await supabase
         .from('products')
         .insert([productData])
       error = insertError;
     }
     
     setIsSubmitting(false)
     
     if (error) {
       console.error('Save product error:', error)
       toast.error('Falha ao salvar produto.')
     } else {
       toast.success(isEditing ? 'Produto atualizado!' : 'Produto adicionado!')
       resetForm()
       fetchData()
     }
   }
 
   const resetForm = () => {
     setNewProduct({ id: '', name: '', description: '', price: '', old_price: '', category_id: '', image_url: '', stock: '0', is_available: true, points_value: '0', brand: '', tags: '' })
     setIsEditing(false)
   }
 
   const handleEdit = (product: any) => {
     setNewProduct({
       id: product.id,
       name: product.name,
       description: product.description || '',
       price: product.price.toString(),
       old_price: product.old_price ? product.old_price.toString() : '',
       category_id: product.category_id,
       image_url: product.image_url || '',
       stock: (product.stock || 0).toString(),
       is_available: product.is_available,
       points_value: (product.points_value || 0).toString(),
       brand: product.brand || '',
       tags: (product.tags || []).join(', ')
     })
     setIsEditing(true)
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
 
       <div className="flex justify-between items-center gap-4 flex-wrap mb-2">
 
       <div className="bg-white p-4 border-2 border-zinc-100 rounded-xl shadow-sm space-y-4">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="space-y-1">
             <Label className="text-[10px] uppercase font-black text-zinc-500">Buscar Produto</Label>
             <Input 
               placeholder="Nome ou marca..." 
               value={searchQuery} 
               onChange={(e) => setSearchQuery(e.target.value)}
               className="h-9 text-xs"
             />
           </div>
           <div className="space-y-1">
             <Label className="text-[10px] uppercase font-black text-zinc-500">Marca</Label>
             <Select value={selectedBrand} onValueChange={setSelectedBrand}>
               <SelectTrigger className="h-9 text-xs">
                 <SelectValue placeholder="Todas as marcas" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todas as marcas</SelectItem>
                 {brands.map(brand => (
                   <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           <div className="space-y-1">
             <Label className="text-[10px] uppercase font-black text-zinc-500">Categoria</Label>
             <Select value={selectedCategory} onValueChange={setSelectedCategory}>
               <SelectTrigger className="h-9 text-xs">
                 <SelectValue placeholder="Todas as categorias" />
               </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={cat} size={14} className="opacity-60" />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
             </Select>
           </div>
           <div className="space-y-1">
             <Label className="text-[10px] uppercase font-black text-zinc-500">Ordenar por</Label>
             <div className="flex gap-1">
               <Select value={sortField} onValueChange={setSortField}>
                 <SelectTrigger className="h-9 text-xs flex-1">
                   <SelectValue placeholder="Ordenar" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="name">Nome</SelectItem>
                   <SelectItem value="brand">Marca</SelectItem>
                   <SelectItem value="price">Preço</SelectItem>
                   <SelectItem value="created_at">Data de Cadastro</SelectItem>
                 </SelectContent>
               </Select>
               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-9 w-9"
                 onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
               >
                 {sortOrder === 'asc' ? '↑' : '↓'}
               </Button>
             </div>
           </div>
         </div>
       </div>
         <div className="flex items-center gap-3">
           <h2 className="text-xl font-semibold uppercase font-black italic">Catálogo de Produtos</h2>
           <Button 
             variant="outline" 
             size="sm"
              onClick={() => {
                 const initialData: Record<string, { price: string, old_price: string, stock: string }> = {}
                 products.forEach(p => initialData[p.id] = { 
                   price: p.price.toString(), 
                   old_price: p.old_price ? p.old_price.toString() : '',
                   stock: (p.stock || 0).toString() 
                 })
                setQuickEditData(initialData)
                setIsQuickEditOpen(true)
              }}
              className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-bold uppercase text-[10px]"
            >
              <Zap className="mr-1 h-3 w-3" /> Atualização Rápida de Preços & Estoque
            </Button>
         </div>
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
               onClick={() => {
                 // Using a manual state update if possible, or just informing the user
                 toast.info('Utilize a aba "Organizador" no menu lateral para mover produtos entre categorias em massa.')
               }}
               className="border-zinc-300 text-zinc-600 hover:bg-zinc-50 font-black uppercase text-[10px]"
             >
               <LayoutGrid className="mr-2 h-4 w-4" /> Organizar em Massa
             </Button>
             <Button 
              variant="outline" 
              onClick={approveAll} 
              className="border-green-600 text-green-600 hover:bg-green-50 font-black uppercase text-[10px]"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Publicar Tudo
            </Button>
          </div>
           <Dialog onOpenChange={(open) => !open && resetForm()}>
             <DialogTrigger asChild onClick={() => resetForm()}>
              <Button className="bg-zinc-900 font-black uppercase text-xs"><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
               <DialogHeader><DialogTitle className="font-black uppercase">{isEditing ? 'Editar Produto' : 'Cadastrar Produto'}</DialogTitle></DialogHeader>
               <div className="grid grid-cols-2 gap-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
                 <div className="space-y-2 col-span-2 md:col-span-1">
                   <Label className="text-[10px] uppercase font-bold">Nome do Produto</Label>
                   <Input value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                 </div>
                 <div className="space-y-2 col-span-2 md:col-span-1">
                   <Label className="text-[10px] uppercase font-bold">Marca</Label>
                   <Input value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} />
                 </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label className="text-[10px] uppercase font-bold text-zinc-400">Preço Anterior (De)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={newProduct.old_price} onChange={(e) => setNewProduct({...newProduct, old_price: e.target.value})} />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label className="text-[10px] uppercase font-bold text-amber-600">Preço Atual (Por)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] uppercase font-bold">Bags / Etiquetas de Destaque</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {productBadges.map(badge => {
                        const currentTags = newProduct.tags ? (typeof newProduct.tags === 'string' ? newProduct.tags.split(',').map(t => t.trim()) : newProduct.tags) : [];
                        const isActive = currentTags.includes(badge.id);
                        return (
                          <Button
                            key={badge.id}
                            type="button"
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            className={`text-[10px] font-black uppercase h-8 ${isActive ? badge.color + ' text-white border-none' : 'text-zinc-500 hover:bg-zinc-100'}`}
                            onClick={() => {
                              let newTags = [...currentTags];
                              if (isActive) {
                                newTags = newTags.filter(t => t !== badge.id);
                              } else {
                                // If it's a badge from the list, maybe we want to allow only one or multiple?
                                // The user's request says "escolher dentro dos bags", usually means selection.
                                // Let's allow multiple as it was before but make it easier.
                                newTags.push(badge.id);
                              }
                              setNewProduct({...newProduct, tags: newTags.join(', ')});
                            }}
                          >
                            {badge.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                 <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label className="text-[10px] uppercase font-bold">Link da Imagem</Label>
                    <div className="flex gap-2">
                      <Input placeholder="https://..." value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})} className="flex-1" />
                      <Button 
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 bg-zinc-900 text-white border-none hover:bg-zinc-800"
                        title="Buscar Foto na Internet"
                        onClick={openImageSearch}
                      >
                        <Search size={16} />
                      </Button>
                      <Label className="h-9 w-9 bg-zinc-100 flex items-center justify-center rounded-md cursor-pointer hover:bg-zinc-200 border border-zinc-200 shrink-0">
                        {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload size={16} />}
                        <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 text-[9px] font-black text-pink-600 hover:text-pink-700 p-0"
                        onClick={() => {
                          const url = prompt('Cole o link da postagem do Instagram:');
                          if (url) importFromInstagram(url);
                        }}
                      >
                        <Instagram size={10} className="mr-1" /> Importar do Insta
                      </Button>
                    </div>
                 </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Categoria</Label>
                  <Select 
                    value={newProduct.category_id} 
                    onValueChange={(val) => setNewProduct({...newProduct, category_id: val})}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <CategoryIcon category={c} size={14} />
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 col-span-2 py-2">
                  <Switch checked={newProduct.is_available} onCheckedChange={(checked) => setNewProduct({...newProduct, is_available: checked})} />
                  <Label className="font-bold">Disponível para venda na loja</Label>
                </div>
                 <Button onClick={handleSaveProduct} disabled={isSubmitting} className="w-full col-span-2 bg-zinc-900 font-black uppercase">
                   {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : (isEditing ? 'Atualizar Produto' : 'Salvar Produto')}
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
                 <TableHead className="text-[10px] font-black uppercase">Produto</TableHead>
                 <TableHead className="text-[10px] font-black uppercase">Bags / Etiquetas</TableHead>
                 <TableHead className="text-[10px] font-black uppercase text-center">Estoque</TableHead>
                 <TableHead className="text-[10px] font-black uppercase text-center">Preço</TableHead>
                 <TableHead className="text-[10px] font-black uppercase text-center">Venda Online</TableHead>
                 <TableHead className="text-right text-[10px] font-black uppercase">Ações</TableHead>
               </TableRow>
          </TableHeader>
          <TableBody>
             {filteredProducts.length === 0 && (
              <TableRow>
                 <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <ShoppingBag className="h-12 w-12 opacity-20" />
                      <p className="font-bold uppercase text-xs">Nenhum produto cadastrado no catálogo</p>
                      <p className="text-[10px]">Use a aba de <strong>Importação</strong> para buscar novos produtos ou adicione manualmente.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
             {filteredProducts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <SmartImage src={p.image_url} tableName="products" itemId={p.id} className="w-10 h-10 object-cover rounded shadow-sm" />
                </TableCell>
                 <TableCell className="font-bold text-xs uppercase">
                   <div className="flex flex-col">
                     <span>{p.name}</span>
                     <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-normal italic">
                       <span>{p.brand ? `Marca: ${p.brand}` : 'Sem marca'} |</span>
                       <CategoryIcon category={p.categories} size={10} className="inline-block" />
                       <span>{p.categories?.name || 'Sem categoria'}</span>
                     </div>
                   </div>
                 </TableCell>
                 <TableCell>
                   <div className="flex flex-wrap gap-1">
                     {p.tags && p.tags.map((tag: string) => (
                       <span key={tag} className="bg-zinc-100 text-[8px] font-black px-1.5 py-0.5 rounded border border-zinc-200 uppercase">{tag}</span>
                     ))}
                   </div>
                 </TableCell>
                 <TableCell className="text-center">
                   <div className={`inline-flex items-center px-2 py-1 rounded-full font-black text-[10px] ${p.stock <= 5 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                     {p.stock || 0} un
                   </div>
                 </TableCell>
                  <TableCell className="text-center font-black">R$ {Number(p.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {productBadges.map(badge => {
                        const isActive = (p.tags || []).includes(badge.id);
                        return (
                          <button
                            key={badge.id}
                            onClick={() => updateProductTags(p.id, p.tags, badge.id)}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${isActive ? badge.color + ' text-white scale-110 shadow-sm' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
                            title={badge.label}
                          >
                            {badge.id.substring(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                <TableCell className="text-center">
                  <Switch checked={p.is_available} onCheckedChange={() => toggleAvailability(p.id, p.is_available)} />
                </TableCell>
                 <TableCell className="text-right">
                   <Dialog onOpenChange={(open) => !open && resetForm()}>
                     <DialogTrigger asChild>
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} className="text-zinc-500">
                         <Edit className="h-4 w-4" />
                       </Button>
                     </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle className="font-black uppercase">Editar Produto</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-2 gap-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
                          <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label className="text-[10px] uppercase font-bold">Nome do Produto</Label>
                            <Input value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                          </div>
                          <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label className="text-[10px] uppercase font-bold">Marca</Label>
                            <Input value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} />
                          </div>
                          <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label className="text-[10px] uppercase font-bold text-zinc-400">Preço Anterior (De)</Label>
                            <Input type="number" step="0.01" placeholder="0.00" value={newProduct.old_price} onChange={(e) => setNewProduct({...newProduct, old_price: e.target.value})} />
                          </div>
                          <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label className="text-[10px] uppercase font-bold text-amber-600">Preço Atual (Por)</Label>
                            <Input type="number" step="0.01" placeholder="0.00" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <Label className="text-[10px] uppercase font-bold">Bags / Etiquetas de Destaque</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {productBadges.map(badge => {
                                const currentTags = newProduct.tags ? (typeof newProduct.tags === 'string' ? newProduct.tags.split(',').map(t => t.trim()) : newProduct.tags) : [];
                                const isActive = currentTags.includes(badge.id);
                                return (
                                  <Button
                                    key={badge.id}
                                    type="button"
                                    variant={isActive ? 'default' : 'outline'}
                                    size="sm"
                                    className={`text-[10px] font-black uppercase h-8 ${isActive ? badge.color + ' text-white border-none' : 'text-zinc-500 hover:bg-zinc-100'}`}
                                    onClick={() => {
                                      let newTags = [...currentTags];
                                      if (isActive) {
                                        newTags = newTags.filter(t => t !== badge.id);
                                      } else {
                                        newTags.push(badge.id);
                                      }
                                      setNewProduct({...newProduct, tags: newTags.join(', ')});
                                    }}
                                  >
                                    {badge.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label className="text-[10px] uppercase font-bold">Link da Imagem</Label>
                            <div className="flex gap-2">
                              <Input placeholder="https://..." value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})} className="flex-1" />
                              <Button 
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 bg-zinc-900 text-white border-none hover:bg-zinc-800"
                                title="Buscar Foto na Internet"
                                onClick={openImageSearch}
                              >
                                <Search size={16} />
                              </Button>
                              <Label className="h-9 w-9 bg-zinc-100 flex items-center justify-center rounded-md cursor-pointer hover:bg-zinc-200 border border-zinc-200 shrink-0">
                                {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload size={16} />}
                                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                              </Label>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold">Categoria</Label>
                            <Select 
                              value={newProduct.category_id} 
                              onValueChange={(val) => setNewProduct({...newProduct, category_id: val})}
                            >
                              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {categories.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center gap-2">
                                      <CategoryIcon category={c} size={14} />
                                      <span>{c.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2 col-span-2 py-2">
                            <Switch checked={newProduct.is_available} onCheckedChange={(checked) => setNewProduct({...newProduct, is_available: checked})} />
                            <Label className="font-bold">Disponível para venda na loja</Label>
                          </div>
                          <Button onClick={handleSaveProduct} disabled={isSubmitting} className="w-full col-span-2 bg-zinc-900 font-black uppercase">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Atualizar Produto'}
                          </Button>
                        </div>
                      </DialogContent>
                   </Dialog>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-zinc-900 text-white">
            <DialogTitle className="text-xl font-black uppercase italic italic tracking-tighter">Atualização de Preços Diária</DialogTitle>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1">
                <Label className="text-[10px] font-black uppercase text-zinc-400 mb-1 block">Filtrar Categoria</Label>
                <Select value={quickEditCategory} onValueChange={setQuickEditCategory}>
                  <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-5">
                <p className="text-[10px] font-bold text-zinc-500">Editando {products.filter(p => quickEditCategory === 'all' || p.category_id === quickEditCategory).length} itens</p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Produto</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center text-zinc-500">Preço Antigo (De)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center text-amber-600">Preço Novo (Por)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">Estoque (Qtd)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products
                  .filter(p => quickEditCategory === 'all' || p.category_id === quickEditCategory)
                  .map((p, index) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img src={p.image_url} className="w-8 h-8 rounded object-cover border" />
                          <p className="text-xs font-bold uppercase">{p.name}</p>
                        </div>
                      </TableCell>
                        <TableCell className="w-[140px]">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] font-bold text-zinc-400">R$</span>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              value={quickEditData[p.id]?.old_price || ''} 
                              onChange={(e) => setQuickEditData({...quickEditData, [p.id]: { ...quickEditData[p.id], old_price: e.target.value }})}
                              className="text-center font-black text-xs h-9 border-zinc-200 focus:ring-zinc-500 text-zinc-400 bg-zinc-50/50"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="w-[140px]">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] font-black text-amber-600">R$</span>
                            <Input 
                              type="number" 
                              step="0.01"
                              autoFocus={index === 0}
                              value={quickEditData[p.id]?.price || ''} 
                              onChange={(e) => setQuickEditData({...quickEditData, [p.id]: { ...quickEditData[p.id], price: e.target.value }})}
                              className="text-center font-black text-sm h-9 border-amber-300 focus:ring-amber-500 bg-amber-50 ring-2 ring-amber-100"
                            />
                          </div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={quickEditData[p.id]?.stock || ''} 
                          onChange={(e) => setQuickEditData({...quickEditData, [p.id]: { ...quickEditData[p.id], stock: e.target.value }})}
                          className="text-center font-black text-xs h-8 border-amber-100 focus:ring-amber-500"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="p-6 border-t bg-zinc-50 gap-2">
            <Button variant="ghost" onClick={() => setIsQuickEditOpen(false)} className="font-bold uppercase text-[10px]">Cancelar</Button>
            <Button onClick={handleQuickUpdate} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 font-black uppercase text-[10px] px-8 shadow-xl shadow-green-100">
              {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações em Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-2xl border-4 border-zinc-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase italic text-2xl tracking-tighter">Buscador de Fotos</DialogTitle>
            <DialogDescription className="font-bold uppercase text-[10px]">Encontre a melhor imagem para {newProduct.name}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex gap-2">
              <Input 
                value={imageSearchQuery} 
                onChange={(e) => setImageSearchQuery(e.target.value)}
                placeholder="Ex: Coca Cola 2L garrafa"
                className="font-bold"
              />
              <Button onClick={performSearch} disabled={searching} className="bg-zinc-900 hover:bg-zinc-800">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
              <Button variant="outline" className="border-2 border-zinc-200" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(imageSearchQuery)}&tbm=isch`, '_blank')}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {searchResults.map((url, i) => (
                  <div 
                    key={i} 
                    className="group relative aspect-square rounded-xl overflow-hidden border-2 border-zinc-100 hover:border-zinc-900 cursor-pointer transition-all"
                    onClick={() => selectImage(url)}
                  >
                    <img src={url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-white font-black uppercase text-[10px]">Selecionar</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-100 rounded-2xl p-12 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-zinc-200 mb-4" />
                <p className="text-zinc-400 font-bold uppercase text-[10px]">Clique em pesquisar para ver sugestões ou use o botão do Google ao lado</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">Ou cole a URL da imagem diretamente</label>
              <Input 
                placeholder="https://exemplo.com/foto.jpg" 
                onChange={(e) => {
                  if (e.target.value.startsWith('http')) {
                    selectImage(e.target.value)
                  }
                }}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSearchDialogOpen(false)} className="font-black uppercase text-[10px]">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
