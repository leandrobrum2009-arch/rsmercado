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

  const normalize = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, ""); // Remove special chars
  };

  const handleCreateAiRecipe = async () => {
    if (!aiInput.trim()) return toast.error('Digite os produtos para a IA')
    setIsAiGenerating(true)
    
    try {
      const products = aiInput.split(',').map(p => p.trim())
      const mainProduct = products[0] || 'Ingrediente'
      const title = `Chef IA: ${mainProduct} Criativo`
      
      // Check for duplicates with robust normalization
      const { data: allRecipes } = await supabase.from('recipes').select('title')
      const nTitle = normalize(title)
      const isDuplicate = (allRecipes || []).some(r => normalize(r.title) === nTitle)

      if (isDuplicate) {
        toast.error('Já existe uma receita similar a esta!');
        setIsAiGenerating(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newRecipe = {
        title,
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
    
    const detailedTemplates = [
      { 
        title: 'Feijoada Completa Tradicional', 
        description: 'A clássica feijoada brasileira, rica em sabores e tradição. Um prato completo que reúne o melhor das carnes defumadas com feijão preto selecionado.', 
        instructions: '1. Deixe o feijão de molho por 12 horas.\n2. Cozinhe o feijão com as carnes salgadas (previamente dessalgadas).\n3. Adicione o paio e a linguiça calabresa após 40 minutos.\n4. Faça um refogado com alho, cebola e uma concha do caldo do feijão amassado.\n5. Junte o refogado à panela e deixe engrossar o caldo.', 
        category: 'Brasileira', 
        difficulty: 'Difícil', 
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=400&fit=crop', 
        ingredients: [
          {name:'Feijão Preto', quantity:'1kg'},
          {name:'Carne Seca', quantity:'500g'},
          {name:'Lombo Salgado', quantity:'500g'},
          {name:'Linguiça Calabresa', quantity:'2 unidades'},
          {name:'Paio', quantity:'2 unidades'},
          {name:'Bacon', quantity:'200g'},
          {name:'Cebola', quantity:'2 unidades'},
          {name:'Alho', quantity:'4 dentes'},
          {name:'Louro', quantity:'3 folhas'}
        ] 
      },
      { 
        title: 'Strogonoff de Frango Cremoso', 
        description: 'Um prato rápido, prático e que agrada a todos. O segredo está no equilíbrio entre o molho de tomate e o creme de leite.', 
        instructions: '1. Corte o frango em cubos e tempere.\n2. Doure a cebola e o alho, depois acrescente o frango.\n3. Quando o frango estiver cozido, adicione o ketchup, a mostarda e os cogumelos.\n4. Desligue o fogo e misture o creme de leite suavemente.\n5. Sirva com arroz branco e batata palha.', 
        category: 'Almoço', 
        difficulty: 'Fácil', 
        image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=400&fit=crop', 
        ingredients: [
          {name:'Peito de Frango', quantity:'500g'},
          {name:'Creme de Leite', quantity:'1 lata'},
          {name:'Ketchup', quantity:'3 colheres'},
          {name:'Mostarda', quantity:'1 colher'},
          {name:'Cogumelos em conserva', quantity:'100g'},
          {name:'Cebola', quantity:'1 unidade'},
          {name:'Alho', quantity:'2 dentes'}
        ] 
      },
      { 
        title: 'Bolo de Cenoura com Chocolate', 
        description: 'O lanche perfeito para a tarde. Massa fofinha de cenoura com uma cobertura de chocolate crocante que todo mundo ama.', 
        instructions: '1. Bata no liquidificador as cenouras, os ovos e o óleo.\n2. Em uma tigela, misture o açúcar e a farinha, depois adicione a mistura do liquidificador.\n3. Por último, adicione o fermento.\n4. Asse por 40 minutos a 180°C.\n5. Para a calda: misture chocolate, açúcar e leite no fogo até engrossar.', 
        category: 'Sobremesa', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=800&h=400&fit=crop', 
        ingredients: [
          {name:'Cenoura média', quantity:'3 unidades'},
          {name:'Ovo', quantity:'4 unidades'},
          {name:'Óleo', quantity:'1 xícara'},
          {name:'Açúcar', quantity:'2 xícaras'},
          {name:'Farinha de Trigo', quantity:'2 xícaras'},
          {name:'Fermento em pó', quantity:'1 colher'},
          {name:'Chocolate em pó', quantity:'1 xícara'}
        ] 
      },
      { 
        title: 'Moqueca de Peixe Capixaba', 
        description: 'O verdadeiro sabor do mar em uma panela de barro. Peixe fresco cozido lentamente com tomate, coentro e urucum.', 
        instructions: '1. Tempere o peixe com sal e limão.\n2. Em uma panela, faça camadas de cebola, tomate e peixe.\n3. Regue com azeite e adicione o urucum dissolvido.\n4. Cozinhe com a panela tampada por 20 minutos.\n5. Finalize com muito coentro e cebolinha.', 
        category: 'Brasileira', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=400&fit=crop', 
        ingredients: [
          {name:'Postas de Peixe (Badejo ou Robalo)', quantity:'1kg'},
          {name:'Tomate maduro', quantity:'4 unidades'},
          {name:'Cebola branca', quantity:'2 unidades'},
          {name:'Coentro fresco', quantity:'1 maço'},
          {name:'Urucum ou Colorau', quantity:'2 colheres'},
          {name:'Limão', quantity:'2 unidades'},
          {name:'Azeite de Oliva', quantity:'100ml'}
        ] 
      },
      { 
        title: 'Lasanha à Bolonhesa', 
        description: 'Massa clássica italiana montada em camadas com molho de carne rico em sabor e queijo derretido.', 
        instructions: '1. Prepare o molho bolonhesa refogando a carne com temperos e extrato de tomate.\n2. Faça um molho branco (bechamel) com leite e farinha.\n3. Monte a lasanha: molho, massa, presunto, queijo, repetindo as camadas.\n4. Finalize com parmesão ralado por cima.\n5. Gratine no forno por 30 minutos.', 
        category: 'Italiana', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=400&fit=crop', 
        ingredients: [
          {name:'Massa de Lasanha', quantity:'500g'},
          {name:'Carne Moída', quantity:'500g'},
          {name:'Queijo Mussarela', quantity:'400g'},
          {name:'Presunto', quantity:'300g'},
          {name:'Molho de Tomate', quantity:'2 sachês'},
          {name:'Leite', quantity:'500ml'},
          {name:'Farinha de Trigo', quantity:'2 colheres'}
        ] 
      },
      { 
        title: 'Pudim de Leite Condensado', 
        description: 'A sobremesa mais amada das famílias brasileiras. Textura aveludada e calda de caramelo perfeita.', 
        instructions: '1. Derreta o açúcar na forma para fazer a calda.\n2. Bata no liquidificador o leite condensado, o leite e os ovos.\n3. Despeje na forma caramelizada.\n4. Asse em banho-maria por cerca de 1 hora e 30 minutos.\n5. Deixe esfriar e leve à geladeira por 6 horas antes de desenformar.', 
        category: 'Sobremesa', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=800&h=400&fit=crop', 
        ingredients: [
          {name:'Leite Condensado', quantity:'1 lata'},
          {name:'Leite Integral', quantity:'1 lata (medida)'},
          {name:'Ovo', quantity:'3 unidades'},
          {name:'Açúcar (para a calda)', quantity:'1 xícara'}
        ] 
      }
    ];

    try {
      // Buscar títulos existentes para evitar duplicatas
      const { data: existingRecipes } = await supabase.from('recipes').select('title');
      const existingSet = new Set((existingRecipes || []).map(r => normalize(r.title)));

      const finalRecipes = [];
      let addedCount = 0;

      for(let i = 0; i < 40; i++) {
        const template = detailedTemplates[i % detailedTemplates.length];
        const baseTitle = template.title;
        
        // Só adiciona se o título (sem o sufixo anterior) não existir
        const nTitle = normalize(baseTitle);
        if (!existingSet.has(nTitle)) {
          finalRecipes.push({ ...template, title: baseTitle });
          existingSet.add(nTitle);
          addedCount++;
        }
      }

      if (finalRecipes.length > 0) {
        const { error } = await supabase.from('recipes').insert(finalRecipes)
        if (error) throw error
        toast.success(`${addedCount} novas receitas brasileiras cadastradas!`);
      } else {
        toast.info('Todas as receitas já existem no banco de dados.');
      }
      
      fetchRecipes()
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro na importação em massa')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCleanDuplicates = async () => {
    setIsLoading(true)
    try {
      const { data } = await supabase.from('recipes').select('id, title').order('created_at', { ascending: true })
      if (!data) return

      const seen = new Set()
      const toDelete = []

      for (const recipe of data) {
        const nTitle = normalize(recipe.title)
        if (seen.has(nTitle)) {
          toDelete.push(recipe.id)
        } else {
          seen.add(nTitle)
        }
      }

      if (toDelete.length > 0) {
        const { error } = await supabase.from('recipes').delete().in('id', toDelete)
        if (error) throw error
        toast.success(`${toDelete.length} duplicatas removidas!`)
        fetchRecipes()
      } else {
        toast.info('Nenhuma duplicata encontrada.')
      }
    } catch (error) {
      toast.error('Erro ao limpar duplicatas')
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleCleanDuplicates} disabled={isLoading} className="border-2 font-black uppercase text-[10px] h-10 px-6">
            <Trash2 className="mr-2 h-4 w-4 text-red-500" /> Limpar Duplicatas
          </Button>
          <Button variant="outline" onClick={handleSeed40Recipes} disabled={isLoading} className="border-2 font-black uppercase text-[10px] h-10 px-6">
            <Zap className="mr-2 h-4 w-4 text-amber-500 fill-amber-500" /> Semear Receitas
          </Button>
          <Button onClick={() => setIsAiModalOpen(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-black uppercase text-[10px] h-10 px-6 shadow-lg shadow-purple-100">
            <BrainCircuit className="mr-2 h-4 w-4" /> Criar com IA
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
                  <TableCell><span className="text-[10px] font-bold uppercase bg-zinc-100 px-2 py-1 rounded-md">{item.category}</span></TableCell>
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
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
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
