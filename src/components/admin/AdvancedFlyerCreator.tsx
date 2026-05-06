 import { useState, useEffect } from 'react'
 import { useStoreSettings } from '@/hooks/useStoreSettings'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { Label } from '@/components/ui/label'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
 import { Slider } from '@/components/ui/slider'
 import { Loader2, Plus, Trash2, Printer, Download, ImageIcon, Upload, Type, Palette, Layout, Settings2 } from 'lucide-react'
 import { toast } from '@/lib/toast'
 import { cn } from '@/lib/utils'
 
 type FlyerProduct = {
   id: string
   name: string
   price: number
   original_price?: number
   image_url: string
   unit?: string
 }
 
 type LayoutType = 'grid-8' | 'featured-side' | 'featured-top' | 'single'
 
 export function AdvancedFlyerCreator() {
   const { settings: storeSettings } = useStoreSettings()
   const [layout, setLayout] = useState<LayoutType>('grid-8')
   const [backgroundUrl, setBackgroundUrl] = useState('')
   const [uploading, setUploading] = useState(false)
   const [selectedProducts, setSelectedProducts] = useState<FlyerProduct[]>([])
   const [allProducts, setAllProducts] = useState<any[]>([])
   
   // Styling states
   const [titleColor, setTitleColor] = useState('#000000')
   const [priceColor, setPriceColor] = useState('#e11d48')
   const [fontSize, setFontSize] = useState(14)
   const [priceSize, setPriceSize] = useState(24)
   const [fontFamily, setFontFamily] = useState('font-sans')
 
   useEffect(() => {
     fetchProducts()
   }, [])
 
   const fetchProducts = async () => {
     const { data } = await supabase.from('products').select('*').limit(100)
     setAllProducts(data || [])
   }
 
   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (!file) return
 
     setUploading(true)
     try {
       const fileExt = file.name.split('.').pop()
       const fileName = `flyer-bg-${Math.random().toString(36).substring(2)}.${fileExt}`
       const { data, error } = await supabase.storage.from('banners').upload(fileName, file)
       
       if (error) throw error
 
       const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName)
       setBackgroundUrl(publicUrl)
       toast.success('Fundo carregado com sucesso!')
     } catch (error: any) {
       toast.error('Erro no upload: ' + error.message)
     } finally {
       setUploading(false)
     }
   }
 
   const addProductToFlyer = (product: any) => {
     const max = layout === 'single' ? 1 : 8
     if (selectedProducts.length >= max) {
       toast.error(`Limite de ${max} produtos para este layout`)
       return
     }
     const newProduct: FlyerProduct = {
       id: product.id,
       name: product.name,
       price: product.price,
       original_price: product.old_price,
       image_url: product.image_url,
       unit: product.unit
     }
     setSelectedProducts([...selectedProducts, newProduct])
     toast.success('Produto adicionado')
   }
 
   const removeProduct = (idx: number) => {
     const updated = [...selectedProducts]
     updated.splice(idx, 1)
     setSelectedProducts(updated)
   }
 
   const handlePrint = () => {
     window.print()
   }
 
   return (
     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
       {/* Controls Sidebar */}
       <div className="lg:col-span-4 space-y-6 print:hidden">
         <Card className="rounded-[24px] border-2 border-zinc-100 shadow-xl overflow-hidden">
           <CardHeader className="bg-zinc-50 border-b border-zinc-100">
             <CardTitle className="flex items-center gap-2 font-black uppercase italic tracking-tighter text-lg">
               <Settings2 className="w-5 h-5 text-primary" /> Gerador de Encartes A4
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-6 pt-6">
             {/* Layout Selection */}
             <div className="space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Modelo de Layout</Label>
               <div className="grid grid-cols-2 gap-2">
                 {[
                   { id: 'grid-8', label: '8 Produtos (Grade)', icon: Layout },
                   { id: 'featured-side', label: 'Destaque Lateral', icon: Layout },
                   { id: 'featured-top', label: 'Destaque Topo', icon: Layout },
                   { id: 'single', label: 'Produto Único', icon: Layout },
                 ].map((l) => (
                   <Button
                     key={l.id}
                     variant={layout === l.id ? 'default' : 'outline'}
                     className="h-20 flex flex-col gap-2 rounded-xl text-[10px] font-bold"
                     onClick={() => {
                       setLayout(l.id as LayoutType)
                       setSelectedProducts([])
                     }}
                   >
                     <l.icon className="w-5 h-5" />
                     {l.label}
                   </Button>
                 ))}
               </div>
             </div>
 
             {/* Background Image */}
             <div className="space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Imagem de Fundo (A4)</Label>
               <div className="flex gap-4 items-center">
                 {backgroundUrl && (
                   <img src={backgroundUrl} className="w-16 h-20 object-cover rounded border" alt="BG Preview" />
                 )}
                 <div className="flex-1">
                   <Input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="bg-upload" />
                   <label htmlFor="bg-upload" className="flex items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                     {uploading ? <Loader2 className="animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                     <span className="text-xs font-bold uppercase">{uploading ? 'Enviando...' : 'Carregar Arte'}</span>
                   </label>
                 </div>
               </div>
             </div>
 
             {/* Styling */}
             <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Personalização de Texto</h4>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-[10px] font-bold uppercase">Cor Nome</Label>
                   <div className="flex gap-2">
                     <Input type="color" value={titleColor} onChange={(e) => setTitleColor(e.target.value)} className="w-8 h-8 p-0 border-none" />
                     <Input value={titleColor} onChange={(e) => setTitleColor(e.target.value)} className="h-8 text-[10px]" />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label className="text-[10px] font-bold uppercase">Cor Preço</Label>
                   <div className="flex gap-2">
                     <Input type="color" value={priceColor} onChange={(e) => setPriceColor(e.target.value)} className="w-8 h-8 p-0 border-none" />
                     <Input value={priceColor} onChange={(e) => setPriceColor(e.target.value)} className="h-8 text-[10px]" />
                   </div>
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label className="text-[10px] font-bold uppercase">Tamanho Fonte ({fontSize}px)</Label>
                 <Slider value={[fontSize]} min={8} max={32} step={1} onValueChange={([val]) => setFontSize(val)} />
               </div>
 
               <div className="space-y-2">
                 <Label className="text-[10px] font-bold uppercase">Tamanho Preço ({priceSize}px)</Label>
                 <Slider value={[priceSize]} min={16} max={80} step={1} onValueChange={([val]) => setPriceSize(val)} />
               </div>
 
               <div className="space-y-2">
                 <Label className="text-[10px] font-bold uppercase">Fonte</Label>
                 <Select value={fontFamily} onValueChange={setFontFamily}>
                   <SelectTrigger className="h-8 text-[10px] font-bold">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="font-sans">Sans (Moderna)</SelectItem>
                     <SelectItem value="font-serif">Serif (Clássica)</SelectItem>
                     <SelectItem value="font-mono">Mono (Digital)</SelectItem>
                     <SelectItem value="font-black">Black (Pesada)</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             {/* Product List */}
             <div className="space-y-3">
               <div className="flex justify-between items-center">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Produtos ({selectedProducts.length})</Label>
                 <Dialog>
                   <DialogTrigger asChild>
                     <Button size="sm" variant="outline" className="h-7 text-[10px] font-black uppercase"><Plus className="w-3 h-3 mr-1" /> Adicionar</Button>
                   </DialogTrigger>
                   <DialogContent className="max-w-2xl">
                     <DialogHeader>
                       <DialogTitle>Selecionar Produtos</DialogTitle>
                     </DialogHeader>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-4">
                       {allProducts.map(p => (
                         <div key={p.id} className="border rounded-xl p-3 text-center space-y-2 hover:bg-zinc-50 cursor-pointer transition-colors" onClick={() => addProductToFlyer(p)}>
                           <img src={p.image_url} className="w-16 h-16 object-contain mx-auto" />
                           <p className="text-[10px] font-bold line-clamp-2 leading-tight h-8">{p.name}</p>
                           <p className="text-xs font-black text-primary">R$ {p.price.toFixed(2)}</p>
                           <Button size="sm" variant="ghost" className="w-full text-[9px] uppercase font-black">Selecionar</Button>
                         </div>
                       ))}
                     </div>
                   </DialogContent>
                 </Dialog>
               </div>
 
               <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                 {selectedProducts.map((p, idx) => (
                   <div key={idx} className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100 group">
                     <img src={p.image_url} className="w-10 h-10 object-contain" />
                     <div className="flex-1 min-w-0">
                       <p className="text-[10px] font-bold truncate">{p.name}</p>
                       <p className="text-[10px] font-black text-primary">R$ {p.price.toFixed(2)}</p>
                     </div>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 group-hover:text-red-500 transition-colors" onClick={() => removeProduct(idx)}>
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                 ))}
                 {selectedProducts.length === 0 && (
                   <div className="text-center py-10 border-2 border-dashed rounded-2xl text-zinc-300">
                     <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum produto</p>
                   </div>
                 )}
               </div>
             </div>
 
             <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg" onClick={handlePrint}>
               <Printer className="w-4 h-4 mr-2" /> Gerar PDF / Imprimir
             </Button>
           </CardContent>
         </Card>
       </div>
 
       {/* Preview Area */}
       <div className="lg:col-span-8 flex justify-center bg-zinc-200 p-8 rounded-[32px] overflow-hidden min-h-[1000px] print:p-0 print:bg-white print:rounded-none">
         <div 
           id="flyer-content"
           className="bg-white shadow-2xl relative flex flex-col aspect-[1/1.414] w-[700px] print:w-full print:shadow-none overflow-hidden"
           style={{ 
             backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
             backgroundSize: '100% 100%',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat'
           }}
         >
           {/* Top Reserved Zone (25%) */}
           <div className="h-[25%] w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
             <div className="bg-primary/10 border-2 border-dashed border-primary text-primary font-black uppercase text-[10px] px-4 py-2 rounded-full">
               Topo Reservado (Arte de Fundo)
             </div>
           </div>
 
           {/* Content Middle Zone (60%) */}
           <div className="flex-1 px-8 py-4 flex flex-col justify-center">
             <div className={cn(
               "grid gap-6 h-full",
               layout === 'grid-8' && "grid-cols-2 grid-rows-4",
               layout === 'featured-side' && "grid-cols-4 grid-rows-3",
               layout === 'featured-top' && "grid-cols-2 grid-rows-5",
               layout === 'single' && "grid-cols-1 grid-rows-1"
             )}>
               {selectedProducts.map((p, i) => {
                 let spanClass = ""
                 if (layout === 'featured-side') {
                   if (i === 0) spanClass = "col-span-1 row-span-3"
                   if (i === 1) spanClass = "col-span-1 row-span-3 order-last"
                 }
                 if (layout === 'featured-top') {
                   if (i === 0 || i === 1) spanClass = "col-span-1 row-span-1"
                 }
 
                 return (
                   <div 
                     key={i} 
                     className={cn(
                       "flex flex-col items-center justify-center text-center space-y-2 p-2 relative",
                       spanClass,
                       fontFamily
                     )}
                   >
                     <div className={cn(
                       "relative bg-white/40 backdrop-blur-sm rounded-2xl p-4 w-full h-full flex flex-col items-center justify-center border border-white/50 shadow-sm",
                       layout === 'single' ? 'p-12' : ''
                     )}>
                       <img 
                         src={p.image_url} 
                         className={cn(
                           "object-contain mix-blend-multiply drop-shadow-md",
                           layout === 'single' ? 'w-80 h-80' : 
                           (layout === 'featured-side' && (i === 0 || i === 1)) ? 'w-48 h-64' : 'w-24 h-24'
                         )} 
                       />
                       <div className="space-y-1">
                         <h3 
                           className="font-black uppercase italic leading-tight line-clamp-2 drop-shadow-sm"
                           style={{ color: titleColor, fontSize: `${layout === 'single' ? fontSize * 2.5 : fontSize}px` }}
                         >
                           {p.name}
                         </h3>
                         <div className="flex flex-col items-center">
                           {p.original_price && (
                             <span className="text-[8px] line-through text-zinc-500 opacity-60">R$ {p.original_price.toFixed(2)}</span>
                           )}
                           <div 
                             className="font-black italic flex items-start drop-shadow-sm"
                             style={{ color: priceColor, fontSize: `${layout === 'single' ? priceSize * 2 : priceSize}px` }}
                           >
                             <span className="text-[0.5em] mt-1 mr-0.5">R$</span>
                             <span>{p.price.toFixed(2).split('.')[0]}</span>
                             <span className="text-[0.5em] mt-1">,{p.price.toFixed(2).split('.')[1]}</span>
                             {p.unit && <span className="text-[0.3em] self-end mb-1 ml-1">{p.unit}</span>}
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 )
               })}
             </div>
           </div>
 
           {/* Bottom Reserved Zone (15%) */}
           <div className="h-[15%] w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
             <div className="bg-primary/10 border-2 border-dashed border-primary text-primary font-black uppercase text-[10px] px-4 py-2 rounded-full">
               Rodapé Reservado (Arte de Fundo)
             </div>
           </div>
         </div>
       </div>
 
       <style>{`
         @media print {
           body * { visibility: hidden; }
           #flyer-content, #flyer-content * { visibility: visible; }
           #flyer-content { 
             position: absolute; 
             left: 0; 
             top: 0; 
             width: 210mm; 
             height: 297mm;
             margin: 0;
             padding: 0;
             border: none !important;
             -webkit-print-color-adjust: exact;
             print-color-adjust: exact;
           }
           @page { 
             size: A4; 
             margin: 0; 
           }
         }
       `}</style>
     </div>
   )
 }