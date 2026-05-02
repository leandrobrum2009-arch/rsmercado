 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Card, CardContent } from '@/components/ui/card'
 import { Badge } from '@/components/ui/badge'
 import { ChefHat, Clock, Sparkles, ArrowRight } from 'lucide-react'
 import { Link } from '@tanstack/react-router'
 
 export function RecipeFeed() {
   const [recipes, setRecipes] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
 
   useEffect(() => {
     const fetchRecipes = async () => {
       const { data, error } = await supabase
         .from('recipes')
         .select('*')
         .limit(4)
         .order('created_at', { ascending: false })
       
       if (!error && data) {
         setRecipes(data)
       }
       setLoading(false)
     }
     fetchRecipes()
   }, [])
 
   if (loading) return null
 
   return (
     <div className="px-4 py-4">
       <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 flex items-center gap-2">
           <Sparkles className="text-amber-500" size={20} />
           Chef IA & Receitas
         </h2>
         <Link to="/recipes" className="text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
           Ver todas <ArrowRight size={12} />
         </Link>
       </div>
 
       <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
         {recipes.length > 0 ? (
           recipes.map((recipe) => (
             <Link key={recipe.id} to="/recipes" className="min-w-[280px] group">
               <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                 <div className="aspect-[16/9] relative overflow-hidden">
                   <img 
                     src={recipe.image_url} 
                     alt={recipe.title} 
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                   <div className="absolute bottom-3 left-3 right-3">
                     <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-black uppercase text-[8px] mb-1 border-0">
                       {recipe.category}
                     </Badge>
                     <h3 className="text-white font-black uppercase italic tracking-tighter text-sm line-clamp-1">
                       {recipe.title}
                     </h3>
                   </div>
                 </div>
                 <CardContent className="p-3">
                   <div className="flex items-center gap-3">
                     <div className="flex items-center text-[8px] font-bold text-zinc-400 uppercase">
                       <Clock className="w-2.5 h-2.5 mr-1" /> 20 MIN
                     </div>
                     <div className="flex items-center text-[8px] font-bold text-zinc-400 uppercase">
                       <ChefHat className="w-2.5 h-2.5 mr-1" /> {recipe.difficulty}
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </Link>
           ))
         ) : (
           <div className="w-full py-10 text-center bg-white rounded-3xl border-2 border-dashed border-zinc-100">
             <ChefHat className="mx-auto text-zinc-200 mb-2" size={32} />
             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
               Nenhuma receita disponível
             </p>
           </div>
         )}
       </div>
     </div>
   )
 }