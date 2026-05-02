import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Trash2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

export function BannerManager() {
  const [banners, setBanners] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newBanner, setNewBanner] = useState({ image_url: '', category_id: '', link_url: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: bannersData } = await supabase.from('banners').select('*, categories(name)')
    const { data: catData } = await supabase.from('categories').select('*')
    setBanners(bannersData || [])
    setCategories(catData || [])
    setIsLoading(false)
  }

  const handleAddBanner = async () => {
    if (!newBanner.image_url) return toast.error('URL da imagem é obrigatória')
    
    setIsAdding(true)
    const { error } = await supabase.from('banners').insert([newBanner])
    setIsAdding(false)
    
    if (error) {
      toast.error('Erro ao adicionar banner')
    } else {
      toast.success('Banner adicionado!')
      setNewBanner({ image_url: '', category_id: '', link_url: '' })
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('banners').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      toast.success('Banner removido')
      fetchData()
    }
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL da Imagem</label>
              <Input 
                placeholder="https://exemplo.com/banner.jpg" 
                value={newBanner.image_url}
                onChange={(e) => setNewBanner({...newBanner, image_url: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria (Opcional)</label>
              <Select onValueChange={(val) => setNewBanner({...newBanner, category_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Link de Destino</label>
              <Input 
                placeholder="/produtos/categoria" 
                value={newBanner.link_url}
                onChange={(e) => setNewBanner({...newBanner, link_url: e.target.value})}
              />
            </div>
          </div>
          <Button onClick={handleAddBanner} disabled={isAdding}>
            {isAdding ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
            Cadastrar Banner
          </Button>
        </CardContent>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Preview</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>
                  <img src={banner.image_url} className="h-12 w-32 object-cover rounded border" />
                </TableCell>
                <TableCell>{banner.categories?.name || 'Geral'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{banner.link_url || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {banners.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum banner cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
