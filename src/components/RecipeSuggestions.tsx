import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ChefHat, Plus, ChefHatIcon, Info } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useCart } from '@/contexts/CartContext'

export function RecipeSuggestions({ cartItems }: { cartItems: any[] }) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { addToCart } = useCart()

  useEffect(() => {
    if (cartItems.length > 0) {
      findMatchingRecipes()
    }
  }, [cartItems])

  const findMatchingRecipes = async () => {
    setLoading(true)
    try {
      const { data: allRecipes, error } = await supabase
        .from('recipes')
        .select('*')

      if (error) throw error

      // Simple matching logic: see how many ingredients in the recipe match cart items
      // (Using case-insensitive substring match for names)
      const cartNames = cartItems.map(item => item.name.toLowerCase())
      
      const ranked = (allRecipes || [])
        .map(recipe => {
          const recipeIngredients = (recipe.ingredients || []) as any[]
          const matches = recipeIngredients.filter(ing => 
            cartNames.some(cartName => cartName.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(cartName))
          )
          const missing = recipeIngredients.filter(ing => 
            !cartNames.some(cartName => cartName.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(cartName))
          )
          return { ...recipe, matchCount: matches.length, missing }
        })
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 3)

      setSuggestions(ranked)
    } catch (error) {
      console.error('Error finding recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const addMissingToCart = async (missingIngredients: any[]) => {
    toast.info('Buscando produtos para completar sua receita...')
    
    let addedCount = 0
    for (const ing of missingIngredients) {
      // Try to find a matching product in the database
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${ing.name}%`)
        .limit(1)

      if (products && products.length > 0) {
        addToCart(products[0])
        addedCount++
      } else {
        toast.error(`Não encontramos "${ing.name}" em nosso estoque.`)
      }
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} produtos adicionados para completar sua receita!`)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-6 w-6 text-green-600" />
      </div>
    )
  }

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center gap-2 px-2">
        <ChefHat className="text-green-600" size={24} />
        <h2 className="text-lg font-black uppercase italic tracking-tighter">O que cozinhar hoje?</h2>
      </div>
      
      <p className="text-[10px] text-gray-500 font-bold uppercase px-2">Sugestões baseadas no seu carrinho:</p>

      <div className="flex flex-col gap-4">
        {suggestions.map((recipe) => (
          <Card key={recipe.id} className="border-2 border-dashed border-green-200 overflow-hidden shadow-none">
            <div className="flex gap-4 p-3">
              <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border">
                <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm leading-tight">{recipe.title}</h3>
                  <Badge variant="outline" className="text-[8px] font-black uppercase h-4 bg-green-50 text-green-700 border-green-200">
                    {recipe.category}
                  </Badge>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-2">{recipe.description}</p>
                
                {recipe.missing.length > 0 ? (
                  <div className="pt-1">
                    <p className="text-[9px] font-bold text-amber-600 uppercase">Falta para fazer:</p>
                    <p className="text-[9px] text-gray-400">
                      {recipe.missing.map((m: any) => m.name).join(', ')}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[8px] font-black uppercase mt-1 p-0 hover:bg-transparent hover:text-green-600"
                      onClick={() => addMissingToCart(recipe.missing)}
                    >
                      <Plus size={10} className="mr-1" /> Completar Ingredientes
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase pt-1">
                    <ChefHatIcon size={12} /> Você tem tudo que precisa!
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="bg-amber-50 p-3 rounded-2xl flex gap-3 border border-amber-100">
        <Info className="text-amber-600 shrink-0" size={20} />
        <p className="text-[10px] text-amber-800 font-medium italic">
          Ao completar os ingredientes, sua receita ficará pronta para brilhar na cozinha! Você também pode salvar suas receitas favoritas no seu painel.
        </p>
      </div>
    </div>
  )
}
