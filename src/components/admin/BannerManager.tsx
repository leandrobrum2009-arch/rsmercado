import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Trash2, Image as ImageIcon, Upload, Instagram, LayoutGrid, Layers, ArrowUp, ArrowDown, ChevronUp } from 'lucide-react'
import { toast } from '@/lib/toast'

export function BannerManager() {
  const [activeTab, setActiveTab] = useState<'home' | 'categories'>('home')
  const [banners, setBanners] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
   const [newBanner, setNewBanner] = useState({ image_url: '', category_id: '', link_url: '', is_active: true })
   const [uploading, setUploading] = useState<string | boolean>(false)
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
        
        const buckets = ['banners', 'categories', 'products'];
        let success = false;

        for (const bucket of buckets) {
          const { data, error } = await supabase.storage.from(bucket).upload(filePath, file);
          if (!error) {
            bucketName = bucket;
            success = true;
            break;
          }
          uploadError = error;
        }

        if (!success) throw uploadError || new Error('Não foi possível fazer o upload em nenhum bucket.');
  
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

  const importFromInstagram = (url: string) => {
    if (!url.includes('instagram.com/')) {
      return toast.error('URL do Instagram inválida');
    }
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && (pathParts[0] === 'p' || pathParts[0] === 'reels' || pathParts[0] === 'reel' || pathParts[0] === 'stories')) {
        const postId = pathParts[1];
        const imageUrl = `https://www.instagram.com/p/${postId}/media/?size=l`;
        setNewBanner({ ...newBanner, image_url: imageUrl });
        toast.success('Imagem do Instagram capturada para o banner!');
      } else {
        toast.error('Não foi possível identificar o ID da postagem.');
      }
    } catch (e) {
      toast.error('Erro ao processar URL.');
    }
  };

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

  const updateCategoryBanner = async (categoryId: string, url: string) => {
    try {
      const { error } = await supabase.from('categories').update({ banner_url: url }).eq('id', categoryId);
      if (error) throw error;
      toast.success('Banner da categoria atualizado!');
      fetchData();
    } catch (err: any) {
      console.error('Error updating category banner:', err);
      toast.error('Erro ao atualizar: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleMoveToBottom = async (id: string) => {
    // Set to a date far in the past
    const { error } = await supabase.from('banners').update({ created_at: '2000-01-01T00:00:00Z' }).eq('id', id);
    if (error) toast.error('Erro ao reordenar');
    else {
      toast.success('Banner movido para o final!');
      fetchData();
    }
  };

  const handleMoveToTop = async (id: string) => {
    const { error } = await supabase.from('banners').update({ created_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error('Erro ao reordenar');
    else {
      toast.success('Banner movido para o topo!');
      fetchData();
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex bg-zinc-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('home')} 
          className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all flex items-center gap-2 ${activeTab === 'home' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          <Layers size={14} /> Carrossel Principal
        </button>
        <button 
          onClick={() => setActiveTab('categories')} 
          className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          <LayoutGrid size={14} /> Banners de Categorias
        </button>
      </div>

      {activeTab === 'home' ? (
        <>
      <Card>
        <CardHeader>
          <CardTitle className="font-black uppercase italic tracking-tighter">Adicionar ao Carrossel Principal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="space-y-2 col-span-1 md:col-span-3">
                <label className="text-xs font-black uppercase text-zinc-500 flex justify-between items-center">
                  Imagem do Banner
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 text-[9px] font-black text-pink-600 hover:text-pink-700 p-0"
                    onClick={() => {
                      const url = prompt('Cole o link da postagem do Instagram para a imagem:');
                      if (url) importFromInstagram(url);
                    }}
                  >
                    <Instagram size={10} className="mr-1" /> Importar do Insta
                  </Button>
                </label>
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

      <div className="border-2 border-zinc-100 rounded-[32px] overflow-hidden bg-white shadow-xl shadow-zinc-100">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
               <TableHead className="text-[10px] font-black uppercase text-zinc-500 p-6">Preview</TableHead>
               <TableHead className="text-[10px] font-black uppercase text-zinc-500">Link de Destino</TableHead>
               <TableHead className="text-right text-[10px] font-black uppercase text-zinc-500 p-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell className="p-6">
                  <div className="relative group">
                    <img src={banner.image_url} className="h-20 w-48 object-cover rounded-2xl shadow-sm border border-zinc-100" />
                    {banner.categories && (
                      <span className="absolute -top-2 -right-2 bg-zinc-900 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                        {banner.categories.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-800">{banner.link_url || 'Sem link'}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Redireciona ao clicar</span>
                  </div>
                </TableCell>
                <TableCell className="text-right p-6">
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleMoveToTop(banner.id)} 
                      className="text-amber-500 hover:bg-amber-50 rounded-full h-10 w-10"
                      title="Mover para o início"
                    >
                      <ArrowUp className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleMoveToBottom(banner.id)} 
                      className="text-zinc-500 hover:bg-zinc-50 rounded-full h-10 w-10"
                      title="Mover para o final"
                    >
                      <ArrowDown className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)} className="text-red-500 hover:bg-red-50 rounded-full h-10 w-10">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {banners.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-20">
                  <div className="flex flex-col items-center gap-2 text-zinc-300">
                    <ImageIcon size={48} strokeWidth={1} />
                    <p className="font-black uppercase text-[10px] tracking-widest">Nenhum banner no carrossel</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Card key={cat.id} className="rounded-[32px] overflow-hidden border-2 border-zinc-100 hover:border-zinc-900 transition-all group">
              <div className="h-32 bg-zinc-100 relative overflow-hidden">
                {cat.banner_url ? (
                  <img src={cat.banner_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-1 bg-zinc-50">
                    <ImageIcon size={24} strokeWidth={1.5} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Sem Banner</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white shadow-lg">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-900">{cat.name}</span>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex justify-between">
                    URL da Imagem
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-4 text-[8px] font-black text-pink-600 p-0"
                      onClick={() => {
                        const url = prompt('Cole o link do Instagram para o banner de ' + cat.name + ':');
                        if (url) {
                          const pathParts = new URL(url).pathname.split('/').filter(Boolean);
                          if (pathParts[1]) updateCategoryBanner(cat.id, `https://www.instagram.com/p/${pathParts[1]}/media/?size=l`);
                        }
                      }}
                    >
                      <Instagram size={10} className="mr-1" /> Insta
                    </Button>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      key={`${cat.id}-${cat.banner_url}`}
                      placeholder="Link da imagem..."
                      defaultValue={cat.banner_url}
                      onBlur={(e) => {
                        if (e.target.value !== cat.banner_url) {
                          updateCategoryBanner(cat.id, e.target.value);
                        }
                      }}
                      className="text-xs font-bold h-10 rounded-xl"
                    />
                    <label className="h-10 w-10 shrink-0 bg-zinc-900 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors">
                      {uploading === cat.id ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        disabled={uploading !== false}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(cat.id);
                          try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `cat-banner-${cat.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                          
                          const buckets = ['banners', 'categories', 'products'];
                          let success = false;
                          let finalBucket = 'products';

                          for (const bucket of buckets) {
                            const { error } = await supabase.storage.from(bucket).upload(fileName, file);
                            if (!error) {
                              finalBucket = bucket;
                              success = true;
                              break;
                            }
                          }

                          if (success) {
                            const { data: { publicUrl } } = supabase.storage.from(finalBucket).getPublicUrl(fileName);
                            await updateCategoryBanner(cat.id, publicUrl);
                          } else {
                            toast.error('Erro ao fazer upload da imagem.');
                          }
                          } catch (err: any) {
                            toast.error('Erro no processamento: ' + err.message);
                          } finally {
                            setUploading(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
