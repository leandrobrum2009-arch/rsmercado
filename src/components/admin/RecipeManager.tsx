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
      
      // Use multiple sources for images as requested
       // Use multiple sources for images as requested
       const sources = [
         `https://loremflickr.com/800/400/food,recipe,${encodeURIComponent(mainProduct.toLowerCase())}`,
         `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop`,
         `https://picsum.photos/800/400?random=${Date.now()}`
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
     toast.info('Iniciando cadastro em massa de 40 receitas...');
     
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
      },
      {
        title: 'Arroz Carreteiro Gaúcho',
        description: 'Um clássico do Rio Grande do Sul, feito com sobras de churrasco ou charque, arroz e muitos temperos.',
        instructions: '1. Preparação: Comece fritando o charque em cubos em fogo médio até que esteja bem dourado e crocante.\n2. Refogado: Adicione cebola picada, alho esmagado e pimentão vermelho, refogando até os vegetais murcharem.\n3. Arroz: Acrescente o arroz agulhinha e frite por 2 minutos para absorver a gordura e os sabores das carnes.\n4. Cozimento: Adicione água quente suficiente para cobrir (proporção 2:1) e deixe cozinhar com a panela semi-tampada.\n5. Finalização: Quando a água secar, desligue o fogo, tampe totalmente e deixe descansar por 5 minutos. Sirva com salsinha fresca por cima.',
        category: 'Brasileira',
        difficulty: 'Fácil',
        image_url: 'https://images.unsplash.com/photo-1512058560366-cd2429555614?w=800&h=400&fit=crop',
        ingredients: [
          {name: 'Arroz Agulhinha', quantity: '2 xícaras'},
          {name: 'Charque picado', quantity: '500g'},
          {name: 'Cebola média', quantity: '1 unidade'},
          {name: 'Alho', quantity: '3 dentes'},
          {name: 'Pimentão Vermelho', quantity: '1/2 unidade'},
          {name: 'Salsinha e Cebolinha', quantity: 'a gosto'}
        ]
      },
      {
        title: 'Torta de Frango com Requeijão',
        description: 'Torta salgada de liquidificador, super prática e com recheio cremoso de frango desfiado. Ideal para lanches rápidos ou jantares leves.',
        instructions: '1. Recheio: Refogue o frango desfiado com cebola, alho, milho verde e molho de tomate até ficar suculento.\n2. Massa: No liquidificador, bata o leite, o óleo, os ovos e o sal. Adicione a farinha aos poucos e por último o fermento.\n3. Montagem: Em uma forma untada, despeje metade da massa.\n4. Camadas: Distribua o recheio de frango e coloque colheradas generosas de requeijão por cima.\n5. Forno: Cubra com o restante da massa e leve ao forno pré-aquecido a 200°C por cerca de 35 a 40 minutos.',
        category: 'Lanche',
        difficulty: 'Fácil',
        image_url: 'https://images.unsplash.com/photo-1626082896492-766af4eb6501?w=800&h=400&fit=crop',
        ingredients: [
          {name: 'Peito de Frango cozido e desfiado', quantity: '500g'},
          {name: 'Requeijão Cremoso', quantity: '200g'},
          {name: 'Farinha de Trigo', quantity: '3 xícaras'},
          {name: 'Leite Integral', quantity: '2 xícaras'},
          {name: 'Ovo', quantity: '3 unidades'},
          {name: 'Óleo de Soja', quantity: '1/2 xícara'},
          {name: 'Fermento Químico', quantity: '1 colher'}
        ]
      },
      {
        title: 'Escondidinho de Carne Seca',
        description: 'Um prato reconfortante que combina o purê de mandioca cremoso com o sabor intenso da carne seca bem temperada.',
        instructions: '1. Purê: Cozinhe a mandioca até ficar bem macia. Amasse e misture com leite e manteiga até formar um purê liso.\n2. Carne: Refogue a carne seca desfiada com cebola roxa e manteiga de garrafa.\n3. Montagem: Em um refratário, faça uma camada de purê, depois a carne seca e finalize com mais purê.\n4. Cobertura: Cubra com queijo coalho ralado ou mussarela.\n5. Gratinar: Leve ao forno alto apenas para dourar o queijo por cima.',
        category: 'Nordestina',
        difficulty: 'Média',
        image_url: 'https://images.unsplash.com/photo-1551462147-37885acc3c41?w=800&h=400&fit=crop',
        ingredients: [
          {name: 'Mandioca cozida', quantity: '1kg'},
          {name: 'Carne Seca desfiada', quantity: '500g'},
          {name: 'Manteiga de Garrafa', quantity: '3 colheres'},
          {name: 'Leite Integral', quantity: '200ml'},
          {name: 'Queijo Coalho', quantity: '200g'},
          {name: 'Cebola Roxa', quantity: '1 unidade'}
        ]
      },
      {
        title: 'Risoto de Funghi Secchi',
        description: 'Um clássico da culinária italiana, cremoso e com o sabor profundo e amadeirado dos cogumelos secos. Perfeito para um jantar especial.',
        instructions: '1. Preparo do Funghi: Hidrate o funghi secchi em água morna por 30 minutos. Coe e reserve o líquido.\n2. Refogado: Doure a cebola e o alho em manteiga e azeite. Adicione o arroz arbóreo e refogue.\n3. Vinho: Adicione o vinho branco seco e mexa até evaporar.\n4. Caldo: Vá adicionando o líquido do funghi e caldo de legumes quente, concha por concha, mexendo sempre.\n5. Finalização: Quando o arroz estiver al dente, adicione o funghi picado, queijo parmesão ralado e uma colher de manteiga gelada para dar brilho.',
        category: 'Italiana',
        difficulty: 'Média',
        image_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&h=400&fit=crop',
        ingredients: [
          {name: 'Arroz Arbóreo', quantity: '2 xícaras'},
          {name: 'Funghi Secchi', quantity: '50g'},
          {name: 'Vinho Branco Seco', quantity: '150ml'},
          {name: 'Caldo de Legumes', quantity: '1.5L'},
          {name: 'Queijo Parmesão', quantity: '100g'},
          {name: 'Manteiga', quantity: '2 colheres'}
        ]
      },
       { title: 'Moqueca de Camarão', category: 'Baiana', keywords: 'shrimp,moqueca' },
       { title: 'Filé Mignon ao Poivre', category: 'Francesa', keywords: 'steak,pepper' },
       { title: 'Risoto de Cogumelos', category: 'Italiana', keywords: 'risotto,mushroom' },
       { title: 'Salmão com Alcaparras', category: 'Saudável', keywords: 'salmon,caper' },
       { title: 'Picanha ao Alho', category: 'Churrasco', keywords: 'picanha,garlic' },
       { title: 'Bacalhau à Gomes de Sá', category: 'Portuguesa', keywords: 'codfish,potato' },
       { title: 'Nhoque de Batata Doce', category: 'Massa', keywords: 'gnocchi,sweetpotato' },
       { title: 'Quiche de Alho Poró', category: 'Francesa', keywords: 'quiche,leek' },
       { title: 'Ceviche Clássico', category: 'Peruana', keywords: 'ceviche,fish' },
       { title: 'Paella Valeciana', category: 'Espanhola', keywords: 'paella,seafood' },
       { title: 'Ratatouille Tradicional', category: 'Vegana', keywords: 'vegetables,stew' },
       { title: 'Hambúrguer de Grão de Bico', category: 'Vegetariana', keywords: 'burger,chickpea' },
       { title: 'Sushi Variado', category: 'Japonesa', keywords: 'sushi,fish' },
       { title: 'Pad Thai de Frango', category: 'Tailandesa', keywords: 'noodles,chicken' },
       { title: 'Guacamole com Nachos', category: 'Mexicana', keywords: 'avocado,nacho' },
       { title: 'Mousse de Maracujá', category: 'Sobremesa', keywords: 'passionfruit,mousse' },
       { title: 'Petit Gâteau', category: 'Sobremesa', keywords: 'chocolate,lava' },
       { title: 'Torta de Maçã', category: 'Sobremesa', keywords: 'apple,pie' },
       { title: 'Cheesecake de Frutas Vermelhas', category: 'Sobremesa', keywords: 'cheesecake,berry' },
       { title: 'Panqueca Americana', category: 'Café', keywords: 'pancake,syrup' },
       { title: 'Carne de Panela com Batata', category: 'Caseira', keywords: 'meat,potato' },
       { title: 'Frango Assado com Ervas', category: 'Assado', keywords: 'chicken,herb' },
       { title: 'Lasanha de Berinjela', category: 'Vegetariana', keywords: 'eggplant,lasagna' },
       { title: 'Espaguete à Carbonara', category: 'Italiana', keywords: 'pasta,bacon' },
       { title: 'Arroz de Marisco', category: 'Portuguesa', keywords: 'rice,seafood' },
       { title: ' Yakisoba de Carne', category: 'Chinesa', keywords: 'noodles,meat' },
       { title: 'Tacos de Carne Asada', category: 'Mexicana', keywords: 'meat,taco' },
       { title: 'Falafel com Hummus', category: 'Árabe', keywords: 'chickpea,dip' },
       { title: 'Kibe Assado Recheado', category: 'Árabe', keywords: 'meat,wheat' },
       { title: 'Tabule Refrescante', category: 'Árabe', keywords: 'salad,parsley' },
       { title: 'Bobó de Camarão', category: 'Baiana', keywords: 'shrimp,cassava' },
       { title: 'Arroz com Frango e Pequi', category: 'Goiana', keywords: 'chicken,rice,pequi' },
       { title: 'Feijão Tropeiro Mineiro', category: 'Mineira', keywords: 'beans,bacon' },
       { title: 'Galinhada com Guariroba', category: 'Regional', keywords: 'chicken,rice' },
       { title: 'Pão de Ló de Laranja', category: 'Bolo', keywords: 'cake,orange' },
       { title: 'Torta Holandesa', category: 'Sobremesa', keywords: 'pie,cookie' },
       { title: 'Pudim de Chia com Coco', category: 'Fitness', keywords: 'chia,coconut' },
       { title: 'Salada Caesar com Frango', category: 'Salada', keywords: 'salad,chicken' },
       { title: 'Sopa de Cebola Francesa', category: 'Sopa', keywords: 'onion,soup' },
       { title: 'Bruschetta de Tomate', category: 'Entrada', keywords: 'bread,tomato' }
     ];
 
     try {
       const { data: existingRecipes } = await supabase.from('recipes').select('title');
       const existingSet = new Set((existingRecipes || []).map(r => normalize(r.title)));
 
       const finalRecipes = [];
       let addedCount = 0;
 
       const imageSources = [
         (k: string) => `https://loremflickr.com/800/400/food,recipe,${k}`,
         (k: string) => `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop&q=${k}`,
         (k: string) => `https://picsum.photos/seed/${k}/800/400`
       ];

       for(let i = 0; i < 40; i++) {
         const base = detailedTemplates[i % detailedTemplates.length];
         const variant = i >= detailedTemplates.length ? ` ${Math.floor(i / detailedTemplates.length) + 1}` : '';
         const title = base.title + variant;
         const nTitle = normalize(title);
         
         if (!existingSet.has(nTitle)) {
           const keywords = (base as any).keywords || normalize(base.title);
           const sources = [
             `https://loremflickr.com/800/400/food,recipe,${keywords.split(',')[0]}?random=${i}`,
             `https://picsum.photos/seed/${keywords}${i}/800/400`,
             `https://source.unsplash.com/featured/800x400?food,${keywords.split(',')[0]}&sig=${i}`,
             `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop`
           ];
           
           let chosenUrl = '';
           for (const url of sources) {
             if (await checkImageExists(url)) {
               chosenUrl = url;
               break;
             }
           }
 
           if (chosenUrl) {
             finalRecipes.push({ 
               title,
               description: (base as any).description || `Uma deliciosa receita de ${title.toLowerCase()}.`,
               instructions: (base as any).instructions || `1. Preparar ingredientes.\n2. Cozinhar bem.\n3. Servir quente.`,
               category: base.category,
               difficulty: (base as any).difficulty || 'Média',
               image_url: chosenUrl,
               ingredients: (base as any).ingredients || [{name: 'Ingrediente Base', quantity: '1 unidade'}]
             });
             existingSet.add(nTitle);
             addedCount++;
           }
         }
       }

      if (finalRecipes.length > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        const recipesWithAuthor = finalRecipes.map(r => ({
          ...r,
          author_id: session?.user?.id
        }))
        
        const { error } = await supabase.from('recipes').insert(recipesWithAuthor)
        if (error) throw error
        toast.success(`${addedCount} novas receitas brasileiras cadastradas!`);
      } else {
        toast.info('Todas as receitas já existem no banco de dados.');
      }
      
      fetchRecipes()
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Erro na importação: ' + (error.message || 'Erro desconhecido'))
    } finally {
      setIsLoading(false)
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
    </div>
  )
}
