import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Download, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { SmartImage } from '@/components/ui/SmartImage'

export function ProductImporter() {
  const [searchQuery, setSearchQuery] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [missingImagesProducts, setMissingImagesProducts] = useState<any[]>([])
  const [isCheckingMissing, setIsCheckingMissing] = useState(false)

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

  const simulateCompetitorImport = async (category: string) => {
    toast.info(`Iniciando importação de 25 produtos da categoria ${category}...`)
    
    // Simulate process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    toast.success('Importação concluída! 25 produtos adicionados ao catálogo.')
    checkMissingImages()
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
