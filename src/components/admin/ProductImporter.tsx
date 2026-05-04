import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/lib/toast'
import { Loader2, Zap, Save, RefreshCw, CheckCircle2, History, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

export function ProductImporter() {
  const [activeTab, setActiveTab] = useState<'importer' | 'review' | 'history'>('importer')
  const [category, setCategory] = useState('')
  const [batchSize, setBatchSize] = useState(25)
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [importLogs, setImportLogs] = useState<any[]>([])
  const [reviewProducts, setReviewProducts] = useState<any[]>([])

  const categories = [
    "Bebidas", "Mercearia", "Hortifruti", "Limpeza", "Higiene", "Padaria", "Açougue", "Frios", "Pet Shop"
  ]

  useEffect(() => {
    if (activeTab === 'history') fetchImportLogs()
    if (activeTab === 'review') fetchReviewProducts()
  }, [activeTab])

  const fetchImportLogs = async () => {
    const { data } = await supabase.from('import_logs').select('*').order('created_at', { ascending: false }).limit(20)
    setImportLogs(data || [])
  }

  const fetchReviewProducts = async () => {
    const { data } = await supabase.from('products').select('*, categories(name)').eq('is_approved', false).order('created_at', { ascending: false })
    setReviewProducts(data || [])
  }

  const generateSuggestions = () => {
    if (!category) return toast.error('Selecione uma categoria')
    setLoading(true)
    
    // Realistic Brazilian supermarket product simulation
    const datasets: Record<string, any[]> = {
      "Bebidas": [
        { name: "Cerveja Heineken", brand: "Heineken", size: "330ml", price: "6.90" },
        { name: "Refrigerante Coca-Cola", brand: "Coca-Cola", size: "2L", price: "11.50" },
        { name: "Suco de Laranja Prats", brand: "Prats", size: "900ml", price: "14.90" },
        { name: "Água Mineral Crystal", brand: "Crystal", size: "500ml", price: "2.50" },
        { name: "Energético Red Bull", brand: "Red Bull", size: "250ml", price: "9.90" },
        { name: "Vinho Tinto Reservado", brand: "Concha y Toro", size: "750ml", price: "39.90" }
      ],
      "Mercearia": [
        { name: "Arroz Agulhinha Tipo 1", brand: "Tio João", size: "5kg", price: "29.90" },
        { name: "Feijão Carioca", brand: "Camil", size: "1kg", price: "8.50" },
        { name: "Açúcar Refinado", brand: "União", size: "1kg", price: "4.90" },
        { name: "Café Torrado e Moído", brand: "Pilão", size: "500g", price: "18.90" },
        { name: "Macarrão Espaguete", brand: "Barilla", size: "500g", price: "6.50" },
        { name: "Óleo de Soja", brand: "Soya", size: "900ml", price: "7.90" }
      ],
      "Hortifruti": [
        { name: "Banana Nanica", brand: "Produtor Local", size: "kg", price: "5.50" },
        { name: "Maçã Gala", brand: "Nacional", size: "kg", price: "12.90" },
        { name: "Batata Lavada", brand: "Nacional", size: "kg", price: "6.90" },
        { name: "Cebola Nacional", brand: "Nacional", size: "kg", price: "5.90" },
        { name: "Alface Crespa", brand: "Hidropônico", size: "Un", price: "3.50" }
      ],
      "Limpeza": [
        { name: "Sabão em Pó", brand: "OMO", size: "1.6kg", price: "24.90" },
        { name: "Detergente Líquido", brand: "Ypê", size: "500ml", price: "2.40" },
        { name: "Amaciante de Roupas", brand: "Downy", size: "500ml", price: "15.90" },
        { name: "Desinfetante Pinho Sol", brand: "Pinho Sol", size: "500ml", price: "8.90" },
        { name: "Papel Higiênico", brand: "Neve", size: "12 Rolos", price: "22.90" }
      ],
      "Higiene": [
        { name: "Creme Dental Total 12", brand: "Colgate", size: "90g", price: "7.90" },
        { name: "Shampoo Reconstrução", brand: "Dove", size: "400ml", price: "19.90" },
        { name: "Sabonete Barra", brand: "Rexona", size: "84g", price: "2.50" },
        { name: "Desodorante Aerosol", brand: "Rexona", size: "150ml", price: "14.90" }
      ]
    }

    const baseData = datasets[category] || datasets["Mercearia"]
    
    setTimeout(() => {
      const suggestions = Array.from({ length: batchSize }).map((_, i) => {
        const template = baseData[i % baseData.length]
        const id = Math.random().toString(36).substr(2, 9)
        return {
          id,
          name: template.name,
          brand: template.brand,
          size: template.size,
          price: (parseFloat(template.price) * (0.9 + Math.random() * 0.2)).toFixed(2),
          category: category,
          is_available: true
        }
      })
      setSuggestedProducts(suggestions)
      setSelectedIds(suggestions.map(s => s.id))
      setLoading(false)
      toast.success(`${suggestions.length} sugestões geradas para ${category}`)
    }, 800)
  }

  const handleImport = async () => {
    if (selectedIds.length === 0) return toast.error('Selecione ao menos um produto')
    setImporting(true)
    
     try {
       console.log('Starting product import...', selectedIds.length, 'items');
       const toImport = suggestedProducts.filter(p => selectedIds.includes(p.id))
       
       // Check if user is admin first
       const { data: isAdmin, error: adminCheckErr } = await supabase.rpc('is_admin');
       if (adminCheckErr) console.warn('Admin check error:', adminCheckErr);
       
       if (isAdmin === false) {
         toast.error('Você não tem permissão de administrador no banco de dados. Use o Reparador Admin.');
         setImporting(false);
         return;
       }
 
       // Get or create category
       // Input validation for category
       if (!category || category.trim() === '') {
         toast.error('Categoria inválida')
         return
       }
 
       let { data: catData, error: catFetchErr } = await supabase.from('categories').select('id').eq('name', category).maybeSingle()
       
        if (catFetchErr) {
          console.error('Error fetching category:', catFetchErr);
          toast.error('Erro ao buscar categoria: ' + catFetchErr.message);
        }
  
        if (!catData) {
          console.log('Category not found, creating:', category);
         const slug = category.toLowerCase()
           .normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "")
           .replace(/[^a-z0-9\s-]/g, "") // Sanitize slug
           .replace(/\s+/g, '-')
           .trim()
 
         const { data: newCat, error: catErr } = await supabase.from('categories').insert({ 
           name: category, 
           slug: slug 
         }).select().single()
         
         if (catErr) {
            console.error('Category creation failed:', catErr)
            const { data: retryCat } = await supabase.from('categories').select('id').eq('name', category).maybeSingle()
            catData = retryCat
         } else {
            catData = newCat
             console.log('New category created:', catData.id);
         }
       }

       let successCount = 0;
       let errorCount = 0;
        let lastErrorMessage = '';
       
       // Batch processing would be better, but keeping loop for fallback resilience
       for (const p of toImport) {
         // Validate price
         const priceValue = parseFloat(p.price);
         if (isNaN(priceValue)) continue;
 
         const productToInsert: any = {
           name: `${p.name} ${p.brand || ''} ${p.size || ''}`.trim().substring(0, 255), // Basic length limit
           price: priceValue,
           category_id: catData?.id || null,
           image_url: `https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=300&q=80`
         };
         
         const optionalFields = {
           brand: (p.brand || '').substring(0, 100),
           stock: 100,
           is_approved: true,
           is_available: true
         };
 
         let { error } = await supabase.from('products').insert({ ...productToInsert, ...optionalFields });
         
         if (error) {
           if (error.message.includes('column')) {
             const { error: retryError } = await supabase.from('products').insert(productToInsert);
             error = retryError;
           } else if (error.code === '42501') {
             toast.error('Erro de permissão (RLS). Você é um administrador?');
             setImporting(false);
             return; // Stop on RLS error as it won't change
           }
         }
         
         if (!error) successCount++;
         else {
           console.error('Failed to import product:', p.name, error);
            lastErrorMessage = error.message;
           errorCount++;
         }
       }

       await supabase.from('import_logs').insert({
        category: category,
        total_attempted: toImport.length,
        successful_count: successCount,
        duplicate_count: toImport.length - successCount,
        details: { products: toImport.map(p => p.name) }
       }).catch(e => console.warn('Failed to save import log:', e));
 
       if (successCount > 0) {
         toast.success(`${successCount} produtos importados com sucesso!`);
       }
       
       if (errorCount > 0) {
         toast.error(`${errorCount} produtos falharam. Último erro: ${lastErrorMessage}`);
       }
       
      setSuggestedProducts([])
      setSelectedIds([])
     } catch (error: any) {
       console.error('Critical import error:', error);
      toast.error('Erro na importação: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const updateProduct = (id: string, field: string, value: any) => {
    setSuggestedProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  return (
    <div className="space-y-6">
      <div className="flex bg-zinc-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('importer')} className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${activeTab === 'importer' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}>Sugestões</button>
        <button onClick={() => setActiveTab('review')} className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${activeTab === 'review' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}>Aprovação</button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}>Histórico</button>
      </div>

      {activeTab === 'importer' && (
        <div className="space-y-6">
          <Card className="border-2 border-zinc-900 shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-900 text-white">
              <CardTitle className="font-black italic uppercase italic tracking-tighter">Gerador de Catálogo</CardTitle>
              <CardDescription className="text-zinc-400 font-bold uppercase text-[10px]">Busca inteligente de produtos por categoria</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Categoria</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[200px] h-12 border-2 border-zinc-200">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Qtd. Produtos</label>
                  <Select value={batchSize.toString()} onValueChange={v => setBatchSize(parseInt(v))}>
                    <SelectTrigger className="w-[120px] h-12 border-2 border-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 25, 50].map(v => <SelectItem key={v} value={v.toString()}>{v} itens</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={generateSuggestions} disabled={loading} className="h-12 px-8 bg-zinc-900 hover:bg-zinc-800 font-black uppercase text-[10px] tracking-widest">
                  {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Gerar Sugestões
                </Button>
              </div>
            </CardContent>
          </Card>

          {suggestedProducts.length > 0 && (
            <Card className="border-2 border-zinc-100 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-black uppercase tracking-tighter">Sugestões Encontradas</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase">Revise e edite antes de importar para o sistema</CardDescription>
                </div>
                <Button onClick={handleImport} disabled={importing} className="bg-green-600 hover:bg-green-700 font-black uppercase text-[10px] px-8 h-12">
                  {importing ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Importar {selectedIds.length} Itens
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="w-12"><Checkbox checked={selectedIds.length === suggestedProducts.length} onCheckedChange={(checked) => setSelectedIds(checked ? suggestedProducts.map(p => p.id) : [])} /></TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Nome do Produto</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Marca</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Tamanho/Vol</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Preço Estimado</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Disponível</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestedProducts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell><Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                        <TableCell><Input value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)} className="h-8 text-xs font-bold" /></TableCell>
                        <TableCell><Input value={p.brand} onChange={e => updateProduct(p.id, 'brand', e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input value={p.size} onChange={e => updateProduct(p.id, 'size', e.target.value)} className="h-8 text-xs w-24" /></TableCell>
                        <TableCell><Input type="number" value={p.price} onChange={e => updateProduct(p.id, 'price', e.target.value)} className="h-8 text-xs w-24" /></TableCell>
                        <TableCell className="text-center">
                          <Switch checked={p.is_available} onCheckedChange={v => updateProduct(p.id, 'is_available', v)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle className="font-black uppercase italic tracking-tighter">Produtos Pendentes de Foto</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-amber-600">Esses produtos foram importados sem imagem e aguardam a próxima etapa de busca</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Produto</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-bold">{p.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase">Aguardando Foto</Badge></TableCell>
                  </TableRow>
                ))}
                {reviewProducts.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center py-8 text-zinc-400 uppercase text-[10px] font-bold">Nenhum produto pendente</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="font-black uppercase italic tracking-tighter">Histórico de Importação</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Categoria</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Sucesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-[10px]">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary">{log.category}</Badge></TableCell>
                    <TableCell className="font-bold">{log.successful_count} itens</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
