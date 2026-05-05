import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
 import { Loader2, Plus, Trash2, Zap, BrainCircuit, Save, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function RecipeManager() {
  const [recipes, setRecipes] = useState<any[]>([])
   const [isLoading, setIsLoading] = useState(true)
   const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [isAiGenerating, setIsAiGenerating] = useState(false)

   useEffect(() => {
     const check = async () => {
       const { data: isAdminRpc } = await supabase.rpc('is_admin')
       const { data: { session } } = await supabase.auth.getSession()
       const isSuper = session?.user?.email === 'leandrobrum2009@gmail.com'
       setIsAdmin(isAdminRpc || isSuper)
     }
     check()
     fetchRecipes()
   }, [])

  const fetchRecipes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

        if (error) {
          console.error('Recipes fetch error:', error);
          const isMissingTable = error.message?.includes('relation "recipes" does not exist') || 
                               error.message?.includes('schema cache') || 
                               error.message?.includes('404');

          if (isMissingTable) {
            toast.error(
              <div className="flex flex-col gap-2">
                <p>A tabela de receitas não foi encontrada.</p>
                <Button size="sm" onClick={() => window.location.href = '/admin-fix'} className="bg-red-600 text-[10px] font-black uppercase">
                  Reparar Banco de Dados
                </Button>
              </div>,
              { duration: 10000 }
            );
          } else {
            toast.error('Erro ao carregar receitas: ' + error.message);
          }
          setRecipes([]);
        } else {
          setRecipes(data || []);
        }
     } catch (error: any) {
       console.error('Fetch recipes error:', error)
       toast.error('Erro de conexão ao carregar receitas')
     } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAiRecipe = async () => {
    if (!aiInput.trim()) return toast.error('Digite os produtos para a IA')
    setIsAiGenerating(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const products = aiInput.split(',').map(p => p.trim())
      const mainProduct = products[0] || 'Ingrediente'
      
      const newRecipe = {
        title: `Chef IA: ${mainProduct} Criativo`,
        description: `Uma criação exclusiva da nossa inteligência artificial utilizando ${aiInput}.`,
        instructions: `1. Prepare sua bancada com: ${aiInput}.\n2. Combine os sabores conforme sua intuição.\n3. Cozinhe com atenção aos detalhes.\n4. Finalize com um toque especial de temperos frescos.`,
        category: 'Inovação IA',
        difficulty: 'Média',
        image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=400&fit=crop',
        ingredients: products.map(p => ({ name: p, quantity: 'a gosto' }))
      }

        const { data: { session } } = await supabase.auth.getSession()
        
        const recipeToInsert = {
          ...newRecipe,
          author_id: session?.user?.id
        }
 
         const { error: insertError } = await supabase.from('recipes').insert([recipeToInsert])
       
       if (insertError) {
         console.error('Recipe creation error:', insertError);
         if (insertError.message.includes('API key')) {
           throw new Error('Chave de API inválida no Supabase');
         }
         throw insertError;
       }
      
      toast.success('Receita gerada pela IA e salva no catálogo!')
      setIsAiModalOpen(false)
      setAiInput('')
      fetchRecipes()
    } catch (error) {
      toast.error('Erro ao processar IA')
    } finally {
      setIsAiGenerating(false)
    }
  }

  const handleSeed40Recipes = async () => {
    setIsLoading(true)
    toast.info('Iniciando cadastro em massa de 40 receitas...')
    
    const brazilianDishes = [
      'Feijoada Completa', 'Moqueca Baiana', 'Coxinha de Frango', 'Pão de Queijo Mineiro',
      'Brigadeiro Gourmet', 'Farofa de Bacon', 'Bolo de Cenoura com Calda', 'Arroz Carreteiro',
      'Escondidinho de Carne Seca', 'Vaca Atolada', 'Tapioca Recheada', 'Açaí na Tigela',
      'Quindim Tradicional', 'Mousse de Maracujá', 'Pudim de Leite Moça', 'Salpicão de Frango',
      'Maionese de Domingo', 'Churrasco Gaúcho', 'Pastel de Feira', 'Tacacá do Norte',
      'Acarajé Crocante', 'Baião de Dois', 'Galinhada Goiana', 'Peixe na Telha',
      'Bobó de Camarão', 'Caldo Verde', 'Canjica Doce', 'Pamonha de Milho Verde',
      'Curau Cremoso', 'Bolinha de Queijo', 'Kibe Assado', 'Pizza de Calabresa',
      'Lasanha Bolonhesa', 'Strogonoff de Frango', 'Frango com Quiabo', 'Dobradinha',
      'Sarapatel', 'Buchada de Bode', 'Arroz Doce Cremoso', 'Romeu e Julieta'
    ]

    const categories = ['Brasileira', 'Sobremesa', 'Lanche', 'Almoço Especial']
    
    const mockRecipes = brazilianDishes.map((title, i) => ({
      title: title,
      description: `O segredo do melhor ${title} que você já provou. Uma receita que passa de geração em geração.`,
      instructions: `1. Limpe e pique os ingredientes.\n2. Inicie o refogado com alho e cebola.\n3. Adicione os itens principais e cozinhe em fogo brando.\n4. Ajuste o sal e sirva com acompanhamentos frescos.`,
      category: categories[i % categories.length],
      difficulty: i % 3 === 0 ? 'Fácil' : i % 3 === 1 ? 'Média' : 'Difícil',
      image_url: `https://images.unsplash.com/photo-${1504674900247 - i * 1000}?w=800&h=400&fit=crop`,
      ingredients: [
        { name: 'Ingrediente Principal', quantity: '500g' },
        { name: 'Temperos da Casa', quantity: 'a gosto' }
      ]
    }))

    try {
      const { error } = await supabase.from('recipes').insert(mockRecipes)
      if (error) throw error
      toast.success('40 receitas brasileiras cadastradas com sucesso!')
      fetchRecipes()
    } catch (error) {
      toast.error('Erro na importação em massa')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta receita?')) return
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw error
      toast.success('Removido!')
      fetchRecipes()
    } catch (error) {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <div className="space-y-6">
       {isAdmin === false && (
         <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl mb-6 flex items-center gap-3">
           <AlertCircle className="text-red-600" />
           <div>
             <p className="text-xs font-black text-red-700 uppercase">Acesso Restrito pelo Banco de Dados</p>
             <p className="text-[10px] text-red-600 font-bold uppercase">Suas permissões RLS não permitem salvar. Use a página /admin-fix primeiro.</p>
           </div>
         </div>
       )}

      <div className="flex justify-between items-center gap-4 flex-wrap bg-white p-4 rounded-2xl shadow-sm border">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900">Portal de Gastronomia</h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Controle total das receitas e IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed40Recipes} disabled={isLoading} className="border-2 font-black uppercase text-[10px] h-10 px-6">
            <Zap className="mr-2 h-4 w-4 text-amber-500 fill-amber-500" /> Semear 40 Receitas
          </Button>
          <Button onClick={() => setIsAiModalOpen(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-black uppercase text-[10px] h-10 px-6 shadow-lg shadow-purple-100">
            <BrainCircuit className="mr-2 h-4 w-4" /> Criar com IA
          </Button>
          <Button onClick={() => setIsAiModalOpen(true)} className="bg-zinc-900 font-black uppercase text-[10px] h-10 px-6">
            <Plus className="mr-2 h-4 w-4" /> Nova Manual
          </Button>
        </div>
      </div>

      <div className="border-2 border-zinc-100 rounded-3xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow className="border-b-2">
              <TableHead className="text-[10px] font-black uppercase py-4">Receita</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Categoria</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-center">Nível</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && recipes.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-zinc-300" /></TableCell></TableRow>
            ) : (
              recipes.map((item) => (
                <TableRow key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <SmartImage src={item.image_url} tableName="recipes" itemId={item.id} className="w-16 h-10 object-cover rounded-xl shadow-sm border" />
                      <span className="font-black text-xs uppercase italic tracking-tighter">{item.title}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-[10px] font-bold uppercase bg-zinc-100 px-2 py-1 rounded-full">{item.category}</span></TableCell>
                  <TableCell className="text-center"><span className="text-[10px] font-black uppercase">{item.difficulty}</span></TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 rounded-xl">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-4 border-purple-100">
          <DialogHeader>
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-2">
              <Sparkles className="text-purple-600" size={24} />
            </div>
            <DialogTitle className="font-black uppercase italic tracking-tighter text-2xl">Gerador Gourmet IA</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase text-zinc-400">
              Digite os produtos disponíveis para criar uma receita magistral.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ingredientes do Carrinho</Label>
              <Textarea 
                placeholder="Ex: Leite condensado, Morangos, Bolacha Maria..." 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                className="min-h-[120px] border-2 border-zinc-100 rounded-2xl focus:border-purple-500 transition-all text-sm font-medium"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsAiModalOpen(false)} className="font-black uppercase text-[10px] rounded-xl">Cancelar</Button>
            <Button 
              onClick={handleCreateAiRecipe} 
              disabled={isAiGenerating}
              className="bg-purple-600 hover:bg-purple-700 font-black uppercase text-[10px] rounded-xl px-8 h-12 shadow-lg shadow-purple-200"
            >
              {isAiGenerating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Gerar Gastronomia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
