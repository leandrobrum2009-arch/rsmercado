import { useState, useEffect, useRef, useMemo } from 'react'
import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'
 import { useStoreSettings } from '@/hooks/useStoreSettings'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Input } from '@/components/ui/input'
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { Label } from '@/components/ui/label'
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
 import { Slider } from '@/components/ui/slider'
 import { Progress } from '@/components/ui/progress'
import { Loader2, Plus, Trash2, Printer, Download, ImageIcon, Upload, Type, Palette, Layout, Settings2, AlignLeft, AlignCenter, AlignRight, Eraser, Save, FolderOpen, RefreshCcw, History, Clock, Calendar, CheckSquare, Share2, MessageCircle, Eye, X, Camera } from 'lucide-react'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { StoryGenerator } from './StoryGenerator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
 import { toast } from '@/lib/toast'
 import { cn } from '@/lib/utils'
 import { sanitizeClonedDocColors } from '@/lib/sanitizeColors'
 
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

 const LAST_FLYER_PRODUCTS_KEY = 'last_flyer_products'
 const MAX_CACHED_FLYER_PRODUCTS = 60
 const MAX_CACHED_IMAGE_URL_LENGTH = 2048

 const isStorageQuotaError = (error: unknown) =>
   error instanceof DOMException && (
     error.name === 'QuotaExceededError' ||
     error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
     error.code === 22 ||
     error.code === 1014
   )

 const safeSetLocalStorage = (key: string, value: string) => {
   try {
     localStorage.setItem(key, value)
   } catch (error) {
     if (isStorageQuotaError(error)) {
       localStorage.removeItem(key)
       console.warn(`Storage quota exceeded while saving ${key}. Cache was cleared.`)
       return
     }

     throw error
   }
 }

 const compactFlyerProduct = (product: FlyerProduct): FlyerProduct => {
   const imageUrl = typeof product.image_url === 'string' ? product.image_url : ''

   return {
     id: product.id,
     name: product.name,
     price: Number(product.price || 0),
     original_price: product.original_price,
     image_url: imageUrl.startsWith('data:') || imageUrl.length > MAX_CACHED_IMAGE_URL_LENGTH ? '' : imageUrl,
     unit: product.unit,
     removeBg: product.removeBg,
   }
 }
 
  const hexToRgba = (hex: string, opacity: number) => {
    if (!hex || hex.length < 7) return `rgba(255, 255, 255, ${opacity / 100})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    // If it's just a filename, it's likely from the flyer-backgrounds bucket
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/flyer-backgrounds/${url}`;
  };

  const validateImageUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      // Timeout after 5s
      setTimeout(() => resolve(false), 5000);
    });
  };



interface ValidityBannerProps {
  isLine?: boolean;
  validityBgColor: string;
  validityTextColor: string;
  validityFontSize: number;
  validityText: string;
}

