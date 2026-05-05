import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
 import * as LucideIcons from 'lucide-react'
 import { 
    Loader2, Plus, Trash2, Edit, Upload, Image as ImageIcon, Apple, Beef, Milk, Beer, Fish, IceCream, Coffee, 
    Carrot, Pizza, Wine, Egg, GlassWater, ChefHat, ShoppingBag, Sparkles, Baby, Dog, Grape, Wheat, Cookie, Bath, Flower2,
    Snowflake, Candy, Box, Soup, Sandwich, Popcorn, Salad, Cherry
  } from 'lucide-react'

  const getIconComponent = (name: string) => {
    // @ts-ignore
    return LucideIcons[name] || LucideIcons.ShoppingBag;
  };

 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'

export function CategoryManagement() {
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
   const [newCategory, setNewCategory] = useState({ name: '', slug: '', icon_url: '', icon_name: 'ShoppingBag:minimalist', banner_url: '' })
   const [selectedStyle, setSelectedStyle] = useState('minimalist')
    const elegantIcons = [
      { name: 'Apple', label: 'Frutas' },
      { name: 'Beef', label: 'Carnes' },
      { name: 'Milk', label: 'Laticínios' },
      { name: 'Beer', label: 'Bebidas' },
      { name: 'Fish', label: 'Peixaria' },
      { name: 'IceCream', label: 'Sorvetes' },
      { name: 'Snowflake', label: 'Congelados' },
      { name: 'Coffee', label: 'Café' },
      { name: 'Carrot', label: 'Legumes' },
      { name: 'Pizza', label: 'Massas' },
      { name: 'Wine', label: 'Vinhos' },
      { name: 'Egg', label: 'Ovos' },
      { name: 'GlassWater', label: 'Água' },
      { name: 'ChefHat', label: 'Gourmet' },
      { name: 'ShoppingBag', label: 'Geral' },
      { name: 'Trash2', label: 'Limpeza' },
      { name: 'Sparkles', label: 'Higiene' },
      { name: 'Baby', label: 'Infantil' },
      { name: 'Dog', label: 'Pet Shop' },
      { name: 'Grape', label: 'Frutas' },
      { name: 'Wheat', label: 'Grãos' },
      { name: 'Cookie', label: 'Biscoitos' },
      { name: 'Bath', label: 'Banho' },
      { name: 'Flower2', label: 'Flores' },
      { name: 'Candy', label: 'Doces' },
      { name: 'Box', label: 'Estoque' },
      { name: 'Soup', label: 'Caldos' },
      { name: 'Sandwich', label: 'Lanches' },
      { name: 'Popcorn', label: 'Cinema' },
      { name: 'Salad', label: 'Saudável' },
      { name: 'Cherry', label: 'Cerejas' }
    ];
 
   const [uploading, setUploading] = useState<'icon' | 'banner' | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
    setIsLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'banner') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(type)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `categories/${type}/${fileName}`

      // Try categories bucket, fallback to products
      let bucketName = 'categories';
      let uploadError = null;
      
      const { data: uploadData, error: firstError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);
      
      if (firstError) {
        bucketName = 'products';
        const { data: retryData, error: retryError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);
        uploadError = retryError;
      }

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      setNewCategory({ ...newCategory, [type === 'icon' ? 'icon_url' : 'banner_url']: publicUrl })
      toast.success(`${type === 'icon' ? 'Ícone' : 'Banner'} carregado!`)
    } catch (error: any) {
      toast.error('Erro no upload: ' + error.message)
    } finally {
      setUploading(null)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.slug) return toast.error('Nome e Slug são obrigatórios')
    
    setIsSubmitting(true)
    const { error } = await supabase.from('categories').insert([newCategory])
    setIsSubmitting(false)
    
    if (error) toast.error('Erro ao adicionar categoria')
    else {
       toast.success('Categoria adicionada!')
        setNewCategory({ name: '', slug: '', icon_url: '', icon_name: '', banner_url: '' })
       fetchCategories()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta categoria?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Categoria removida')
      fetchCategories()
    }
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categorias</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Categoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Categoria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input 
                    value={newCategory.name} 
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input value={newCategory.slug} onChange={(e) => setNewCategory({...newCategory, slug: e.target.value})} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-bold">Ícone da Categoria</Label>
                     <div className="flex gap-2">
                        <Input 
                          placeholder="URL ou Upload ->" 
                          value={newCategory.icon_url} 
                          onChange={(e) => setNewCategory({...newCategory, icon_url: e.target.value})} 
                        />
                        <label className="cursor-pointer bg-zinc-100 p-2 rounded-lg hover:bg-zinc-200 transition-colors">
                          {uploading === 'icon' ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload className="w-5 h-5" />}
                          <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'icon')} accept="image/*" />
                        </label>
                     </div>
                   </div>
                   <div className="space-y-4 col-span-2">
                     <div className="flex items-center justify-between">
                       <Label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Escolha o Ícone Moderno</Label>
                       <div className="flex bg-zinc-100 p-1 rounded-lg gap-1">
                         {['thin', 'minimalist', 'classic', 'bold'].map((style) => (
                           <button
                             key={style}
                             type="button"
                             onClick={() => {
                               setSelectedStyle(style);
                               const name = newCategory.icon_name.split(':')[0];
                               setNewCategory({...newCategory, icon_name: `${name}:${style}`});
                             }}
                             className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${selectedStyle === style ? 'bg-primary text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                           >
                             {style}
                           </button>
                         ))}
                       </div>
                     </div>
                     <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-2 bg-zinc-50 rounded-2xl border border-zinc-100">
                        {elegantIcons.map((icon) => {
                          const Icon = getIconComponent(icon.name);
                          const currentName = newCategory.icon_name.split(':')[0];
                          const isSelected = currentName === icon.name;
                          
                          return (
                            <div className="group relative" key={icon.name}>
                              <button
                                type="button"
                                onClick={() => setNewCategory({...newCategory, icon_name: `${icon.name}:${selectedStyle}`})}
                                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 w-full aspect-square ${isSelected ? 'bg-primary border-primary text-white scale-105 shadow-lg shadow-primary/20' : 'bg-white border-zinc-100 hover:border-primary/30 text-zinc-400 hover:text-primary'}`}
                              >
                                {Icon ? (
                                  <Icon 
                                    size={24} 
                                    strokeWidth={selectedStyle === 'bold' ? 2.5 : selectedStyle === 'classic' ? 2.0 : selectedStyle === 'thin' ? 1.0 : 1.5} 
                                  />
                                ) : (
                                  <ShoppingBag size={24} strokeWidth={1.5} />
                                )}
                                <span className={`text-[8px] font-bold uppercase truncate w-full text-center ${isSelected ? 'text-white' : 'text-zinc-500'}`}>{icon.label}</span>
                              </button>
                            </div>
                          );
                        })}
                     </div>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-bold">Banner da Categoria (Opcional)</Label>
                   <div className="flex gap-2">
                      <Input 
                        placeholder="URL do banner ou Upload ->" 
                        value={newCategory.banner_url} 
                        onChange={(e) => setNewCategory({...newCategory, banner_url: e.target.value})} 
                      />
                      <label className="cursor-pointer bg-zinc-100 p-2 rounded-lg hover:bg-zinc-200 transition-colors">
                        {uploading === 'banner' ? <Loader2 className="animate-spin w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'banner')} accept="image/*" />
                      </label>
                   </div>
                   {newCategory.banner_url && (
                     <img src={newCategory.banner_url} className="w-full h-20 object-cover rounded-lg border mt-2" alt="Preview Banner" />
                   )}
                 </div>
                <Button onClick={handleAddCategory} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Salvar Categoria'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ícone</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                 <TableRow key={cat.id} className="hover:bg-zinc-50 transition-colors">
                   <TableCell>
                     <div className="flex items-center gap-2">
                       <SmartImage 
                         src={cat.icon_url} 
                         tableName="categories" 
                         itemId={cat.id} 
                         className="w-8 h-8 object-contain rounded bg-zinc-100" 
                       />
                       {cat.icon_name && (
                         <span className="text-[10px] bg-zinc-900 text-white px-1.5 py-0.5 rounded font-black uppercase">{cat.icon_name}</span>
                       )}
                     </div>
                   </TableCell>
                  <TableCell className="font-bold">{cat.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
