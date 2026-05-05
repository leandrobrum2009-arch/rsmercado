 import { useState, useEffect } from 'react'
 import { useStoreSettings } from '@/hooks/useStoreSettings'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
 import { Loader2, Plus, Trash2, Printer, Download, Instagram, Layout, Palette, Image as ImageIcon, MessageSquare } from 'lucide-react'
 import { sendWhatsAppMessage } from '@/lib/whatsapp'
 import { toast } from '@/lib/toast'
   const handleWhatsAppShare = async () => {
     if (selectedProducts.length === 0) {
       toast.error('Adicione produtos ao encarte primeiro')
       return
     }
 
     let message = `🔥 *OFERTAS DO DIA - ${storeSettings.site_name || 'RS SUPERMERCADO'}* 🔥\n\n`
     
     selectedProducts.forEach((p: any) => {
       message += `📍 *${p.name}*\n`
       message += `💰 Por apenas: *R$ ${p.price.toFixed(2)}*\n`
       message += `➖➖\n`
     })
 
     message += `\n🛒 *Peça agora pelo site:* ${window.location.origin}\n`
     message += `📦 *Entregamos na sua casa!*`
 
     const url = `https://wa.me/?text=${encodeURIComponent(message)}`
     window.open(url, '_blank')
     
     toast.success('WhatsApp aberto para compartilhamento!')
   }
 
type FlyerProduct = {
  id: string
  name: string
  price: number
  original_price: number
  image_url: string
}

