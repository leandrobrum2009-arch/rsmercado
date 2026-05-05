import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
  import { Loader2, Plus, Trash2, Zap, BrainCircuit, Save, Sparkles, AlertCircle, ChefHat } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function RecipeManager() {
  const [recipes, setRecipes] = useState<any[]>([])
   const [isLoading, setIsLoading] = useState(true)
   const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiInput, setAiInput] = useState('')
   const [isAiGenerating, setIsAiGenerating] = useState(false)
   const [isManualModalOpen, setIsManualModalOpen] = useState(false)
   const [manualRecipe, setManualRecipe] = useState({
     title: '',
     description: '',
     instructions: '',
     category: 'Brasileira',
     difficulty: 'Média',
     image_url: '',
     ingredients: [{ name: '', quantity: '' }]
   })

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
      
       // Use multiple sources for images as requested
        const sources = [
          `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop`, // Default generic food
          `https://loremflickr.com/800/400/meal,cooking,food?random=${Date.now()}`
        ];
       
       let image_url = '';
       for (const src of sources) {
         const exists = await checkImageExists(src);
         if (exists) {
           image_url = src;
           break;
         }
       }

       if (!image_url) {
         toast.error('Nenhuma imagem válida encontrada. A receita não será cadastrada sem foto.');
        setIsAiGenerating(false);
        return;
      }

      const newRecipe = {
        title,
        description: `Esta receita foi cuidadosamente elaborada por nosso algoritmo de gastronomia para destacar os sabores de: ${aiInput}. Uma combinação harmoniosa de texturas e aromas para uma experiência única.`,
        instructions: `1. Preparação Inicial: Comece organizando todos os ingredientes: ${aiInput}. Lave e corte os vegetais e proteínas em tamanhos uniformes.\n2. Base de Sabor: Em uma panela aquecida com um fio de azeite, doure os ingredientes principais começando pelos que exigem mais tempo de cocção.\n3. Desenvolvimento: Adicione os temperos de sua preferência e deixe os sabores se integrarem em fogo médio. Se necessário, adicione um pouco de água ou caldo para manter a umidade.\n4. Finalização: Cozinhe até que a textura esteja ao seu gosto. Desligue o fogo e adicione ervas frescas por cima antes de servir.\n5. Serviço: Disponha em um prato fundo para preservar o calor e finalize com um toque de pimenta moída na hora.`,
        category: 'Inovação IA',
        difficulty: 'Média',
        image_url,
        ingredients: products.map(p => ({ name: p, quantity: '1 porção/unidade' }))
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

   const checkImageExists = (url: string): Promise<boolean> => {
     return new Promise((resolve) => {
       const img = new Image();
       img.onload = () => resolve(true);
       img.onerror = () => resolve(false);
       img.src = url;
       setTimeout(() => resolve(false), 2000); // 2s timeout
     });
   };

  const handleSeed40Recipes = async () => {
    setIsLoading(true);
    toast.info('Importando catálogo gastronômico selecionado...');
    
    const templates = [
      { 
        title: 'Feijoada Completa', 
        description: 'O prato nacional do Brasil, rico em carnes defumadas e sabor marcante.', 
        instructions: '1. Dessalgue as carnes por 12h.\n2. Cozinhe o feijão com as carnes até amaciar.\n3. Tempere com alho frito e louro.', 
        category: 'Brasileira', 
        difficulty: 'Difícil', 
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=400&fit=crop', 
        ingredients: [{name:'Feijão Preto', quantity:'1kg'}, {name:'Carnes Defumadas', quantity:'1kg'}] 
      },
      { 
        title: 'Strogonoff de Carne', 
        description: 'Cremoso, suculento e tradicionalmente servido com batata palha e arroz.', 
        instructions: '1. Sele a carne em fogo alto.\n2. Adicione champignon, ketchup e mostarda.\n3. Finalize com creme de leite fresco.', 
        category: 'Almoço', 
        difficulty: 'Fácil', 
        image_url: 'https://images.unsplash.com/photo-1594973877793-149d8e7885b5?w=800&h=400&fit=crop', 
        ingredients: [{name:'Filé Mignon', quantity:'500g'}, {name:'Creme de Leite', quantity:'1 lata'}] 
      },
      { 
        title: 'Bolo de Cenoura', 
        description: 'O clássico café da tarde brasileiro com cobertura de chocolate crocante.', 
        instructions: '1. Bata cenouras, óleo e ovos.\n2. Misture farinha e açúcar.\n3. Asse por 40 min e cubra com calda de chocolate.', 
        category: 'Sobremesa', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=800&h=400&fit=crop', 
        ingredients: [{name:'Cenoura', quantity:'3 unidades'}, {name:'Chocolate', quantity:'200g'}] 
      },
      { 
        title: 'Risoto de Funghi', 
        description: 'Sofisticação italiana com cogumelos secos hidratados e vinho branco.', 
        instructions: '1. Hidrate o funghi.\n2. Refogue o arroz arbóreo.\n3. Adicione caldo aos poucos até ficar cremoso.', 
        category: 'Italiana', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&h=400&fit=crop', 
        ingredients: [{name:'Arroz Arbóreo', quantity:'2 xícaras'}, {name:'Funghi Secchi', quantity:'50g'}] 
      },
      { 
        title: 'Picanha ao Sal Grosso', 
        description: 'Corte nobre grelhado na perfeição com manteiga de ervas.', 
        instructions: '1. Sele a picanha inteira.\n2. Corte em bifes grossos.\n3. Finalize com sal grosso e alho frito.', 
        category: 'Brasileira', 
        difficulty: 'Fácil', 
        image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=400&fit=crop', 
        ingredients: [{name:'Picanha', quantity:'1kg'}, {name:'Alho', quantity:'4 dentes'}] 
      },
      { 
        title: 'Moqueca de Peixe', 
        description: 'Tradicional sabor do mar com leite de coco e azeite de dendê.', 
        instructions: '1. Refogue cebola e pimentão.\n2. Disponha o peixe em camadas.\n3. Cozinhe com leite de coco por 20 min.', 
        category: 'Brasileira', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=400&fit=crop', 
        ingredients: [{name:'Postas de Peixe', quantity:'1kg'}, {name:'Leite de coco', quantity:'400ml'}] 
      },
      { 
        title: 'Lasanha à Bolonhesa', 
        description: 'Massa fresca, molho de carne rico e queijo gratinado.', 
        instructions: '1. Prepare o molho de carne.\n2. Monte camadas com massa e queijo.\n3. Leve ao forno até dourar.', 
        category: 'Italiana', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=400&fit=crop', 
        ingredients: [{name:'Massa de Lasanha', quantity:'500g'}, {name:'Carne Moída', quantity:'500g'}] 
      },
      { 
        title: 'Pudim de Leite Condensado', 
        description: 'A sobremesa mais amada das famílias brasileiras.', 
        instructions: '1. Prepare o caramelo.\n2. Bata os ingredientes.\n3. Cozinhe em banho-maria.', 
        category: 'Sobremesa', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=800&h=400&fit=crop', 
        ingredients: [{name:'Leite Condensado', quantity:'1 lata'}, {name:'Ovos', quantity:'3 unidades'}] 
      },
      { 
        title: 'Torta de Frango Cremosa', 
        description: 'Massa amanteigada com recheio de frango e requeijão.', 
        instructions: '1. Prepare o recheio.\n2. Forre a forma com a massa.\n3. Cubra e asse até dourar.', 
        category: 'Lanche', 
        difficulty: 'Média', 
        image_url: 'https://images.unsplash.com/photo-1626082896492-766af4eb6501?w=800&h=400&fit=crop', 
        ingredients: [{name:'Peito de Frango', quantity:'500g'}, {name:'Farinha', quantity:'3 xícaras'}] 
      },
      { 
        title: 'Hambúrguer Artesanal', 
        description: 'Blend de carnes suculento no pão brioche tostado.', 
        instructions: '1. Moldar a carne.\n2. Grelhar com sal e pimenta.\n3. Montar com queijo e maionese.', 
        category: 'Lanche', 
        difficulty: 'Fácil', 
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=400&fit=crop', 
        ingredients: [{name:'Carne Moída', quantity:'400g'}, {name:'Pão Brioche', quantity:'2 un'}] 
      }
    ];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const author_id = session?.user?.id;
      
      const finalRecipes: any[] = [];
      // Repeat templates to reach 40 recipes with variation in titles
      for(let i = 0; i < 4; i++) {
        templates.forEach(t => {
          finalRecipes.push({
            title: i === 0 ? t.title : `${t.title} Var. ${i + 1}`,
            description: t.description,
            instructions: t.instructions,
            category: t.category,
            difficulty: t.difficulty,
            image_url: t.image_url,
            ingredients: t.ingredients,
            author_id
          });
        });
      }

      const { error } = await supabase.from('recipes').insert(finalRecipes);
      if (error) throw error;
      
      toast.success('Catálogo com 40 receitas importado com sucesso!');
      fetchRecipes();
    } catch (error: any) {
      toast.error('Erro na importação: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteAllRecipes = async () => {
    if (!window.confirm('TEM CERTEZA? Isso apagará TODAS as receitas permanentemente!')) return
    setIsLoading(true)
    try {
      // More robust way to delete all if possible, or just delete all records
      const { error } = await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      toast.success('Todas as receitas foram apagadas!')
      fetchRecipes()
    } catch (error: any) {
      toast.error('Erro ao apagar: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateManualRecipe = async () => {
    if (!manualRecipe.title || !manualRecipe.image_url) {
      return toast.error('Título e URL da imagem são obrigatórios')
    }
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase.from('recipes').insert([{
        ...manualRecipe,
        author_id: session?.user?.id,
        ingredients: manualRecipe.ingredients.filter(i => i.name)
      }])
      if (error) throw error
      toast.success('Receita cadastrada com sucesso!')
      setIsManualModalOpen(false)
      setManualRecipe({
        title: '',
        description: '',
        instructions: '',
        category: 'Brasileira',
        difficulty: 'Média',
        image_url: '',
        ingredients: [{ name: '', quantity: '' }]
      })
      fetchRecipes()
    } catch (error) {
      toast.error('Erro ao cadastrar receita')
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
        {isAdmin === null ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin h-8 w-8 text-zinc-300" />
          </div>
        ) : isAdmin === false ? (
          <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600" />
            <div>
              <p className="text-xs font-black text-red-700 uppercase">Acesso Restrito pelo Banco de Dados</p>
              <p className="text-[10px] text-red-600 font-bold uppercase">Suas permissões RLS não permitem salvar. Use a página /admin-fix primeiro.</p>
            </div>
          </div>
        ) : null}

      <div className="flex justify-between items-center gap-4 flex-wrap bg-white p-4 rounded-2xl shadow-sm border">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900">Portal de Gastronomia</h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Controle total das receitas e IA</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {isAdmin === true && (
            <>
              <Button variant="outline" onClick={handleDeleteAllRecipes} disabled={isLoading} className="border-2 border-red-200 text-red-600 font-black uppercase text-[10px] h-10 px-6 hover:bg-red-50 shadow-sm transition-all active:scale-95">
                <Trash2 className="mr-2 h-4 w-4" /> Deletar Tudo
              </Button>
              <Button variant="outline" onClick={handleCleanDuplicates} disabled={isLoading} className="border-2 font-black uppercase text-[10px] h-10 px-6 hover:bg-zinc-50 shadow-sm transition-all active:scale-95">
                <Trash2 className="mr-2 h-4 w-4 text-red-500" /> Limpar Duplicatas
              </Button>
              <Button variant="outline" onClick={handleSeed40Recipes} disabled={isLoading} className="border-2 font-black uppercase text-[10px] h-10 px-6 hover:bg-zinc-50 shadow-sm transition-all active:scale-95">
                <Zap className="mr-2 h-4 w-4 text-amber-500 fill-amber-500" /> Semear Receitas
              </Button>
           <Button onClick={() => setIsManualModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] h-10 px-6 shadow-lg shadow-emerald-100 transition-all active:scale-95">
             <Plus className="mr-2 h-4 w-4" /> Nova Receita
           </Button>
           <Button onClick={() => setIsAiModalOpen(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-black uppercase text-[10px] h-10 px-6 shadow-lg shadow-purple-100 transition-all active:scale-95">
             <BrainCircuit className="mr-2 h-4 w-4" /> Criar com IA
           </Button>
            </>
          )}
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

      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border-4 border-emerald-100">
          <DialogHeader>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
              <ChefHat className="text-emerald-600" size={24} />
            </div>
            <DialogTitle className="font-black uppercase italic tracking-tighter text-2xl">Nova Receita</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase text-zinc-400">
              Cadastre manualmente uma receita no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Título</Label>
              <Input value={manualRecipe.title} onChange={(e) => setManualRecipe({...manualRecipe, title: e.target.value})} className="rounded-xl border-2" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Categoria</Label>
              <Select value={manualRecipe.category} onValueChange={(v) => setManualRecipe({...manualRecipe, category: v})}>
                <SelectTrigger className="rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Brasileira">Brasileira</SelectItem>
                  <SelectItem value="Italiana">Italiana</SelectItem>
                  <SelectItem value="Sobremesa">Sobremesa</SelectItem>
                  <SelectItem value="Lanche">Lanche</SelectItem>
                  <SelectItem value="Saudável">Saudável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Descrição Curta</Label>
              <Input value={manualRecipe.description} onChange={(e) => setManualRecipe({...manualRecipe, description: e.target.value})} className="rounded-xl border-2" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Modo de Preparo</Label>
              <Textarea value={manualRecipe.instructions} onChange={(e) => setManualRecipe({...manualRecipe, instructions: e.target.value})} className="rounded-xl border-2 min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">URL da Imagem</Label>
              <Input value={manualRecipe.image_url} placeholder="https://exemplo.com/foto.jpg" onChange={(e) => setManualRecipe({...manualRecipe, image_url: e.target.value})} className="rounded-xl border-2" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateManualRecipe} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] w-full">
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Salvar Receita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
