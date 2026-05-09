import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

const BASE_URL = 'https://www.tudogostoso.com.br'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

const CATEGORIES = [
  { name: 'Carnes', url: '/categorias/1000-carnes' },
  { name: 'Doces e sobremesas', url: '/categorias/1020-doces-e-sobremesas' },
  { name: 'Aves', url: '/categorias/1004-aves' },
  { name: 'Massas', url: '/categorias/1014-massas' }
]

async function getRecipeDetails(url: string) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT }
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    // Improved extraction
    const title = $('h1').text().trim() || $('.recipe-title').text().trim() || $('header span').first().text().trim()
    const image_url = $('.recipe-media img').attr('src') || $('.recipe-media meta[itemprop="image"]').attr('content') || ''
    const description = $('.recipe-description').text().trim() || 'Uma deliciosa receita do TudoGostoso.'
    
    const ingredients: any[] = []
    $('.p-ingredient').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      if (text) {
        ingredients.push({ name: text, quantity: '' })
      }
    })

    let instructions = ''
    const stepSelectors = [
      '.instructions ol li p',
      '.instructions ol li span',
      '.instructions ol li div',
      '.instructions ol li'
    ]

    for (const selector of stepSelectors) {
      const steps = $(selector).map((i, el) => $(el).text().trim()).filter((_, text) => text.length > 5).get()
      if (steps.length > 0) {
        instructions = steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
        break
      }
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
    const response = await fetch(`${BASE_URL}${category.url}`, {
      headers: { 'User-Agent': USER_AGENT }
    })
    const html = await response.text()
    const $ = cheerio.load(html)

    const recipeLinks: string[] = []
    $('a').each((_, el) => {
      const href = $(el).attr('href')
      if (href && (href.startsWith('/receita/') || href.includes('tudogostoso.com.br/receita/'))) {
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
        if (!recipeLinks.includes(fullUrl) && fullUrl.endsWith('.html')) {
          recipeLinks.push(fullUrl)
        }
      }
    })

    console.log(`Found ${recipeLinks.length} potential recipes.`)

    let count = 0
    for (const link of recipeLinks) {
      if (count >= maxRecipes) break

      const { data: existing } = await supabase
        .from('recipes')
        .select('id')
        .eq('source_url', link)
        .maybeSingle()

      if (existing) {
        console.log(`Skipping already existing recipe: ${link}`)
        continue
      }

      console.log(`Fetching: ${link}`)
      const details = await getRecipeDetails(link)
      if (!details || !details.title || !details.instructions) {
        console.log(`Failed to extract valid details for: ${link}`)
        continue
      }

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
      
      await new Promise(resolve => setTimeout(resolve, 1000))
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
    const added = await crawlCategory(cat, 5)
    total += added
  }
  console.log(`Crawler finished. Total added: ${total}`)
}

main()
