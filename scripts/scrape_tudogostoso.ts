 import { createClient } from '@supabase/supabase-js'
 import * as cheerio from 'cheerio'
 import dotenv from 'dotenv'
 
 dotenv.config()
 
 const supabase = createClient(
   process.env.VITE_SUPABASE_URL!,
   process.env.VITE_SUPABASE_ANON_KEY!
 )
 
 const BASE_URL = 'https://www.tudogostoso.com.br'
 
 const CATEGORIES = [
   { name: 'Carnes', url: '/categorias/1000-carnes' },
   { name: 'Aves', url: '/categorias/1004-aves' },
   { name: 'Massas', url: '/categorias/1014-massas' },
   { name: 'Doces e sobremesas', url: '/categorias/1020-doces-e-sobremesas' },
   { name: 'Peixes e frutos do mar', url: '/categorias/1008-peixes-e-frutos-do-mar' },
   { name: 'Saladas e molhos', url: '/categorias/1028-saladas-molhos-e-acompanhamentos' },
   { name: 'Sopas', url: '/categorias/1032-sopas' },
   { name: 'Bebidas', url: '/categorias/1036-bebidas' }
 ]
 
 async function getRecipeDetails(url: string) {
   try {
     const response = await fetch(url)
     const html = await response.text()
     const $ = cheerio.load(html)
 
     const title = $('h1').text().trim()
     const image_url = $('.recipe-media img').attr('src') || $('.recipe-media meta[itemprop="image"]').attr('content') || ''
     const description = $('.recipe-description').text().trim() || 'Uma deliciosa receita do TudoGostoso.'
     
     const ingredients: any[] = []
     $('.p-ingredient').each((_, el) => {
       const text = $(el).text().trim()
       if (text) {
         ingredients.push({ name: text, quantity: '' })
       }
     })
 
     let instructions = ''
     $('.instructions ol li span').each((i, el) => {
       instructions += `${i + 1}. ${$(el).text().trim()}\n`
     })
     
     // Fallback for instructions
     if (!instructions) {
       $('.instructions ol li').each((i, el) => {
         instructions += `${i + 1}. ${$(el).text().trim()}\n`
       })
     }
 
     return {
       title,
       description,
       instructions,
       image_url,
       ingredients,
       source_url: url
     }
   } catch (error) {
     console.error(`Error fetching recipe at ${url}:`, error)
     return null
   }
 }
 
 async function crawlCategory(category: { name: string, url: string }, maxRecipes: number = 20) {
   console.log(`Crawling category: ${category.name}...`)
   try {
     const response = await fetch(`${BASE_URL}${category.url}`)
     const html = await response.text()
     const $ = cheerio.load(html)
 
     const recipeLinks: string[] = []
     $('.recipe-card a').each((_, el) => {
       const href = $(el).attr('href')
       if (href && href.startsWith('/receita/')) {
         recipeLinks.push(`${BASE_URL}${href}`)
       }
     })
 
     console.log(`Found ${recipeLinks.length} potential recipes.`)
 
     let count = 0
     for (const link of recipeLinks) {
       if (count >= maxRecipes) break
 
       // Check if exists
       const { data: existing } = await supabase
         .from('recipes')
         .select('id')
         .eq('source_url', link)
         .maybeSingle()
 
       if (existing) {
         console.log(`Skipping already existing recipe: ${link}`)
         continue
       }
 
       const details = await getRecipeDetails(link)
       if (details && details.title && details.instructions) {
         const { error } = await supabase.from('recipes').insert({
           ...details,
           category: category.name,
           difficulty: 'Média'
         })
 
         if (error) {
           console.error(`Error inserting ${details.title}:`, error.message)
         } else {
           console.log(`Successfully added: ${details.title}`)
           count++
         }
       }
       
       // Small delay to be polite
       await new Promise(resolve => setTimeout(resolve, 500))
     }
 
     return count
   } catch (error) {
     console.error(`Error crawling category ${category.name}:`, error)
     return 0
   }
 }
 
 async function main() {
   console.log('Starting Master Crawler...')
   let total = 0
   for (const cat of CATEGORIES) {
     const added = await crawlCategory(cat, 10)
     total += added
   }
   console.log(`Crawler finished. Total added: ${total}`)
 }
 
 main()