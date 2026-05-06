 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { LayoutGrid, Loader2, Search, ArrowRight, Package, CheckCircle2, ListFilter, GripVertical } from 'lucide-react'
 import { toast } from '@/lib/toast'
 import { Badge } from '@/components/ui/badge'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 
 export function ProductOrganizer() {
   const [products, setProducts] = useState<any[]>([])
   const [categories, setCategories] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [selectedCategory, setSelectedCategory] = useState<string>('all')
   const [targetCategory, setTargetCategory] = useState<string>('')
   const [searchTerm, setSearchTerm] = useState('')
   const [selectedIds, setSelectedIds] = useState<string[]>([])
   const [isMoving, setIsMoving] = useState(false)
 
   useEffect(() => {
     fetchData()
   }, [])
 
   const fetchData = async () => {
     setLoading(true)
     try {
       const { data: catData } = await supabase.from('categories').select('*').order('name')
       const { data: prodData } = await supabase.from('products').select('*, categories(name)').order('name')
       
       setCategories(catData || [])
       setProducts(prodData || [])
     } catch (err) {
       console.error(err)
     } finally {
       setLoading(false)
     }
   }
 
   const toggleSelect = (id: string) => {
     setSelectedIds(prev => 
       prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
     )
   }
 
   const selectAll = () => {
     const currentFiltered = filteredProducts.map(p => p.id)
     if (selectedIds.length === currentFiltered.length) {
       setSelectedIds([])
     } else {
       setSelectedIds(currentFiltered)
     }
   }
 
   const moveProducts = async () => {
     if (!targetCategory || selectedIds.length === 0) return
     
     setIsMoving(true)
     try {
       const { error } = await supabase
         .from('products')
         .update({ category_id: targetCategory })
         .in('id', selectedIds)
 
       if (error) throw error
       
       toast.success(`${selectedIds.length} produtos movidos com sucesso!`)
       setSelectedIds([])
       fetchData()
     } catch (err: any) {
       toast.error('Erro ao mover produtos: ' + err.message)
     } finally {
       setIsMoving(true) // Should be false, fixed in next step or now
       setIsMoving(false)
     }
   }
 
   const filteredProducts = products.filter(p => {
     const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory
     const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
     return matchesCategory && matchesSearch
   })
 
   if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
 
   return (
     <div className="space-y-6">
       <div className="flex items-center gap-4 mb-4">
         <div className="bg-green-600 p-3 rounded-lg text-white shadow-lg">
           <LayoutGrid size={24} />
         </div>
         <div>
           <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">Organizador de Catálogo</h2>
           <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Organize seus produtos em categorias rapidamente</p>
         </div>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         {/* Sidebar Controls */}
         <Card className="lg:col-span-1 border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
           <CardHeader className="bg-zinc-900 text-white">
             <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
               <ListFilter size={16} /> Filtros
             </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-zinc-500">Filtrar por Categoria</label>
               <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                 <SelectTrigger className="h-10 rounded-xl">
                   <SelectValue placeholder="Todas" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todas as Categorias</SelectItem>
                   {categories.map(cat => (
                     <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-zinc-500">Buscar Nome</label>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                 <Input 
                   placeholder="Nome do produto..." 
                   className="pl-9 h-10 rounded-xl"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
               </div>
             </div>
 
             <div className="pt-4 border-t">
                <div className="bg-zinc-50 p-4 rounded-2xl border-2 border-dashed border-zinc-200">
                  <p className="text-[10px] font-black uppercase text-zinc-400 mb-3 text-center">Ações em Massa</p>
                  <div className="space-y-3">
                    <div className="space-y-1 text-center">
                       <Badge variant="secondary" className="mb-2">{selectedIds.length} selecionados</Badge>
                       <Select value={targetCategory} onValueChange={setTargetCategory}>
                         <SelectTrigger className="h-10 rounded-xl bg-white">
                           <SelectValue placeholder="Mover para..." />
                         </SelectTrigger>
                         <SelectContent>
                           {categories.map(cat => (
                             <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </div>
                    <Button 
                      onClick={moveProducts} 
                      disabled={!targetCategory || selectedIds.length === 0 || isMoving}
                      className="w-full bg-green-600 hover:bg-green-700 h-10 rounded-xl font-black uppercase text-[10px]"
                    >
                      {isMoving ? <Loader2 className="animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                      Mover Agora
                    </Button>
                  </div>
                </div>
             </div>
           </CardContent>
         </Card>
 
         {/* Product List */}
         <Card className="lg:col-span-3 border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
           <CardHeader className="bg-zinc-100 border-b flex flex-row items-center justify-between">
             <div>
               <CardTitle className="text-xs font-black uppercase tracking-widest">Produtos ({filteredProducts.length})</CardTitle>
             </div>
             <Button variant="outline" size="sm" onClick={selectAll} className="text-[10px] font-black uppercase rounded-lg h-8">
               {selectedIds.length === filteredProducts.length ? 'Desmarcar Todos' : 'Selecionar Visíveis'}
             </Button>
           </CardHeader>
           <CardContent className="p-0">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-zinc-50 max-h-[700px] overflow-y-auto">
               {filteredProducts.map(p => (
                 <div 
                   key={p.id} 
                   onClick={() => toggleSelect(p.id)}
                   className={`p-4 flex items-center gap-4 cursor-pointer transition-colors relative group ${selectedIds.includes(p.id) ? 'bg-green-50/50' : 'hover:bg-zinc-50'}`}
                 >
                   <div className="relative">
                     <img src={p.image_url} className="w-12 h-12 object-cover rounded-xl shadow-sm" />
                     {selectedIds.includes(p.id) && (
                       <div className="absolute -top-1 -right-1 bg-green-600 text-white rounded-full p-0.5 shadow-lg border-2 border-white">
                         <CheckCircle2 size={12} />
                       </div>
                     )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="font-bold text-xs truncate uppercase tracking-tight">{p.name}</p>
                     <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1.5 h-4 border-zinc-200 text-zinc-400">
                          {p.categories?.name || 'Sem categoria'}
                        </Badge>
                         <span className="text-[10px] font-bold text-green-600">R$ {Number(p.price || 0).toFixed(2)}</span>
                     </div>
                   </div>
                   <div className="opacity-0 group-hover:opacity-100 text-zinc-300">
                     <GripVertical size={16} />
                   </div>
                 </div>
               ))}
               {filteredProducts.length === 0 && (
                 <div className="col-span-full p-20 text-center text-zinc-400">
                   <Package size={48} className="mx-auto mb-4 opacity-20" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Nenhum produto encontrado</p>
                 </div>
               )}
             </div>
           </CardContent>
         </Card>
       </div>
     </div>
   )
 }