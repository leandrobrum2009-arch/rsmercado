import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'

export function NewsManager() {
  const [news, setNews] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNews(data || [])
    } catch (error) {
      toast.error('Erro ao carregar notícias')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateNews = async () => {
    toast.info('Gerando 10 notícias automaticamente via IA/Importação...')
    
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Mock news data
    const mockNews = Array.from({ length: 10 }).map((_, i) => ({
      title: `Oferta da Semana: ${['Frutas fresquinhas', 'Cortes selecionados', 'Limpeza pesada', 'Café da manhã'][i % 4]} #${i + 1}`,
      content: 'Confira as melhores ofertas do nosso supermercado para você e sua família. Qualidade garantida com o melhor preço da região. Venha nos visitar ou peça pelo app e receba em casa com toda comodidade que você merece.',
      category: 'Promoção',
      image_url: `https://picsum.photos/seed/${Math.random()}/800/400`
    }))

    try {
      const { error } = await supabase
        .from('news')
        .insert(mockNews)

      if (error) throw error
      toast.success('10 notícias geradas com sucesso!')
      fetchNews()
    } catch (error) {
      toast.error('Erro ao gerar notícias')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Notícia excluída!')
      fetchNews()
    } catch (error) {
      toast.error('Erro ao excluir notícia')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Blog e Notícias</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateNews}>
            <Zap className="mr-2 h-4 w-4" /> Gerar 10 Notícias
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nova Notícia
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagem</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {news.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <img src={item.image_url} alt={item.title} className="w-16 h-10 object-cover rounded" />
                </TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{new Date(item.created_at).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
