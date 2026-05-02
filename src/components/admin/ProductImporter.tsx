import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Download, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'

export function ProductImporter() {
  const [searchQuery, setSearchQuery] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [missingImagesProducts, setMissingImagesProducts] = useState<any[]>([])
  const [isCheckingMissing, setIsCheckingMissing] = useState(false)

  useEffect(() => {
    checkMissingImages()
  }, [])

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

  const handleUpdateProductImage = async (imageUrl: string) => {
    if (!selectedProduct) return

    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          image_url: imageUrl,
          has_media_error: false // Reset error flag when updating
        })
        .eq('id', selectedProduct.id)

      if (error) throw error
      
      toast.success('Imagem cadastrada com sucesso!')
      setSelectedProduct(null)
      setImages([])
      checkMissingImages() // Refresh list
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

  const simulateCompetitorImport = async (categoryName: string) => {
    toast.info(`Iniciando importação de produtos de ${categoryName}...`)
    setIsCheckingMissing(true)
    
    try {
      // 1. Ensure category exists
      let { data: catData } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .maybeSingle()
      
      if (!catData) {
        const { data: newCat, error: catErr } = await supabase
          .from('categories')
          .insert({ name: categoryName, slug: categoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') })
          .select()
          .single()
        if (catErr) throw catErr
        catData = newCat
      }

      // 2. Sample products based on category
      const samples: any[] = []
      if (categoryName === 'Mercearia') {
        samples.push(
          { name: 'Arroz Tio João Tipo 1 5kg', price: 29.90, description: 'Arroz agulhinha tipo 1 de alta qualidade.' },
          { name: 'Feijão Carioca Camil 1kg', price: 8.50, description: 'Feijão carioca selecionado.' },
          { name: 'Açúcar Refinado União 1kg', price: 4.20, description: 'Açúcar de cana refinado.' },
          { name: 'Óleo de Soja Liza 900ml', price: 6.75, description: 'Óleo de soja refinado.' },
          { name: 'Macarrão Espaguete Adria 500g', price: 3.90, description: 'Macarrão de sêmola.' }
        )
      } else if (categoryName === 'Bebidas') {
        samples.push(
          { name: 'Cerveja Skol Lata 350ml', price: 3.49, description: 'Cerveja pilsen leve.' },
          { name: 'Refrigerante Coca-Cola 2L', price: 11.90, description: 'Refrigerante de cola original.' },
          { name: 'Suco de Laranja Prats 900ml', price: 14.50, description: 'Suco de laranja 100% natural.' },
          { name: 'Água Mineral Crystal 500ml', price: 2.00, description: 'Água mineral sem gás.' }
        )
      } else {
        samples.push(
          { name: `${categoryName} Produto Exemplo 1`, price: 15.00, description: 'Descrição do produto importado.' },
          { name: `${categoryName} Produto Exemplo 2`, price: 22.50, description: 'Descrição do produto importado.' }
        )
      }

      const toInsert = samples.map(s => ({
        ...s,
        category_id: catData?.id,
        image_url: '', // Intentionally empty to test the auto-photo system
        stock: 50
      }))

      const { error: insErr } = await supabase.from('products').insert(toInsert)
      if (insErr) throw insErr

      toast.success(`Sucesso! ${toInsert.length} produtos de ${categoryName} foram adicionados sem fotos.`)
      await checkMissingImages()
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error('Erro na importação: ' + error.message)
    } finally {
      setIsCheckingMissing(false)
    }
  }

  return (
    <div className="space-y-8">
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
            <Button variant="outline" onClick={checkMissingImages} disabled={isCheckingMissing} className="w-full">
              {isCheckingMissing ? <Loader2 className="animate-spin mr-2" /> : <AlertCircle className="mr-2" />}
              Verificar Pendências
            </Button>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
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

        <Card>
          <CardHeader>
            <CardTitle>Importação em Lote (Web Scraping)</CardTitle>
            <CardDescription>
              Importe produtos diretamente de grandes redes de supermercado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecione uma categoria para importar automaticamente nome, descrição e categoria de sites como Pão de Açúcar.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => simulateCompetitorImport('Mercearia')}>
                <Download className="mr-2 h-4 w-4" /> Mercearia
              </Button>
              <Button variant="outline" onClick={() => simulateCompetitorImport('Bebidas')}>
                <Download className="mr-2 h-4 w-4" /> Bebidas
              </Button>
              <Button variant="outline" onClick={() => simulateCompetitorImport('Hortifruti')}>
                <Download className="mr-2 h-4 w-4" /> Hortifruti
              </Button>
              <Button variant="outline" onClick={() => simulateCompetitorImport('Limpeza')}>
                <Download className="mr-2 h-4 w-4" /> Limpeza
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
