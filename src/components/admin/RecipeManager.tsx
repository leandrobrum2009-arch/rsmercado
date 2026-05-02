import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Trash2, Zap, BookOpen } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'

export function RecipeManager() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const handleGenerateRecipes = async () => {
    toast.info('Gerando 5 receitas automáticas...')
    
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const mockRecipes = [
      {
        title: 'Brigadeiro de Panela',
        description: 'Um clássico brasileiro rápido e delicioso.',
        instructions: '1. Em uma panela, misture o leite condensado, a manteiga e o achocolatado.\n2. Leve ao fogo médio e mexa sem parar até desgrudar do fundo da panela.\n3. Deixe esfriar e sirva.',
        category: 'Sobremesa',
        difficulty: 'Fácil',
        image_url: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&h=400&fit=crop',
        ingredients: [
          { name: 'Leite Condensado', quantity: '1 lata' },
          { name: 'Manteiga', quantity: '1 colher de sopa' },
          { name: 'Achocolatado', quantity: '3 colheres de sopa' }
        ]
      },
      {
        title: 'Arroz com Frango',
        description: 'Prato único prático para o dia a dia.',
        instructions: '1. Refogue o frango com temperos.\n2. Adicione o arroz e a água.\n3. Cozinhe até secar a água e o arroz ficar macio.',
        category: 'Almoço',
        difficulty: 'Média',
        image_url: 'https://images.unsplash.com/photo-1512058560550-427499684612?w=800&h=400&fit=crop',
        ingredients: [
          { name: 'Arroz', quantity: '2 xícaras' },
          { name: 'Peito de Frango', quantity: '500g' },
          { name: 'Cebola', quantity: '1 unidade' }
        ]
      },
      {
        title: 'Vitamina de Morango',
        description: 'Bebida nutritiva e refrescante.',
        instructions: '1. Bata todos os ingredientes no liquidificador até ficar homogêneo.\n2. Sirva gelado.',
        category: 'Bebida',
        difficulty: 'Fácil',
        image_url: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=800&h=400&fit=crop',
        ingredients: [
          { name: 'Morango', quantity: '1 xícara' },
          { name: 'Leite', quantity: '500ml' },
          { name: 'Açúcar', quantity: 'a gosto' }
        ]
      },
      {
        title: 'Omelete de Queijo',
        description: 'Refeição rápida e proteica.',
        instructions: '1. Bata os ovos com sal.\n2. Leve à frigideira untada.\n3. Adicione o queijo e dobre.',
        category: 'Lanche',
        difficulty: 'Fácil',
        image_url: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&h=400&fit=crop',
        ingredients: [
          { name: 'Ovos', quantity: '2 unidades' },
          { name: 'Queijo Muçarela', quantity: '50g' },
          { name: 'Sal', quantity: 'a gosto' }
        ]
      },
      {
        title: 'Salada de Frutas',
        description: 'Sobremesa saudável e colorida.',
        instructions: '1. Pique todas as frutas.\n2. Misture em uma tigela.\n3. Opcionalmente adicione suco de laranja.',
        category: 'Sobremesa',
        difficulty: 'Fácil',
        image_url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&h=400&fit=crop',
        ingredients: [
          { name: 'Banana', quantity: '1 unidade' },
          { name: 'Maçã', quantity: '1 unidade' },
          { name: 'Laranja', quantity: '1 unidade' }
        ]
      }
    ]

    try {
      const { error } = await supabase
        .from('recipes')
        .insert(mockRecipes)

      if (error) throw error
      toast.success('Receitas geradas com sucesso!')
      fetchRecipes()
    } catch (error) {
      toast.error('Erro ao gerar receitas')
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestão de Receitas</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateRecipes}>
            <Zap className="mr-2 h-4 w-4" /> Gerar Receitas
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nova Receita
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
              <TableHead>Dificuldade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
                    className="w-16 h-10 object-cover rounded" 
                  />
                </TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.difficulty}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {recipes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma receita encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