export function FlyerCreator() {
  const [layout, setLayout] = useState('grid-4')
  const [designStyle, setDesignStyle] = useState('varejo')
  const [primaryColor, setPrimaryColor] = useState('#e11d48')
  const [secondaryColor, setSecondaryColor] = useState('#fbbf24')
   const { settings: storeSettings } = useStoreSettings()
   const [title, setTitle] = useState('Ofertas Especiais')
   useEffect(() => {
     if (storeSettings.site_name) {
       setTitle(`Ofertas - ${storeSettings.site_name}`)
     }
     if (storeSettings.colors.primary) {
       setPrimaryColor(storeSettings.colors.primary)
     }
     if (storeSettings.colors.secondary) {
       setSecondaryColor(storeSettings.colors.secondary)
     }
   }, [storeSettings])
 
  const [selectedProducts, setSelectedProducts] = useState<FlyerProduct[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').limit(50)
    setAllProducts(data || [])
  }

  const addProductToFlyer = (product: any) => {
    if (selectedProducts.length >= 12) {
      toast.error('Limite de 12 produtos atingido')
      return
    }
    const newProduct: FlyerProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      original_price: product.old_price || product.price * 1.2,
      image_url: product.image_url
    }
    setSelectedProducts([...selectedProducts, newProduct])
    toast.success('Produto adicionado ao encarte')
  }

  const removeProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id))
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Controls Sidebar */}
      <div className="lg:col-span-4 space-y-6 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" /> Configuração do Encarte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo de Layout</Label>
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid-3">3 Produtos</SelectItem>
                    <SelectItem value="grid-4">4 Produtos</SelectItem>
                    <SelectItem value="grid-8">8 Produtos</SelectItem>
                    <SelectItem value="grid-12">12 Produtos</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estilo Visual</Label>
                <Select value={designStyle} onValueChange={setDesignStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="varejo">Varejo Clássico</SelectItem>
                    <SelectItem value="minimal">Minimalista</SelectItem>
                    <SelectItem value="elegante">Premium/Elegante</SelectItem>
                    <SelectItem value="promo">Super Promo</SelectItem>
                    <SelectItem value="dark">Black Edition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título do Encarte</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor Principal</Label>
                <div className="flex gap-2">
                  <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 p-1" />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor de Oferta</Label>
                <div className="flex gap-2">
                  <Input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-12 p-1" />
                  <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="flex justify-between items-center">
                Produtos ({selectedProducts.length}/12)
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Selecionar Produtos</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-4">
                      {allProducts.map(p => (
                        <div key={p.id} className="border rounded p-2 text-center space-y-2">
                          <img src={p.image_url} className="w-20 h-20 object-cover mx-auto rounded" />
                          <p className="text-xs font-bold line-clamp-1">{p.name}</p>
                          <Button size="sm" className="w-full" onClick={() => addProductToFlyer(p)}>Add</Button>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {selectedProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                    <span className="truncate flex-1 pr-2">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <Input 
                        className="w-20 h-8 text-xs" 
                        defaultValue={p.price} 
                        onChange={(e) => {
                          const updated = [...selectedProducts]
                          updated[idx].price = Number(e.target.value)
                          setSelectedProducts(updated)
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeProduct(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

             <div className="grid grid-cols-2 gap-2 pt-4">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" /> Baixar PDF
              </Button>
               <Button variant="outline" onClick={handleWhatsAppShare} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                 <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
               </Button>
               <Button variant="outline">
                 <Instagram className="w-4 h-4 mr-2" /> Stories
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Area */}
      <div className="lg:col-span-8 flex justify-center bg-gray-200 p-8 rounded-xl overflow-hidden min-h-[1000px] print:p-0 print:bg-white print:rounded-none">
        <div 
          id="flyer-content"
          className={`bg-white shadow-2xl overflow-hidden flex flex-col ${layout === 'story' ? 'aspect-[9/16] w-[400px]' : 'aspect-[1/1.414] w-[700px]'} print:w-full print:shadow-none`}
          style={{ borderColor: primaryColor }}
        >
          {/* Header */}
          <div 
            className={`h-32 relative flex items-center justify-center text-white overflow-hidden ${designStyle === 'dark' ? 'bg-black' : ''}`} 
            style={{ backgroundColor: designStyle === 'dark' ? '#000' : primaryColor }}
          >
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 0 L100 0 L100 100 L0 80 Z" fill={designStyle === 'promo' ? 'yellow' : 'black'} />
              </svg>
            </div>
            <div className="relative z-10 text-center">
              <h2 className={`text-4xl font-black italic uppercase tracking-tighter ${designStyle === 'elegante' ? 'font-serif normal-case italic' : ''}`}>{title}</h2>
              <p className="text-sm font-bold opacity-80">QUALIDADE E PREÇO BAIXO TODO DIA</p>
            </div>
            <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-lg">
              <div className="w-12 h-6 bg-primary flex items-center justify-center text-[8px] font-black italic">SUPERMERCADO</div>
            </div>
          </div>

          {/* Products Grid */}
          <div className={`flex-1 p-6 grid gap-4 ${designStyle === 'dark' ? 'bg-zinc-900' : ''} ${
            layout === 'grid-3' ? 'grid-cols-1' : 
            layout === 'grid-4' ? 'grid-cols-2' : 
            layout === 'grid-8' ? 'grid-cols-2' : 
            'grid-cols-3'
          }`}>
            {selectedProducts.map((p, i) => (
              <div 
                key={i} 
                className={`border-2 rounded-2xl p-4 flex flex-col items-center justify-between text-center relative overflow-hidden bg-white shadow-sm ${
                  designStyle === 'minimal' ? 'border-none shadow-none bg-gray-50' : 
                  designStyle === 'elegante' ? 'rounded-none border-x-0 border-t-0 border-b' : 
                  ''
                }`} 
                style={{ borderColor: `${primaryColor}20` }}
              >
                <img src={p.image_url} alt={p.name} className="w-32 h-32 object-contain mb-2" />
                <h3 className={`font-bold text-sm leading-tight h-10 overflow-hidden line-clamp-2 ${designStyle === 'elegante' ? 'font-serif italic' : ''}`}>{p.name}</h3>
                
                <div className="mt-2 w-full">
                  {designStyle !== 'minimal' && <p className="text-[10px] text-gray-400 line-through">De: R$ {p.original_price.toFixed(2)}</p>}
                  <div 
                    className={`bg-yellow-400 text-black rounded-lg py-1 px-4 inline-block font-black text-xl shadow-sm ${
                      designStyle === 'elegante' ? 'bg-transparent text-rose-700 shadow-none' : 
                      designStyle === 'dark' ? 'bg-amber-400' : ''
                    }`} 
                    style={{ backgroundColor: (designStyle === 'elegante' || designStyle === 'minimal') ? 'transparent' : secondaryColor }}
                  >
                    <span className="text-xs align-top mt-1 mr-0.5">R$</span>
                    <span className={designStyle === 'elegante' ? 'text-3xl' : ''}>{p.price.toFixed(2).split('.')[0]}</span>
                    <span className="text-sm align-top">,{p.price.toFixed(2).split('.')[1]}</span>
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-bold py-1 px-2 rounded-full rotate-12">OFERTA</div>
              </div>
            ))}
            {selectedProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center text-gray-300 py-20">
                <ImageIcon size={64} strokeWidth={1} />
                <p className="mt-4 font-medium">Nenhum produto selecionado</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 text-center border-t-4" style={{ borderColor: secondaryColor, backgroundColor: `${primaryColor}05` }}>
            <div className="flex justify-between items-center px-4">
              <div className="text-left">
                <p className="text-[10px] font-bold">OFERTAS VÁLIDAS ENQUANTO DURAREM OS ESTOQUES</p>
                <p className="text-[10px] opacity-70">Fotos meramente ilustrativas. Reservamo-nos o direito de corrigir erros gráficos.</p>
              </div>
              <div className="text-right flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-bold">PEÇA PELO WHATSAPP</p>
                   <p className="font-black text-lg" style={{ color: primaryColor }}>{storeSettings.whatsapp || '(11) 99999-9999'}</p>
                </div>
                <div className="w-12 h-12 bg-black flex items-center justify-center text-white text-[6px]">QR CODE</div>
              </div>
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
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  )
}
