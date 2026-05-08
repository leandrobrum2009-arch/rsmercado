 import * as cheerio from 'cheerio';
 
 const BASE_URL = 'https://www.tudogostoso.com.br';
 
 const categories = [
   { name: 'Carnes', url: '/categorias/1000-carnes' },
   { name: 'Aves', url: '/categorias/1004-aves' },
   { name: 'Peixes e frutos do mar', url: '/categorias/1008-peixes-e-frutos-do-mar' },
   { name: 'Massas', url: '/categorias/1010-massas' },
   { name: 'Doces e sobremesas', url: '/categorias/1020-doces-e-sobremesas' }
 ];
 
 async function scrapeRecipe(url: string, categoryName: string) {
   try {
     const res = await fetch(url);
     if (!res.ok) return null;
     const html = await res.text();
     const $ = cheerio.load(html);
 
     const title = $('h1').text().trim();
     const description = $('.recipe-description').text().trim() || 'Receita deliciosa do TudoGostoso.';
     const image_url = $('.recipe-media-container img').attr('src') || '';
     const difficulty = 'Média'; // TDG often doesn't have a simple text label for this in a standard place
 
     const ingredients: any[] = [];
     $('.p-ingredient').each((_, el) => {
       const text = $(el).text().trim();
       // Try to split quantity and name if possible, but TDG often has them together
       // For now, let's keep name as the full string and quantity empty or try a simple split
       ingredients.push({ name: text, quantity: '' });
     });
 
     const instructionsList: string[] = [];
     $('.p-instruction p').each((_, el) => {
       instructionsList.push($(el).text().trim());
     });
     const instructions = instructionsList.join('\n');
 
     if (!title || ingredients.length === 0) return null;
 
     return {
       title,
       description,
       instructions,
       category: categoryName,
       difficulty,
       image_url,
       ingredients
     };
   } catch (err) {
     console.error(`Error scraping ${url}:`, err);
     return null;
   }
 }
 
 async function run() {
   const allRecipes: any[] = [];
   
   for (const cat of categories) {
     console.log(`Scraping category: ${cat.name}...`);
     const res = await fetch(BASE_URL + cat.url);
     if (!res.ok) continue;
     const html = await res.text();
     const $ = cheerio.load(html);
 
     const links: string[] = [];
     $('.recipe-card a').each((i, el) => {
       if (links.length < 15) {
         const href = $(el).attr('href');
         if (href && href.startsWith('/receita')) {
           links.push(BASE_URL + href);
         }
       }
     });
 
     console.log(`Found ${links.length} recipes in ${cat.name}.`);
     
     for (const link of links) {
       const recipe = await scrapeRecipe(link, cat.name);
       if (recipe) {
         allRecipes.push(recipe);
         console.log(`  Added: ${recipe.title}`);
       }
       // Small delay to be polite
       await new Promise(r => setTimeout(r, 500));
     }
   }
 
   console.log(`Total recipes scraped: ${allRecipes.length}`);
   await Bun.write('recipes_data.json', JSON.stringify(allRecipes, null, 2));
 }
 
 run();