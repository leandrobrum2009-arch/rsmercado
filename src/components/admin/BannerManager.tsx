import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
 import { Loader2, Plus, Trash2, Image as ImageIcon, Upload } from 'lucide-react'
import { toast } from '@/lib/toast'

export function BannerManager() {
  const [banners, setBanners] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
   const [newBanner, setNewBanner] = useState({ image_url: '', category_id: '', link_url: '', is_active: true })
   const [uploading, setUploading] = useState(false)
   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (!file) return
 
     setUploading(true)
     try {
       const fileExt = file.name.split('.').pop()
       const fileName = `banner-${Math.random().toString(36).substring(2)}.${fileExt}`
       const filePath = `${fileName}`
 
        // Try banners bucket, fallback to products
        let bucketName = 'banners';
        let uploadError = null;
        
        const { data: uploadData, error: firstError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);
        
        if (firstError) {
          bucketName = 'products';
          const { data: retryData, error: retryError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file);
          uploadError = retryError;
        }
  
        if (uploadError) throw uploadError;
  
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)
 
       setNewBanner({ ...newBanner, image_url: publicUrl })
       toast.success('Banner carregado com sucesso!')
     } catch (error: any) {
       toast.error('Erro no upload: ' + error.message)
     } finally {
       setUploading(false)
     }
   }
 

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Try a simpler query first to avoid join errors if relations are not set
      // More robust check including superadmin email
      const { data: { session } } = await supabase.auth.getSession();
      const isSuperAdmin = session?.user?.email === 'leandrobrum2009@gmail.com';

       let bannersData = null;
       let bError = null;

       try {
         const response = await supabase
           .from('banners')
           .select('*')
           .order('created_at', { ascending: false });
         bannersData = response.data;
         bError = response.error;
       } catch (err: any) {
         bError = err;
       }

       if (bError) {
         console.error('Error fetching banners:', bError);
         const isMissingTable = bError.message?.includes('relation "banners" does not exist') || 
                               bError.message?.includes('schema cache') || 
                               bError.message?.includes('404');

         if (isMissingTable) {
           toast.error(
             <div className="flex flex-col gap-2">
               <p>A tabela de banners não foi encontrada no banco de dados.</p>
               <Button size="sm" onClick={() => window.location.href = '/admin-fix'} className="bg-red-600 text-[10px] font-black uppercase">
                 Reparar Banco de Dados
               </Button>
             </div>,
             { duration: 10000 }
           );
         } else {
           toast.error('Erro ao carregar banners: ' + bError.message);
         }
         setIsLoading(false);
         return;
       }

      const { data: catData } = await supabase.from('categories').select('*')
      
      // Safely map banners with categories
      const safeBanners = bannersData || [];
      const safeCategories = catData || [];
      
      const mappedBanners = safeBanners.map((banner: any) => ({
        ...banner,
        categories: safeCategories.find(c => c.id === banner.category_id)
      }));
      
      setBanners(mappedBanners);
      
      setCategories(catData || [])
    } catch (err: any) {
      console.error('Fetch data catch:', err)
      toast.error('Erro de conexão: ' + err.message)
    }
    setIsLoading(false)
  }

   const handleAddBanner = async () => {
     if (!newBanner.image_url) return toast.error('URL da imagem é obrigatória')
     
     setIsAdding(true)
     try {
       const { data: isAdmin } = await supabase.rpc('is_admin');
       const { data: { session } } = await supabase.auth.getSession();
       if (!isAdmin && session?.user?.email !== 'leandrobrum2009@gmail.com') {
         throw new Error('Sem permissão administrativa no banco de dados.');
       }

       // Ensure category_id is either a valid UUID or null
       const bannerToInsert = {
         ...newBanner,
        category_id: newBanner.category_id && newBanner.category_id !== '' && newBanner.category_id !== 'none' ? newBanner.category_id : null
       }
   
       const { error } = await supabase.from('banners').insert([bannerToInsert])
       
       if (error) throw error;

       toast.success('Banner adicionado!')
       setNewBanner({ image_url: '', category_id: '', link_url: '', is_active: true })
       fetchData()
     } catch (error: any) {
       console.error('Error adding banner:', error)
       toast.error('Erro ao adicionar: ' + error.message)
     } finally {
       setIsAdding(false)
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
             <div className="space-y-2 col-span-1 md:col-span-3">
                <label className="text-xs font-black uppercase text-zinc-500">Imagem do Banner</label>
                <div className="flex gap-4 items-center">
                  {newBanner.image_url && (
                    <img src={newBanner.image_url} className="w-32 h-16 object-cover rounded-lg border-2 border-zinc-200" alt="Preview" />
                  )}
                  <div className="flex-1">
                    <div className="relative">
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden" 
                        id="banner-upload"
                        disabled={uploading}
                      />
                      <label 
                        htmlFor="banner-upload" 
                        className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-300 rounded-xl cursor-pointer hover:border-zinc-900 transition-colors bg-zinc-50"
                      >
                        {uploading ? <Loader2 className="animate-spin" /> : <Upload className="text-zinc-400" />}
                        <span className="text-xs font-bold uppercase text-zinc-600">
                          {uploading ? 'Enviando...' : 'Clique para fazer upload ou arraste a imagem'}
                        </span>
                      </label>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2">Tamanho recomendado: 1200x400px</p>
                  </div>
                </div>
             </div>
            <div className="space-y-2">
               <label className="text-xs font-black uppercase text-zinc-500">Categoria (Opcional)</label>
               <Select onValueChange={(val) => setNewBanner({...newBanner, category_id: val === 'none' ? '' : val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="none">Nenhuma</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <label className="text-xs font-black uppercase text-zinc-500">Link de Destino</label>
              <Input 
                placeholder="/produtos/categoria" 
                value={newBanner.link_url}
                onChange={(e) => setNewBanner({...newBanner, link_url: e.target.value})}
              />
            </div>
          </div>
           <Button onClick={handleAddBanner} disabled={isAdding} className="w-full md:w-auto rounded-xl font-bold uppercase tracking-tight">
            {isAdding ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
            Cadastrar Banner
          </Button>
        </CardContent>
      </Card>

       <div className="border rounded-2xl overflow-hidden bg-white shadow-sm border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow>
               <TableHead className="text-[10px] font-black uppercase text-zinc-500">Preview</TableHead>
               <TableHead className="text-[10px] font-black uppercase text-zinc-500">Categoria</TableHead>
               <TableHead className="text-[10px] font-black uppercase text-zinc-500">Link</TableHead>
               <TableHead className="text-right text-[10px] font-black uppercase text-zinc-500">Ações</TableHead>
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
