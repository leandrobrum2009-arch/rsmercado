import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Trash2, Edit } from 'lucide-react'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'

export function CategoryManagement() {
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
   const [newCategory, setNewCategory] = useState({ name: '', slug: '', icon_url: '', icon_name: '' })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
    setIsLoading(false)
  }

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.slug) return toast.error('Nome e Slug são obrigatórios')
    
    setIsSubmitting(true)
    const { error } = await supabase.from('categories').insert([newCategory])
    setIsSubmitting(false)
    
    if (error) toast.error('Erro ao adicionar categoria')
    else {
      toast.success('Categoria adicionada!')
      setNewCategory({ name: '', slug: '', icon_url: '' })
      fetchCategories()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta categoria?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Categoria removida')
      fetchCategories()
    }
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categorias</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Categoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Categoria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input 
                    value={newCategory.name} 
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input value={newCategory.slug} onChange={(e) => setNewCategory({...newCategory, slug: e.target.value})} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>URL do Ícone</Label>
                     <Input value={newCategory.icon_url} onChange={(e) => setNewCategory({...newCategory, icon_url: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <Label>Nome do Ícone (Lucide)</Label>
                     <Input placeholder="Apple, Milk, Beef..." value={newCategory.icon_name} onChange={(e) => setNewCategory({...newCategory, icon_name: e.target.value})} />
                   </div>
                 </div>
                <Button onClick={handleAddCategory} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Salvar Categoria'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ícone</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                 <TableRow key={cat.id} className="hover:bg-zinc-50 transition-colors">
                   <TableCell>
                     <div className="flex items-center gap-2">
                       <SmartImage 
                         src={cat.icon_url} 
                         tableName="categories" 
                         itemId={cat.id} 
                         className="w-8 h-8 object-contain rounded bg-zinc-100" 
                       />
                       {cat.icon_name && (
                         <span className="text-[10px] bg-zinc-900 text-white px-1.5 py-0.5 rounded font-black uppercase">{cat.icon_name}</span>
                       )}
                     </div>
                   </TableCell>
                  <TableCell className="font-bold">{cat.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
