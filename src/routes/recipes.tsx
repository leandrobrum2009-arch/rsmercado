import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
import { Badge } from '@/components/ui/badge'
import { Loader2, BookOpen, Clock, ChefHat, Bookmark, BookmarkCheck } from 'lucide-react'
  const [savedRecipes, setSavedRecipes] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/recipes' as any)({
  component: RecipesPage,
})

function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecipes()
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
      toast.error('Faça login para salvar receitas!')
      return
    }

    const isSaved = savedRecipes.includes(recipeId)
    
    try {
      if (isSaved) {
        await supabase
          .from('user_recipes')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipeId)
        setSavedRecipes(prev => prev.filter(id => id !== recipeId))
        toast.success('Receita removida dos salvos')
      } else {
        await supabase
          .from('user_recipes')
          .insert({ user_id: user.id, recipe_id: recipeId })
        setSavedRecipes(prev => [...prev, recipeId])
        toast.success('Receita salva com sucesso!')
      }
    } catch (error) {
      toast.error('Erro ao atualizar favoritos')
    }
  }

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      toast.error('Erro ao carregar receitas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receitas Criativas</h1>
          <p className="text-muted-foreground">Descubra o que você pode cozinhar com os ingredientes que adora.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <Card key={recipe.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-2">
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={recipe.image_url} 
                alt={recipe.title}
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                  {recipe.category}
                </Badge>
              </div>
            </div>
            <CardHeader className="relative">
              <div className="flex justify-between items-start">
                <CardTitle className="group-hover:text-primary transition-colors pr-8">{recipe.title}</CardTitle>
                <div className="flex items-center text-xs font-medium text-muted-foreground">
                  <ChefHat className="h-3 w-3 mr-1" />
                  {recipe.difficulty}
                </div>
              </div>
              <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  toggleSaveRecipe(recipe.id);
                }}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                {savedRecipes.includes(recipe.id) ? (
                  <BookmarkCheck className="text-green-600 fill-green-600" size={20} />
                ) : (
                  <Bookmark className="text-gray-400" size={20} />
                )}
              </button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  15-30 min
                </span>
                <span className="flex items-center">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {recipe.ingredients?.length || 0} Ingredientes
                </span>
              </div>
              <Button className="w-full" onClick={() => setSelectedRecipe(recipe)}>Ver Receita Completa</Button>

      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">{selectedRecipe.title}</DialogTitle>
                <DialogDescription>{selectedRecipe.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <img src={selectedRecipe.image_url} alt={selectedRecipe.title} className="w-full aspect-video object-cover rounded-2xl shadow-lg" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-dashed">
                    <h4 className="font-black uppercase text-[10px] text-gray-500 mb-3 tracking-widest">Ingredientes</h4>
                    <ul className="space-y-2">
                      {(selectedRecipe.ingredients || []).map((ing: any, i: number) => (
                        <li key={i} className="text-sm font-medium flex justify-between">
                          <span>{ing.name}</span>
                          <span className="text-muted-foreground">{ing.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-2xl border border-dashed border-green-200">
                    <h4 className="font-black uppercase text-[10px] text-green-600 mb-3 tracking-widest">Modo de Preparo</h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedRecipe.instructions}</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="w-full" onClick={() => setSelectedRecipe(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
            </CardContent>
          </Card>
        ))}
        {recipes.length === 0 && (
          <div className="col-span-full text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold">Nenhuma receita disponível</h3>
            <p className="text-muted-foreground">Fique atento, logo traremos novidades culinárias!</p>
          </div>
        )}
      </div>
    </div>
  )
}
