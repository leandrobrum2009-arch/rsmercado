import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ChefHat, Plus, ChefHatIcon, Info, AlertCircle } from 'lucide-react'
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
      
       const all = (allRecipes || []).map(recipe => {
         const recipeIngredients = (recipe.ingredients || []) as any[]
         const matches = recipeIngredients.filter(ing => 
           cartNames.some(cartName => 
             cartName.includes(ing.name.toLowerCase()) || 
             ing.name.toLowerCase().includes(cartName)
           )
         )
         const missing = recipeIngredients.filter(ing => 
           !cartNames.some(cartName => 
             cartName.includes(ing.name.toLowerCase()) || 
             ing.name.toLowerCase().includes(cartName)
           )
         )
         return { ...recipe, matchCount: matches.length, missing }
       })
 
       // ONLY show recipes that have AT LEAST ONE match in the cart
       const filtered = all
         .filter(recipe => recipe.matchCount > 0)
         .sort((a, b) => b.matchCount - a.matchCount)
         .slice(0, 5) // Show up to 5 relevant recipes
 
       setSuggestions(filtered)
    } catch (error) {
      console.error('Error finding recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const [checkingStock, setCheckingStock] = useState<Record<string, boolean>>({})
  const [stockStatus, setStockStatus] = useState<Record<string, any>>({})

  useEffect(() => {
    const checkAllStock = async () => {
      const status: Record<string, any> = {}
      for (const recipe of suggestions) {
        for (const ing of recipe.missing) {
          if (status[ing.name]) continue
          const { data } = await supabase
            .from('products')
            .select('*')
            .ilike('name', `%${ing.name}%`)
            .limit(1)
          status[ing.name] = data && data.length > 0 ? data[0] : null
        }
      }
      setStockStatus(status)
    }
    if (suggestions.length > 0) {
      checkAllStock()
    }
  }, [suggestions])

  const addMissingToCart = async (missingIngredients: any[]) => {
    let addedCount = 0
    let missingFromStore: string[] = []

    for (const ing of missingIngredients) {
      const product = stockStatus[ing.name]
      if (product) {
        addToCart(product)
        addedCount++
      } else {
        missingFromStore.push(ing.name)
      }
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} produtos adicionados para completar sua receita!`)
    }
    if (missingFromStore.length > 0) {
      toast.error(`Infelizmente não temos: ${missingFromStore.join(', ')} em nosso estoque no momento.`, { duration: 5000 })
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
                
                <div className="pt-2">
                  {recipe.missing.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                        <AlertCircle size={10} /> Itens Faltantes:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {recipe.missing.map((m: any) => (
                          <Badge 
                            key={m.name} 
                            variant="secondary" 
                            className={`text-[8px] px-1 py-0 h-4 border-0 ${stockStatus[m.name] ? 'bg-zinc-100 text-zinc-600' : 'bg-red-50 text-red-500 line-through'}`}
                          >
                            {m.name}
                          </Badge>
                        ))}
                      </div>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full h-8 text-[9px] font-black uppercase rounded-xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100"
                        onClick={() => addMissingToCart(recipe.missing)}
                      >
                        <Plus size={12} className="mr-1" /> Adicionar Faltantes ao Carrinho
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase bg-green-50 p-2 rounded-xl border border-green-100">
                      <ChefHatIcon size={12} /> Você tem todos os ingredientes!
                    </div>
                  )}
                </div>
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
