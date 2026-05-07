import { useState, useEffect, useRef, useMemo } from 'react'
import html2canvas from 'html2canvas'
 import { useStoreSettings } from '@/hooks/useStoreSettings'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { Label } from '@/components/ui/label'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
 import { Slider } from '@/components/ui/slider'
 import { Loader2, Plus, Trash2, Printer, Download, ImageIcon, Upload, Type, Palette, Layout, Settings2, AlignLeft, AlignCenter, AlignRight, Eraser, Save, FolderOpen, RefreshCcw, History, Clock, Calendar, CheckSquare } from 'lucide-react'
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    const [gridGap, setGridGap] = useState(10)
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
    const [flyerHistory, setFlyerHistory] = useState<any[]>([])
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
    const [productBlockHeight, setProductBlockHeight] = useState<number>(220) // Default to a reasonable height
    const [imageSize, setImageSize] = useState(100)
    const [nameOnTop, setNameOnTop] = useState(false)
   const [showPriceBg, setShowPriceBg] = useState(false)
   const [priceBgColor, setPriceBgColor] = useState('#ffff00')
   const [showShadows, setShowShadows] = useState(true)
   const [removeFlyerBg, setRemoveFlyerBg] = useState(false)
   const [priceLayout, setPriceLayout] = useState<'traditional' | 'inline'>('traditional')
     const [globalRemoveBg, setGlobalRemoveBg] = useState(false)
     const [processingBg, setProcessingBg] = useState<string | null>(null)
    
    // Validity phrase states
    const [showValidity, setShowValidity] = useState(true)
    const [validityText, setValidityText] = useState(`Ofertas válidas de ${new Date().toLocaleDateString('pt-BR')} até as 21h`)
    const [validityPosition, setValidityPosition] = useState<'top' | 'bottom' | 'footer' | 'between'>('bottom')
     const [validityBgColor, setValidityBgColor] = useState('#facc15') // yellow-400
     const [validityFontSize, setValidityFontSize] = useState(11)
    const [validityTextColor, setValidityTextColor] = useState('#000000')
    const [productPadding, setProductPadding] = useState(8)
    const [savedFlyers, setSavedFlyers] = useState<any[]>([])
    const [loadingSaved, setLoadingSaved] = useState(false)

    useEffect(() => {
      if (globalRemoveBg && selectedProducts.length > 0) {
        const processAll = async () => {
          const updated = [...selectedProducts]
          let hasChanges = false
          for (let i = 0; i < updated.length; i++) {
            if (!updated[i].image_url.startsWith('data:image')) {
              setProcessingBg(updated[i].id)
              const processed = await processImageBackground(updated[i].image_url)
              if (processed !== updated[i].image_url) {
                updated[i].image_url = processed
                updated[i].removeBg = true
                hasChanges = true
              }
            }
          }
          if (hasChanges) {
            setSelectedProducts(updated)
          }
          setProcessingBg(null)
        }
        processAll()
      }
    }, [globalRemoveBg])

    const [bgRemovalThreshold, setBgRemovalThreshold] = useState(240)
    const [bgRemovalSmoothing, setBgRemovalSmoothing] = useState(10)
 
   const PREDEFINED_BGS = [
     'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1506617564039-2f3b650ad701?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&q=80&w=1000'
    ];

    const PRESET_TEMPLATES = [
      {
        name: '🔥 Oferta Explosiva',
        config: {
          layout: 'grid', backgroundType: 'color', backgroundColor: '#ffffff',
          columns: 3, gridGap: 12, productPadding: 8, showLogo: true, logoPosition: 'center', logoSize: 120,
          titleColor: '#e11d48', priceColor: '#ffffff', fontSize: 14, priceSize: 28,
          fontFamily: 'font-sans', productBgColor: '#ffffff', productBgOpacity: 100,
          productBlockHeight: 220, showPriceBg: true, priceBgColor: '#e11d48', showShadows: true,
          priceLayout: 'traditional', imageSize: 100, nameOnTop: false, showValidity: true,
          validityBgColor: '#facc15', validityTextColor: '#000000'
        }
      },
      {
        name: '🥗 Hortifruti Fresco',
        config: {
          layout: 'grid', backgroundType: 'gradient', backgroundGradient: 'linear-gradient(to bottom, #f0fdf4, #dcfce7)',
          columns: 3, gridGap: 10, productPadding: 10, showLogo: true, logoPosition: 'left', logoSize: 100,
          titleColor: '#166534', priceColor: '#16a34a', fontSize: 13, priceSize: 24,
          fontFamily: 'font-sans', productBgColor: '#ffffff', productBgOpacity: 80,
          productBlockHeight: 200, showPriceBg: false, showShadows: false,
          priceLayout: 'traditional', imageSize: 110, nameOnTop: false, showValidity: true,
          validityBgColor: '#16a34a', validityTextColor: '#ffffff'
        }
      },
      {
        name: '🌑 Black Friday / Noturno',
        config: {
          layout: 'featured-side', backgroundType: 'color', backgroundColor: '#09090b',
          columns: 3, gridGap: 15, productPadding: 12, showLogo: true, logoPosition: 'center', logoSize: 150,
          titleColor: '#ffffff', priceColor: '#facc15', fontSize: 14, priceSize: 32,
          fontFamily: 'font-sans', productBgColor: '#18181b', productBgOpacity: 100,
          productBlockHeight: 240, showPriceBg: true, priceBgColor: '#27272a', showShadows: true,
          priceLayout: 'traditional', imageSize: 90, nameOnTop: true, showValidity: true,
          validityBgColor: '#facc15', validityTextColor: '#000000'
        }
      },
      {
        name: '✨ Premium Minimalista',
        config: {
          layout: 'grid', backgroundType: 'color', backgroundColor: '#ffffff',
          columns: 2, gridGap: 20, productPadding: 15, showLogo: true, logoPosition: 'center', logoSize: 80,
          titleColor: '#18181b', priceColor: '#18181b', fontSize: 16, priceSize: 30,
          fontFamily: 'font-serif', productBgColor: '#fafafa', productBgOpacity: 100,
          productBlockHeight: 300, showPriceBg: false, showShadows: false,
          priceLayout: 'inline', imageSize: 85, nameOnTop: false, showValidity: false
        }
      }
    ];

     const processImageBackground = (url: string, threshold = bgRemovalThreshold, smoothing = bgRemovalSmoothing): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = url
         img.onload = () => {
           try {
             const canvas = document.createElement('canvas')
             const ctx = canvas.getContext('2d', { willReadFrequently: true })
             if (!ctx) { resolve(url); return; }
             canvas.width = img.width
             canvas.height = img.height
             ctx.drawImage(img, 0, 0)
             const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
             const data = imageData.data
             
              // Helper to check if a color is "background-like" (very light/white)
              const isWhite = (r: number, g: number, b: number) => {
                const avg = (r + g + b) / 3
                const diff = Math.max(r, g, b) - Math.min(r, g, b)
                return avg > threshold && diff < 30
              }

              // Create a mask for background pixels
              const width = canvas.width
              const height = canvas.height
              const mask = new Uint8Array(width * height)
              
              // Simple flood fill from edges to avoid removing white inside the product
              const queue: [number, number][] = []
              
              // Add edge pixels to queue
              for (let x = 0; x < width; x++) {
                queue.push([x, 0], [x, height - 1])
              }
              for (let y = 1; y < height - 1; y++) {
                queue.push([0, y], [width - 1, y])
              }
              
              while (queue.length > 0) {
                const [x, y] = queue.shift()!
                const idx = y * width + x
                if (mask[idx]) continue
                
                const pIdx = idx * 4
                if (isWhite(data[pIdx], data[pIdx+1], data[pIdx+2])) {
                  mask[idx] = 1
                  // Check neighbors
                  if (x > 0) queue.push([x - 1, y])
                  if (x < width - 1) queue.push([x + 1, y])
                  if (y > 0) queue.push([x, y - 1])
                  if (y < height - 1) queue.push([x, y + 1])
                }
              }
              
              // Apply mask with edge smoothing
              for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                  const idx = y * width + x
                  const pIdx = idx * 4
                  
                  if (mask[idx]) {
                    data[pIdx + 3] = 0
                  } else {
                    // Check if it's an edge pixel for smoothing
                    let isEdge = false
                    if (x > 0 && mask[idx - 1]) isEdge = true
                    else if (x < width - 1 && mask[idx + 1]) isEdge = true
                    else if (y > 0 && mask[idx - width]) isEdge = true
                    else if (y < height - 1 && mask[idx + width]) isEdge = true
                    
                    if (isEdge) {
                      // Calculate average of neighbors to "soften" the edge
                      let count = 0
                      let totalAlpha = 0
                      for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                          const nx = x + dx, ny = y + dy
                          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            totalAlpha += mask[ny * width + nx] ? 0 : 255
                            count++
                          }
                        }
                      }
                      data[pIdx + 3] = totalAlpha / count
                    }
                  }
                }
              }
             ctx.putImageData(imageData, 0, 0)
             resolve(canvas.toDataURL('image/png'))
           } catch (e) {
             console.error('Error removing background:', e)
             toast.error('Erro ao processar imagem (CORS/Segurança). Tente outra imagem.')
             resolve(url)
           }
         }
         img.onerror = () => {
           toast.error('Erro ao carregar imagem do produto.')
           resolve(url)
         }
      })
    }
 
    const loadData = () => {
      const savedTemplates = localStorage.getItem('flyer_templates')
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates))
      const savedHistory = localStorage.getItem('flyer_history')
      if (savedHistory) setFlyerHistory(JSON.parse(savedHistory))
    }

    const fetchSavedFlyers = async () => {
      setLoadingSaved(true)
      try {
        const { data, error } = await supabase
          .from('flyers')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setSavedFlyers(data || [])
      } catch (error: any) {
        console.error('Error fetching saved flyers:', error)
      } finally {
        setLoadingSaved(false)
      }
    }

    useEffect(() => {
      fetchProducts()
      loadData()
      fetchSavedFlyers()
    }, [])

    const saveToDatabase = async () => {
      try {
        const config = {
          layout, backgroundType, backgroundUrl, backgroundColor, backgroundGradient,
          columns, gridGap, showLogo, logoPosition, logoSize, titleColor, priceColor,
          fontSize, priceSize, fontFamily, productBgColor, productBgOpacity,
          productBlockHeight, showPriceBg, priceBgColor, showShadows, removeFlyerBg,
          priceLayout, globalRemoveBg, imageSize, nameOnTop, bgRemovalThreshold, productPadding,
          bgRemovalSmoothing, footerText, showFooter, footerFontSize, subtitleText,
          showSubtitle, showValidity, validityText, validityPosition, validityBgColor, validityTextColor
        }

        const { error } = await supabase.from('flyers').insert({
          title: `Encarte ${new Date().toLocaleDateString('pt-BR')}`,
          layout_type: layout,
          primary_color: priceColor,
          secondary_color: secondaryColor,
          products_data: selectedProducts,
          config: config,
          image_url: selectedProducts[0]?.image_url || ''
        })

        if (error) throw error
        toast.success('Encarte salvo com sucesso no banco de dados!')
        fetchSavedFlyers()
      } catch (error: any) {
        toast.error('Erro ao salvar no banco: ' + error.message)
      }
    }

    const saveTemplate = () => {
      if (!templateName) {
        toast.error('Dê um nome ao template')
        return
      }
      const newTemplate = {
        id: Math.random().toString(36).substring(7),
        name: templateName,
        timestamp: new Date().toISOString(),
        config: {
          layout, backgroundType, backgroundUrl, backgroundColor, backgroundGradient,
          columns, gridGap, showLogo, logoPosition, logoSize, titleColor, priceColor,
          fontSize, priceSize, fontFamily, productBgColor, productBgOpacity,
          productBlockHeight, showPriceBg, priceBgColor, showShadows, removeFlyerBg,
          priceLayout, globalRemoveBg, imageSize, nameOnTop, bgRemovalThreshold, productPadding,
          bgRemovalSmoothing, footerText, showFooter, footerFontSize, subtitleText,
          showSubtitle, showValidity, validityText, validityPosition, validityBgColor, validityTextColor
        }
      }
      const updated = [newTemplate, ...templates]
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
      if (config.productPadding !== undefined) setProductPadding(config.productPadding)
       if (config.globalRemoveBg !== undefined) setGlobalRemoveBg(config.globalRemoveBg)
       if (config.imageSize !== undefined) setImageSize(config.imageSize)
       if (config.nameOnTop !== undefined) setNameOnTop(config.nameOnTop)
       if (config.bgRemovalThreshold !== undefined) setBgRemovalThreshold(config.bgRemovalThreshold)
       if (config.bgRemovalSmoothing !== undefined) setBgRemovalSmoothing(config.bgRemovalSmoothing)
       if (config.footerText !== undefined) setFooterText(config.footerText)
       if (config.showFooter !== undefined) setShowFooter(config.showFooter)
       if (config.footerFontSize !== undefined) setFooterFontSize(config.footerFontSize)
      if (config.subtitleText !== undefined) setSubtitleText(config.subtitleText)
      if (config.showSubtitle !== undefined) setShowSubtitle(config.showSubtitle)
      if (config.showValidity !== undefined) setShowValidity(config.showValidity)
      if (config.validityText !== undefined) setValidityText(config.validityText)
      if (config.validityPosition !== undefined) setValidityPosition(config.validityPosition)
      if (config.validityBgColor !== undefined) setValidityBgColor(config.validityBgColor)
      if (config.validityTextColor !== undefined) setValidityTextColor(config.validityTextColor)
      toast.success('Template aplicado!')
    }

    const deleteTemplate = (idx: number) => {
      const updated = templates.filter((_, i) => i !== idx)
      localStorage.setItem('flyer_templates', JSON.stringify(updated))
      setTemplates(updated)
    }

    useEffect(() => {
      if (storeSettings) {
         if (storeSettings.colors?.primary) {
           setPriceColor(storeSettings.colors.primary)
           setTitleColor(storeSettings.colors.primary)
         }
         if (storeSettings.colors?.secondary) {
           setSecondaryColor(storeSettings.colors.secondary)
         }
         
         // Auto-fill footer if empty
         if (!footerText) {
           const info = []
           if (storeSettings.address) info.push(storeSettings.address)
           if (storeSettings.whatsapp) info.push(`WhatsApp: ${storeSettings.whatsapp}`)
           if (info.length > 0) {
             setFooterText(info.join(' | '))
             setShowFooter(true)
           }
         }

         // Auto-fill subtitle if empty
         if (!subtitleText && storeSettings.store_description) {
           setSubtitleText(storeSettings.store_description)
           setShowSubtitle(true)
         }
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
      
      let imageUrl = product.image_url
      const newProduct: FlyerProduct = {
        id: product.id,
        name: product.name,
        price: product.price,
        original_price: product.old_price,
        image_url: imageUrl,
        unit: product.unit,
        removeBg: globalRemoveBg
      }

      setSelectedProducts([...selectedProducts, newProduct])
      toast.success('Produto adicionado')

      // If global removal is on, process it immediately
      if (globalRemoveBg) {
        processImageBackground(imageUrl).then(processed => {
          if (processed !== imageUrl) {
            setSelectedProducts(prev => prev.map(p => 
              p.id === product.id ? { ...p, image_url: processed, removeBg: true } : p
            ))
          }
        })
      }
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
 
    const handlePrint = async () => {
      toast.info('Preparando impressão... Selecione "Salvar como PDF" no destino da impressão.', {
        duration: 5000
      })
      
     const historyItem = {
       id: Math.random().toString(36).substring(7),
       timestamp: new Date().toISOString(),
       config: {
         layout, backgroundType, backgroundUrl, backgroundColor, backgroundGradient,
         columns, gridGap, showLogo, logoPosition, logoSize, titleColor, priceColor,
         fontSize, priceSize, fontFamily, productBgColor, productBgOpacity,
         productBlockHeight, showPriceBg, priceBgColor, showShadows, removeFlyerBg,
         priceLayout, globalRemoveBg, imageSize, nameOnTop, bgRemovalThreshold,
         bgRemovalSmoothing, footerText, showFooter, footerFontSize, subtitleText,
         showSubtitle
       },
       products: selectedProducts
     }
     const updatedHistory = [historyItem, ...flyerHistory].slice(0, 20)
     setFlyerHistory(updatedHistory)
     localStorage.setItem('flyer_history', JSON.stringify(updatedHistory))
      await saveToDatabase()
      // Give time for the toast and any rendering to settle
      setTimeout(() => {
        window.print()
      }, 500)
    }

    const handleDownloadImage = async () => {
      const element = document.getElementById('flyer-content')
      if (!element) return

      setUploading(true)
      toast.info('Gerando imagem para download...')

      try {
        const canvas = await html2canvas(element, {
          useCORS: true,
          scale: 2, // Better quality
          backgroundColor: removeFlyerBg ? null : '#ffffff',
          logging: false,
        })

        const image = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = image
        link.download = `encarte-${new Date().toISOString().split('T')[0]}.png`
        link.click()
        toast.success('Imagem baixada com sucesso!')
      } catch (err) {
        console.error('Error generating image:', err)
        toast.error('Erro ao gerar imagem. Tente usar a opção de imprimir PDF.')
      } finally {
        setUploading(false)
      }
    }

   const hexToRgba = (hex: string, opacity: number) => {
     const r = parseInt(hex.slice(1, 3), 16)
     const g = parseInt(hex.slice(3, 5), 16)
     const b = parseInt(hex.slice(5, 7), 16)
     return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
   }
 
     const ValidityBanner = ({ isLine = false }: { isLine?: boolean }) => (
      <div 
         className={cn(
           "w-full px-4 text-center font-black uppercase italic shadow-md z-[45] tracking-tight transition-all",
           isLine ? "py-0.5 border-y border-black/10 my-1" : "py-1.5"
         )}
         style={{ 
           backgroundColor: validityBgColor, 
           color: validityTextColor, 
           fontSize: `${isLine ? Math.max(validityFontSize * 0.7, 7) : validityFontSize}px`,
           minHeight: isLine ? '12px' : 'auto'
         }}
      >
        {validityText}
      </div>
    )

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
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
                    <Tabs defaultValue="presets" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="presets">Prontos</TabsTrigger>
                        <TabsTrigger value="templates">Meus</TabsTrigger>
                        <TabsTrigger value="history">Histórico</TabsTrigger>
                        <TabsTrigger value="saved">Salvos (DB)</TabsTrigger>
                      </TabsList>
                      <TabsContent value="presets" className="space-y-4 py-4">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          <div className="grid grid-cols-1 gap-2">
                            {PRESET_TEMPLATES.map((t, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group hover:border-primary/30 transition-colors">
                                <div className="flex flex-col">
                                  <span className="font-black uppercase italic text-sm tracking-tight">{t.name}</span>
                                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Design Profissional</span>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="h-8 rounded-xl font-black uppercase text-[10px]" 
                                  onClick={() => {
                                    applyTemplate(t.config)
                                    toast.success(`Estilo "${t.name}" aplicado!`)
                                  }}
                                >
                                  Aplicar
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="templates" className="space-y-4 py-4">
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Nome do novo template..." 
                            value={templateName} 
                            onChange={(e) => setTemplateName(e.target.value)} 
                          />
                          <Button onClick={saveTemplate} size="sm">
                            <Save className="w-4 h-4 mr-1" /> Salvar
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {templates.length === 0 ? (
                            <p className="text-center py-8 text-zinc-400 text-xs">Nenhum template salvo</p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {templates.map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm">{t.name}</span>
                                    {t.timestamp && (
                                      <span className="text-[8px] text-zinc-400 flex items-center">
                                        <Clock className="w-2 h-2 mr-1" /> {new Date(t.timestamp).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => applyTemplate(t.config)}>Usar</Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 text-red-500 p-0" onClick={() => deleteTemplate(idx)}><Trash2 className="w-3 h-3" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="history" className="space-y-4 py-4">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {flyerHistory.length === 0 ? (
                            <p className="text-center py-8 text-zinc-400 text-xs">Nenhum histórico recente</p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {flyerHistory.map((h, idx) => (
                                <div key={h.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-xs">Encarte de {new Date(h.timestamp).toLocaleDateString()}</span>
                                    <span className="text-[8px] text-zinc-400 flex items-center">
                                      <Clock className="w-2 h-2 mr-1" /> {new Date(h.timestamp).toLocaleTimeString()} • {h.products?.length || 0} produtos
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-7 text-[10px]" 
                                      onClick={() => {
                                        applyTemplate(h.config)
                                        if (h.products) setSelectedProducts(h.products)
                                        toast.success('Histórico restaurado!')
                                      }}
                                    >
                                      Restaurar
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="saved" className="space-y-4 py-4">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {loadingSaved ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                          ) : savedFlyers.length === 0 ? (
                            <p className="text-center py-8 text-zinc-400 text-xs">Nenhum encarte salvo no banco</p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {savedFlyers.map((h) => (
                                <div key={h.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-xs">{h.title}</span>
                                    <span className="text-[8px] text-zinc-400 flex items-center">
                                      <Calendar className="w-2 h-2 mr-1" /> {new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-7 text-[10px]" 
                                      onClick={() => {
                                        if (h.config) applyTemplate(h.config)
                                        if (h.products_data) setSelectedProducts(h.products_data)
                                        toast.success('Encarte carregado!')
                                      }}
                                    >
                                      Abrir
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                 </DialogContent>
               </Dialog>
             </div>
           </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Quick Presets Section */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Modelos Rápidos</Label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                  {PRESET_TEMPLATES.map((t, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="flex-shrink-0 h-10 px-4 rounded-xl text-[10px] font-black uppercase border-2 hover:border-primary transition-all"
                      onClick={() => {
                        applyTemplate(t.config)
                        toast.success(`Estilo "${t.name}" aplicado!`)
                      }}
                    >
                      {t.name}
                    </Button>
                  ))}
                </div>
              </div>

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
 
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Espaçamento ({gridGap}px)</Label>
                    <Slider value={[gridGap]} min={0} max={40} step={2} onValueChange={([val]) => setGridGap(val)} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Padding ({productPadding}px)</Label>
                    <Slider value={[productPadding]} min={0} max={20} step={1} onValueChange={([val]) => setProductPadding(val)} />
                  </div>
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
                     <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                       <div className="flex justify-between items-center mb-1">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Legenda Topo</Label>
                         {storeSettings?.store_description && (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-5 text-[7px] px-1 font-black uppercase"
                             onClick={() => {
                               setSubtitleText(storeSettings.store_description)
                               setShowSubtitle(true)
                               toast.success('Descrição importada')
                             }}
                           >
                             <RefreshCcw className="w-2 h-2 mr-1" /> Usar Descrição
                           </Button>
                         )}
                       </div>
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
 
              {/* Validity Phrase Settings */}
              <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Frase de Validade</Label>
                  <Button 
                    variant={showValidity ? 'default' : 'outline'} 
                    size="sm" 
                    className="h-7 text-[10px]"
                    onClick={() => setShowValidity(!showValidity)}
                  >
                    {showValidity ? 'On' : 'Off'}
                  </Button>
                </div>

                {showValidity && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Input 
                      placeholder="Ex: Ofertas válidas até..." 
                      value={validityText} 
                      onChange={(e) => setValidityText(e.target.value)}
                      className="h-8 text-[10px]"
                    />
                    <div className="grid grid-cols-4 gap-1">
                      {(['top', 'bottom', 'footer', 'between'] as const).map(pos => (
                        <Button
                          key={pos}
                          variant={validityPosition === pos ? 'default' : 'outline'}
                          className="h-7 text-[8px] font-bold uppercase"
                          onClick={() => setValidityPosition(pos)}
                        >
                          {pos === 'top' ? 'Topo' : pos === 'bottom' ? 'Meio' : pos === 'footer' ? 'Rodapé' : 'Entre'}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold uppercase">
                        <span>Tamanho Fonte Validade</span>
                        <span>{validityFontSize}px</span>
                      </div>
                      <Slider value={[validityFontSize]} min={6} max={24} step={1} onValueChange={([val]) => setValidityFontSize(val)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold uppercase">Fundo</Label>
                        <Input type="color" value={validityBgColor} onChange={(e) => setValidityBgColor(e.target.value)} className="h-7 w-full p-0 border-none" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold uppercase">Texto</Label>
                        <Input type="color" value={validityTextColor} onChange={(e) => setValidityTextColor(e.target.value)} className="h-7 w-full p-0 border-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                        <SelectItem value="font-sans font-black italic">Impact (Black)</SelectItem>
                        <SelectItem value="font-sans font-bold">Arial Bold</SelectItem>
                        <SelectItem value="font-serif italic font-bold">Traditional Serif</SelectItem>
                        <SelectItem value="font-['Montserrat',sans-serif]">Montserrat</SelectItem>
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
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-black uppercase tracking-tighter">Altura do Bloco ({productBlockHeight === 0 ? 'Auto' : `${productBlockHeight}px`})</Label>
                        <div className="flex gap-1">
                           <Button variant="outline" size="sm" className="h-6 px-1 text-[8px]" onClick={() => setProductBlockHeight(0)}>AUTO</Button>
                           <Input 
                             type="number" 
                             value={productBlockHeight} 
                             onChange={(e) => setProductBlockHeight(Number(e.target.value))} 
                             className="w-12 h-6 text-[10px] p-1 text-center"
                             min={0}
                             max={800}
                           />
                        </div>
                      </div>
                      <div className="flex gap-1 mb-2">
                        {[180, 220, 260, 300, 350].map(h => (
                          <Button 
                            key={h} 
                            variant={productBlockHeight === h ? "default" : "outline"} 
                            className="flex-1 h-7 text-[8px] font-bold px-0"
                            onClick={() => setProductBlockHeight(h)}
                          >
                            {h}px
                          </Button>
                        ))}
                      </div>
                      <Slider value={[productBlockHeight]} min={100} max={600} step={1} onValueChange={([val]) => setProductBlockHeight(val)} />
                    </div>
                    
                    {globalRemoveBg && (
                      <div className="space-y-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center">
                       <Label className="text-[9px] font-black uppercase">Refinar Recorte Inteligente ({bgRemovalThreshold})</Label>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-4 w-4" 
                         onClick={() => {
                           // Re-process all images with new threshold
                           const updated = [...selectedProducts]
                           updated.forEach(async (p, i) => {
                             if (p.removeBg) {
                               const processed = await processImageBackground(p.image_url, bgRemovalThreshold)
                               updated[i].image_url = processed
                               setSelectedProducts([...updated])
                             }
                           })
                         }}
                       >
                         <RefreshCcw className={cn("w-3 h-3", processingBg ? "animate-spin" : "")} />
                       </Button>
                     </div>
                     <Slider value={[bgRemovalThreshold]} min={180} max={254} step={1} onValueChange={([val]) => setBgRemovalThreshold(val)} />
                     <p className="text-[7px] text-zinc-500">Aumente se o fundo não estiver saindo totalmente. Diminua se estiver cortando o produto.</p>
                      </div>
                    )}
                   
                   <div className="space-y-2">
                     <Label className="text-[10px] font-bold uppercase">Tamanho Foto ({imageSize}%)</Label>
                     <Slider value={[imageSize]} min={50} max={300} step={1} onValueChange={([val]) => setImageSize(val)} />
                   </div>

                   <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-zinc-200">
                     <Label className="text-[10px] font-bold uppercase">Nome Sobre Foto</Label>
                     <Button 
                       variant={nameOnTop ? 'default' : 'outline'} 
                       size="sm" 
                       className="h-7 text-[10px]"
                       onClick={() => setNameOnTop(!nameOnTop)}
                     >
                       {nameOnTop ? 'Sim' : 'Não'}
                     </Button>
                   </div>
                    
                    <div className="space-y-2 p-3 bg-white rounded-xl border border-zinc-200">
                       <div className="flex justify-between items-center mb-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dados do Rodapé</Label>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-6 text-[8px] font-black uppercase"
                           onClick={() => {
                             const info = []
                             if (storeSettings?.address) info.push(storeSettings.address)
                             if (storeSettings?.whatsapp) info.push(`WhatsApp: ${storeSettings.whatsapp}`)
                             setFooterText(info.join(' | '))
                             setShowFooter(true)
                             toast.success('Dados importados da loja')
                           }}
                         >
                           <RefreshCcw className="w-3 h-3 mr-1" /> Sincronizar
                         </Button>
                       </div>
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
                    <div className="space-y-2">
                      <Button 
                        variant={globalRemoveBg ? 'default' : 'outline'} 
                        size="sm" className="w-full h-8 text-[10px]"
                        onClick={() => setGlobalRemoveBg(!globalRemoveBg)}
                      >
                         <Eraser className="w-3 h-3 mr-1" /> Remover Fundo Branco
                      </Button>
                      {globalRemoveBg && (
                        <div className="px-2">
                          <Label className="text-[8px] font-bold uppercase mb-1 block">Sensibilidade ({bgRemovalThreshold})</Label>
                          <Slider value={[bgRemovalThreshold]} min={150} max={250} step={1} onValueChange={([val]) => setBgRemovalThreshold(val)} />
                        </div>
                      )}
                    </div>
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
 
              <div className="flex flex-col gap-2">
                <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" /> Exportar PDF / Imprimir
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs border-2" 
                  onClick={handleDownloadImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Baixar como Imagem (PNG)
                </Button>
              </div>
           </CardContent>
         </Card>
       </div>
 
        {/* Preview Area */}
        <div className="lg:col-span-8 sticky top-4 h-fit flex flex-col items-center bg-zinc-200/50 p-8 rounded-[32px] min-h-[calc(100vh-2rem)] print:relative print:top-0 print:p-0 print:bg-white print:rounded-none">
          <div className="mb-4 flex gap-4 print:hidden">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Preview Real A4
            </div>
              <Button size="sm" variant="secondary" className="rounded-full h-8 px-4 text-[10px] font-black uppercase" onClick={() => {
                handlePrint()
                saveToDatabase()
              }}>
                <Save className="w-3 h-3 mr-2" /> Salvar e Imprimir
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
                 <div className="h-[15%] w-full flex flex-col items-center justify-center relative border-b border-dashed border-zinc-100/30 overflow-visible">
                  {showLogo && storeSettings?.logo_url && (
                    <div 
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-full px-12 flex",
                        logoPosition === 'left' && "justify-start",
                        logoPosition === 'center' && "justify-center",
                        logoPosition === 'right' && "justify-end"
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <img 
                          src={storeSettings.logo_url} 
                          style={{ width: `${logoSize}px` }}
                          className="object-contain drop-shadow-xl animate-in fade-in zoom-in duration-500" 
                          alt="Logo" 
                        />
                        {showSubtitle && subtitleText && (
                          <p 
                            className="font-black uppercase italic text-center drop-shadow-sm animate-in slide-in-from-top-2 duration-700"
                            style={{ color: titleColor, fontSize: `${logoSize / 8}px` }}
                          >
                            {subtitleText}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {showValidity && validityPosition === 'top' && (
                    <div className="absolute -bottom-4 left-0 w-full z-50">
                      <ValidityBanner />
                    </div>
                  )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity print:hidden">
                 <div className="bg-primary/10 border-2 border-dashed border-primary text-primary font-black uppercase text-[10px] px-4 py-2 rounded-full">
                     Topo Reservado (15%)
                 </div>
               </div>
             </div>
   
                {/* Content Middle Zone (80%) */}
                <div className="h-[80%] px-8 py-2 flex flex-col justify-center overflow-visible relative">
                  {showValidity && validityPosition === 'bottom' && (
                    <div className="mb-4">
                      <ValidityBanner />
                    </div>
                  )}
               <div 
                 className={cn(
                    "grid h-fit max-h-full transition-all duration-300 items-stretch",
                   layout === 'grid' && (columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-4"),
                   layout === 'featured-side' && "grid-cols-4 grid-rows-3",
                   layout === 'featured-top' && "grid-cols-2 grid-rows-5",
                   layout === 'single' && "grid-cols-1 grid-rows-1"
                 )}
                 style={{ gap: `${gridGap}px` }}
               >
                {selectedProducts.map((p, i) => {
                  const isBetweenRow = validityPosition === 'between' && i > 0 && i % columns === 0;
                  let spanClass = ""
                 if (layout === 'featured-side') {
                   if (i === 0) spanClass = "col-span-1 row-span-3"
                   if (i === 1) spanClass = "col-span-1 row-span-3 order-last"
                 }
                 if (layout === 'featured-top') {
                   if (i === 0 || i === 1) spanClass = "col-span-1 row-span-1"
                 }
 
                  return (
                    <>
                    {isBetweenRow && (
                      <div className="col-span-full my-1 animate-in fade-in slide-in-from-left-2" style={{ zIndex: 40 }}>
                        <ValidityBanner isLine={true} />
                      </div>
                    )}
                    <div
                      key={i}
                      className={cn(
                        "flex flex-col items-center justify-center text-center space-y-2 relative",
                        spanClass,
                        fontFamily
                      )}
                      style={{ padding: `${productPadding}px` }}
                    >
                        <div 
                          className={cn(
                            "relative backdrop-blur-[2px] rounded-xl p-3 w-full flex flex-col items-center justify-center border border-white/30 transition-all",
                            layout === 'single' ? 'p-12' : '',
                            columns === 4 ? 'p-1.5' : '',
                             showShadows ? "shadow-[0_8px_30px_rgb(0,0,0,0.15)] border-white/50" : "shadow-none",
                             productBlockHeight === 0 ? "h-fit min-h-full" : ""
                          )}
                            style={{
                              backgroundColor: hexToRgba(productBgColor, productBgOpacity),
                              height: productBlockHeight > 0 
                                ? (layout === 'featured-side' && (i === 0 || i === 1) 
                                    ? `${productBlockHeight * 3 + gridGap * 2}px` 
                                    : `${productBlockHeight}px`)
                                : 'auto',
                              minHeight: productBlockHeight > 0 
                                ? (layout === 'featured-side' && (i === 0 || i === 1) 
                                    ? `${productBlockHeight * 3 + gridGap * 2}px` 
                                    : `${productBlockHeight}px`)
                                : 'auto',
                              overflow: 'visible'
                            }}
                        >
                            <div className="relative w-full flex-1 flex items-center justify-center min-h-0 overflow-visible">
                             <div className={cn("relative flex items-center justify-center", imageSize > 100 ? "overflow-visible" : "overflow-hidden")}>
                               <img 
                                 src={p.image_url} 
                                 className={cn(
                                   "object-contain transition-all duration-300 z-10",
                                   (p.removeBg || globalRemoveBg) && !p.image_url.startsWith('data:image') && (productBgColor.toLowerCase() === '#ffffff' || productBgColor.toLowerCase() === '#fff')
                                     ? "mix-blend-multiply brightness-[1.02] contrast-[1.05]" 
                                     : "brightness-[1.02] contrast-[1.05]",
                                   (showShadows && !p.removeBg && !globalRemoveBg) ? "drop-shadow-2xl" : ""
                                 )} 
                                 style={{
                                    width: `${layout === 'single' ? 80 : 
                                             (layout === 'featured-side' && (i === 0 || i === 1)) ? 60 : 
                                             columns === 4 ? 70 : 80}%`,
                                   height: 'auto',
                                   maxHeight: '100%',
                                   transform: `scale(${imageSize / 100})`,
                                   position: 'relative',
                                   zIndex: 10,
                                 }}
                               />
                             </div>
                            {nameOnTop && (
                              <h3 
                                className="absolute top-0 left-0 w-full font-black uppercase italic leading-tight line-clamp-2 drop-shadow-md z-20 text-center"
                                style={{ 
                                  color: titleColor, 
                                  fontSize: `${layout === 'single' ? fontSize * 2 : fontSize}px`,
                                  backgroundColor: hexToRgba(productBgColor, 40),
                                  padding: '2px 4px'
                                }}
                              >
                                {p.name}
                              </h3>
                            )}
                           </div>

                          <div className={cn("space-y-0.5 mt-1 w-full z-[35]", columns === 4 ? "scale-90" : "")}>
                          {!nameOnTop && (
                          <h3 
                            className={cn("font-black uppercase italic leading-tight line-clamp-2 drop-shadow-sm", fontFamily)}
                            style={{ 
                              color: titleColor, 
                              fontSize: `${layout === 'single' ? fontSize * 2.5 : fontSize}px`
                            }}
                          >
                            {p.name}
                          </h3>
                          )}
                           <div 
                             className={cn(
                               "flex flex-col items-center mt-auto relative",
                               showPriceBg ? "px-3 py-1 rounded-lg" : ""
                             )}
                             style={{ 
                               backgroundColor: showPriceBg ? priceBgColor : 'transparent',
                               zIndex: 40
                             }}
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
                   </>
                 )
               })}
             </div>
           </div>
 
                {/* Bottom Reserved Zone (5%) */}
                <div className="h-[5%] w-full flex flex-col items-center justify-center relative border-t border-dashed border-zinc-100/30 px-12 overflow-visible">
                  {showValidity && validityPosition === 'footer' && (
                    <div className="absolute bottom-full left-0 w-full mb-1">
                      <ValidityBanner />
                    </div>
                  )}
                  {showFooter && footerText && (
                    <div 
                      className="text-center font-bold uppercase italic animate-in fade-in slide-in-from-bottom-2"
                      style={{ color: titleColor, fontSize: `${footerFontSize}px` }}
                    >
                      {footerText}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity print:hidden pointer-events-none">
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
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
            html, body { height: 297mm; overflow: hidden; }
           @page { 
             size: A4; 
             margin: 0; 
           }
         }
       `}</style>
     </div>
   )
 }