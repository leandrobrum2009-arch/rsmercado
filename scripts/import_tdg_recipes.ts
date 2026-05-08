 import { supabase } from '../src/lib/supabase';
 
 const recipes = [
   {
     title: 'Strogonoff de Carne Suculento',
     description: 'Um clássico brasileiro que agrada a todos, perfeito para um almoço em família.',
     category: 'Carnes',
     image_url: 'https://images.unsplash.com/photo-1594973877793-149d8e7885b5?w=800&h=400&fit=crop',
     ingredients: [
       { name: 'Carne bovina (filé mignon ou alcatra)', quantity: '500g' },
       { name: 'Creme de leite', quantity: '1 lata' },
       { name: 'Champignon', quantity: '100g' },
       { name: 'Ketchup', quantity: '3 colheres' },
       { name: 'Mostarda', quantity: '1 colher' },
       { name: 'Cebola', quantity: '1 unidade' }
     ],
     instructions: '1. Corte a carne em cubos e tempere.\n2. Doure a carne na manteiga.\n3. Adicione cebola e refogue.\n4. Misture ketchup, mostarda e champignon.\n5. Desligue o fogo e misture o creme de leite.'
   },
   {
     title: 'Pudim de Leite Condensado Clássico',
     description: 'A sobremesa mais tradicional e amada, com calda de caramelo perfeita.',
     category: 'Doces e sobremesas',
     image_url: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=800&h=400&fit=crop',
     ingredients: [
       { name: 'Leite condensado', quantity: '1 lata' },
       { name: 'Leite', quantity: '1 medida da lata' },
       { name: 'Ovos', quantity: '3 unidades' },
       { name: 'Açúcar', quantity: '1 xícara (para a calda)' }
     ],
     instructions: '1. Bata no liquidificador o leite condensado, o leite e os ovos.\n2. Faça uma calda com o açúcar na fôrma de pudim.\n3. Despeje a mistura na fôrma e asse em banho-maria por 45 min.'
   },
   {
     title: 'Frango com Quiabo Mineiro',
     description: 'Receita típica mineira, saborosa e reconfortante.',
     category: 'Aves',
     image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=400&fit=crop',
     ingredients: [
       { name: 'Frango em pedaços', quantity: '1kg' },
       { name: 'Quiabo', quantity: '500g' },
       { name: 'Alho', quantity: '3 dentes' },
       { name: 'Cebola', quantity: '1 unidade' },
       { name: 'Óleo', quantity: 'a gosto' }
     ],
     instructions: '1. Tempere o frango com sal e alho.\n2. Frite o quiabo separadamente até parar de babar.\n3. Doure o frango.\n4. Adicione cebola e água aos poucos até cozinhar.\n5. Misture o quiabo ao frango pronto.'
   },
   {
     title: 'Lasanha à Bolonhesa Especial',
     description: 'Camadas de massa fresca com molho de carne rico e queijo derretido.',
     category: 'Massas',
     image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=400&fit=crop',
     ingredients: [
       { name: 'Massa de lasanha', quantity: '500g' },
       { name: 'Carne moída', quantity: '500g' },
       { name: 'Molho de tomate', quantity: '2 sachês' },
       { name: 'Queijo mussarela', quantity: '300g' },
       { name: 'Presunto', quantity: '300g' }
     ],
     instructions: '1. Prepare o molho bolonhesa.\n2. Em um refratário, intercale camadas de molho, massa, presunto e queijo.\n3. Finalize com queijo e leve ao forno por 20 min.'
   },
   {
     title: 'Mousse de Maracujá Rápido',
     description: 'Refrescante, doce na medida certa e pronto em minutos.',
     category: 'Doces e sobremesas',
     image_url: 'https://images.unsplash.com/photo-1516685018646-527ad952f864?w=800&h=400&fit=crop',
     ingredients: [
       { name: 'Leite condensado', quantity: '1 lata' },
       { name: 'Creme de leite', quantity: '1 lata' },
       { name: 'Suco de maracujá concentrado', quantity: '1 medida da lata' }
     ],
     instructions: '1. Bata todos os ingredientes no liquidificador por 5 minutos.\n2. Coloque em um recipiente e leve à geladeira por no mínimo 3 horas.'
   },
   {
     title: 'Bolo de Cenoura com Cobertura de Chocolate',
     description: 'O lanche da tarde favorito, fofinho e com cobertura crocante.',
     category: 'Doces e sobremesas',
     image_url: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=800&h=400&fit=crop',
     ingredients: [
       { name: 'Cenoura', quantity: '3 unidades' },
       { name: 'Óleo', quantity: '1 xícara' },
       { name: 'Ovos', quantity: '3 unidades' },
       { name: 'Farinha de trigo', quantity: '2 xícaras' },
       { name: 'Açúcar', quantity: '2 xícaras' },
       { name: 'Chocolate em pó', quantity: '1 xícara (cobertura)' }
     ],
     instructions: '1. Bata cenouras, ovos e óleo no liquidificador.\n2. Misture açúcar e farinha em uma tigela.\n3. Incorpore a mistura e asse por 40 min.\n4. Cubra com calda de chocolate quente.'
   },
   {
     title: 'Feijoada Completa Tradicional',
     description: 'Rica em sabores, carnes defumadas e tradição brasileira.',
     category: 'Carnes',
     image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=400&fit=crop',
     ingredients: [
       { name: 'Feijão preto', quantity: '1kg' },
       { name: 'Paio', quantity: '200g' },
       { name: 'Calabresa', quantity: '200g' },
       { name: 'Lombo salgado', quantity: '200g' },
       { name: 'Costelinha de porco', quantity: '200g' }
     ],
     instructions: '1. Deixe o feijão de molho.\n2. Cozinhe as carnes e o feijão juntos.\n3. Tempere com alho e louro refogados.'
   },
   {
     title: 'Torta de Frango de Liquidificador',
     description: 'Massa leve e recheio cremoso, a solução ideal para um jantar prático.',
     category: 'Lanches',
     image_url: 'https://images.unsplash.com/photo-1626082896492-766af4eb6501?w=800&h=400&fit=crop',
     ingredients: [
       { name: 'Leite', quantity: '2 xícaras' },
       { name: 'Óleo', quantity: '1 xícara' },
       { name: 'Ovos', quantity: '3 unidades' },
       { name: 'Farinha de trigo', quantity: '2 xícaras' },
       { name: 'Peito de frango desfiado', quantity: '500g' }
     ],
     instructions: '1. Bata os ingredientes da massa no liquidificador.\n2. Refogue o frango com temperos.\n3. Coloque metade da massa na forma, adicione o recheio e cubra com o restante.\n4. Asse até dourar.'
   }
 ];
 
 async function importRecipes() {
   console.log('Iniciando importação de receitas do TudoGostoso...');
   
   // Delete existing recipes to avoid duplicates and refresh the list
   const { error: deleteError } = await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
   if (deleteError) console.warn('Erro ao limpar receitas antigas:', deleteError.message);
 
   const { error } = await supabase.from('recipes').insert(recipes);
 
   if (error) {
     console.error('Erro na importação:', error);
   } else {
     console.log(`${recipes.length} receitas importadas com sucesso!`);
   }
 }
 
 importRecipes();