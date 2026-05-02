import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, BookOpen, Clock, ChefHat, Bookmark, BookmarkCheck, Share2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/recipes')({
  loader: async () => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return { recipes: data || [] }
  },
  component: RecipesPage,
})

function RecipesPage() {
  const { recipes } = Route.useLoaderData()
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [savedRecipes, setSavedRecipes] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
    if (data.user) {
      const { data: saved } = await supabase
        .from('user_recipes')
        .select('recipe_id')
        .eq('user_id', data.user.id)
      setSavedRecipes(saved?.map(s => s.recipe_id) || [])
    }
  }

  const toggleSaveRecipe = async (recipeId: string) => {
    if (!user) {
      toast.error('Faça login para salvar!')
      return
    }

    const isSaved = savedRecipes.includes(recipeId)
    try {
      if (isSaved) {
        await supabase.from('user_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
        setSavedRecipes(prev => prev.filter(id => id !== recipeId))
        toast.success('Removido dos favoritos')
      } else {
        await supabase.from('user_recipes').insert({ user_id: user.id, recipe_id: recipeId })
        setSavedRecipes(prev => [...prev, recipeId])
        toast.success('Receita salva!')
      }
    } catch (error) {
      toast.error('Erro ao salvar')
    }
  }


  return (
    <div className="bg-zinc-50 min-h-screen pb-20">
      <div className="bg-white border-b px-4 py-8 mb-6">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-amber-500" size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Gastronomia & Tendências</span>
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-zinc-900 mb-2">Feed de Receitas</h1>
          <p className="text-zinc-500 font-medium text-sm max-w-xl">
            Acompanhe as últimas criações da nossa IA e as receitas mais amadas da comunidade SuperLoja.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white group cursor-pointer" onClick={() => setSelectedRecipe(recipe)}>
              <div className="aspect-[16/10] relative overflow-hidden">
                <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute bottom-4 left-4 right-4">
                  <Badge className="bg-green-600 hover:bg-green-600 text-white font-black uppercase text-[8px] mb-2 border-0">
                    {recipe.category}
                  </Badge>
                  <h2 className="text-white font-black uppercase italic tracking-tighter text-xl line-clamp-1">{recipe.title}</h2>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center text-[10px] font-bold text-zinc-400 uppercase">
                      <Clock className="w-3 h-3 mr-1" /> 20 MIN
                    </div>
                    <div className="flex items-center text-[10px] font-bold text-zinc-400 uppercase">
                      <ChefHat className="w-3 h-3 mr-1" /> {recipe.difficulty}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); toggleSaveRecipe(recipe.id); }} className="p-2 rounded-full bg-zinc-100 hover:bg-green-50 hover:text-green-600 transition-colors">
                      {savedRecipes.includes(recipe.id) ? <BookmarkCheck size={18} className="fill-green-600 text-green-600" /> : <Bookmark size={18} />}
                    </button>
                    <button className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors">
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-zinc-500 text-sm font-medium line-clamp-2 mb-4 leading-relaxed">
                  {recipe.description}
                </p>
                <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-green-600">Ler reportagem completa →</span>
                  <span className="text-[9px] font-bold text-zinc-300 uppercase">
                    {new Date(recipe.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {recipes.length === 0 && (
          <div className="text-center py-40">
            <ChefHat className="w-16 h-16 mx-auto text-zinc-200 mb-4" />
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-400">Nenhuma postagem no momento</h2>
          </div>
        )}
      </div>

      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-3xl rounded-[40px] border-8 border-white p-0 overflow-hidden shadow-2xl">
          {selectedRecipe && (
            <div className="flex flex-col max-h-[90vh]">
              <div className="h-64 relative shrink-0">
                <img src={selectedRecipe.image_url} alt={selectedRecipe.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-6 left-8 right-8">
                  <Badge className="bg-white text-zinc-900 font-black uppercase text-[10px] mb-3 border-0">
                    Materia Especial: {selectedRecipe.category}
                  </Badge>
                  <DialogTitle className="text-white text-4xl font-black uppercase italic tracking-tighter leading-none">
                    {selectedRecipe.title}
                  </DialogTitle>
                </div>
              </div>
              
              <div className="p-8 overflow-y-auto bg-white flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <p className="text-zinc-600 font-medium leading-relaxed first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:italic first-letter:text-green-600">
                      {selectedRecipe.description}
                    </p>
                    <div className="bg-zinc-50 p-6 rounded-3xl border-2 border-dashed border-zinc-100">
                      <h4 className="font-black uppercase italic tracking-tighter text-xl mb-4 text-zinc-800">Modo de Reportagem (Preparo)</h4>
                      <div className="text-zinc-600 text-sm space-y-3 leading-relaxed whitespace-pre-wrap">
                        {selectedRecipe.instructions}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                      <h4 className="font-black uppercase text-[10px] tracking-widest text-green-600 mb-4">Itens Necessários</h4>
                      <ul className="space-y-3">
                        {(selectedRecipe.ingredients || []).map((ing: any, i: number) => (
                          <li key={i} className="flex flex-col border-b border-green-100/50 pb-2 last:border-0">
                            <span className="text-xs font-black uppercase text-zinc-900 leading-tight">{ing.name}</span>
                            <span className="text-[10px] font-bold text-green-600/70">{ing.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button className="w-full h-12 bg-zinc-900 rounded-2xl font-black uppercase text-[10px] tracking-widest" onClick={() => setSelectedRecipe(null)}>
                      Fechar Leitura
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
