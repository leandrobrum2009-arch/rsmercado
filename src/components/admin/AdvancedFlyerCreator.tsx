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
 import { Loader2, Plus, Trash2, Printer, Download, ImageIcon, Upload, Type, Palette, Layout, Settings2, AlignLeft, AlignCenter, AlignRight, Eraser, Save, FolderOpen, RefreshCcw } from 'lucide-react'
 import { toast } from '@/lib/toast'
 import { cn } from '@/lib/utils'
 
 type FlyerProduct = {
   id: string
   name: string
   price: number
   original_price?: number
   image_url: string
   unit?: string
   removeBg?: boolean
 }
 
 type LayoutType = 'grid' | 'featured-side' | 'featured-top' | 'single'
 type BackgroundType = 'image' | 'gradient' | 'color'
 
 export function AdvancedFlyerCreator() {
   const { settings: storeSettings } = useStoreSettings()
   const [layout, setLayout] = useState<LayoutType>('grid')
   const [backgroundType, setBackgroundType] = useState<BackgroundType>('image')
   const [backgroundUrl, setBackgroundUrl] = useState('')
   const [backgroundColor, setBackgroundColor] = useState('#ffffff')
   const [backgroundGradient, setBackgroundGradient] = useState('linear-gradient(to bottom, #ffffff, #f3f4f6)')
   const [columns, setColumns] = useState(3)
   const [gridGap, setGridGap] = useState(16)
   const [showLogo, setShowLogo] = useState(true)
   const [logoPosition, setLogoPosition] = useState<'left' | 'center' | 'right'>('center')
   const [logoSize, setLogoSize] = useState(120)
   const [subtitleText, setSubtitleText] = useState('')
   const [showSubtitle, setShowSubtitle] = useState(false)
   const [footerText, setFooterText] = useState('')
   const [showFooter, setShowFooter] = useState(false)
   const [footerFontSize, setFooterFontSize] = useState(10)
   const [uploading, setUploading] = useState(false)
   const [selectedProducts, setSelectedProducts] = useState<FlyerProduct[]>([])
    const [allProducts, setAllProducts] = useState<any[]>([])
    const [templates, setTemplates] = useState<any[]>([])
    const [templateName, setTemplateName] = useState('')
   
   // Styling states
   const [titleColor, setTitleColor] = useState('#000000')
   const [priceColor, setPriceColor] = useState('#e11d48')
   const [secondaryColor, setSecondaryColor] = useState('#facc15')
   const [fontSize, setFontSize] = useState(14)
   const [priceSize, setPriceSize] = useState(24)
   const [fontFamily, setFontFamily] = useState('font-sans')
   const [productBgColor, setProductBgColor] = useState('#ffffff')
   const [productBgOpacity, setProductBgOpacity] = useState(60)
   const [productBlockHeight, setProductBlockHeight] = useState(0) // 0 means auto
   const [showPriceBg, setShowPriceBg] = useState(false)
   const [priceBgColor, setPriceBgColor] = useState('#ffff00')
   const [showShadows, setShowShadows] = useState(true)
   const [removeFlyerBg, setRemoveFlyerBg] = useState(false)
   const [priceLayout, setPriceLayout] = useState<'traditional' | 'inline'>('traditional')
   const [globalRemoveBg, setGlobalRemoveBg] = useState(false)
 
   const PREDEFINED_BGS = [
     'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1506617564039-2f3b650ad701?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&q=80&w=1000'
   ]

    const processImageBackground = (url: string): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = url
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) { resolve(url); return; }
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2]
            if (r > 230 && g > 230 && b > 230) data[i+3] = 0
          }
          ctx.putImageData(imageData, 0, 0)
          resolve(canvas.toDataURL())
        }
        img.onerror = () => resolve(url)
      })
    }
 
    useEffect(() => {
      fetchProducts()
      loadTemplates()
    }, [])

    const loadTemplates = () => {
      const saved = localStorage.getItem('flyer_templates')
      if (saved) setTemplates(JSON.parse(saved))
    }

    const saveTemplate = () => {
      if (!templateName) {
        toast.error('Dê um nome ao template')
        return
      }
      const newTemplate = {
        name: templateName,
        config: {
          layout, backgroundType, backgroundUrl, backgroundColor, backgroundGradient,
          columns, gridGap, showLogo, logoPosition, logoSize, titleColor, priceColor,
          fontSize, priceSize, fontFamily, productBgColor, productBgOpacity,
          productBlockHeight, showPriceBg, priceBgColor, showShadows, removeFlyerBg,
          priceLayout, globalRemoveBg
        }
      }
      const updated = [...templates, newTemplate]
      localStorage.setItem('flyer_templates', JSON.stringify(updated))
      setTemplates(updated)
      setTemplateName('')
      toast.success('Template salvo!')
    }

    const applyTemplate = (config: any) => {
      if (config.layout) setLayout(config.layout)
      if (config.backgroundType) setBackgroundType(config.backgroundType)
      if (config.backgroundUrl !== undefined) setBackgroundUrl(config.backgroundUrl)
      if (config.backgroundColor) setBackgroundColor(config.backgroundColor)
      if (config.backgroundGradient) setBackgroundGradient(config.backgroundGradient)
      if (config.columns) setColumns(config.columns)
      if (config.gridGap !== undefined) setGridGap(config.gridGap)
      if (config.showLogo !== undefined) setShowLogo(config.showLogo)
      if (config.logoPosition) setLogoPosition(config.logoPosition)
      if (config.logoSize) setLogoSize(config.logoSize)
      if (config.titleColor) setTitleColor(config.titleColor)
      if (config.priceColor) setPriceColor(config.priceColor)
      if (config.fontSize) setFontSize(config.fontSize)
      if (config.priceSize) setPriceSize(config.priceSize)
      if (config.fontFamily) setFontFamily(config.fontFamily)
      if (config.productBgColor) setProductBgColor(config.productBgColor)
      if (config.productBgOpacity !== undefined) setProductBgOpacity(config.productBgOpacity)
      if (config.productBlockHeight !== undefined) setProductBlockHeight(config.productBlockHeight)
      if (config.showPriceBg !== undefined) setShowPriceBg(config.showPriceBg)
      if (config.priceBgColor) setPriceBgColor(config.priceBgColor)
      if (config.showShadows !== undefined) setShowShadows(config.showShadows)
      if (config.removeFlyerBg !== undefined) setRemoveFlyerBg(config.removeFlyerBg)
      if (config.priceLayout) setPriceLayout(config.priceLayout)
      if (config.globalRemoveBg !== undefined) setGlobalRemoveBg(config.globalRemoveBg)
      toast.success('Template aplicado!')
    }

    const deleteTemplate = (idx: number) => {
      const updated = templates.filter((_, i) => i !== idx)
      localStorage.setItem('flyer_templates', JSON.stringify(updated))
      setTemplates(updated)
    }

   useEffect(() => {
     if (storeSettings) {
       if (storeSettings.colors?.primary) setPriceColor(storeSettings.colors.primary)
       if (storeSettings.colors?.secondary) setSecondaryColor(storeSettings.colors.secondary)
     }
   }, [storeSettings])
 
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
     let max = 12
     if (layout === 'single') max = 1
     if (layout === 'grid') max = columns * 4 
     if (layout === 'featured-side') max = 8
     if (layout === 'featured-top') max = 10
 
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
       unit: product.unit,
       removeBg: globalRemoveBg
     }
     setSelectedProducts([...selectedProducts, newProduct])
     toast.success('Produto adicionado')
   }
 
   const removeProduct = (idx: number) => {
     const updated = [...selectedProducts]
     updated.splice(idx, 1)
     setSelectedProducts(updated)
   }

    const toggleProductBg = async (idx: number) => {
      const updated = [...selectedProducts]
      const product = updated[idx]
      product.removeBg = !product.removeBg
      if (product.removeBg && !product.image_url.startsWith('data:image')) {
        const processed = await processImageBackground(product.image_url)
        product.image_url = processed
      }
      setSelectedProducts(updated)
    }
 
   const handlePrint = () => {
     window.print()
   }
 
   const hexToRgba = (hex: string, opacity: number) => {
     const r = parseInt(hex.slice(1, 3), 16)
     const g = parseInt(hex.slice(3, 5), 16)
     const b = parseInt(hex.slice(5, 7), 16)
     return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
   }
 
   return (
     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
       {/* Controls Sidebar */}
       <div className="lg:col-span-4 space-y-6 print:hidden">
         <Card className="rounded-[24px] border-2 border-zinc-100 shadow-xl overflow-hidden">
           <CardHeader className="bg-zinc-50 border-b border-zinc-100">
             <div className="flex items-center justify-between">
               <CardTitle className="flex items-center gap-2 font-black uppercase italic tracking-tighter text-lg">
                 <Settings2 className="w-5 h-5 text-primary" /> Gerador de Encartes A4
               </CardTitle>
               <Dialog>
                 <DialogTrigger asChild>
                   <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase">
                     <FolderOpen className="w-3 h-3 mr-1" /> Templates
                   </Button>
                 </DialogTrigger>
                 <DialogContent>
                   <DialogHeader>
                     <DialogTitle>Templates de Encarte</DialogTitle>
                   </DialogHeader>
                   <div className="space-y-4 py-4">
                     <div className="flex gap-2">
                       <Input 
                         placeholder="Nome do novo template..." 
                         value={templateName} 
                         onChange={(e) => setTemplateName(e.target.value)} 
                       />
                       <Button onClick={saveTemplate} size="sm">
                         <Save className="w-4 h-4 mr-1" /> Salvar Atual
                       </Button>
                     </div>
                     <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Templates Salvos</Label>
                       {templates.length === 0 ? (
                         <p className="text-center py-8 text-zinc-400 text-xs">Nenhum template salvo</p>
                       ) : (
                         <div className="grid grid-cols-1 gap-2">
                           {templates.map((t, idx) => (
                             <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                               <span className="font-bold text-sm">{t.name}</span>
                               <div className="flex gap-2">
                                 <Button size="sm" variant="outline" onClick={() => applyTemplate(t.config)}>Usar</Button>
                                 <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteTemplate(idx)}><Trash2 className="w-4 h-4" /></Button>
                               </div>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>
                 </DialogContent>
               </Dialog>
             </div>
           </CardHeader>
           <CardContent className="space-y-6 pt-6">
             {/* Layout Selection */}
             <div className="space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Modelo de Layout</Label>
               <div className="grid grid-cols-2 gap-2">
                 {[
                   { id: 'grid', label: 'Grade Flexível', icon: Layout },
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
                       }}
                   >
                     <l.icon className="w-5 h-5" />
                     {l.label}
                   </Button>
                 ))}
               </div>
             </div>
 
               {layout === 'grid' && (
                 <div className="space-y-3">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Colunas na Grade</Label>
                   <div className="flex gap-2">
                     {[2, 3, 4].map(c => (
                       <Button
                         key={c}
                         variant={columns === c ? 'default' : 'outline'}
                         className="flex-1 h-8 text-[10px] font-bold"
                         onClick={() => setColumns(c)}
                       >
                         {c} Colunas
                       </Button>
                     ))}
                   </div>
                 </div>
               )}
 
               <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Espaçamento entre Blocos ({gridGap}px)</Label>
                 <Slider value={[gridGap]} min={0} max={40} step={2} onValueChange={([val]) => setGridGap(val)} />
               </div>
 
               <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Logotipo no Topo</Label>
                 <Button 
                   variant={showLogo ? 'default' : 'outline'} 
                   size="sm" 
                   className="h-8 text-[10px]"
                   onClick={() => setShowLogo(!showLogo)}
                 >
                   {showLogo ? 'Sim' : 'Não'}
                 </Button>
               </div>

               {showLogo && (
                 <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 animate-in fade-in slide-in-from-top-2">
                   <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Posição do Logo</Label>
                     <div className="flex gap-2">
                       {[
                         { id: 'left', icon: AlignLeft },
                         { id: 'center', icon: AlignCenter },
                         { id: 'right', icon: AlignRight },
                       ].map(pos => (
                         <Button
                           key={pos.id}
                           variant={logoPosition === pos.id ? 'default' : 'outline'}
                           className="flex-1 h-8"
                           onClick={() => setLogoPosition(pos.id as any)}
                         >
                           <pos.icon className="w-4 h-4" />
                         </Button>
                       ))}
                     </div>
                   </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tamanho Logo ({logoSize}px)</Label>
                      <Slider value={[logoSize]} min={40} max={400} step={5} onValueChange={([val]) => setLogoSize(val)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Legenda Topo</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Frase..." 
                          value={subtitleText} 
                          onChange={(e) => setSubtitleText(e.target.value)} 
                          className="h-8 text-[10px]" 
                        />
                        <Button 
                          variant={showSubtitle ? 'default' : 'outline'} 
                          size="sm" 
                          className="h-8" 
                          onClick={() => setShowSubtitle(!showSubtitle)}
                        >
                          {showSubtitle ? 'On' : 'Off'}
                        </Button>
                      </div>
                    </div>
                  </div>
                 </div>
               )}
 
              {/* Background Settings */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fundo do Encarte</Label>
                <div className="flex gap-2 mb-2">
                  {(['image', 'gradient', 'color'] as BackgroundType[]).map(type => (
                    <Button
                      key={type}
                      variant={backgroundType === type ? 'default' : 'outline'}
                      className="flex-1 h-8 text-[10px] font-bold capitalize"
                      onClick={() => setBackgroundType(type)}
                    >
                      {type === 'image' ? 'Img' : type === 'gradient' ? 'Deg' : 'Cor'}
                    </Button>
                  ))}
                </div>

                {backgroundType === 'image' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-4 gap-2">
                      {PREDEFINED_BGS.map((bg, idx) => (
                        <button
                          key={idx}
                          className={cn(
                            "relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all",
                            backgroundUrl === bg ? "border-primary scale-95 shadow-lg" : "border-transparent hover:border-zinc-300"
                          )}
                          onClick={() => setBackgroundUrl(bg)}
                        >
                          <img src={bg} className="w-full h-full object-cover" alt={`BG ${idx}`} />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <Input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="bg-upload" />
                        <label htmlFor="bg-upload" className="flex items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                          <span className="text-[10px] font-bold uppercase">{uploading ? 'Enviando...' : 'Carregar Minha Arte'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
 
                 {backgroundType === 'color' && (
                   <div className="flex gap-2">
                     <Input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-12 h-10 p-0 border-none" />
                     <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-10 text-xs" />
                   </div>
                 )}
 
                 {backgroundType === 'gradient' && (
                   <div className="space-y-2">
                     <Input value={backgroundGradient} onChange={(e) => setBackgroundGradient(e.target.value)} className="h-10 text-xs font-mono" />
                   </div>
                 )}
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
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-bold uppercase">Cor Preço</Label>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-4 w-4" 
                        onClick={() => {
                          if (storeSettings?.colors?.primary) setPriceColor(storeSettings.colors.primary)
                        }}
                        title="Usar cor da marca"
                      >
                        <RefreshCcw className="w-3 h-3" />
                      </Button>
                    </div>
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
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-[10px] font-bold uppercase">Fonte</Label>
                   <Select value={fontFamily} onValueChange={setFontFamily}>
                     <SelectTrigger className="h-8 text-[10px] font-bold">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="font-sans">Inter (Sans)</SelectItem>
                        <SelectItem value="font-serif">Merriweather (Serif)</SelectItem>
                        <SelectItem value="font-mono">Fira (Mono)</SelectItem>
                        <SelectItem value="font-black text-6xl">Impact (Bold)</SelectItem>
                        <SelectItem value="font-sans uppercase">Arial (Caps)</SelectItem>
                        <SelectItem value="italic font-serif">Italic Serif</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label className="text-[10px] font-bold uppercase">Preço</Label>
                   <Select value={priceLayout} onValueChange={(val: any) => setPriceLayout(val)}>
                     <SelectTrigger className="h-8 text-[10px] font-bold">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="traditional">Tradicional</SelectItem>
                       <SelectItem value="inline">Linha</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
 
               <div className="pt-4 border-t border-zinc-200 mt-4 space-y-4">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Configurações de Bloco</Label>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label className="text-[10px] font-bold uppercase">Cor Fundo Bloco</Label>
                     <div className="flex gap-2">
                       <Input type="color" value={productBgColor} onChange={(e) => setProductBgColor(e.target.value)} className="w-8 h-8 p-0 border-none" />
                       <Input value={productBgColor} onChange={(e) => setProductBgColor(e.target.value)} className="h-8 text-[10px]" />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] font-bold uppercase">Opacidade ({productBgOpacity}%)</Label>
                     <Slider value={[productBgOpacity]} min={0} max={100} step={1} onValueChange={([val]) => setProductBgOpacity(val)} />
                   </div>
                 </div>
 
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase">Altura Fixa ({productBlockHeight === 0 ? 'Auto' : `${productBlockHeight}px`})</Label>
                      <Slider value={[productBlockHeight]} min={0} max={400} step={1} onValueChange={([val]) => setProductBlockHeight(val)} />
                    </div>
                    
                    <div className="space-y-2 p-3 bg-white rounded-xl border border-zinc-200">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Dados do Rodapé</Label>
                      <div className="flex gap-2 mb-2">
                        <Input 
                          placeholder="Endereço, Telefone, Observações..." 
                          value={footerText} 
                          onChange={(e) => setFooterText(e.target.value)} 
                          className="h-8 text-[10px]" 
                        />
                        <Button 
                          variant={showFooter ? 'default' : 'outline'} 
                          size="sm" 
                          className="h-8" 
                          onClick={() => setShowFooter(!showFooter)}
                        >
                          {showFooter ? 'On' : 'Off'}
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-bold uppercase">
                          <span>Tam. Fonte</span>
                          <span>{footerFontSize}px</span>
                        </div>
                        <Slider value={[footerFontSize]} min={6} max={24} step={1} onValueChange={([val]) => setFooterFontSize(val)} />
                      </div>
                    </div>
                  </div>
 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="flex items-center gap-2">
                     <Button 
                       variant={showPriceBg ? 'default' : 'outline'} 
                       size="sm" className="w-full h-8 text-[10px]"
                       onClick={() => setShowPriceBg(!showPriceBg)}
                     >
                       Fundo Preço
                     </Button>
                   </div>
                   {showPriceBg && (
                     <Input type="color" value={priceBgColor} onChange={(e) => setPriceBgColor(e.target.value)} className="w-full h-8 p-0 border-none" />
                   )}
                 </div>
 
                 <div className="grid grid-cols-2 gap-4">
                   <Button 
                     variant={showShadows ? 'default' : 'outline'} 
                     size="sm" className="h-8 text-[10px]"
                     onClick={() => setShowShadows(!showShadows)}
                   >
                     Sombras: {showShadows ? 'Sim' : 'Não'}
                   </Button>
                   <Button 
                     variant={removeFlyerBg ? 'default' : 'outline'} 
                     size="sm" className="h-8 text-[10px]"
                     onClick={() => setRemoveFlyerBg(!removeFlyerBg)}
                   >
                     Fundo Branco: {removeFlyerBg ? 'Não' : 'Sim'}
                   </Button>
                   <Button 
                     variant={globalRemoveBg ? 'default' : 'outline'} 
                     size="sm" className="h-8 text-[10px]"
                     onClick={() => setGlobalRemoveBg(!globalRemoveBg)}
                   >
                      <Eraser className="w-3 h-3 mr-1" /> Remover Fundo Branco
                   </Button>
                 </div>
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
                     <Button 
                       variant={p.removeBg ? 'default' : 'ghost'} 
                       size="icon" 
                       className={cn("h-8 w-8", p.removeBg ? "" : "text-zinc-300")} 
                       onClick={() => toggleProductBg(idx)}
                       title="Remover fundo branco"
                     >
                       <Eraser className="w-4 h-4" />
                     </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-red-500 transition-colors" onClick={() => removeProduct(idx)}>
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
        <div className="lg:col-span-8 flex flex-col items-center bg-zinc-200/50 p-8 rounded-[32px] overflow-hidden min-h-[1000px] print:p-0 print:bg-white print:rounded-none">
          <div className="mb-4 flex gap-4 print:hidden">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Preview Real A4
            </div>
            <Button size="sm" variant="secondary" className="rounded-full h-8 px-4 text-[10px] font-black uppercase" onClick={handlePrint}>
              <Download className="w-3 h-3 mr-2" /> Download / Salvar PDF
            </Button>
          </div>

         <div 
           id="flyer-content"
               className={cn(
                 "relative flex flex-col aspect-[1/1.414] w-[700px] print:w-full print:shadow-none overflow-hidden transition-all duration-300",
                 removeFlyerBg ? "bg-transparent" : "bg-white shadow-2xl"
               )}
               style={{ 
                 background: backgroundType === 'image' 
                   ? (backgroundUrl ? `url(${backgroundUrl}) center/100% 100% no-repeat` : (removeFlyerBg ? 'transparent' : 'white'))
                   : backgroundType === 'gradient'
                     ? backgroundGradient
                     : backgroundColor
               }}
           >
               {/* Top Reserved Zone (15%) */}
               <div className="h-[15%] w-full flex flex-col items-center justify-center relative border-b border-dashed border-zinc-100/50">
               {showLogo && storeSettings?.logo_url && (
                 <div 
                   className={cn(
                     "absolute top-1/2 -translate-y-1/2 w-full px-12 flex",
                     logoPosition === 'left' && "justify-start",
                     logoPosition === 'center' && "justify-center",
                     logoPosition === 'right' && "justify-end"
                   )}
                 >
                   <img 
                     src={storeSettings.logo_url} 
                     style={{ width: `${logoSize}px` }}
                     className="object-contain drop-shadow-lg animate-in fade-in zoom-in duration-500" 
                     alt="Logo" 
                   />
                 </div>
               )}
               <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity print:hidden">
                 <div className="bg-primary/10 border-2 border-dashed border-primary text-primary font-black uppercase text-[10px] px-4 py-2 rounded-full">
                     Topo Reservado (15%)
                 </div>
               </div>
             </div>
   
               {/* Content Middle Zone (80%) */}
               <div className="h-[80%] px-8 py-4 flex flex-col justify-center overflow-hidden relative">
               <div 
                 className={cn(
                   "grid h-full max-h-full transition-all duration-300",
                   layout === 'grid' && (columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-4"),
                   layout === 'featured-side' && "grid-cols-4 grid-rows-3",
                   layout === 'featured-top' && "grid-cols-2 grid-rows-5",
                   layout === 'single' && "grid-cols-1 grid-rows-1"
                 )}
                 style={{ gap: `${gridGap}px` }}
               >
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
                        <div 
                          className={cn(
                            "relative backdrop-blur-[2px] rounded-xl p-3 w-full flex flex-col items-center justify-center border border-white/30 transition-all",
                            layout === 'single' ? 'p-12' : '',
                            columns === 4 ? 'p-1.5' : '',
                            showShadows ? "shadow-md hover:shadow-lg" : "shadow-none",
                             productBlockHeight === 0 ? "h-fit min-h-full" : ""
                          )}
                          style={{ 
                            backgroundColor: hexToRgba(productBgColor, productBgOpacity),
                             height: productBlockHeight > 0 ? `${productBlockHeight}px` : 'auto'
                          }}
                        >
                          <img 
                            src={p.image_url} 
                            className={cn(
                              "object-contain transition-all duration-300",
                              p.removeBg || globalRemoveBg ? "mix-blend-multiply brightness-[1.02] contrast-[1.05]" : "drop-shadow-sm",
                              layout === 'single' ? 'w-80 h-80' : 
                              (layout === 'featured-side' && (i === 0 || i === 1)) ? 'w-48 h-64' : 
                              columns === 4 ? 'w-16 h-16' : 'w-24 h-24'
                            )} 
                            style={{
                              // Alternative for truly transparent backgrounds if the browser supports it
                              // but mix-blend-multiply is generally the "effective" way for white backgrounds
                            }}
                          />
                         <div className={cn("space-y-0.5 mt-1", columns === 4 ? "scale-90" : "")}>
                         <h3 
                           className="font-black uppercase italic leading-tight line-clamp-2 drop-shadow-sm"
                           style={{ color: titleColor, fontSize: `${layout === 'single' ? fontSize * 2.5 : fontSize}px` }}
                         >
                           {p.name}
                         </h3>
                          <div className={cn(
                            "flex flex-col items-center mt-auto",
                            showPriceBg ? "px-3 py-1 rounded-lg" : ""
                          )}
                          style={{ backgroundColor: showPriceBg ? priceBgColor : 'transparent' }}
                          >
                            {p.original_price && (
                              <span className="text-[8px] line-through text-zinc-500 opacity-60">R$ {p.original_price.toFixed(2)}</span>
                            )}
                            
                            {priceLayout === 'traditional' ? (
                              <div 
                                className="font-black italic flex items-baseline drop-shadow-sm"
                                style={{ color: priceColor, fontSize: `${layout === 'single' ? priceSize * 2 : priceSize}px` }}
                              >
                                <span className="text-[0.4em] self-start mt-1 mr-0.5">R$</span>
                                <span className="leading-none">{p.price.toFixed(2).split('.')[0]}</span>
                                <div className="flex flex-col items-start ml-0.5">
                                  <span className="text-[0.4em] leading-none border-b-2 border-current">,{p.price.toFixed(2).split('.')[1]}</span>
                                  {p.unit && <span className="text-[0.25em] leading-none mt-0.5">{p.unit}</span>}
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="font-black italic flex items-center drop-shadow-sm"
                                style={{ color: priceColor, fontSize: `${layout === 'single' ? priceSize * 2 : priceSize}px` }}
                              >
                                <span className="text-[0.5em] mr-1">R$</span>
                                <span>{p.price.toFixed(2).replace('.', ',')}</span>
                                {p.unit && <span className="text-[0.3em] ml-1">{p.unit}</span>}
                              </div>
                            )}
                          </div>
                       </div>
                     </div>
                   </div>
                 )
               })}
             </div>
           </div>
 
               {/* Bottom Reserved Zone (5%) */}
               <div className="h-[5%] w-full flex items-center justify-center relative border-t border-dashed border-zinc-100/50">
               <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity print:hidden">
                 <div className="bg-primary/10 border-2 border-dashed border-primary text-primary font-black uppercase text-[10px] px-4 py-2 rounded-full">
                     Rodapé Reservado (5%)
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