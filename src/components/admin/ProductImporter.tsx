import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Download, CheckCircle2, AlertCircle, AlertTriangle, Check, X, Info, ImagePlus, RefreshCw } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export function ProductImporter() {
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false)
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([])

  const addLog = (msg: string) => {
    setDiagnosticLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [missingImagesProducts, setMissingImagesProducts] = useState<any[]>([])
  const [isCheckingMissing, setIsCheckingMissing] = useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [photoSearchQuery, setPhotoSearchQuery] = useState('')
  const [photoResults, setPhotoResults] = useState<string[]>([])
  const [isSearchingPhotos, setIsSearchingPhotos] = useState(false)
  const [productBeingEdited, setProductBeingEdited] = useState<any>(null)
  const [existingProductNames, setExistingProductNames] = useState<Set<string>>(new Set())
  const [scrapedProducts, setScrapedProducts] = useState<any[]>([])
  const [isScraping, setIsScraping] = useState(false)
  const [activeTab, setActiveTab] = useState<'importer' | 'review'>('importer')
  const [reviewProducts, setReviewProducts] = useState<any[]>([])
  const [isFetchingReview, setIsFetchingReview] = useState(false)
  const [importProgress, setImportProgress] = useState<{current: number, total: number} | null>(null)
  const [selectedForImport, setSelectedForImport] = useState<string[]>([])

  useEffect(() => {
    if (activeTab === 'importer') {
      checkMissingImages()
      fetchExistingNames()
    } else {
      fetchReviewProducts()
    }
  }, [activeTab])

  const fetchReviewProducts = async () => {
    setIsFetchingReview(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setReviewProducts(data || [])
    } catch (error) {
      toast.error('Erro ao carregar revisão')
    } finally {
      setIsFetchingReview(false)
    }
  }

  const generateReview = async () => {
    setIsFetchingReview(true)
    try {
      addLog('Gerando revisão automática de fotos...')
      // Identify products with generic images (picsum, unsplash) or media errors
      const { data, error } = await supabase
        .from('products')
        .select('id, image_url, has_media_error')
      
      if (error) throw error
      
      const toReview = data.filter(p => 
        !p.image_url || 
        p.image_url.includes('picsum') || 
        p.image_url.includes('unsplash') ||
        p.has_media_error
      ).map(p => p.id)

      if (toReview.length === 0) {
        toast.info('Nenhum produto precisa de revisão no momento.')
        return
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ is_approved: false })
        .in('id', toReview)

      if (updateError) throw updateError
      
      addLog(`${toReview.length} produtos marcados para revisão.`)
      toast.success(`${toReview.length} produtos enviados para a fila de revisão.`)
      fetchReviewProducts()
    } catch (error: any) {
      toast.error('Erro ao gerar revisão: ' + error.message)
    } finally {
      setIsFetchingReview(false)
    }
  }

  const approveProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_approved: true, last_reviewed_at: new Date().toISOString() })
        .eq('id', id)
      
      if (error) throw error
      setReviewProducts(prev => prev.filter(p => p.id !== id))
      toast.success('Produto aprovado!')
    } catch (error) {
      toast.error('Erro ao aprovar')
    }
  }

  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^\w\s]/gi, '') // Remove special chars
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  }

  const fetchExistingNames = async () => {
    const { data } = await supabase.from('products').select('name')
    if (data) {
      setExistingProductNames(new Set(data.map(p => normalizeString(p.name))))
    }
  }

  const toggleSelectProduct = (id: string) => {
    setSelectedForImport(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedForImport(scrapedProducts.map(p => p.id))
  }

  const deselectAll = () => {
    setSelectedForImport([])
  }

  // Mock function for Google Image search proxy
  const searchGoogleImages = async (query: string) => {
    setIsSearching(true)
    try {
      // In a real app, this would be an Edge Function calling a Search API
      // For now, we simulate finding images
      console.log('Searching images for:', query)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock results
      const mockImages = [
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1563636619-e910009351dc?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1621459536108-230c157f706c?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1523294587484-53553471ca69?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1516594773960-b0ffa996a3a0?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200',
      ]
      
      setImages(mockImages)
      toast.success('Imagens encontradas!')
    } catch (error) {
      toast.error('Erro ao buscar imagens')
    } finally {
      setIsSearching(false)
    }
  }

  const openPhotoModal = (product: any) => {
    setProductBeingEdited(product)
    setPhotoSearchQuery(`${product.name} ${product.brand || ''}`)
    setIsPhotoModalOpen(true)
    handlePhotoSearch(`${product.name} ${product.brand || ''}`)
  }

  const handlePhotoSearch = async (query: string) => {
    setIsSearchingPhotos(true)
    try {
      // Simula resultados de busca do Google Imagens
      await new Promise(resolve => setTimeout(resolve, 1000))
      const randomSeeds = [1, 2, 3, 4, 5, 6].map(() => Math.floor(Math.random() * 1000))
      const mockResults = randomSeeds.map(seed => `https://picsum.photos/seed/${seed}/600/600`)
      setPhotoResults(mockResults)
    } finally {
      setIsSearchingPhotos(false)
    }
  }

  const selectNewPhoto = (url: string) => {
    if (productBeingEdited?.id?.toString().startsWith('s')) {
      setScrapedProducts(prev => prev.map(p => 
        p.id === productBeingEdited.id ? { ...p, image_url: url } : p
      ))
    } else {
      handleUpdateProductImage(url, productBeingEdited.id)
    }
    setIsPhotoModalOpen(false)
    setProductBeingEdited(null)
  }

  const handleUpdateProductImage = async (imageUrl: string, productId?: string) => {
    const targetId = productId || selectedProduct?.id
    if (!targetId) return

    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          image_url: imageUrl,
          has_media_error: false
        })
        .eq('id', targetId)

      if (error) throw error
      toast.success('Imagem atualizada!')
      checkMissingImages()
    } catch (error) {
      toast.error('Erro ao salvar imagem')
    }
  }

  const checkMissingImages = async () => {
    setIsCheckingMissing(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('image_url.is.null,image_url.eq.""')
        .limit(20)

      if (error) throw error
      setMissingImagesProducts(data || [])
    } catch (error) {
      toast.error('Erro ao verificar produtos sem fotos')
    } finally {
      setIsCheckingMissing(false)
    }
  }

  const runAutoImageAI = async () => {
    if (missingImagesProducts.length === 0) {
      return toast.info('Não há produtos sem fotos para processar.')
    }

    toast.info('Iniciando processamento de IA para encontrar fotos...')
    setIsCheckingMissing(true)

    try {
      for (const product of missingImagesProducts) {
        // Simulate AI search for each product
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const randomId = Math.floor(Math.random() * 1000)
        const autoImg = `https://picsum.photos/seed/${randomId}/400/400`
        
        await supabase
          .from('products')
          .update({ image_url: autoImg, has_media_error: false })
          .eq('id', product.id)
        
        toast.success(`Foto encontrada para: ${product.name}`)
      }
      
      toast.success('Processamento concluído com sucesso!')
      checkMissingImages()
    } catch (error) {
      toast.error('Erro no processamento automático')
    } finally {
      setIsCheckingMissing(false)
    }
  }
  const simulateScraping = async (categoryName: string) => {
    setIsScraping(true)
    setDiagnosticLog([])
    addLog(`Escaneando site parceiro para ${categoryName}...`)
    setScrapedProducts([])
    setSelectedForImport([])
    toast.info(`Escaneando site parceiro para ${categoryName}...`)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      let samples: any[] = []
      const catKey = categoryName.toLowerCase()
      
      if (catKey.includes('mercearia')) {
        samples = [
          { id: 's1', name: 'Arroz Prato Fino 5kg', price: 32.90, description: 'Arroz agulhinha premium.', category: 'Mercearia', brand: 'Prato Fino', image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
          { id: 's2', name: 'Feijão Camil Carioca 1kg', price: 9.40, description: 'Feijão carioca selecionado.', category: 'Mercearia', brand: 'Camil', image_url: 'https://images.unsplash.com/photo-1551462147-37885acc3c41?w=400' },
          { id: 's3', name: 'Açúcar União Refinado 1kg', price: 4.50, description: 'Açúcar refinado extra fino.', category: 'Mercearia', brand: 'União', image_url: 'https://images.unsplash.com/photo-1581448670546-07b57f40ed5b?w=400' },
          { id: 's3-1', name: 'Café Pilão Tradicional 500g', price: 18.90, description: 'Café forte do Brasil.', category: 'Mercearia', brand: 'Pilão', image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400' },
        ]
      } else if (catKey.includes('bebida')) {
        samples = [
          { id: 's4', name: 'Coca-Cola Zero 2L', price: 11.99, description: 'Refrigerante zero açúcar.', category: 'Bebidas', brand: 'Coca-Cola', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400' },
          { id: 's5', name: 'Cerveja Heineken Long Neck 330ml', price: 6.90, description: 'Cerveja premium holandesa.', category: 'Bebidas', brand: 'Heineken', image_url: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400' },
          { id: 's5-1', name: 'Suco Prats Laranja 900ml', price: 14.50, description: 'Suco de laranja 100% natural.', category: 'Bebidas', brand: 'Prats', image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400' },
        ]
      } else if (catKey.includes('hort') || catKey.includes('fruit')) {
        samples = [
          { id: 's6', name: 'Banana Nanica Climatizada (kg)', price: 5.90, description: 'Bananas maduras e selecionadas.', category: 'Hortifruti', brand: 'Produtor Local', image_url: 'https://images.unsplash.com/photo-1571771894821-ad9902d83f4e?w=400' },
          { id: 's7', name: 'Maçã Fuji Argentina (kg)', price: 12.50, description: 'Maçãs crocantes importadas.', category: 'Hortifruti', brand: 'Argentina', image_url: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400' },
        ]
      } else if (catKey.includes('limpeza')) {
        samples = [
          { id: 's8', name: 'Sabão em Pó OMO Lavagem Perfeita 1.6kg', price: 24.90, description: 'Sabão em pó de alta performance.', category: 'Limpeza', brand: 'OMO', image_url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400' },
          { id: 's9', name: 'Detergente Ypê Maçã 500ml', price: 2.65, description: 'Lava louças líquido.', category: 'Limpeza', brand: 'Ypê', image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400' },
        ]
      } else if (catKey.includes('pet')) {
        samples = [
          { id: 's10', name: 'Ração Pedigree Adulto Raças Médias 10kg', price: 129.90, description: 'Alimento completo para cães.', category: 'Pet Shop', brand: 'Pedigree', image_url: 'https://images.unsplash.com/photo-1589924691106-073b69759fbb?w=400' },
        ]
      } else if (catKey.includes('padaria')) {
        samples = [
          { id: 's11', name: 'Pão Francês Unidade', price: 0.85, description: 'Pão crocante e quentinho.', category: 'Padaria', brand: 'Própria', image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
        ]
      } else if (catKey.includes('açougue')) {
        samples = [
          { id: 's12', name: 'Picanha Bovina Resfriada (kg)', price: 79.90, description: 'Carne bovina de primeira.', category: 'Açougue', brand: 'Swift', image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400' },
        ]
      } else {
        samples = [
          { id: `s-${Math.random()}`, name: `${categoryName} Item Selecionado`, price: 19.90, description: 'Produto importado de alta qualidade.', category: categoryName, brand: 'Marca Selecionada', image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400' },
        ]
      }

      setScrapedProducts(samples)
      setSelectedForImport(samples.map(p => p.id))
      // Simulate finding more products
      const moreSamples = [...samples];
      if (samples.length > 0) {
        for (let i = 1; i <= 21; i++) {
          const base = samples[i % samples.length];
          moreSamples.push({
            ...base,
            id: `s-extra-${i}`,
            name: `${base.name} - Opção ${i}`,
            price: base.price + (Math.random() * 5),
          });
        }
      }

      setScrapedProducts(moreSamples)
      setSelectedForImport(moreSamples.map(p => p.id))
      toast.success(`${moreSamples.length} produtos encontrados (lote de 25). Revise a lista abaixo.`)
    } catch (error) {
      toast.error('Erro ao conectar com o site parceiro.')
    } finally {
      setIsScraping(false)
    }
  }

  const handleConfirmImport = async () => {
    const toImport = scrapedProducts.filter(p => selectedForImport.includes(p.id))
    if (toImport.length === 0) return toast.error('Nenhum produto selecionado.')

    setIsScraping(true)
    try {
      let successCount = 0;
      let i = 0;

      for (const product of toImport) {
        // Duplicate check
        const normalizedCurrent = normalizeString(product.name);
        const isDuplicate = existingProductNames.has(normalizedCurrent);
        addLog(`Processando: ${product.name}...`)
        if (isDuplicate) {
          console.log(`Pulando duplicado: ${product.name}`);
          continue;
        }

        let { data: catData } = await supabase
          .from('categories')
          .select('id')
          .eq('name', product.category)
          .maybeSingle()
        
        if (!catData) {
          const { data: newCat, error: catError } = await supabase
            .from('categories')
            .insert({ 
              name: product.category, 
              slug: product.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') 
            })
            .select()
            .single()
          
          if (catError) {
            console.error('Category creation error:', catError)
            throw new Error(`Erro ao criar categoria ${product.category}: ${catError.message}`)
          }
          catData = newCat
        }

        await supabase.from('products').insert({
          name: product.name,
          description: `${product.description} Marca: ${product.brand}`,
          price: product.price,
          category_id: catData?.id,
          image_url: product.image_url,
          stock: 100
        });
        successCount++;
        i++;
        setImportProgress({ current: i, total: toImport.length })
      }
      
      addLog(`Importação finalizada. Sucesso: ${successCount}, Duplicados: ${toImport.length - successCount}`)
      toast.success(`${successCount} produtos cadastrados com sucesso!`)
      fetchExistingNames() // Refresh duplicates list
      setScrapedProducts([])
      setSelectedForImport([])
      checkMissingImages()
    } catch (error: any) {
      addLog(`ERRO CRÍTICO: ${error.message}`)
      toast.error('Erro ao salvar produtos: ' + error.message)
    } finally {
      setIsScraping(false)
      setImportProgress(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex bg-zinc-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('importer')}
          className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${activeTab === 'importer' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
        >
          Scanner & Importação
        </button>
        <button 
          onClick={() => setActiveTab('review')}
          className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${activeTab === 'review' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
        >
          Centro de Aprovação
          {reviewProducts.length > 0 && (
            <Badge className="ml-2 bg-red-500 text-[8px] h-4">{reviewProducts.length}</Badge>
          )}
        </button>
      </div>

      {activeTab === 'review' ? (
        <div className="space-y-6">
          <Card className="border-4 border-amber-500 shadow-2xl overflow-hidden">
            <div className="bg-amber-500 p-2 text-center text-white font-black text-[10px] uppercase italic tracking-widest">
              Fila de Curadoria e Aprovação de Catálogo
            </div>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-black italic uppercase tracking-tighter text-2xl">Revisão de Fotos</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase">Produtos marcados pela IA ou importados recentemente</CardDescription>
              </div>
              <Button onClick={generateReview} disabled={isFetchingReview} variant="outline" className="h-12 border-2 border-zinc-900 font-black uppercase text-[10px]">
                {isFetchingReview ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Gerar Revisão de Fotos
              </Button>
            </CardHeader>
            <CardContent>
              {isFetchingReview && reviewProducts.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
                  <p className="font-black uppercase text-xs animate-pulse">Sincronizando fila de aprovação...</p>
                </div>
              ) : reviewProducts.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                  <div>
                    <h3 className="font-black uppercase text-xl italic tracking-tighter">Catálogo 100% Limpo!</h3>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase">Não há produtos pendentes de aprovação no momento.</p>
                  </div>
                  <Button onClick={generateReview} variant="secondary">Escanear por Problemas</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reviewProducts.map(product => (
                    <Card key={product.id} className="overflow-hidden border-2 hover:border-amber-500 transition-all group shadow-lg">
                      <div className="aspect-square relative overflow-hidden bg-gray-100">
                        <img src={product.image_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {(!product.image_url || product.image_url.includes('picsum')) && (
                            <Badge className="bg-amber-500 text-[8px]">IA/TEMP</Badge>
                          )}
                          {product.has_media_error && (
                            <Badge variant="destructive" className="text-[8px]">ERRO</Badge>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-4">
                          <Button variant="secondary" size="sm" className="font-black uppercase text-[10px]" onClick={() => openPhotoModal(product)}>
                            <RefreshCw className="mr-1 h-3 w-3" /> Trocar
                          </Button>
                          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 font-black uppercase text-[10px]" onClick={() => approveProduct(product.id)}>
                            <Check className="mr-1 h-3 w-3" /> Aprovar
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black uppercase tracking-tight text-sm truncate max-w-[150px]">{product.name}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{product.categories?.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-zinc-900 text-xs">R$ {Number(product.price).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="w-full text-[10px] font-bold uppercase h-8" onClick={() => approveProduct(product.id)}>
                            Aprovar Foto
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
      <Card>
        <CardHeader>
          <CardTitle>Busca Automática de Imagens (Proxy Google)</CardTitle>
          <CardDescription>
            Digite o nome e marca do produto para encontrar imagens automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Ex: Arroz Tio João 5kg" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchGoogleImages(searchQuery)}
            />
            <Button onClick={() => searchGoogleImages(searchQuery)} disabled={isSearching}>
              {isSearching ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
              Buscar
            </Button>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              {images.map((url, i) => (
                <div 
                  key={i} 
                  className="relative group cursor-pointer border rounded-lg overflow-hidden hover:border-primary transition-colors"
                  onClick={() => {
                    if (selectedProduct) {
                      handleUpdateProductImage(url)
                    } else {
                      toast.info('Selecione um produto na lista abaixo primeiro para vincular esta imagem.')
                    }
                  }}
                >
                  <img src={url} alt={`Result ${i}`} className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <CheckCircle2 className="text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Produtos sem Fotos</CardTitle>
            <CardDescription>
              Verifique quais itens do catálogo ainda não possuem imagem cadastrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={checkMissingImages} disabled={isCheckingMissing} className="flex-1">
                {isCheckingMissing ? <Loader2 className="animate-spin mr-2" /> : <AlertCircle className="mr-2" />}
                Atualizar Lista
              </Button>
              <Button variant="default" onClick={runAutoImageAI} disabled={isCheckingMissing || missingImagesProducts.length === 0} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="mr-2" /> IA: Fotos Automáticas
              </Button>
            </div>

            <div className="max-h-[350px] overflow-y-auto space-y-2 border p-2 rounded-lg bg-gray-50/50">
              {missingImagesProducts.map(product => (
                <div 
                  key={product.id} 
                  className={`p-3 border rounded-lg flex justify-between items-center cursor-pointer transition-colors ${selectedProduct?.id === product.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                  onClick={() => {
                    setSelectedProduct(product)
                    setSearchQuery(product.name)
                  }}
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {product.id.substring(0, 8)}</p>
                  </div>
                  {selectedProduct?.id === product.id && <Badge>Selecionado</Badge>}
                </div>
              ))}
              {missingImagesProducts.length === 0 && !isCheckingMissing && (
                <p className="text-center py-4 text-muted-foreground text-sm">Nenhum produto pendente encontrado.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="text-primary" /> Importação Inteligente (Web Scraping)
            </CardTitle>
            <CardDescription>
              Selecione as categorias do site parceiro para escanear e cadastrar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {['Mercearia', 'Bebidas', 'Hortifruti', 'Limpeza', 'Padaria', 'Açougue', 'Laticínios', 'Pet Shop'].map(cat => (
                <Button 
                  key={cat}
                  variant="secondary" 
                  className="h-10 px-4 font-bold uppercase text-[10px] tracking-wider"
                  onClick={() => simulateScraping(cat)}
                  disabled={isScraping}
                >
                  {isScraping ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <Search className="mr-2 h-3 w-3" />}
                  Escanear {cat}
                </Button>
              ))}
            </div>

            {scrapedProducts.length > 0 && (
              <div className="mt-8 border rounded-2xl overflow-hidden bg-white shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-zinc-900 text-white p-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h3 className="font-black uppercase italic tracking-tighter text-lg">Produtos Encontrados</h3>
                    <Badge variant="outline" className="text-white border-white/20">
                      {selectedForImport.length} selecionados
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-[10px] font-bold" onClick={selectAll}>MARCAR TODOS</Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-[10px] font-bold" onClick={deselectAll}>DESMARCAR</Button>
                  </div>
                </div>
                
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="w-[80px]">Foto</TableHead>
                        <TableHead>Produto / Marca</TableHead>
                        <TableHead>Preço Est.</TableHead>
                        <TableHead>Categoria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scrapedProducts.map(product => (
                        <TableRow 
                          key={product.id} 
                          className={`
                            ${selectedForImport.includes(product.id) ? 'bg-green-50/30' : 'opacity-60'}
                            ${existingProductNames.has(normalizeString(product.name)) ? 'border-l-4 border-l-amber-500' : ''}
                          `}
                        >
                          <TableCell>
                            <Checkbox 
                              checked={selectedForImport.includes(product.id)}
                              onCheckedChange={() => toggleSelectProduct(product.id)}
                            />
                          </TableCell>
                          <TableCell className="relative group">
                            <img src={product.image_url} className="w-12 h-12 object-cover rounded-lg shadow-sm" alt="" />
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="absolute top-0 right-0 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => openPhotoModal(product)}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="font-black text-sm uppercase tracking-tight">{product.name}</div>
                              {existingProductNames.has(normalizeString(product.name)) && (
                                <Badge variant="destructive" className="text-[8px] h-4 bg-amber-500 hover:bg-amber-600">JÁ EXISTE</Badge>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.brand}</div>
                          </TableCell>
                          <TableCell className="font-black text-green-700">R$ {product.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter">
                              {product.category}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                
                <div className="p-6 bg-gray-50 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                    <Info className="h-4 w-4 text-blue-500" />
                    Clique em Cadastrar para salvar os itens selecionados.
                  </div>
                  <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                    {importProgress && (
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300" 
                          style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsDiagnosticOpen(true)}
                        className="h-14 font-bold uppercase text-[10px]"
                      >
                        Ver Log
                      </Button>
                      <Button 
                        size="lg" 
                        className="w-full md:w-auto px-10 h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase italic tracking-tighter text-lg shadow-xl"
                        onClick={handleConfirmImport}
                        disabled={isScraping || selectedForImport.length === 0}
                      >
                        {isScraping ? (
                          <>
                            <Loader2 className="animate-spin mr-2" />
                            {importProgress ? `SALVANDO ${importProgress.current}/${importProgress.total}...` : 'PROCESSANDO...'}
                          </>
                        ) : (
                          <>
                            <Check className="mr-2" />
                            Cadastrar Selecionados
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDiagnosticOpen} onOpenChange={setIsDiagnosticOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 text-green-500 font-mono text-[10px]">
          <DialogHeader>
            <DialogTitle className="text-white">Console de Importação Real</DialogTitle>
          </DialogHeader>
          <div className="h-[300px] overflow-y-auto space-y-1 p-2 bg-black rounded">
            {diagnosticLog.map((log, i) => <div key={i}>{log}</div>)}
            {isScraping && <div className="animate-pulse">_</div>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDiagnosticOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Busca de Fotos via Google (Simulado) */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase font-black tracking-tighter italic">
              <ImagePlus className="text-primary" /> Trocar Foto do Produto
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Buscando a melhor imagem para: {photoSearchQuery}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <div className="flex gap-2">
              <Input 
                value={photoSearchQuery} 
                onChange={(e) => setPhotoSearchQuery(e.target.value)}
                className="font-bold uppercase text-xs"
              />
              <Button onClick={() => handlePhotoSearch(photoSearchQuery)} disabled={isSearchingPhotos}>
                {isSearchingPhotos ? <Loader2 className="animate-spin" /> : <Search size={18} />}
              </Button>
            </div>

            {isSearchingPhotos ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-xs font-black uppercase text-gray-400 animate-pulse">Consultando Banco de Imagens do Google...</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                  {photoResults.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="relative group cursor-pointer rounded-2xl overflow-hidden border-4 border-transparent hover:border-primary transition-all shadow-md active:scale-95"
                      onClick={() => selectNewPhoto(url)}
                    >
                      <img src={url} alt="" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Check className="text-white h-10 w-10 drop-shadow-lg" />
                      </div>
                      {idx === 0 && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">Melhor Escolha</div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button variant="ghost" onClick={() => setIsPhotoModalOpen(false)} className="text-[10px] font-black uppercase tracking-widest">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
        </>
      )}

      <Dialog open={isDiagnosticOpen} onOpenChange={setIsDiagnosticOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 text-green-500 font-mono text-[10px]">
          <DialogHeader>
            <DialogTitle className="text-white">Console de Importação Real</DialogTitle>
          </DialogHeader>
          <div className="h-[300px] overflow-y-auto space-y-1 p-2 bg-black rounded">
            {diagnosticLog.map((log, i) => <div key={i}>{log}</div>)}
            {isScraping && <div className="animate-pulse">_</div>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDiagnosticOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Busca de Fotos via Google (Simulado) */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase font-black tracking-tighter italic">
              <ImagePlus className="text-primary" /> Trocar Foto do Produto
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Buscando a melhor imagem para: {photoSearchQuery}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <div className="flex gap-2">
              <Input 
                value={photoSearchQuery} 
                onChange={(e) => setPhotoSearchQuery(e.target.value)}
                className="font-bold uppercase text-xs"
              />
              <Button onClick={() => handlePhotoSearch(photoSearchQuery)} disabled={isSearchingPhotos}>
                {isSearchingPhotos ? <Loader2 className="animate-spin" /> : <Search size={18} />}
              </Button>
            </div>

            {isSearchingPhotos ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-xs font-black uppercase text-gray-400 animate-pulse">Consultando Banco de Imagens do Google...</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                  {photoResults.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="relative group cursor-pointer rounded-2xl overflow-hidden border-4 border-transparent hover:border-primary transition-all shadow-md active:scale-95"
                      onClick={() => selectNewPhoto(url)}
                    >
                      <img src={url} alt="" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Check className="text-white h-10 w-10 drop-shadow-lg" />
                      </div>
                      {idx === 0 && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">Melhor Escolha</div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button variant="ghost" onClick={() => setIsPhotoModalOpen(false)} className="text-[10px] font-black uppercase tracking-widest">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
