 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Badge } from '@/components/ui/badge'
import { Loader2, Zap, Trash2, Plus, Percent, Clock, Tag, Search, ShoppingBag, ArrowRight, Send } from 'lucide-react'
 import { toast } from '@/lib/toast'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sendWhatsAppMessage, formatWhatsAppMessage } from '@/lib/whatsapp'
 
 export function OfferManager() {
   const [products, setProducts] = useState<any[]>([])
   const [allProducts, setAllProducts] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [searchQuery, setSearchQuery] = useState('')
   const [selectedProduct, setSelectedProduct] = useState<any>(null)
   const [discountPercent, setDiscountPercent] = useState('10')
   const [offerType, setOfferType] = useState('OFERTA')
 
    const [isNotifying, setIsNotifying] = useState<string | null>(null)

   useEffect(() => {
     fetchData()
   }, [])
 
    const notifyWhatsApp = async (product: any) => {
      setIsNotifying(product.id)
      try {
        const message = formatWhatsAppMessage('promotion', {
          id: product.id,
          title: product.name,
          description: `De R$ ${product.old_price?.toFixed(2) || product.price.toFixed(2)} por apenas *R$ ${product.price.toFixed(2)}*!`
        })

        // Get all customers with whatsapp
        const { data: customers } = await supabase.from('profiles').select('whatsapp').not('whatsapp', 'is', null)
        
        if (!customers || customers.length === 0) {
          toast.error('Nenhum cliente com WhatsApp encontrado')
          return
        }

        if (!confirm(`Deseja enviar esta promoção para ${customers.length} clientes?`)) return

        let count = 0
        for (const customer of customers) {
          const result = await sendWhatsAppMessage(customer.whatsapp, message)
          if (result.success) count++
          // Simple delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 800))
        }

        toast.success(`${count} notificações enviadas!`)
      } catch (e: any) {
        toast.error('Erro ao notificar: ' + e.message)
      } finally {
        setIsNotifying(null)
      }
    }

   const fetchData = async () => {
     setLoading(true)
     try {
       const { data: prods } = await supabase.from('products').select('*')
       const activeOffers = prods?.filter(p => 
         p.tags?.some((t: string) => ['OFERTA', 'RELAMPAGO', 'EXCLUSIVO'].includes(t)) || 
         (p.old_price && p.old_price > p.price)
       )
       setProducts(activeOffers || [])
       setAllProducts(prods || [])
     } catch (e) {
       console.error(e)
     } finally {
       setLoading(false)
     }
   }
 
   const applyDiscount = async () => {
     if (!selectedProduct || !discountPercent) return
     
     const percent = parseFloat(discountPercent)
     const oldPrice = selectedProduct.price
     const newPrice = oldPrice * (1 - percent / 100)
     
     let currentTags = selectedProduct.tags || []
     // Remove existing offer tags
     currentTags = currentTags.filter((t: string) => !['OFERTA', 'RELAMPAGO', 'EXCLUSIVO'].includes(t))
     // Add new tag
     currentTags = [offerType, ...currentTags]
 
     const { error } = await supabase.from('products').update({
       price: newPrice,
       old_price: oldPrice,
       tags: currentTags
     }).eq('id', selectedProduct.id)
 
     if (error) {
       toast.error('Erro ao aplicar oferta')
     } else {
       toast.success('Oferta aplicada com sucesso!')
       setSelectedProduct(null)
       fetchData()
     }
   }
 
   const removeOffer = async (product: any) => {
     const { error } = await supabase.from('products').update({
       price: product.old_price || product.price,
       old_price: null,
       tags: (product.tags || []).filter((t: string) => !['OFERTA', 'RELAMPAGO', 'EXCLUSIVO'].includes(t))
     }).eq('id', product.id)
 
     if (error) {
       toast.error('Erro ao remover oferta')
     } else {
       toast.success('Oferta removida')
       fetchData()
     }
   }
 
   const searchResults = searchQuery.length > 2 
     ? allProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !products.some(o => o.id === p.id))
     : []
 
   return (
     <div className="space-y-6">
       <div className="flex items-center gap-4 mb-8">
         <div className="bg-red-600 p-3 rounded-lg text-white shadow-lg">
           <Percent size={24} />
         </div>
         <div>
           <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">Gestão de Ofertas</h2>
           <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Controle preços promocionais e etiquetas</p>
         </div>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
           <CardHeader className="bg-zinc-900 text-white">
             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
               <Plus size={16} /> Criar Nova Oferta
             </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-zinc-500">Buscar Produto</label>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                 <Input 
                   placeholder="Nome do produto..." 
                   className="pl-10 h-12 rounded-xl border-zinc-100"
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                 />
               </div>
               
               {searchResults.length > 0 && (
                 <div className="bg-white border rounded-xl overflow-hidden shadow-xl max-h-[300px] overflow-y-auto mt-2">
                   {searchResults.map(p => (
                     <button 
                       key={p.id}
                       onClick={() => {
                         setSelectedProduct(p)
                         setSearchQuery('')
                       }}
                       className="w-full p-3 hover:bg-zinc-50 flex items-center gap-3 text-left border-b last:border-0"
                     >
                       <img src={p.image_url} className="w-10 h-10 object-cover rounded-lg" />
                       <div>
                         <p className="font-bold text-xs">{p.name}</p>
                         <p className="text-[10px] text-green-600 font-bold">R$ {p.price.toFixed(2)}</p>
                       </div>
                     </button>
                   ))}
                 </div>
               )}
             </div>
 
             {selectedProduct && (
               <div className="p-4 bg-zinc-50 rounded-2xl border-2 border-zinc-100 animate-in fade-in slide-in-from-top-2">
                 <div className="flex items-center gap-4 mb-4">
                    <img src={selectedProduct.image_url} className="w-16 h-16 object-cover rounded-xl shadow-md" />
                    <div>
                      <p className="font-black uppercase text-xs">{selectedProduct.name}</p>
                      <p className="font-bold text-[10px] text-zinc-400">Preço Atual: R$ {selectedProduct.price.toFixed(2)}</p>
                    </div>
                 </div>
 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-zinc-500">Desconto %</label>
                     <Input 
                       type="number" 
                       value={discountPercent} 
                       onChange={e => setDiscountPercent(e.target.value)}
                       className="h-10 rounded-lg font-bold"
                     />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-zinc-500">Tipo de Selo</label>
                     <Select value={offerType} onValueChange={setOfferType}>
                       <SelectTrigger className="h-10 text-xs font-bold uppercase">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="OFERTA">Oferta</SelectItem>
                         <SelectItem value="RELAMPAGO">⚡ Relâmpago</SelectItem>
                         <SelectItem value="EXCLUSIVO">⭐ Exclusivo</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
 
                 <div className="mt-4 p-3 bg-white rounded-xl border border-zinc-200 flex justify-between items-center">
                   <div className="text-center">
                     <p className="text-[8px] font-bold text-zinc-400 uppercase">De</p>
                     <p className="text-xs font-bold line-through text-zinc-400">R$ {selectedProduct.price.toFixed(2)}</p>
                   </div>
                   <ArrowRight size={16} className="text-zinc-300" />
                   <div className="text-center">
                     <p className="text-[8px] font-black text-green-600 uppercase">Por</p>
                     <p className="text-lg font-black text-green-600">
                       R$ {(selectedProduct.price * (1 - parseFloat(discountPercent || '0') / 100)).toFixed(2)}
                     </p>
                   </div>
                 </div>
 
                 <Button onClick={applyDiscount} className="w-full mt-4 bg-green-600 hover:bg-green-700 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest">
                   Ativar Oferta Agora
                 </Button>
                 <Button variant="ghost" onClick={() => setSelectedProduct(null)} className="w-full mt-2 text-[10px] font-bold uppercase text-zinc-400">
                   Cancelar
                 </Button>
               </div>
             )}
           </CardContent>
         </Card>
 
         <Card className="lg:col-span-2 border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
           <CardHeader className="bg-zinc-900 text-white flex flex-row items-center justify-between">
             <div>
               <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Tag size={16} /> Ofertas Ativas no Momento
               </CardTitle>
             </div>
             <Badge className="bg-white/20 text-white border-0">{products.length} Ativas</Badge>
           </CardHeader>
           <CardContent className="p-6">
             {loading ? (
               <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
             ) : products.length === 0 ? (
               <div className="text-center p-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                 <ShoppingBag size={48} className="mx-auto text-zinc-200 mb-4" />
                 <p className="text-zinc-500 font-bold uppercase text-xs">Nenhuma oferta ativa</p>
                 <p className="text-[10px] text-zinc-400 mt-1">Busque um produto acima para começar</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {products.map(p => {
                   const badge = p.tags?.find((t: string) => ['OFERTA', 'RELAMPAGO', 'EXCLUSIVO'].includes(t)) || 'OFERTA'
                   return (
                     <div key={p.id} className="group p-4 bg-white border border-zinc-100 rounded-3xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
                       <div className="relative">
                         <img src={p.image_url} className="w-20 h-20 object-cover rounded-2xl shadow-sm" />
                         <div className="absolute -top-2 -left-2 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg rotate-12">
                           {badge}
                         </div>
                       </div>
                       <div className="flex-1">
                         <h4 className="font-black uppercase text-xs leading-tight mb-1 line-clamp-1">{p.name}</h4>
                         <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-green-600">R$ {p.price.toFixed(2)}</span>
                            {p.old_price && <span className="text-[10px] font-bold text-zinc-400 line-through">R$ {p.old_price.toFixed(2)}</span>}
                         </div>
                         <div className="mt-2 flex items-center gap-2">
                           <div className="bg-green-50 text-green-700 text-[8px] font-black px-2 py-0.5 rounded uppercase">
                             {p.old_price ? `${Math.round((1 - p.price / p.old_price) * 100)}% OFF` : 'PROMO'}
                           </div>
                         </div>
                       </div>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => removeOffer(p)}
                         className="text-zinc-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                       >
                         <Trash2 size={18} />
                       </Button>
                     </div>
                   )
                 })}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     </div>
   )
 }