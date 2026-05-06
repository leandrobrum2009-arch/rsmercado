 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
  import { Loader2, Save, GripVertical, Eye, EyeOff, Layout as LayoutIcon, Edit } from 'lucide-react'
 import { toast } from '@/lib/toast'
 import { Switch } from '@/components/ui/switch'
  import { Link } from '@tanstack/react-router'
 
 export function HomeLayoutManager() {
   const [loading, setLoading] = useState(false)
   const [layout, setLayout] = useState<any[]>([
     { id: 'search', label: 'Busca Principal', visible: true },
     { id: 'flyer', label: 'Encarte do Dia', visible: true },
     { id: 'banner_carousel', label: 'Carrossel Principal', visible: true },
     { id: 'home_banners', label: 'Banners Secundários', visible: true },
     { id: 'category_bar', label: 'Barra de Categorias', visible: true },
     { id: 'stories', label: 'Stories', visible: true },
     { id: 'recipes', label: 'Feed de Receitas', visible: true },
     { id: 'ai_recipes', label: 'Banner IA de Receitas', visible: true },
     { id: 'instagram', label: 'Feed Instagram', visible: true },
     { id: 'prod_horti', label: 'Grade: Hortifruti', visible: true, title: 'Ingredientes em Oferta', category: 'Hortifruti' },
     { id: 'pwa', label: 'Instalação App', visible: true },
     { id: 'prod_mercearia', label: 'Grade: Mercearia', visible: true, title: 'Destaques da Mercearia', category: 'Mercearia' },
     { id: 'digital_flyers', label: 'Encartes Digitais', visible: true },
     { id: 'prod_bebidas', label: 'Grade: Bebidas', visible: true, title: 'Bebidas Mais Vendidas', category: 'Bebidas' },
     { id: 'coupon', label: 'Banner Cupom Primeira Compra', visible: true },
     { id: 'prod_limpeza', label: 'Grade: Limpeza', visible: true, title: 'Ofertas de Limpeza', category: 'Limpeza' }
   ])
 
   useEffect(() => {
     fetchLayout()
   }, [])
 
   const fetchLayout = async () => {
     setLoading(true)
     try {
       const { data } = await supabase.from('store_settings').select('value').eq('key', 'home_layout').maybeSingle()
       if (data && Array.isArray(data.value)) {
         // Merge with default to ensure new sections appear
         const savedLayout = data.value;
         const mergedLayout = [...layout];
         
         savedLayout.forEach((s: any) => {
           const idx = mergedLayout.findIndex(m => m.id === s.id);
           if (idx !== -1) {
             mergedLayout[idx] = { ...mergedLayout[idx], ...s };
           }
         });
         
         // Sort by saved order
         const sortedLayout = savedLayout.map((s: any) => mergedLayout.find(m => m.id === s.id)).filter(Boolean);
         // Add missing ones at the end
         mergedLayout.forEach(m => {
           if (!sortedLayout.find(s => s.id === m.id)) sortedLayout.push(m);
         });
 
         setLayout(sortedLayout)
       }
     } catch (e) {
       console.error(e)
     } finally {
       setLoading(false)
     }
   }
 
   const saveLayout = async () => {
     setLoading(true)
     const { error } = await supabase.from('store_settings').upsert({
       key: 'home_layout',
       value: layout
     })
     if (error) toast.error('Erro ao salvar layout')
     else toast.success('Layout da página inicial atualizado!')
     setLoading(false)
   }
 
   const moveSection = (index: number, direction: 'up' | 'down') => {
     const newLayout = [...layout]
     const targetIndex = direction === 'up' ? index - 1 : index + 1
     if (targetIndex < 0 || targetIndex >= newLayout.length) return
     
     const temp = newLayout[index]
     newLayout[index] = newLayout[targetIndex]
     newLayout[targetIndex] = temp
     setLayout(newLayout)
   }
 
   const toggleVisibility = (index: number) => {
     const newLayout = [...layout]
     newLayout[index].visible = !newLayout[index].visible
     setLayout(newLayout)
   }
 
   return (
     <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
       <CardHeader className="bg-zinc-900 text-white">
         <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
           <LayoutIcon size={18} /> Organização da Página Inicial
         </CardTitle>
         <CardDescription className="text-zinc-400 text-[10px] font-bold uppercase">Arraste para reordenar ou oculte seções do app</CardDescription>
       </CardHeader>
       <CardContent className="p-6 space-y-4">
         <div className="space-y-2">
           {layout.map((section, index) => (
             <div key={section.id} className={`flex items-center gap-4 p-3 rounded-2xl border-2 transition-all ${section.visible ? 'border-zinc-100 bg-white' : 'border-dashed border-zinc-200 bg-zinc-50 opacity-60'}`}>
               <div className="flex flex-col gap-1">
                 <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="text-zinc-400 hover:text-zinc-900 disabled:opacity-20"><GripVertical size={16} /></button>
                 <button onClick={() => moveSection(index, 'down')} disabled={index === layout.length - 1} className="text-zinc-400 hover:text-zinc-900 disabled:opacity-20"><GripVertical size={16} /></button>
               </div>
               <div className="flex-1">
                 <p className="font-black uppercase text-xs tracking-tight">{section.label}</p>
                 <p className="text-[10px] text-zinc-500 font-bold">{section.id}</p>
               </div>
                <div className="flex items-center gap-2">
                  {section.category && (
                    <Link 
                      to="/admin" 
                       search={{ tab: 'categories', edit: section.category }} 
                      className="p-2 text-zinc-400 hover:text-green-600 transition-colors border rounded-xl hover:bg-green-50"
                      title={`Editar categoria ${section.category}`}
                    >
                      <Edit size={14} />
                    </Link>
                  )}
                  <div className="flex items-center gap-3 ml-2 border-l pl-3">
                    <Switch checked={section.visible} onCheckedChange={() => toggleVisibility(index)} />
                    {section.visible ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} className="text-zinc-300" />}
                  </div>
                </div>
             </div>
           ))}
         </div>
         <Button onClick={saveLayout} disabled={loading} className="w-full h-12 bg-zinc-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-zinc-200">
           {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Salvar Ordem do Layout
         </Button>
       </CardContent>
     </Card>
   )
 }