const ValidityBanner = ({ 
  isLine = false, 
  validityBgColor, 
  validityTextColor, 
  validityFontSize, 
  validityText 
}: ValidityBannerProps) => (
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

export function AdvancedFlyerCreator() {

  const { settings: storeSettings } = useStoreSettings()

    const [layout, setLayout] = useState<LayoutType>('grid')
    const [backgroundType, setBackgroundType] = useState<BackgroundType>('image')
    const [backgroundUrl, setBackgroundUrl] = useState('')
    const [backgroundColor, setBackgroundColor] = useState('#ffffff')
    const [backgroundGradient, setBackgroundGradient] = useState('linear-gradient(to bottom, #ffffff, #f3f4f6)')
    const [customBackgrounds, setCustomBackgrounds] = useState<string[]>([])
  const [gradientStart, setGradientStart] = useState('#ffffff')
  const [gradientEnd, setGradientEnd] = useState('#f3f4f6')
  const [gradientDirection, setGradientDirection] = useState('to bottom')
    useEffect(() => {
      setBackgroundGradient(`linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd})`)
    }, [gradientStart, gradientEnd, gradientDirection])

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
    const [uploadProgress, setUploadProgress] = useState(0)
   const [selectedProducts, setSelectedProducts] = useState<FlyerProduct[]>([])
     const [allProducts, setAllProducts] = useState<any[]>([])
     const [categories, setCategories] = useState<any[]>([])
      const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
      const [onlyOffers, setOnlyOffers] = useState(false)
      const [onlyInStock, setOnlyInStock] = useState(false)
     const [productSearchTerm, setProductSearchTerm] = useState('')
    const [templates, setTemplates] = useState<any[]>([]) // Local templates
    const [dbTemplates, setDbTemplates] = useState<any[]>([]) // Database templates
    const [flyerHistory, setFlyerHistory] = useState<any[]>([])
     const [templateName, setTemplateName] = useState('')
     const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false)
   
   // Styling states
   const [titleColor, setTitleColor] = useState('#000000')
   const [priceColor, setPriceColor] = useState('#e11d48')
   const [secondaryColor, setSecondaryColor] = useState('#facc15')
   const [fontSize, setFontSize] = useState(14)
   const [priceSize, setPriceSize] = useState(24)
   const [fontFamily, setFontFamily] = useState('font-sans')
   const [productBgColor, setProductBgColor] = useState('#ffffff')
   const [productBgOpacity, setProductBgOpacity] = useState(60)
    const [productBlockHeight, setProductBlockHeight] = useState<number>(0) // Default to auto
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
      const [nameOffsetY, setNameOffsetY] = useState(0)
      const [nameOffsetX, setNameOffsetX] = useState(0)
      const [priceOffsetY, setPriceOffsetY] = useState(0)
      const [priceOffsetX, setPriceOffsetX] = useState(0)
      const [imageOffsetY, setImageOffsetY] = useState(0)
      const [imageOffsetX, setImageOffsetX] = useState(0)
     const [blurAmount, setBlurAmount] = useState(2)
    const [savedFlyers, setSavedFlyers] = useState<any[]>([])
     const [loadingSaved, setLoadingSaved] = useState(false)
     const [logHistory, setLogHistory] = useState<{msg: string, isBlocker?: boolean, time: string}[]>([])
     const [showLogViewer, setShowLogViewer] = useState(false)
     const [corsWarningCount, setCorsWarningCount] = useState(0)
         const [showPreviewModal, setShowPreviewModal] = useState(false)
         const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
       const [printImage, setPrintImage] = useState<string | null>(null)
    const [isPreparingPrint, setIsPreparingPrint] = useState(false)
    const [isStoryGenOpen, setIsStoryGenOpen] = useState(false)
    const [selectedFlyerForStory, setSelectedFlyerForStory] = useState<any>(null)
    
        const [generationProgress, setGenerationProgress] = useState(0)
        const [generationStep, setGenerationStep] = useState('')
        const [flyerScale, setFlyerScale] = useState(0.8)
         const [useHtmlMode, setUseHtmlMode] = useState(true)
    const [bgRemovalThreshold, setBgRemovalThreshold] = useState(240)
    const [bgRemovalSmoothing, setBgRemovalSmoothing] = useState(10)

     const filteredProducts = useMemo(() => {
       const term = productSearchTerm.toLowerCase();
       return allProducts.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(term) ||
            (p.description && p.description.toLowerCase().includes(term)) ||
            (p.brand && p.brand.toLowerCase().includes(term)) ||
            (p.sku && p.sku.toLowerCase().includes(term));
         
          const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
          const matchesOffers = !onlyOffers || (p.tags && p.tags.includes('OFERTA'));
          const matchesStock = !onlyInStock || (p.stock > 0);
          
          return matchesSearch && matchesCategory && matchesOffers && matchesStock;
        })
     }, [allProducts, productSearchTerm, selectedCategory])

    // Load filters from sessionStorage
    useEffect(() => {
      const savedFilters = sessionStorage.getItem('flyer_product_filters');
      if (savedFilters) {
        try {
          const { term, cat, offers, stock } = JSON.parse(savedFilters);
          if (term !== undefined) setProductSearchTerm(term);
          if (cat !== undefined) setSelectedCategory(cat);
          if (offers !== undefined) setOnlyOffers(offers);
          if (stock !== undefined) setOnlyInStock(stock);
        } catch (e) {
          console.error('Error loading session filters:', e);
        }
      }
    }, []);

    // Save filters to sessionStorage
    useEffect(() => {
      const filters = {
        term: productSearchTerm,
        cat: selectedCategory,
        offers: onlyOffers,
        stock: onlyInStock
      };
      sessionStorage.setItem('flyer_product_filters', JSON.stringify(filters));
    }, [productSearchTerm, selectedCategory, onlyOffers, onlyInStock]);

    // Auto-load last configuration
    useEffect(() => {
      if (typeof window === 'undefined') return;
      
      const loadLastConfig = () => {
        const lastConfig = localStorage.getItem('last_flyer_config')
        if (lastConfig) {
          try {
            const config = JSON.parse(lastConfig)
            // Manually apply without toast to avoid annoying on mount
            if (config.layout) setLayout(config.layout)
            if (config.backgroundType) setBackgroundType(config.backgroundType)
            if (config.backgroundUrl !== undefined) setBackgroundUrl(ensureAbsoluteUrl(config.backgroundUrl))
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
            if (config.showValidity) setShowValidity(config.showValidity)
            if (config.validityText) setValidityText(config.validityText)
            if (config.validityPosition) setValidityPosition(config.validityPosition)
            if (config.validityBgColor) setValidityBgColor(config.validityBgColor)
            if (config.validityTextColor) setValidityTextColor(config.validityTextColor)
            if (config.nameOffsetY !== undefined) setNameOffsetY(config.nameOffsetY)
            if (config.priceOffsetY !== undefined) setPriceOffsetY(config.priceOffsetY)
            if (config.priceOffsetX !== undefined) setPriceOffsetX(config.priceOffsetX)
            if (config.nameOffsetX !== undefined) setNameOffsetX(config.nameOffsetX)
            if (config.imageOffsetY !== undefined) setImageOffsetY(config.imageOffsetY)
            if (config.imageOffsetX !== undefined) setImageOffsetX(config.imageOffsetX)
            if (config.blurAmount !== undefined) setBlurAmount(config.blurAmount)
            if (config.customBackgrounds) setCustomBackgrounds(config.customBackgrounds.map(ensureAbsoluteUrl))
          } catch (e) {
            console.error('Error loading last flyer config:', e)
          }
        }
        
        const lastProducts = localStorage.getItem(LAST_FLYER_PRODUCTS_KEY)
        if (lastProducts) {
          try {
            const parsedProducts = JSON.parse(lastProducts)
            if (Array.isArray(parsedProducts)) {
              setSelectedProducts(parsedProducts.map(compactFlyerProduct))
            }
          } catch (e) {
            console.error('Error loading last flyer products:', e)
            localStorage.removeItem(LAST_FLYER_PRODUCTS_KEY)
          }
        }
      }
      loadLastConfig()
    }, [])

    // Auto-save current configuration
    useEffect(() => {
      if (typeof window === 'undefined') return;
      
      const config = {
        layout, backgroundType, backgroundUrl, backgroundColor, backgroundGradient,
        columns, gridGap, showLogo, logoPosition, logoSize, titleColor, priceColor,
        fontSize, priceSize, fontFamily, productBgColor, productBgOpacity,
        productBlockHeight, showPriceBg, priceBgColor, showShadows, removeFlyerBg,
        priceLayout, globalRemoveBg, imageSize, nameOnTop, bgRemovalThreshold, productPadding,
        nameOffsetY, nameOffsetX, priceOffsetY, priceOffsetX, imageOffsetY, imageOffsetX, blurAmount,
        bgRemovalSmoothing, footerText, showFooter, footerFontSize, subtitleText,
        showSubtitle, showValidity, validityText, validityPosition, validityBgColor, validityTextColor,
        customBackgrounds
      }
      safeSetLocalStorage('last_flyer_config', JSON.stringify(config))
    }, [
      layout, backgroundType, backgroundUrl, backgroundColor, backgroundGradient,
      columns, gridGap, showLogo, logoPosition, logoSize, titleColor, priceColor,
      fontSize, priceSize, fontFamily, productBgColor, productBgOpacity,
      productBlockHeight, showPriceBg, priceBgColor, showShadows, removeFlyerBg,
      priceLayout, globalRemoveBg, imageSize, nameOnTop, bgRemovalThreshold, productPadding,
      nameOffsetY, nameOffsetX, priceOffsetY, priceOffsetX, imageOffsetY, imageOffsetX, blurAmount,
      bgRemovalSmoothing, footerText, showFooter, footerFontSize, subtitleText,
      showSubtitle, showValidity, validityText, validityPosition, validityBgColor, validityTextColor
    ])

    useEffect(() => {
      if (typeof window !== 'undefined') {
        const cachedProducts = selectedProducts
          .slice(0, MAX_CACHED_FLYER_PRODUCTS)
          .map(compactFlyerProduct)

        safeSetLocalStorage(LAST_FLYER_PRODUCTS_KEY, JSON.stringify(cachedProducts))
      }
    }, [selectedProducts])
      useEffect(() => {
        const handleResize = () => {
          if (typeof window !== 'undefined') {
            const width = window.innerWidth
            const height = window.innerHeight
            
            // Área de prévia no desktop (lg) ocupa aprox 8/12 colunas
            // No mobile ocupa a largura total
            let availableWidth = width
            if (width >= 1024) {
              availableWidth = (width * 8 / 12) - 120 // 120px de respiro/padding
            } else {
              availableWidth = width - 40
            }
            
             // Área de prévia expandida: usamos mais altura para permitir um zoom maior
             // O usuário quer ver o encarte grande, então damos mais "espaço virtual"
             const availableHeight = height - 100 // Menos respiro no topo
            
            // A4 tem 794x1123 em 96dpi
            const scaleW = availableWidth / 794
            const scaleH = availableHeight / 1123
            
             // O usuário quer a imagem grande ocupando o lado direito
             // Se houver espaço na largura, priorizamos preencher a largura
             // mas mantendo um limite para não estourar demais a tela verticalmente sem necessidade
             let calculatedScale = scaleW * 0.95 // 95% da largura disponível
             
             // Mas não deixamos ficar maior que o necessário para caber na altura com algum scroll suave
             // ou menor que o legível
             calculatedScale = Math.max(Math.min(calculatedScale, 1.2), 0.5)
            
            setFlyerScale(calculatedScale)
          }
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
      }, [])

      // Effect to disable animations globally when preparing print
      useEffect(() => {
       if (isPreparingPrint || uploading) {
         document.body.classList.add('no-animations');
       } else {
         document.body.classList.remove('no-animations');
       }
       return () => document.body.classList.remove('no-animations');
     }, [isPreparingPrint, uploading]);

    // Helper: estilo de fundo do encarte conforme tipo selecionado.
    // Aplicado no #flyer-content e também usado para decidir se devemos
    // forçar backgroundColor branco no html2canvas (só para tipo 'color').
    const getFlyerBackgroundStyle = (): Record<string, string> => {
      if (removeFlyerBg) {
        return { backgroundColor: 'rgba(0,0,0,0)' };
      }
      switch (backgroundType) {
        case 'image':
          if (!backgroundUrl) return { backgroundColor: '#ffffff' };
          return {
            backgroundImage: `url("${backgroundUrl}"), url("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000")`,
            backgroundSize: 'cover, cover',
            backgroundPosition: 'center, center',
            backgroundRepeat: 'no-repeat, no-repeat',
            backgroundColor: '#ffffff'
          };
        case 'gradient':
          return { background: backgroundGradient };
        case 'color':
        default:
          return { backgroundColor: backgroundColor || '#ffffff' };
      }
    };


    // Cor de fundo para passar ao html2canvas. Quando o fundo é imagem ou
    // gradiente, retornamos null para que o html2canvas NÃO pinte por cima.
    const getHtml2CanvasBackground = (format?: string): string | null => {
      if (removeFlyerBg) return format === 'png' ? null : 'rgba(0,0,0,0)';
      if (backgroundType === 'image' && backgroundUrl) return null;
      if (backgroundType === 'gradient') return null;
      return backgroundColor || '#ffffff';
    };

    // Extract content to a reusable component
    const FlyerContentInner = () => {
      return (
        <>
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
                          crossOrigin="anonymous"
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
                      <ValidityBanner 
                        validityBgColor={validityBgColor}
                        validityTextColor={validityTextColor}
                        validityFontSize={validityFontSize}
                        validityText={validityText}
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
                <div className="h-[80%] px-8 py-2 flex flex-col justify-center overflow-visible relative">
                  {showValidity && validityPosition === 'bottom' && (
                    <div className="mb-4">
                      <ValidityBanner 
                        validityBgColor={validityBgColor}
                        validityTextColor={validityTextColor}
                        validityFontSize={validityFontSize}
                        validityText={validityText}
                      />
                    </div>
                  )}
                <div 
                  className={cn(
                    "grid transition-all duration-300 items-stretch",
                    layout === 'single' ? "h-full grid-cols-1 grid-rows-1 flex items-center justify-center" : "h-fit max-h-full",
                    layout === 'grid' && (columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-4"),
                    layout === 'featured-side' && "grid-cols-4 grid-rows-3",
                    layout === 'featured-top' && "grid-cols-2 grid-rows-5"
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
                         <ValidityBanner 
                           isLine={true} 
                           validityBgColor={validityBgColor}
                           validityTextColor={validityTextColor}
                           validityFontSize={validityFontSize}
                           validityText={validityText}
                         />
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
                              "relative rounded-xl p-3 w-full flex flex-col items-center justify-center border border-white/30 transition-all",
                               layout === 'single' ? 'p-16' : '',
                             columns === 4 ? 'p-1.5' : '',
                              (showShadows && productBgOpacity > 0) ? "shadow-[0_8px_30px_rgb(0,0,0,0.15)] border-white/50" : "shadow-none",
                              productBlockHeight === 0 ? "h-fit min-h-full" : ""
                           )}
                             style={{
                                backgroundColor: productBgOpacity > 0 ? hexToRgba(productBgColor, productBgOpacity) : 'transparent',
                                backdropFilter: (productBgOpacity > 0 && blurAmount > 0) ? `blur(${blurAmount}px)` : 'none',
                                border: productBgOpacity > 0 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                              height: layout === 'single' ? '90%' : (productBlockHeight > 0
                                ? (layout === 'featured-side' && (i === 0 || i === 1)
                                    ? `${productBlockHeight * 3 + gridGap * 2}px`
                                    : `${productBlockHeight}px`)
                                : 'auto'),
                              minHeight: layout === 'single' ? '90%' : (productBlockHeight > 0
                                ? (layout === 'featured-side' && (i === 0 || i === 1)
                                    ? `${productBlockHeight * 3 + gridGap * 2}px`
                                    : `${productBlockHeight}px`)
                                : 'auto'),
                               overflow: (layout === 'single' || imageSize > 100) ? 'visible' : 'hidden'
                             }}
                         >
                             <div className="relative w-full flex-1 flex items-center justify-center min-h-0 overflow-visible z-10">
                               <div className="relative flex items-center justify-center w-full h-full overflow-visible" style={{ minHeight: layout === 'single' ? '450px' : '140px' }}>
                                <img 
                                  src={p.image_url} 
                                   crossOrigin="anonymous"
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
                                    height: imageSize > 100 ? 'auto' : '100%',
                                    maxHeight: imageSize > 100 ? 'none' : '100%',
                                    objectFit: 'contain',
                                    transform: `scale(${imageSize / 100}) translate(${imageOffsetX}px, ${imageOffsetY}px)`,
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
 
                           <div 
                             className={cn("space-y-0.5 mt-1 w-full z-[35] price-container")}
                             style={{ transform: columns === 4 ? 'scale(0.92)' : 'none' }}
                           >
                           {!nameOnTop && (
                           <h3 
                             className={cn("font-black uppercase italic leading-tight line-clamp-2 drop-shadow-sm", fontFamily)}
                              style={{ 
                                color: titleColor, 
                                fontSize: `${layout === 'single' ? fontSize * 4.5 : fontSize}px`,
                                 transform: `translate(${nameOffsetX}px, ${nameOffsetY}px)`
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
                                zIndex: 40,
                                 transform: `translate(${priceOffsetX}px, ${priceOffsetY}px)`
                              }}
                            >
                             {p.original_price && (
                               <span className="text-[8px] line-through text-zinc-500 opacity-60">R$ {p.original_price.toFixed(2)}</span>
                             )}
                             
                             {priceLayout === 'traditional' ? (
                               <div 
                                 className="font-black italic flex items-baseline drop-shadow-sm"
                                 style={{ color: priceColor, fontSize: `${layout === 'single' ? priceSize * 4 : priceSize}px` }}
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
                                 style={{ color: priceColor, fontSize: `${layout === 'single' ? priceSize * 4 : priceSize}px` }}
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
                       <ValidityBanner 
                         validityBgColor={validityBgColor}
                         validityTextColor={validityTextColor}
                         validityFontSize={validityFontSize}
                         validityText={validityText}
                       />
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
        </>
      );
    };

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
      },
      {
        name: '🎯 Produto Único Destaque',
        config: {
          layout: 'single', backgroundType: 'gradient', backgroundGradient: 'radial-gradient(circle, #ffffff, #f1f5f9)',
          columns: 1, gridGap: 0, productPadding: 40, showLogo: true, logoPosition: 'center', logoSize: 150,
          titleColor: '#000000', priceColor: '#e11d48', fontSize: 18, priceSize: 40,
          fontFamily: 'font-sans font-black italic', productBgColor: '#ffffff', productBgOpacity: 0,
          productBlockHeight: 0, showPriceBg: false, showShadows: false,
          priceLayout: 'traditional', imageSize: 150, nameOnTop: false, showValidity: true,
          nameOffsetY: -50, priceOffsetY: 50, imageOffsetY: 0, blurAmount: 0
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
              // Downscale large images to max 1200px to keep database payload reasonable
              const maxDim = 1200
              let width = img.width
              let height = img.height
              
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = (height / width) * maxDim
                  width = maxDim
                } else {
                  width = (width / height) * maxDim
                  height = maxDim
                }
              }
              
              canvas.width = width
              canvas.height = height
              ctx.drawImage(img, 0, 0, width, height)
             const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
             const data = imageData.data
             
              // Helper to check if a color is "background-like" (very light/white)
              const isWhite = (r: number, g: number, b: number) => {
                const avg = (r + g + b) / 3
                const diff = Math.max(r, g, b) - Math.min(r, g, b)
                return avg > threshold && diff < 30
              }

               // Create a mask for background pixels using already defined dimensions
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
          .eq('is_template', false)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setSavedFlyers(data || [])

        const { data: tData, error: tError } = await supabase
          .from('flyers')
          .select('*')
          .eq('is_template', true)
          .order('created_at', { ascending: false })
        
        if (!tError) setDbTemplates(tData || [])
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
          nameOffsetY, nameOffsetX, priceOffsetY, priceOffsetX, imageOffsetY, imageOffsetX, blurAmount,
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

        if (error) {
          if (error.message?.includes('row-level security')) {
            toast.error('Erro de permissão! O banco bloqueou o salvamento. Vá em /admin-fix e execute o script de reparo.', {
              duration: 10000,
            })
          } else {
            throw error
          }
         } else {
           toast.success('Encarte salvo com sucesso no banco de dados!')
           
           // Create an alert automatically
           try {
             await supabase.from('store_alerts').insert({
               message: `🚀 NOVO ENCARTE PUBLICADO! Confira as ofertas agora.`,
               type: 'flyer',
               is_active: true,
               target_url: '/offers',
               duration_seconds: 15
             });
             
             // Notify all users via notification bell
             await supabase.rpc('notify_all_users', {
               p_title: '🔥 NOVO ENCARTE DISPONÍVEL!',
               p_message: 'Confira as super ofertas que acabamos de preparar para você.',
               p_type: 'promo'
             });
           } catch (e) {
             console.warn('Alert/Notification creation failed:', e);
           }

           fetchSavedFlyers()
         }
      } catch (error: any) {
        console.error('Error saving flyer:', error)
        toast.error('Erro ao salvar no banco: ' + error.message)
      }
    }

    const saveTemplate = async () => {
      if (!templateName) {
        toast.error('Dê um nome ao modelo')
        return
      }

      const config = {
        layout, backgroundType, backgroundUrl, backgroundColor, backgroundGradient,
        columns, gridGap, showLogo, logoPosition, logoSize, titleColor, priceColor,
        fontSize, priceSize, fontFamily, productBgColor, productBgOpacity,
        productBlockHeight, showPriceBg, priceBgColor, showShadows, removeFlyerBg,
        priceLayout, globalRemoveBg, imageSize, nameOnTop, bgRemovalThreshold, productPadding,
        nameOffsetY, nameOffsetX, priceOffsetY, priceOffsetX, imageOffsetY, imageOffsetX, blurAmount,
        bgRemovalSmoothing, footerText, showFooter, footerFontSize, subtitleText,
        showSubtitle, showValidity, validityText, validityPosition, validityBgColor, validityTextColor
      }

      try {
        setUploading(true)
        const { error } = await supabase.from('flyers').insert({
          title: templateName,
          template_name: templateName,
          is_template: true,
          layout_type: layout,
          primary_color: priceColor,
          config: config,
          products_data: [] // Templates save the style, not necessarily the products
        })

        if (error) throw error

        toast.success(`Modelo "${templateName}" salvo com sucesso!`)
        setTemplateName('')
        fetchSavedFlyers()
        
        // Also save to local storage as fallback
        const newTemplate = {
          id: Math.random().toString(36).substring(7),
          name: templateName,
          timestamp: new Date().toISOString(),
          config: config
        }
        const updated = [newTemplate, ...templates]
        safeSetLocalStorage('flyer_templates', JSON.stringify(updated))
        setTemplates(updated)
      } catch (error: any) {
        console.error('Error saving template:', error)
        toast.error('Erro ao salvar modelo: ' + error.message)
      } finally {
        setUploading(false)
        setTimeout(() => {
          setGenerationProgress(0)
          setGenerationStep('')
        }, 500)
      }
    }

    const applyTemplate = (config: any) => {
      if (config.layout) setLayout(config.layout)
      if (config.backgroundType) setBackgroundType(config.backgroundType)
      if (config.backgroundUrl !== undefined) setBackgroundUrl(ensureAbsoluteUrl(config.backgroundUrl))
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
       if (config.nameOffsetY !== undefined) setNameOffsetY(config.nameOffsetY)
       if (config.priceOffsetY !== undefined) setPriceOffsetY(config.priceOffsetY)
       if (config.priceOffsetX !== undefined) setPriceOffsetX(config.priceOffsetX)
       if (config.nameOffsetX !== undefined) setNameOffsetX(config.nameOffsetX)
       if (config.imageOffsetY !== undefined) setImageOffsetY(config.imageOffsetY)
       if (config.imageOffsetX !== undefined) setImageOffsetX(config.imageOffsetX)
       if (config.blurAmount !== undefined) setBlurAmount(config.blurAmount)
      toast.success('Template aplicado!')
    }

    const deleteTemplate = (idx: number) => {
      const updated = templates.filter((_, i) => i !== idx)
      safeSetLocalStorage('flyer_templates', JSON.stringify(updated))
      setTemplates(updated)
    }

    const deleteDbTemplate = async (id: string) => {
      try {
        const { error } = await supabase.from('flyers').delete().eq('id', id)
        if (error) throw error
        toast.success('Modelo removido')
        fetchSavedFlyers()
      } catch (error: any) {
        toast.error('Erro ao remover modelo')
      }
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
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').limit(500).order('name', { ascending: true }),
        supabase.from('categories').select('*').order('name', { ascending: true })
      ])
      
      setAllProducts(productsRes.data || [])
      setCategories(categoriesRes.data || [])
    }
 
   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (!file) return
 
     if (file.size > 5 * 1024 * 1024) {
       toast.error('Imagem muito grande. O limite é 5MB.')
       return
     }

     setUploading(true)
     setUploadProgress(10)
     try {
       const fileExt = file.name.split('.').pop()
       const fileName = `flyer-bg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
       const bucketName = 'flyer-backgrounds'
       
       setUploadProgress(30)
       const { data, error } = await supabase.storage.from(bucketName).upload(fileName, file)
       
       if (error) throw error
 
        setUploadProgress(80)
         const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName)
         
         // Test if URL is accessible
         const isValid = await validateImageUrl(publicUrl);
         
         if (isValid) {
           setBackgroundUrl(publicUrl)
           setCustomBackgrounds(prev => [...prev, publicUrl])
           setUploadProgress(100)
           toast.success('Fundo carregado com sucesso!')
         } else {
           throw new Error('A imagem foi enviada mas não pôde ser carregada. Verifique as permissões do storage.');
         }
         
         setUploading(false)
         setUploadProgress(0)

     } catch (error: any) {
       console.error('Erro no upload:', error);
       toast.error('Erro no upload: ' + (error.message || 'Erro desconhecido'))
       setUploading(false)
       setUploadProgress(0)
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
      
       let imageUrl = product.image_url || ''
       const newProduct: FlyerProduct = {
         id: product.id,
         name: product.name,
         price: product.price,
         original_price: product.old_price,
         image_url: imageUrl,
         unit: product.unit,
         removeBg: globalRemoveBg


      }

      // Diagnostic CORS check
      if (imageUrl && !imageUrl.startsWith('data:')) {
        const checkImg = new Image();
        checkImg.crossOrigin = "anonymous";
        checkImg.src = imageUrl;
        checkImg.onload = () => logStep(`CORS OK para: ${product.name}`);
        checkImg.onerror = () => {
          logStep(`AVISO CORS: Falha ao carregar com crossOrigin=anonymous para: ${product.name}. Isso pode afetar a geração da imagem de alta fidelidade.`);
          setCorsWarningCount(prev => prev + 1);
        };
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
 
      const logStep = (step: string, data?: any, isBlocker: boolean = false) => {
        const timestamp = new Date().toLocaleTimeString();
        const logMsg = `${step}${data ? ' ' + (typeof data === 'string' ? data : JSON.stringify(data)) : ''}`;
        console.log(`[FlyerGen] [${timestamp}] ${isBlocker ? '!!! ' : ''}${logMsg}`);
        setLogHistory(prev => [...prev.slice(-49), { msg: logMsg, time: timestamp, isBlocker }]);
      };


      const handlePrint = async (shouldSave = true, silentSave = false) => {
      logStep('Iniciando handlePrint', { products: selectedProducts.length, shouldSave });
      
      if (selectedProducts.length === 0) {
        toast.error('Adicione produtos ao encarte primeiro');
        return;
      }

      const flyerElement = document.getElementById('flyer-content');
      if (!flyerElement) {
        logStep('ERRO CRÍTICO: Elemento #flyer-content não encontrado no DOM');
        toast.error('Erro técnico: O elemento do encarte sumiu da página. Tente recarregar.');
        return;
      }


      setIsPreparingPrint(true);
      setGenerationProgress(5);
      setGenerationStep('Iniciando...');
      const loadingToast = toast.loading('Gerando arquivo em alta fidelidade...');

      try {
        // Background save
        if (shouldSave) {
          saveToDatabase().catch(e => console.error('Silent save failed:', e));
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        logStep('Passo 1: Preparando recursos');
        setGenerationStep('Carregando imagens...');
        setGenerationProgress(20);
        const images = Array.from(flyerElement.querySelectorAll('img'));
        logStep(`Encontradas ${images.length} imagens no encarte`);
        
        await Promise.all([
          ...images.map((img, i) => {
            if (img.complete && img.naturalWidth !== 0) {
              logStep(`Imagem ${i+1} já carregada: ${img.src.substring(0, 50)}...`);
              return Promise.resolve();
            }
            return new Promise((resolve) => {
              const timeout = setTimeout(() => {
                logStep(`TIMEOUT: Imagem ${i+1} demorou muito para carregar`);
                resolve(null);
              }, 10000);
              img.onload = () => {
                clearTimeout(timeout);
                logStep(`Imagem ${i+1} carregada com sucesso`);
                resolve(null);
              };
              img.onerror = () => {
                clearTimeout(timeout);
                logStep(`ERRO: Falha ao carregar imagem ${i+1}: ${img.src.substring(0, 50)}...`);
                resolve(null);
              };
            });
          }),

          document.fonts?.ready.then(() => logStep('Fontes carregadas e prontas')) || Promise.resolve()
        ]);

        logStep('Passo 3: Renderizando html2canvas');
        setGenerationStep('Renderizando em alta fidelidade...');
        setGenerationProgress(60);

          const generatePrintCanvas = async (customScale = 2) => {
            logStep(`Iniciando html2canvas interno (Escala: ${customScale})`);
            try {
              return await html2canvas(flyerElement, {
                useCORS: true,
                scale: customScale, 
                backgroundColor: getHtml2CanvasBackground(),
                logging: true,
                imageTimeout: 30000,
                allowTaint: true,
                onclone: (clonedDoc) => {
                  sanitizeClonedDocColors(clonedDoc);
                  logStep('onclone: Ajustando estilos no clone');
                  const clonedFlyer = clonedDoc.getElementById('flyer-content');
                  if (clonedFlyer) {
                    clonedFlyer.style.transform = 'none';
                    clonedFlyer.style.transition = 'none';
                    clonedFlyer.style.animation = 'none';
                    clonedFlyer.style.margin = '0';
                    clonedFlyer.style.position = 'relative';
                    clonedFlyer.style.top = '0';
                    clonedFlyer.style.left = '0';
                    clonedFlyer.style.boxShadow = 'none';
                    clonedFlyer.style.display = 'flex';
                    clonedFlyer.style.flexDirection = 'column';
                    clonedFlyer.style.overflow = 'hidden';
                    clonedFlyer.style.visibility = 'visible';
                    clonedFlyer.style.width = '794px';
                    clonedFlyer.style.height = '1123px';
                    Object.assign(clonedFlyer.style, getFlyerBackgroundStyle());
                    
                    const allElements = clonedFlyer.querySelectorAll('*');
                    allElements.forEach((el: any) => {
                      el.style.setProperty('transition', 'none', 'important');
                      el.style.setProperty('animation', 'none', 'important');
                      el.style.setProperty('animation-duration', '0s', 'important');
                      el.style.setProperty('transition-duration', '0s', 'important');
                      el.style.backdropFilter = 'none';
                      el.style.fontVariantNumeric = 'tabular-nums';
                      el.style.webkitFontSmoothing = 'antialiased';
                      
                      if (el.className && typeof el.className === 'string') {
                        el.className = el.className
                          .replace(/\banimate-\S+/g, '')
                          .replace(/\bduration-\S+/g, '')
                          .replace(/\bfade-in\S*/g, '')
                          .replace(/\bzoom-in\S*/g, '')
                          .replace(/\bslide-in\S*/g, '')
                          .replace(/\bdelay-\S+/g, '');
                      }

                      if (el.classList.contains('price-container')) {
                        el.style.overflow = 'visible';
                        el.style.display = 'block';
                        el.style.minWidth = '100%';
                        el.style.position = 'relative';
                      }
                    });
                  }
                }
              });
            } catch (err) {
              logStep(`Erro no html2canvas (Escala: ${customScale}):`, err);
              throw err;
            }
          };

          const printTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Tempo limite excedido ao preparar impressão')), 30000);
          });

          logStep('Iniciando tentativa 1 (Escala 2)');
          let canvas: HTMLCanvasElement;
          try {
            const printCanvasResult = await Promise.race([
              generatePrintCanvas(2),
              printTimeoutPromise
            ]);
            canvas = printCanvasResult as HTMLCanvasElement;
          } catch (firstTryError) {
            logStep('Tentativa 1 falhou. Reduzindo escala para 1.5...', firstTryError);
            setGenerationStep('Otimizando recursos...');
            const printCanvasResult = await Promise.race([
              generatePrintCanvas(1.5),
              printTimeoutPromise
            ]);
            canvas = printCanvasResult as HTMLCanvasElement;
          }
          
          setGenerationProgress(90);
          setGenerationStep('Preparando impressão...');
          logStep(`Canvas final gerado: ${canvas.width}x${canvas.height}`);
 
          logStep('Convertendo canvas para DataURL (PNG)');
          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL('image/png');
            logStep(`DataURL gerado. Tamanho: ${Math.round(dataUrl.length / 1024)} KB`);
          } catch (exportError: any) {
            logStep('ERRO ao exportar canvas (possível canvas sujo/tainted):', exportError);
            throw new Error('CANVAS_TAINTED');
          }
          
          setGenerationProgress(100);
          setGenerationStep('Concluído!');
          setPrintImage(dataUrl);
          toast.dismiss(loadingToast);
          
          // Trigger print after image is likely rendered in the overlay
          setTimeout(() => {
            window.print();
            // Clear print image after a delay or on return to window
            const clearPrint = () => {
              setPrintImage(null);
              window.removeEventListener('focus', clearPrint);
            };
            window.addEventListener('focus', clearPrint, { once: true });
          }, 1000);

          toast.success('Pronto para imprimir!');
      } catch (error: any) {
        console.error('Error preparing print:', error);
        toast.dismiss(loadingToast);
        
        const isCORS = error.message === 'CANVAS_TAINTED';
        const isTimeout = error.message === 'Tempo limite excedido ao preparar impressão';
        
        toast.error(isCORS ? 'Problema de segurança nas imagens (CORS).' : (isTimeout ? 'O processamento demorou muito.' : 'Erro na geração da imagem.'), {
          description: 'Deseja abrir os logs para diagnosticar?',
          duration: 10000,
          action: {
            label: 'Ver Logs',
            onClick: () => setShowLogViewer(true)
          }
        });

       } finally {
         setIsPreparingPrint(false);
         setTimeout(() => {
           setGenerationProgress(0);
           setGenerationStep('');
         }, 500);
       }
     };
 
    const handleDirectPrint = () => {
      if (selectedProducts.length === 0) {
        toast.error('Adicione produtos ao encarte primeiro');
        return;
      }
      
      // Save history in background (don't await)
      saveToDatabase().catch(e => console.error('Silent save failed:', e));

      setPrintImage(null); // Ensure high-fidelity overlay is NOT shown
      toast.info('Abrindo diálogo de impressão...');
      // Give time for React to update the state and for the browser to prepare
      setTimeout(() => {
        window.print();
      }, 1000);
    };

      const handleGeneratePreview = async () => {
        logStep('Iniciando handleGeneratePreview');
        const flyerElement = document.getElementById('flyer-content');
        if (!flyerElement) {
          logStep('ERRO CRÍTICO: Elemento #flyer-content não encontrado no DOM para prévia');
          toast.error('O elemento do encarte não foi encontrado para gerar a prévia.');
          return;
        }

        
        setIsPreparingPrint(true);
        setGenerationProgress(5);
        setGenerationStep('Iniciando...');
        
        // Delay to allow UI to show the 5% progress
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setGenerationProgress(15);
        setGenerationStep('Preparando ambiente...');

        try {
          logStep('--- DIAGNÓSTICO DE GERAÇÃO ---');
          logStep(`Layout: ${layout}, Colunas: ${columns}`);
          logStep(`Total de Produtos: ${selectedProducts.length}`);

          logStep('Passo 1: Delay de estabilização');
          await new Promise(resolve => setTimeout(resolve, 300));

          logStep('Passo 2: Carregando recursos');
          setGenerationProgress(20);
          setGenerationStep('Carregando imagens e fontes...');

          const images = Array.from(flyerElement.querySelectorAll('img'));
          logStep(`Aguardando ${images.length} imagens e fontes...`);
          
          const loadResources = Promise.all([
            ...images.map((img, idx) => {
              if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
              return new Promise((resolve) => {
                const timer = setTimeout(() => {
                  logStep(`[Preview] Timeout imagem ${idx + 1}: ${img.src.substring(0, 30)}...`);
                  resolve(null);
                }, 3000);
                img.onload = () => { clearTimeout(timer); resolve(null); };
                img.onerror = () => { 
                  logStep(`[Preview] ERRO imagem ${idx + 1}: ${img.src.substring(0, 30)}...`);
                  clearTimeout(timer); 
                  resolve(null); 
                };
              });
            }),
            document.fonts?.ready.then(() => logStep('Fontes prontas para prévia')) || Promise.resolve()
          ]);

          await Promise.race([loadResources, new Promise(resolve => setTimeout(resolve, 8000))]);
          
          setGenerationProgress(40);
          setGenerationStep('Renderizando conteúdo...');
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 20000)
          );

          logStep('Passo 3: Renderizando html2canvas para prévia');
          const canvasPromise = html2canvas(flyerElement, {
            useCORS: true,
            scale: 1.2, 
            backgroundColor: getHtml2CanvasBackground(),
            logging: true,
            allowTaint: true,
            imageTimeout: 10000,
            onclone: (clonedDoc) => {
              sanitizeClonedDocColors(clonedDoc);
              logStep('onclone: Ajustando estilos no clone da prévia');
              const clonedFlyer = clonedDoc.getElementById('flyer-content');
              if (clonedFlyer) {
                clonedFlyer.style.transform = 'none';
                clonedFlyer.style.transition = 'none';
                clonedFlyer.style.animation = 'none';
                clonedFlyer.style.margin = '0';
                clonedFlyer.style.display = 'flex';
                clonedFlyer.style.flexDirection = 'column';
                clonedFlyer.style.width = '794px';
                clonedFlyer.style.height = '1123px';
                Object.assign(clonedFlyer.style, getFlyerBackgroundStyle());

                clonedFlyer.querySelectorAll('*').forEach((el: any) => {
                  el.style.setProperty('transition', 'none', 'important');
                  el.style.setProperty('animation', 'none', 'important');
                  el.style.setProperty('animation-duration', '0s', 'important');
                  el.style.setProperty('transition-duration', '0s', 'important');
                  if (el.className && typeof el.className === 'string') {
                    el.className = el.className
                      .replace(/\banimate-\S+/g, '')
                      .replace(/\bduration-\S+/g, '')
                      .replace(/\bfade-in\S*/g, '')
                      .replace(/\bzoom-in\S*/g, '')
                      .replace(/\bslide-in\S*/g, '')
                      .replace(/\bdelay-\S+/g, '');
                  }
                });
              } else {
                logStep('onclone: ERRO - flyer-content não encontrado no clone da prévia');
              }
            }
          });

          logStep('Aguardando canvas da prévia...');
          let canvas: HTMLCanvasElement;
          try {
            canvas = await Promise.race([canvasPromise, timeoutPromise]) as HTMLCanvasElement;
          } catch (previewErr) {
            logStep('Erro na prévia (escala 1.2). Tentando escala 1...', previewErr);
            const canvasPromiseScale1 = html2canvas(flyerElement, {
              useCORS: true,
              scale: 1, 
              backgroundColor: getHtml2CanvasBackground(),
              allowTaint: true,
              imageTimeout: 10000,
              onclone: (clonedDoc) => {
                sanitizeClonedDocColors(clonedDoc);
                const clonedFlyer = clonedDoc.getElementById('flyer-content');
                if (clonedFlyer) {
                  clonedFlyer.style.width = '794px';
                  clonedFlyer.style.height = '1123px';
                  Object.assign(clonedFlyer.style, getFlyerBackgroundStyle());
                  clonedFlyer.querySelectorAll('*').forEach((el: any) => {
                    el.style.setProperty('animation', 'none', 'important');
                    el.style.setProperty('transition', 'none', 'important');
                  });
                }
              }
            });
            canvas = await Promise.race([canvasPromiseScale1, timeoutPromise]) as HTMLCanvasElement;
          }
          logStep(`Canvas da prévia gerado: ${canvas.width}x${canvas.height}`);
          
          setGenerationProgress(80);
          setGenerationStep('Finalizando imagem...');
          
          logStep('Convertendo canvas da prévia para DataURL');
          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL('image/png');
            logStep(`DataURL da prévia gerado. Tamanho: ${Math.round(dataUrl.length / 1024)} KB`);
          } catch (exportError: any) {
            logStep('ERRO ao exportar canvas da prévia:', exportError);
            throw new Error('CANVAS_TAINTED');
          }
          
          if (!dataUrl || dataUrl === 'data:,') {
            logStep('ERRO: Canvas da prévia gerou uma imagem vazia');
            throw new Error('EMPTY_IMAGE');
          }
          
          setGenerationProgress(100);
          setGenerationStep('Concluído!');
          setPreviewImageUrl(dataUrl);
        } catch (error: any) {
          logStep(`ERRO handleGeneratePreview: ${error.message}`, error);
          logStep(`ERRO handleGeneratePreview: ${error.message}`, error);
          setUseHtmlMode(true);
          toast.error('Erro ao gerar prévia em alta resolução. Ativando Modo HTML automático.', {
            description: 'Você ainda pode visualizar e imprimir o encarte agora.',
            duration: 5000
          });
        } finally {
          setIsPreparingPrint(false);
          setTimeout(() => {
            setGenerationProgress(0);
            setGenerationStep('');
          }, 500);
        }
      };
 
    const handleDownloadImage = async (format: 'png' | 'jpg' = 'jpg') => {
      if (selectedProducts.length === 0) {
        toast.error('Adicione produtos ao encarte primeiro');
        return;
      }

      const element = document.getElementById('flyer-content')
      if (!element) {
        logStep('ERRO CRÍTICO: Elemento #flyer-content não encontrado no DOM para download de imagem');
        toast.error('Erro: O elemento do encarte sumiu da página.')
        return
      }


      logStep(`Iniciando handleDownloadImage (${format.toUpperCase()})`);
      setUploading(true)
      setGenerationProgress(5)
      setGenerationStep('Iniciando...')
      const loadingToast = toast.loading(`Gerando imagem ${format.toUpperCase()}...`)

      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        logStep('Passo 1: Verificando imagens e CORS');
        setGenerationStep('Analisando imagens...')
        setGenerationProgress(15)
        
        const images = Array.from(element.getElementsByTagName('img'));
        let failedImagesCount = 0;
        let corsImagesCount = 0;
        
        // Função auxiliar para converter imagem para base64
        const toBase64 = async (img: HTMLImageElement): Promise<string | null> => {
          if (!img.src || img.src.startsWith('data:')) return img.src;
          
          if (img.src.includes(window.location.hostname)) return img.src;

          try {
            logStep(`Tentando carga direta: ${img.src.substring(0, 40)}...`);
            const response = await fetch(img.src, { 
              mode: 'cors',
              credentials: 'omit',
              cache: 'force-cache'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } catch (e: any) {
            logStep(`Falha direta. Tentando via Servidor (Proxy): ${img.src.substring(0, 40)}...`);
            try {
              const { data, error } = await supabase.functions.invoke('cors-proxy', {
                body: { url: img.src }
              });
              
              if (error || !data) throw new Error(error?.message || 'Erro no proxy');
              
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(data); 
              });
            } catch (proxyErr: any) {
              logStep(`Bloqueio total na imagem: ${img.src.substring(0, 40)}...`, proxyErr.message, true);
              return null;
            }
          }
        };



        logStep(`Processando ${images.length} imagens...`);

        // Carregar todas as imagens primeiro
        await Promise.all([
          ...images.map(async (img, i) => {
            if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
            return new Promise((resolve) => {
              const timer = setTimeout(() => {
                logStep(`Bloqueio: Timeout no carregamento da imagem ${i+1}`, img.src.substring(0, 40), true);
                failedImagesCount++;
                resolve(null);
              }, 10000);
              img.onload = () => { clearTimeout(timer); resolve(null); };
              img.onerror = () => { 
                clearTimeout(timer); 
                logStep(`Bloqueio: Falha crítica na carga da imagem ${i+1}`, img.src.substring(0, 40), true); 
                failedImagesCount++; 
                resolve(null); 
              };

            });
          }),
          document.fonts?.ready || Promise.resolve()
        ]);

        logStep('Passo 2: Convertendo imagens externas para Base64 (Segurança)');
        setGenerationStep('Processando imagens...');
        setGenerationProgress(30)
        
        const base64Map = new Map<string, string>();
        await Promise.all(images.map(async (img) => {
          if (img.src && !img.src.startsWith('data:')) {
            const b64 = await toBase64(img);
            if (b64) {
              base64Map.set(img.src, b64);
            } else {
              corsImagesCount++;
            }
          }
        }));

        if (corsImagesCount > 0) {
          logStep(`Atenção: ${corsImagesCount} imagens podem causar erro de segurança (CORS).`);
        }

        logStep(`Passo 3: Renderizando html2canvas (${format.toUpperCase()})`);
        setGenerationStep('Renderizando imagem A4 de alta fidelidade...')
        setGenerationProgress(60)

        // Adicionar um pequeno delay para garantir que todos os estilos e fontes estejam aplicados
        await new Promise(resolve => setTimeout(resolve, 500));

        const generateImageCanvas = async (customScale = 3) => {
          logStep(`Iniciando html2canvas para imagem (Escala: ${customScale})`);

          try {
            return await html2canvas(element, {
              useCORS: true,
              allowTaint: true, 
              scale: customScale,
              backgroundColor: getHtml2CanvasBackground(format),
              logging: true, 
              imageTimeout: 60000,
              width: 794,
              height: 1123,
              onclone: (clonedDoc) => {
                logStep('onclone: Aplicando fidelidade de impressão e removendo incompatibilidades');
                
                // Sanitização completa de cores modernas para evitar erro oklch()
                sanitizeClonedDocColors(clonedDoc);

                const clonedElement = clonedDoc.getElementById('flyer-content');

                if (clonedElement) {
                  // Forçar proporções A4 perfeitas
                  clonedElement.style.width = '794px';
                  clonedElement.style.height = '1123px';
                  clonedElement.style.transform = 'none';
                  clonedElement.style.transition = 'none';
                  clonedElement.style.animation = 'none';
                  clonedElement.style.margin = '0';
                  clonedElement.style.padding = '0';
                  clonedElement.style.boxShadow = 'none';
                  clonedElement.style.border = 'none'; 
                  clonedElement.style.display = 'flex';
                  clonedElement.style.flexDirection = 'column';
                  clonedElement.style.visibility = 'visible';
                  clonedElement.style.position = 'relative';
                  clonedElement.style.left = '0';
                  clonedElement.style.top = '0';
                  Object.assign(clonedElement.style, getFlyerBackgroundStyle());

                  const allElements = clonedElement.querySelectorAll('*');
                  
                  allElements.forEach((el: any) => {
                    // Remover animações e filtros que causam lentidão ou travamentos
                    el.style.setProperty('transition', 'none', 'important');
                    el.style.setProperty('animation', 'none', 'important');
                    el.style.setProperty('animation-duration', '0s', 'important');
                    el.style.setProperty('transition-duration', '0s', 'important');
                    el.style.backdropFilter = 'none';
                    el.style.filter = 'none'; 
                    el.style.mixBlendMode = 'normal'; 
                    el.style.fontVariantNumeric = 'tabular-nums';

                    // Garantir que as imagens usem CORS
                    if (el.tagName === 'IMG') {
                      el.crossOrigin = 'anonymous';
                      const originalSrc = el.getAttribute('src');
                      if (originalSrc && base64Map.has(originalSrc)) {
                        el.src = base64Map.get(originalSrc);
                      }
                    }

                    // Limpar classes de animação do Tailwind
                    if (el.className && typeof el.className === 'string') {
                      el.className = el.className
                        .replace(/\banimate-\S+/g, '')
                        .replace(/\bduration-\S+/g, '')
                        .replace(/\bfade-in\S*/g, '')
                        .replace(/\bzoom-in\S*/g, '')
                        .replace(/\bslide-in\S*/g, '')
                        .replace(/\bdelay-\S+/g, '');
                    }
                  });
                }
              }
            });
          } catch (error) {
            logStep(`Erro no html2canvas (escala ${customScale}):`, error);
            throw error;
          }
        };

        let canvas: HTMLCanvasElement;
        try {
          // Usar escala 3 por padrão para qualidade profissional (similar à impressão)
          canvas = await generateImageCanvas(3);
        } catch (firstErr) {
          logStep('Falha na escala 3, tentando escala 1.5...', firstErr);
          canvas = await generateImageCanvas(1.5);
        }


        logStep('Passo 4: Finalizando arquivo de imagem');
        setGenerationStep('Gerando download...');
        setGenerationProgress(90)



        logStep('Passo 3: Finalizando arquivo de imagem');
        setGenerationProgress(90)
        setGenerationStep('Finalizando arquivo...')
        
        const fileName = `encarte-${new Date().toISOString().split('T')[0]}`
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
        const quality = format === 'jpg' ? 0.95 : undefined
        
        logStep('Convertendo canvas para blob para download seguro');
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), mimeType, quality);
        });

        if (!blob) {
          throw new Error('EMPTY_IMAGE');
        }

        
        setGenerationProgress(100)
        setGenerationStep('Pronto!')
        
        const url = URL.createObjectURL(blob);
        const link = document.body.appendChild(document.createElement('a'));
        link.href = url
        link.download = `${fileName}.${format}`
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url);

        
        toast.dismiss(loadingToast)
        toast.success(`${format.toUpperCase()} baixado com sucesso!`)
      } catch (err: any) {
        console.error('Error in handleDownloadImage:', err)
        toast.dismiss(loadingToast)
        
        let errorMessage = 'Falha técnica ao gerar arquivo.';
        let description = 'O navegador encontrou um erro ao processar os elementos gráficos.';
        
        if (err.name === 'SecurityError' || err.message?.includes('tainted') || err.message?.includes('SecurityError')) {
          errorMessage = 'Bloqueio de Segurança (CORS)';
          description = 'Imagens externas impediram a criação do arquivo. Tente remover imagens de outros sites ou use a Impressão Direta.';
        } else if (err.message === 'EMPTY_IMAGE') {
          description = 'O arquivo gerado ficou vazio. Tente com menos produtos.';
        } else if (err.name === 'QuotaExceededError' || err.message?.includes('Large') || err.message?.includes('memory')) {
          description = 'Encarte muito complexo para seu aparelho. Tente reduzir o número de produtos.';
        } else if (err.message) {
          description = `Erro: ${err.message.substring(0, 100)}`;
        }
        
        toast.error(errorMessage, { 
          description,
          duration: 15000 
        });

        logStep(`BLOQUEIO FINAL: ${errorMessage}`, description, true);
        if (err.stack) logStep(`Stack: ${err.stack.substring(0, 200)}`);







      } finally {
        setUploading(false)
        setTimeout(() => {
          setGenerationProgress(0)
          setGenerationStep('')
        }, 500)
      }
    }


    const handleDownloadPDF = async () => {
      const element = document.getElementById('flyer-content')
      if (!element) {
        logStep('ERRO CRÍTICO: Elemento #flyer-content não encontrado no DOM para PDF');
        toast.error('O elemento do encarte não foi encontrado para gerar o PDF.')
        return
      }


      logStep('Iniciando handleDownloadPDF');
      setUploading(true)
      setGenerationProgress(5)
      setGenerationStep('Iniciando...')
      const loadingToast = toast.loading('Gerando PDF de alta qualidade...')

      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        logStep('Passo 1: Carregando recursos para PDF');
        setGenerationStep('Carregando recursos...')
        setGenerationProgress(20)
        const images = Array.from(element.getElementsByTagName('img'));
        await Promise.all([
          ...images.map((img, i) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = () => { logStep(`Imagem PDF ${i+1} OK`); resolve(null); };
              img.onerror = () => { logStep(`Imagem PDF ${i+1} FALHOU`); resolve(null); };
            });
          }),
          document.fonts?.ready.then(() => logStep('Fontes PDF OK')) || Promise.resolve()
        ]);

        logStep('Passo 2: Renderizando html2canvas para PDF');
        setGenerationStep('Renderizando páginas...')
        setGenerationProgress(60)

        const originalTransform = element.style.transform
        const originalTransition = element.style.transition
        element.style.transform = 'none'
        element.style.transition = 'none'

        const generatePDFCanvas = async (customScale = 2) => {
          logStep(`Iniciando html2canvas para PDF (Escala: ${customScale})`);
          return await html2canvas(element, {
            useCORS: true,
            allowTaint: true,
            scale: customScale,
            backgroundColor: getHtml2CanvasBackground(),
            imageTimeout: 30000,
            onclone: (clonedDoc) => {
              sanitizeClonedDocColors(clonedDoc);
              const clonedElement = clonedDoc.getElementById('flyer-content');
              if (clonedElement) {
                clonedElement.style.transform = 'none';
                clonedElement.style.transition = 'none';
                clonedElement.style.animation = 'none';
                clonedElement.style.margin = '0';
                clonedElement.style.boxShadow = 'none';
                clonedElement.style.display = 'flex';
                clonedElement.style.flexDirection = 'column';
                clonedElement.style.visibility = 'visible';
                clonedElement.style.width = '794px';
                clonedElement.style.height = '1123px';
                Object.assign(clonedElement.style, getFlyerBackgroundStyle());

                const allElements = clonedElement.querySelectorAll('*');
                allElements.forEach((el: any) => {
                  el.style.setProperty('transition', 'none', 'important');
                  el.style.setProperty('animation', 'none', 'important');
                  el.style.setProperty('animation-duration', '0s', 'important');
                  el.style.setProperty('transition-duration', '0s', 'important');
                  el.style.backdropFilter = 'none';
                  el.style.fontVariantNumeric = 'tabular-nums';
                  if (el.className && typeof el.className === 'string') {
                    el.className = el.className
                      .replace(/\banimate-\S+/g, '')
                      .replace(/\bduration-\S+/g, '')
                      .replace(/\bfade-in\S*/g, '')
                      .replace(/\bzoom-in\S*/g, '')
                      .replace(/\bslide-in\S*/g, '')
                      .replace(/\bdelay-\S+/g, '');
                  }
                  if (el.classList.contains('price-container')) {
                    el.style.overflow = 'visible';
                    el.style.display = 'block';
                  }
                });
              }
            }
          });
        };

        let canvas: HTMLCanvasElement;
        try {
          canvas = await generatePDFCanvas(2);
        } catch (firstErr) {
          logStep('Erro PDF (escala 2). Tentando escala 1.2...', firstErr);
          setGenerationStep('Otimizando PDF (1/2)...');
          try {
            canvas = await generatePDFCanvas(1.2);
          } catch (secondErr) {
            logStep('Erro PDF (escala 1.2). Tentando escala básica (1.0)...', secondErr);
            setGenerationStep('Otimizando PDF (Final)...');
            canvas = await generatePDFCanvas(1.0);
          }
        }

        element.style.transform = originalTransform
        element.style.transition = originalTransition

        logStep('Passo 3: Gerando documento PDF');
        setGenerationProgress(80)
        setGenerationStep('Gerando documento PDF...')
        let imgData = ''
        try {
          // Try JPEG first for PDF as it's much smaller and less likely to crash memory
          imgData = canvas.toDataURL('image/jpeg', 0.9);
          logStep(`PDF DataURL (JPEG) gerado. Tamanho: ${Math.round(imgData.length / 1024)} KB`);
        } catch (exportError: any) {
          logStep('ERRO ao exportar JPEG para PDF, tentando PNG:', exportError);
          try {
            imgData = canvas.toDataURL('image/png');
            logStep(`PDF DataURL (PNG) gerado. Tamanho: ${Math.round(imgData.length / 1024)} KB`);
          } catch (pngError: any) {
            logStep('ERRO crítico ao exportar imagem:', pngError);
            throw new Error('CANVAS_TAINTED');
          }
        }
        
        setGenerationProgress(90)
        setGenerationStep('Montando documento...')
        
        try {
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          })

          const pdfWidth = 210
          const pdfHeight = 297

          pdf.addImage(imgData, imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
          setGenerationProgress(100)
          setGenerationStep('Finalizando download...')
          pdf.save(`encarte-${new Date().toISOString().split('T')[0]}.pdf`)
        } catch (pdfErr: any) {
          logStep('ERRO ao gerar arquivo PDF final:', pdfErr);
          throw new Error('PDF_GENERATION_FAILED');
        }

        toast.dismiss(loadingToast)
        toast.success('PDF baixado com sucesso!')
      } catch (err: any) {
        console.error('Error generating PDF:', err)
        toast.dismiss(loadingToast)
        const isCORS = err.message === 'CANVAS_TAINTED';
        
        const isPDFError = err.message === 'PDF_GENERATION_FAILED';
        
        toast.error(isCORS ? 'Problema de segurança nas imagens (CORS).' : (isPDFError ? 'Erro crítico ao montar o arquivo PDF.' : 'Erro ao gerar PDF.'), {
          description: 'Deseja tentar a Impressão Direta (Modo HTML)?',
          duration: 10000,
          action: {
            label: 'Imprimir Direto',
            onClick: () => handleDirectPrint()
          }
        });
      } finally {
        setUploading(false)
      }
    }

    const handleShareWhatsApp = async () => {
      if (selectedProducts.length === 0) {
        toast.error('Adicione produtos ao encarte primeiro')
        return
      }

      await saveToDatabase()

      let message = `🚀 *${(storeSettings?.site_name || 'RS SUPERMERCADO').toUpperCase()}* 🚀\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`
      
      if (validityText) {
        message += `📅 *VALIDADE:* _${validityText}_\n\n`
      }

      selectedProducts.forEach((p, index) => {
        message += `${index % 2 === 0 ? '🔸' : '🔹'} *${p.name.toUpperCase()}*\n`
        message += `💰 *APENAS R$ ${p.price.toFixed(2).replace('.', ',')}* ${p.unit ? `(${p.unit})` : ''}\n`
        if (p.original_price && p.original_price > p.price) {
          message += `<s>❌ De: R$ ${p.original_price.toFixed(2).replace('.', ',')}</s>\n`
        }
        message += `\n`
      })

      message += `━━━━━━━━━━━━━━━━━━━━\n`
      message += `🛒 *PEÇA PELO SITE:* ${window.location.origin}\n`
      if (storeSettings?.address) {
        message += `📍 *LOJA:* ${storeSettings.address}\n`
      }
      message += `\n*Aproveite antes que acabe!* ⚡`

      // Use correct WhatsApp formatting for strikethrough (~) and bold (*)
      // Note: <s> is just a placeholder for me to remember to use ~ in the final string if needed
      // Actually, for WhatsApp it's ~text~
      const finalMessage = message.replace(/<s>/g, '~').replace(/<\/s>/g, '~');

      const encoded = encodeURIComponent(finalMessage)
      window.open(`https://wa.me/?text=${encoded}`, '_blank')
      toast.success('Compartilhando no WhatsApp...')
    }

   const hexToRgba = (hex: string, opacity: number) => {
     const r = parseInt(hex.slice(1, 3), 16)
     const g = parseInt(hex.slice(3, 5), 16)
     const b = parseInt(hex.slice(5, 7), 16)
     return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
   }
 

    return (
      <>
    {/* Progress Overlay - reduced prominence as per user request */}
    {(isPreparingPrint || uploading) && (
     <div className="fixed bottom-8 right-8 z-[100000] w-72 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-primary/20 overflow-hidden">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black uppercase italic tracking-tighter text-sm truncate">Processando...</h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate">{generationStep}</p>
            </div>
            <div className="text-[10px] font-black text-primary">{generationProgress}%</div>
          </div>
          <Progress value={generationProgress} className="h-1.5" />
        </CardContent>
      </Card>
    </div>
  )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative items-start">
       {/* Controls Sidebar */}
        <div className="lg:col-span-4 space-y-6 print:hidden lg:sticky lg:top-8 pb-20 max-h-[calc(100vh-2rem)] min-h-[600px] overflow-y-auto no-scrollbar">
         <Card className="rounded-[24px] border-2 border-zinc-100 shadow-xl">
           <CardHeader className="bg-zinc-50 border-b border-zinc-100">
             <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2 font-black uppercase italic tracking-tighter text-lg">
                    <Settings2 className="w-5 h-5 text-primary" /> Gerador de Encartes A4
                  </CardTitle>
                  <button 
                    onClick={() => setShowLogViewer(true)}

                    className="text-[8px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors text-left"
                  >
                    Ver Log de Sistema
                  </button>
                </div>
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
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
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
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                          {dbTemplates.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase text-zinc-400 px-1">Modelos no Banco de Dados</p>
                              <div className="grid grid-cols-1 gap-2">
                                {dbTemplates.map((t) => (
                                  <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-zinc-100 group shadow-sm hover:border-primary/30 transition-all">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm">{t.template_name || t.title}</span>
                                      <span className="text-[8px] text-zinc-400 flex items-center">
                                        <Clock className="w-2 h-2 mr-1" /> {new Date(t.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={() => applyTemplate(t.config)}>Aplicar</Button>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 p-0" onClick={() => deleteDbTemplate(t.id)}><Trash2 className="w-3 h-3" /></Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-zinc-400 px-1">Modelos Locais (Neste Navegador)</p>
                            {templates.length === 0 && dbTemplates.length === 0 ? (
                              <p className="text-center py-8 text-zinc-400 text-xs">Nenhum modelo salvo</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-2">
                                {templates.map((t, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 group">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm">{t.name}</span>
                                      {t.timestamp && (
                                        <span className="text-[8px] text-zinc-400 flex items-center">
                                          <Clock className="w-2 h-2 mr-1" /> {new Date(t.timestamp).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => applyTemplate(t.config)}>Aplicar</Button>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 text-red-500 p-0" onClick={() => deleteTemplate(idx)}><Trash2 className="w-3 h-3" /></Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
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
               {/* Scale Control */}
               <div className="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                 <div className="flex justify-between items-center">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Zoom do Encarte ({Math.round(flyerScale * 100)}%)</Label>
                   <Button variant="ghost" size="sm" className="h-6 text-[8px]" onClick={() => setFlyerScale(0.7)}>RESET</Button>
                 </div>
                 <Slider value={[flyerScale * 100]} min={20} max={150} step={1} onValueChange={([val]) => setFlyerScale(val / 100)} />
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
                      {customBackgrounds.map((bg, idx) => (
                        <div key={`user-${idx}`} className="relative group">
                          <button
                            className={cn(
                              "w-full relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all",
                              backgroundUrl === bg ? "border-primary scale-95 shadow-lg" : "border-transparent hover:border-zinc-300"
                            )}
                            onClick={() => setBackgroundUrl(bg)}
                          >
                            <img 
                              src={bg} 
                              className="w-full h-full object-cover" 
                              alt={`User BG ${idx}`}
                              crossOrigin="anonymous"
                              onError={(e) => {

                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=Erro+Imagem';
                              }}
                            />
                            {backgroundUrl === bg && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <CheckSquare className="w-6 h-6 text-primary" />
                              </div>
                            )}
                          </button>
                          <button 
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-100 transition-opacity shadow-lg z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomBackgrounds(prev => prev.filter(u => u !== bg));
                              if (backgroundUrl === bg) setBackgroundUrl('');
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      
                      {/* Only show defaults if user has few or no custom backgrounds */}
                      {(customBackgrounds.length < 4) && PREDEFINED_BGS.map((bg, idx) => (
                        <button
                          key={`default-${idx}`}
                          className={cn(
                            "relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all opacity-40 hover:opacity-100",
                            backgroundUrl === bg ? "border-primary scale-95 shadow-lg opacity-100" : "border-transparent hover:border-zinc-300"
                          )}
                          onClick={() => setBackgroundUrl(bg)}
                        >
                          <img src={bg} className="w-full h-full object-cover grayscale-[50%] hover:grayscale-0" alt={`Default BG ${idx}`} crossOrigin="anonymous" />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <Input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="bg-upload" />
                        <label htmlFor="bg-upload" className="flex items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors bg-zinc-50/50">
                          <div className="flex flex-col items-center w-full">
                            {uploading ? (
                              <div className="w-full space-y-2 flex flex-col items-center">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                <Progress value={uploadProgress} className="h-1 w-full max-w-[150px]" />
                                <span className="text-[10px] font-bold uppercase text-zinc-600">Enviando {uploadProgress}%</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 mb-1 text-zinc-400" />
                                <span className="text-[10px] font-bold uppercase text-zinc-600">Adicionar Novo Fundo à Galeria</span>
                              </>
                            )}
                          </div>
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
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[8px] font-bold uppercase text-zinc-400">Cor Inicial</Label>
                          <div className="flex gap-1">
                            <Input type="color" value={gradientStart} onChange={(e) => setGradientStart(e.target.value)} className="w-8 h-8 p-0 border-none rounded-lg" />
                            <Input value={gradientStart} onChange={(e) => setGradientStart(e.target.value)} className="h-8 text-[10px]" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] font-bold uppercase text-zinc-400">Cor Final</Label>
                          <div className="flex gap-1">
                            <Input type="color" value={gradientEnd} onChange={(e) => setGradientEnd(e.target.value)} className="w-8 h-8 p-0 border-none rounded-lg" />
                            <Input value={gradientEnd} onChange={(e) => setGradientEnd(e.target.value)} className="h-8 text-[10px]" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold uppercase text-zinc-400">Direção do Degradê</Label>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { id: 'to bottom', label: '↓' },
                            { id: 'to top', label: '↑' },
                            { id: 'to right', label: '→' },
                            { id: 'to bottom right', label: '↘' },
                          ].map(dir => (
                            <Button
                              key={dir.id}
                              variant={gradientDirection === dir.id ? 'default' : 'outline'}
                              className="h-7 text-xs font-bold"
                              onClick={() => setGradientDirection(dir.id)}
                            >
                              {dir.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold uppercase text-zinc-400">Código CSS (Manual)</Label>
                        <Input 
                          value={backgroundGradient} 
                          onChange={(e) => setBackgroundGradient(e.target.value)} 
                          className="h-8 text-[9px] font-mono bg-zinc-50" 
                        />
                      </div>
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
                         <SelectItem value="font-montserrat">Montserrat</SelectItem>
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

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase">Nível de Desfoque ({blurAmount}px)</Label>
                      <Slider value={[blurAmount]} min={0} max={10} step={1} onValueChange={([val]) => setBlurAmount(val)} />
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
                      <Slider value={[imageSize]} min={50} max={400} step={1} onValueChange={([val]) => setImageSize(val)} />
                    </div>

                    {layout === 'single' && (
                      <div className="space-y-4 p-3 bg-primary/5 rounded-xl border border-primary/10 animate-in zoom-in-95 duration-300">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Ajuste de Posição (Modelo Único)</Label>
                        <div className="space-y-3">
                          <div className="space-y-1">
                             <div className="grid grid-cols-2 gap-2 text-[8px] font-bold uppercase">
                               <div className="space-y-1">
                                 <span>Subir/Descer Nome ({nameOffsetY}px)</span>
                                 <Slider value={[nameOffsetY]} min={-500} max={500} step={2} onValueChange={([val]) => setNameOffsetY(val)} />
                               </div>
                               <div className="space-y-1">
                                 <span>Esq/Dir Nome ({nameOffsetX}px)</span>
                                 <Slider value={[nameOffsetX]} min={-300} max={300} step={2} onValueChange={([val]) => setNameOffsetX(val)} />
                               </div>
                             </div>
                          </div>
                           <div className="grid grid-cols-2 gap-2 text-[8px] font-bold uppercase">
                             <div className="space-y-1">
                               <span>Subir/Descer Preço ({priceOffsetY}px)</span>
                               <Slider value={[priceOffsetY]} min={-500} max={500} step={2} onValueChange={([val]) => setPriceOffsetY(val)} />
                             </div>
                             <div className="space-y-1">
                               <span>Esq/Dir Preço ({priceOffsetX}px)</span>
                               <Slider value={[priceOffsetX]} min={-300} max={300} step={2} onValueChange={([val]) => setPriceOffsetX(val)} />
                             </div>
                           </div>
                           <div className="grid grid-cols-2 gap-2 text-[8px] font-bold uppercase">
                             <div className="space-y-1">
                               <span>Subir/Descer Foto ({imageOffsetY}px)</span>
                               <Slider value={[imageOffsetY]} min={-500} max={500} step={2} onValueChange={([val]) => setImageOffsetY(val)} />
                             </div>
                             <div className="space-y-1">
                               <span>Esq/Dir Foto ({imageOffsetX}px)</span>
                               <Slider value={[imageOffsetX]} min={-300} max={300} step={2} onValueChange={([val]) => setImageOffsetX(val)} />
                             </div>
                           </div>
                        </div>
                      </div>
                    )}

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
                    <DialogContent className="max-w-[98vw] w-full md:max-w-6xl overflow-hidden flex flex-col h-[95vh] md:h-[90vh] p-0 gap-0 bg-white shadow-2xl border-none ring-0">
                       <DialogHeader className="p-4 md:p-6 pb-2 space-y-4 shrink-0 border-b bg-zinc-50/80 text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                              <span>Selecionar Produtos</span>
                              <span className="text-xs font-medium text-zinc-500 bg-zinc-200/50 px-2.5 py-0.5 rounded-full">
                                {filteredProducts.length} encontrados
                              </span>
                            </DialogTitle>
                           
                           <div className="flex items-center gap-2 w-full sm:w-auto">
                             <div className="relative flex-1 sm:w-80 min-w-[200px]">
                               <Input 
                                 placeholder="Buscar produto..." 
                                 value={productSearchTerm}
                                 onChange={(e) => setProductSearchTerm(e.target.value)}
                                 className="h-8 text-xs pr-8"
                               />
                               {productSearchTerm && (
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="absolute right-0 top-0 h-8 w-8 text-zinc-400 hover:text-zinc-600"
                                   onClick={() => setProductSearchTerm('')}
                                 >
                                   <X className="w-3 h-3" />
                                 </Button>
                               )}
                             </div>
                             <Button 
                               variant="outline" 
                               size="icon" 
                               className="h-8 w-8 shrink-0 border-2"
                               onClick={() => setBarcodeScannerOpen(true)}
                             >
                               <Camera className="w-4 h-4" />
                             </Button>
                           </div>
                         </div>
                         
                          <div className="w-full shrink-0 mt-3 border-t border-zinc-100 pt-3">
                            <div className="flex flex-wrap items-center gap-2 px-1 max-w-full overflow-visible">
                              <Button 
                                variant={onlyOffers ? "default" : "outline"} 
                                size="sm" 
                                className={cn(
                                  "h-8 text-[10px] whitespace-nowrap px-4 rounded-full flex items-center gap-1.5 transition-all shadow-sm",
                                  onlyOffers ? "bg-red-600 hover:bg-red-700 text-white border-red-600 scale-105" : "text-red-600 border-red-200 hover:bg-red-50"
                                )}
                                onClick={() => setOnlyOffers(!onlyOffers)}
                              >
                                Ofertas
                              </Button>
                              <Button 
                                variant={onlyInStock ? "default" : "outline"} 
                                size="sm" 
                                className={cn(
                                  "h-8 text-[10px] whitespace-nowrap px-4 rounded-full flex items-center gap-1.5 transition-all shadow-sm",
                                  onlyInStock ? "bg-green-600 hover:bg-green-700 text-white border-green-600 scale-105" : "text-green-600 border-green-200 hover:bg-green-50"
                                )}
                                onClick={() => setOnlyInStock(!onlyInStock)}
                              >
                                Em Estoque
                              </Button>
                              <div className="w-px h-5 bg-zinc-300 mx-1 shrink-0" />
                              <Button 
                                variant={selectedCategory === null ? "default" : "outline"} 
                                size="sm" 
                                className="h-8 text-[10px] whitespace-nowrap px-4 rounded-full shadow-sm"
                                onClick={() => setSelectedCategory(null)}
                              >
                                Todos
                              </Button>
                              {categories.map((cat) => (
                                <Button 
                                  key={cat.id}
                                  variant={selectedCategory === cat.id ? "default" : "outline"} 
                                  size="sm" 
                                  className="h-8 text-[10px] whitespace-nowrap px-4 rounded-full shadow-sm"
                                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                                 >
                                  {cat.name}
                                </Button>
                              ))}
                              {(productSearchTerm || selectedCategory !== null || onlyOffers || onlyInStock) && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-[10px] px-3 rounded-full text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 flex items-center gap-1.5"
                                  onClick={() => {
                                    setProductSearchTerm('');
                                    setSelectedCategory(null);
                                    setOnlyOffers(false);
                                    setOnlyInStock(false);
                                  }}
                                >
                                  <X className="w-3.5 h-3.5" /> Limpar Filtros
                                </Button>
                              )}
                            </div>
                          </div>
                        </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50/30 scrollbar-thin">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map(p => (
                              <div key={p.id} className="border rounded-xl p-3 text-center space-y-2 hover:bg-zinc-50 cursor-pointer transition-colors group relative" onClick={() => addProductToFlyer(p)}>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-primary text-white p-1 rounded-full"><Plus className="w-3 h-3" /></div>
                                </div>
                                <img src={p.image_url} className="w-16 h-16 object-contain mx-auto" />
                                <p className="text-[10px] font-bold line-clamp-2 leading-tight h-8">{p.name}</p>
                                <p className="text-xs font-black text-primary">R$ {p.price.toFixed(2)}</p>
                                <Button size="sm" variant="ghost" className="w-full text-[9px] uppercase font-black">Selecionar</Button>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full py-12 text-center text-zinc-400">
                              <p className="text-sm">Nenhum produto encontrado</p>
                            </div>
                          )}
                        </div>
                      </div>
                   </DialogContent>
                 </Dialog>
               </div>
 
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
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
 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Button 
                        className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg bg-primary hover:bg-primary/90 text-white" 
                        onClick={saveToDatabase}
                        disabled={uploading}
                      >
                        <Save className="w-4 h-4 mr-2" /> Salvar no Banco
                      </Button>
                      <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg bg-green-600 hover:bg-green-700 text-white" onClick={handleShareWhatsApp}>
                        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm border-zinc-200" 
                        onClick={() => setShowLogViewer(true)}
                      >
                        <Clock className="w-4 h-4 mr-2" /> Ver Histórico de Logs
                      </Button>

                      <div className="col-span-2 mt-2">
                        <Button 
                          className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-sm shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white" 
                          onClick={() => handleDownloadImage('jpg')}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-5 h-5 mr-2" />
                          )}
                          Baixar Encarte (Alta Fidelidade)
                        </Button>
                        <p className="text-[9px] text-center mt-1 text-zinc-400 font-bold uppercase tracking-tighter">
                          Gera imagem com fidelidade de impressão (PDF para JPG)
                        </p>
                      </div>

                      <Button 
                        className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl bg-zinc-900 hover:bg-black text-white col-span-2 mt-2" 
                        onClick={handleDirectPrint}
                        disabled={isPreparingPrint}
                      >

                        {isPreparingPrint ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="w-5 h-5 mr-2" />
                        )}
                        Imprimir Encarte (A4)
                      </Button>

                      <Button 
                        className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl bg-purple-600 hover:bg-purple-700 text-white col-span-2 mt-2" 
                        onClick={async () => {
                          const config = {
                            layout, backgroundType, backgroundUrl, backgroundColor, backgroundGradient,
                            columns, gridGap, showLogo, logoPosition, logoSize, titleColor, priceColor,
                            fontSize, priceSize, fontFamily, productBgColor, productBgOpacity,
                            productBlockHeight, showPriceBg, priceBgColor, showShadows, removeFlyerBg,
                            priceLayout, globalRemoveBg, imageSize, nameOnTop, bgRemovalThreshold, productPadding,
                            nameOffsetY, nameOffsetX, priceOffsetY, priceOffsetX, imageOffsetY, imageOffsetX, blurAmount,
                            bgRemovalSmoothing, footerText, showFooter, footerFontSize, subtitleText,
                            showSubtitle, showValidity, validityText, validityPosition, validityBgColor, validityTextColor
                          }

                          // If we don't have a saved flyer, we should try to save it first to get an ID
                          // or at least prepare a temporary object
                          setSelectedFlyerForStory({
                            title: `Encarte ${new Date().toLocaleDateString('pt-BR')}`,
                            products_data: selectedProducts,
                            config: config
                          })
                          setIsStoryGenOpen(true)
                        }}
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Gerar Stories para Instagram
                      </Button>
                    </div>


             </CardContent>
          </Card>

          {/* Lista por Data (Histórico) */}
          <Card className="rounded-[24px] border-2 border-zinc-100 shadow-xl overflow-hidden print:hidden">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100">
              <CardTitle className="flex items-center gap-2 font-black uppercase italic tracking-tighter text-lg">
                <History className="w-5 h-5 text-primary" /> Histórico por Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-50 no-scrollbar">
                {loadingSaved ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : savedFlyers.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-xs font-bold uppercase">Nenhum encarte salvo</div>
                ) : (
                  savedFlyers.map((f) => (
                    <div key={f.id} className="p-4 hover:bg-zinc-50 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-black uppercase italic text-xs tracking-tight">{f.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-zinc-400" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">
                              {new Date(f.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            <Clock className="w-3 h-3 text-zinc-400 ml-1" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">
                              {new Date(f.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-primary" 
                            title="Abrir"
                            onClick={() => {
                              if (f.config) applyTemplate(f.config)
                              if (f.products_data) setSelectedProducts(f.products_data)
                              toast.success('Encarte carregado!')
                            }}
                          >
                            <FolderOpen className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-purple-600" 
                            title="Gerar Stories"
                            onClick={() => {
                              setSelectedFlyerForStory(f)
                              setIsStoryGenOpen(true)
                            }}
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                          <Button 

                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-green-600" 
                            title="WhatsApp"
                             onClick={() => {
                               if (f.products_data) {
                                 const storeName = storeSettings?.site_name || 'RS SUPERMERCADO';
                                 let msg = `🚀 *OFERTAS - ${storeName.toUpperCase()}* 🚀\n`;
                                 msg += `📅 *DATA:* ${new Date(f.created_at).toLocaleDateString('pt-BR')}\n`;
                                 msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
                                 
                                 f.products_data.forEach((p: any) => {
                                   msg += `✅ *${p.name.toUpperCase()}*\n`;
                                   msg += `💰 *R$ ${p.price.toFixed(2).replace('.', ',')}* ${p.unit ? `(${p.unit})` : ''}\n\n`;
                                 });
                                 
                                 msg += `━━━━━━━━━━━━━━━━━━━━\n`;
                                 msg += `🛒 *PEÇA AQUI:* ${window.location.origin}`;
                                 
                                 window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                               }
                             }}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-1 overflow-hidden h-8">
                        {f.products_data?.slice(0, 5).map((p: any, i: number) => (
                          <img key={i} src={p.image_url} className="h-full w-8 object-contain bg-white rounded border border-zinc-100" />
                        ))}
                        {f.products_data?.length > 5 && (
                          <div className="h-full aspect-square bg-zinc-100 rounded flex items-center justify-center text-[8px] font-black text-zinc-400">
                            +{f.products_data.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
 
         {/* Preview Area */}
          <div className="lg:col-span-8 flex flex-col items-center bg-zinc-200/50 p-4 md:p-6 rounded-[32px] min-h-screen print:relative print:top-0 print:p-0 print:bg-white print:rounded-none transition-all duration-500 no-scrollbar">

            {/* Botões de Ação Rápida no Topo da Prévia */}
            <div className="w-full max-w-[794px] mb-6 flex flex-wrap items-center gap-3 justify-center bg-white/90 backdrop-blur-md p-4 rounded-3xl border-2 border-primary/10 shadow-xl sticky top-4 z-30 print:hidden transition-all hover:border-primary/30">
              <div className="hidden sm:flex flex-col mr-auto">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Opções de Exportação</span>
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">Baixe em tamanho real A4</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button 
                  size="sm" 
                  className="h-10 px-6 rounded-2xl font-black uppercase text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl transition-all active:scale-95" 
                  onClick={() => handleDownloadImage('jpg')}
                  disabled={uploading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Encarte (Alta Fidelidade)
                </Button>

                <Button 
                  size="sm" 
                  className="h-10 px-6 rounded-2xl font-black uppercase text-[10px] bg-zinc-900 hover:bg-black text-white shadow-lg shadow-black/20 transition-all active:scale-95" 
                  onClick={handleDirectPrint}
                  disabled={isPreparingPrint}
                >
                  {isPreparingPrint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                  Imprimir
                </Button>
              </div>
            </div>

            <div className="w-full flex justify-center print:block p-0 md:p-2 flyer-print-wrapper">

              <div className="relative w-full flex justify-center no-scrollbar print:m-0 print:p-0">
                <div
                  id="flyer-content"
                  className={cn(
                    "relative flex flex-col shrink-0 print:w-[210mm] print:h-[297mm] print:shadow-none overflow-hidden transition-all duration-500 origin-top shadow-2xl",
                    removeFlyerBg ? "bg-transparent" : "bg-white border border-zinc-100"
                  )}
                  style={{
                    width: '794px', // A4 em 96dpi
                    height: '1123px',
                    ...getFlyerBackgroundStyle(),
                    transform: `scale(${flyerScale})`,
                    marginBottom: `${(1123 * (flyerScale - 1))}px`,
                    marginRight: `${(794 * (flyerScale - 1)) / 2}px`,
                    marginLeft: `${(794 * (flyerScale - 1)) / 2}px`
                  }}
                >
                {/* Dedicated Background Layer for better print reliability and CORS support */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" style={{ opacity: removeFlyerBg ? 0 : 1 }}>
                  {backgroundType === 'image' && backgroundUrl ? (
                    <img
                      src={backgroundUrl}
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-cover bg-layer-print"
                      alt="Background"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      onError={(e) => {
                        console.error('Falha ao carregar imagem de fundo:', backgroundUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div 
                      className="absolute inset-0 w-full h-full"
                      style={{ 
                        background: backgroundType === 'gradient' ? backgroundGradient : backgroundColor 
                      }}
                    />
                  )}
                </div>
                
                  <div className="relative z-10 w-full h-full flex flex-col">
                    <FlyerContentInner />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
        /* Hide scrollbars but allow scrolling */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0 !important; 
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 210mm !important; 
            height: 297mm !important;
            overflow: hidden !important;
            background: white !important;
          }
          
          /* Hide everything by default, then show only the flyer path */
          body {
            visibility: hidden !important;
          }

          .flyer-print-wrapper,
          .flyer-print-wrapper *,
          #flyer-content,
          #flyer-content * {
            visibility: visible !important;
          }

          .flyer-print-wrapper {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            z-index: 99999 !important;
            background: white !important;
          }

          #flyer-content {
            display: flex !important;
            flex-direction: column !important;
            position: absolute !important;
            left: 0 !important; 
            top: 0 !important;
            width: 210mm !important; 
            height: 297mm !important;
            margin: 0 !important; 
            padding: 0 !important;
            transform: none !important;
            visibility: visible !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 99999 !important;
          }

          /* Ensure background covers full page */
          .bg-layer-print {
            width: 210mm !important;
            height: 297mm !important;
            object-fit: cover !important;
          }
          
          .print\:hidden { display: none !important; }
        }

        .no-animations *, 
        .no-animations *::before, 
        .no-animations *::after {
          animation-duration: 0.001s !important;
          animation-delay: 0s !important;
          transition-duration: 0.001s !important;
          transition-delay: 0s !important;
        }
      `}</style>
      <Dialog open={showLogViewer} onOpenChange={setShowLogViewer}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-black uppercase italic tracking-tighter">Log de Sistema do Gerador</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 mt-4 no-scrollbar">
            {logHistory.some(l => l.isBlocker) && (
              <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl">
                <h4 className="text-red-600 font-black uppercase italic text-xs mb-2 flex items-center gap-2">
                  <X className="w-4 h-4" /> Bloqueadores Encontrados
                </h4>
                <div className="space-y-1">
                  {logHistory.filter(l => l.isBlocker).map((log, i) => (
                    <p key={i} className="text-[10px] text-red-500 font-bold leading-tight">
                      • {log.msg}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-zinc-950 rounded-xl font-mono text-[10px] text-emerald-400 space-y-1">
              {logHistory.length === 0 ? (
                <p className="text-zinc-500 italic text-center py-4">Nenhum evento registrado ainda...</p>
              ) : (
                logHistory.map((log, i) => (
                  <div key={i} className={cn(
                    "border-l pl-2 py-0.5",
                    log.isBlocker ? "border-red-500 text-red-400 bg-red-500/10" : "border-zinc-800"
                  )}>
                    <span className="text-zinc-500 mr-2">[{log.time}]</span>
                    {log.isBlocker && <span className="mr-1 font-bold">!!!</span>}
                    {log.msg}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setLogHistory([])}
              className="text-[10px] font-black uppercase"
            >
              <Eraser className="w-3 h-3 mr-2" />
              Limpar Logs
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedFlyerForStory && (
        <StoryGenerator 
          isOpen={isStoryGenOpen} 
          onClose={() => setIsStoryGenOpen(false)} 
          flyer={selectedFlyerForStory} 
        />
      )}

      <BarcodeScanner 

        isOpen={barcodeScannerOpen} 
        onClose={() => setBarcodeScannerOpen(false)} 
        onScan={(code) => {
          setProductSearchTerm(code);
          toast.success(`Buscando por: ${code}`);
        }}
      />
      </>
    )
  }

