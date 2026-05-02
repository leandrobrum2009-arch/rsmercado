import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Trash2, Zap, BrainCircuit, MessageSquare, Save } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RecipeManager() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [isAiGenerating, setIsAiGenerating] = useState(false)

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      toast.error('Erro ao carregar receitas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAiRecipe = async () => {
    if (!aiInput.trim()) return toast.error('Digite os produtos para a IA')
    setIsAiGenerating(true)
    
    try {
      // Simulate IA generation based on input products
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const products = aiInput.split(',').map(p => p.trim())
      const mainProduct = products[0] || 'Ingrediente'
      
      const newRecipe = {
        title: `Especial de ${mainProduct}`,
        description: `Uma receita deliciosa criada pela IA usando ${aiInput}.`,
        instructions: `1. Separe os ingredientes: ${aiInput}.\n2. Misture tudo em uma tigela.\n3. Cozinhe em fogo médio por 20 minutos.\n4. Sirva quente e aproveite!`,
        category: 'Sugestão IA',
        difficulty: 'Fácil',
        image_url: 'https://images.unsplash.com/photo-1466632311177-a3d143ee79a1?w=800&h=400&fit=crop',
        ingredients: products.map(p => ({ name: p, quantity: 'a gosto' }))
      }

      const { error } = await supabase.from('recipes').insert(newRecipe)
      if (error) throw error
      
      toast.success('Receita criada pela IA com sucesso!')
      setIsAiModalOpen(false)
      setAiInput('')
      fetchRecipes()
    } catch (error) {
      toast.error('Erro ao criar receita com IA')
    } finally {
      setIsAiGenerating(false)
    }
  }

  const handleSeed40Recipes = async () => {
    setIsLoading(true)
    toast.info('Semeando 40 receitas no banco de dados...')
    
    const categories = ['Almoço', 'Jantar', 'Sobremesa', 'Lanche', 'Bebida', 'Café da Manhã']
    const difficulties = ['Fácil', 'Média', 'Difícil']
    
    const mockRecipes = Array.from({ length: 40 }).map((_, i) => ({
      title: `Receita Deliciosa #${i + 1}`,
      description: `Uma descrição incrível para a nossa receita número ${i + 1}. Perfeita para qualquer ocasião.`,
      instructions: `Passo 1: Prepare os ingredientes.\nPasso 2: Misture com amor.\nPasso 3: Cozinhe até ficar no ponto.\nPasso 4: Aproveite com a família!`,
      category: categories[i % categories.length],
      difficulty: difficulties[i % difficulties.length],
      image_url: `https://images.unsplash.com/photo-${1500000000000 + (i * 1000000)}?w=800&h=400&fit=crop`,
      ingredients: [
        { name: 'Ingrediente A', quantity: '100g' },
        { name: 'Ingrediente B', quantity: '1 unidade' },
        { name: 'Ingrediente C', quantity: 'a gosto' }
      ]
    }))

    try {
      // First clear existing mock recipes if needed, or just append
      const { error } = await supabase.from('recipes').insert(mockRecipes)
      if (error) throw error
      toast.success('40 receitas cadastradas com sucesso!')
      fetchRecipes()
    } catch (error) {
      toast.error('Erro ao semear receitas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Receita excluída!')
      fetchRecipes()
    } catch (error) {
      toast.error('Erro ao excluir receita')
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
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-xl font-semibold uppercase font-black italic">Gestão de Receitas</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed40Recipes} className="font-black uppercase text-[10px]">
            <Zap className="mr-2 h-4 w-4" /> Semear 40 Receitas
          </Button>
          <Button variant="default" onClick={() => setIsAiModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 font-black uppercase text-[10px]">
            <BrainCircuit className="mr-2 h-4 w-4" /> Criar com IA
          </Button>
          <Button className="bg-zinc-900 font-black uppercase text-[10px]">
            <Plus className="mr-2 h-4 w-4" /> Nova Receita
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase">Imagem</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Título</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Categoria</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Dificuldade</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipes.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <SmartImage 
                    src={item.image_url} 
                    tableName="recipes" 
                    itemId={item.id} 
                    className="w-16 h-10 object-cover rounded shadow-sm" 
                  />
                </TableCell>
                <TableCell className="font-bold text-xs uppercase">{item.title}</TableCell>
                <TableCell className="text-xs uppercase">{item.category}</TableCell>
                <TableCell className="text-xs uppercase">{item.difficulty}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {recipes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground uppercase text-[10px] font-bold">
                  Nenhuma receita encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase italic tracking-tighter text-2xl">Gerador de Receitas IA</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase">
              Digite os produtos que você tem (separados por vírgula) e nossa IA criará uma receita exclusiva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Produtos disponíveis</Label>
              <Textarea 
                placeholder="Ex: Leite condensado, Nescau, Manteiga..." 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                className="min-h-[100px] border-2 border-zinc-100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAiModalOpen(false)} className="font-black uppercase text-[10px]">Cancelar</Button>
            <Button 
              onClick={handleCreateAiRecipe} 
              disabled={isAiGenerating}
              className="bg-purple-600 hover:bg-purple-700 font-black uppercase text-[10px]"
            >
              {isAiGenerating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Gerar e Salvar Receita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
