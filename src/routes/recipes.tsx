import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, BookOpen, Clock, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/recipes')({
  component: RecipesPage,
})

function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecipes()
  }, [])

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
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="group-hover:text-primary transition-colors">{recipe.title}</CardTitle>
                <div className="flex items-center text-xs font-medium text-muted-foreground">
                  <ChefHat className="h-3 w-3 mr-1" />
                  {recipe.difficulty}
                </div>
              </div>
              <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
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
              <Button className="w-full">Ver Receita Completa</Button>
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
