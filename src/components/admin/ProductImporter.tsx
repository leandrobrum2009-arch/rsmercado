import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/lib/toast'
  import { Loader2, Zap, Save, RefreshCw, CheckCircle2, History, AlertCircle, FileUp, Download, Trash2, Image as ImageIcon, Search, ExternalLink, Camera } from 'lucide-react'
 import Papa from 'papaparse'
 import { Input } from '@/components/ui/input'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

export function ProductImporter() {
   const [activeTab, setActiveTab] = useState<'importer' | 'review' | 'history' | 'csv'>('importer')
   const [csvFile, setCsvFile] = useState<File | null>(null)
   const [csvData, setCsvData] = useState<any[]>([])
   const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (!file) return
     setCsvFile(file)
     
     Papa.parse(file, {
       header: true,
       skipEmptyLines: true,
       complete: (results) => {
         const parsedData = results.data.map((row: any, index: number) => ({
           id: `csv-${index}-${Math.random().toString(36).substr(2, 5)}`,
           name: row.nome || row.name || row.Produto || '',
           brand: row.marca || row.brand || row.Marca || '',
           size: row.tamanho || row.size || row.Tamanho || row.peso || row.vol || '',
           price: row.preco || row.price || row.Preço || '0.00',
           category: row.categoria || row.category || row.Categoria || category || 'Mercearia',
           is_available: true
         }))
         setCsvData(parsedData)
         setSuggestedProducts(parsedData)
         setSelectedIds(parsedData.map(p => p.id))
         toast.success(`${parsedData.length} produtos carregados do CSV`)
       },
       error: (error) => {
         toast.error(`Erro ao processar CSV: ${error.message}`)
       }
     })
   }
 
   const downloadTemplate = () => {
     const headers = ['nome', 'marca', 'tamanho', 'preco', 'categoria']
     const csvContent = headers.join(',') + '\nExemplo Arroz,Tio João,5kg,29.90,Mercearia\nExemplo Feijão,Camil,1kg,8.50,Mercearia'
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
     const link = document.createElement('a')
     const url = URL.createObjectURL(blob)
     link.setAttribute('href', url)
     link.setAttribute('download', 'template_importacao_produtos.csv')
     link.style.visibility = 'hidden'
     document.body.appendChild(link)
     link.click()
     document.body.removeChild(link)
   }
 
  const [category, setCategory] = useState('')
  const [batchSize, setBatchSize] = useState(25)
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [importLogs, setImportLogs] = useState<any[]>([])
   const [reviewProducts, setReviewProducts] = useState<any[]>([])
   const [availableCategories, setAvailableCategories] = useState<any[]>([])
   const [searchDialogOpen, setSearchDialogOpen] = useState(false)
   const [searchingProduct, setSearchingProduct] = useState<any>(null)
   const [searchQuery, setSearchQuery] = useState('')
   const [searchResults, setSearchResults] = useState<string[]>([])
   const [searching, setSearching] = useState(false)
 
   const openImageSearch = (product: any) => {
     setSearchingProduct(product)
     setSearchQuery(`${product.name} ${product.brand} ${product.size}`)
     setSearchDialogOpen(true)
     setSearchResults([])
   }
 
    const performSearch = async () => {
      if (!searchQuery.trim()) return;
      setSearching(true);
      try {
         const query = encodeURIComponent(searchQuery + " produto supermercado fundo branco");
         const placeholders = [
           `https://tse1.mm.bing.net/th?q=${query}&w=600&h=600&c=7`,
           `https://tse2.mm.bing.net/th?q=${query}&w=600&h=600&c=7`,
           `https://tse3.mm.bing.net/th?q=${query}&w=600&h=600&c=7`,
           `https://tse4.mm.bing.net/th?q=${query}&w=600&h=600&c=7`,
           `https://tse1.mm.bing.net/th?q=${encodeURIComponent(searchQuery + " embalagem real")}&w=600&h=600&c=7`,
           `https://tse2.mm.bing.net/th?q=${encodeURIComponent(searchQuery + " pack")}&w=600&h=600&c=7`
         ];
        await new Promise(resolve => setTimeout(resolve, 800));
        setSearchResults(placeholders);
      } catch (error) {
        toast.error('Erro ao buscar imagens');
      } finally {
        setSearching(false);
      }
    };
 
   const selectImage = (url: string) => {
     if (searchingProduct) {
       updateProduct(searchingProduct.id, 'image_url', url)
       setSearchDialogOpen(false)
     }
   }
 
    const categories = [
      "Bebidas", "Mercearia", "Hortifruti", "Limpeza", "Higiene", "Padaria", "Açougue", "Laticínios", "Frios", "Pet Shop", 
      "Congelados", "Enlatados", "Doces e Biscoitos", "Massas e Grãos", "Café e Matinais", "Temperos", "Utilidades Domésticas", "Beleza"
    ]
 
   const fetchCategories = async () => {
     const { data } = await supabase.from('categories').select('*').order('name')
     if (data) setAvailableCategories(data)
   }
 
   useEffect(() => {
     fetchCategories()
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

  const generateSuggestions = async () => {
    if (!category) return toast.error('Selecione uma categoria')
    setLoading(true)
    
    // Get existing products to avoid duplicates - fetch more to be safe
    let { data: existingProducts } = await supabase
      .from('products')
      .select('name, brand, size')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Create a robust set for duplicate checking
    const existingSet = new Set(
      (existingProducts || []).map(p => 
        `${p.name.toLowerCase().trim()}|${(p.brand || '').toLowerCase().trim()}|${(p.size || '').toLowerCase().trim()}`
      )
    );

    // Realistic Brazilian supermarket product simulation
    const datasets: Record<string, any[]> = {
      "Bebidas": [
         { name: "Cerveja Heineken", brand: "Heineken", size: "330ml", price: "6.90", image_url: "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400&q=80" },
         { name: "Cerveja Skol", brand: "Skol", size: "350ml", price: "3.50" },
         { name: "Cerveja Brahma", brand: "Brahma", size: "350ml", price: "3.40" },
         { name: "Refrigerante Guaraná Antarctica", brand: "Antarctica", size: "2L", price: "8.90" },
         { name: "Água de Coco Obrigado", brand: "Obrigado", size: "1L", price: "12.50" },
         { name: "Suco de Uva Aurora", brand: "Aurora", size: "1.5L", price: "18.90" },
         { name: "Refrigerante Coca-Cola", brand: "Coca-Cola", size: "2L", price: "11.50", image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80" },
         { name: "Suco de Laranja Prats", brand: "Prats", size: "900ml", price: "14.90", image_url: "https://images.unsplash.com/photo-1621506289937-4c72ba5fb9cf?w=400&q=80" },
         { name: "Água Mineral Crystal", brand: "Crystal", size: "500ml", price: "2.50", image_url: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80" },
         { name: "Energético Red Bull", brand: "Red Bull", size: "250ml", price: "9.90", image_url: "https://images.unsplash.com/photo-1622543953491-f17a46dff73c?w=400&q=80" },
         { name: "Vinho Tinto Reservado", brand: "Concha y Toro", size: "750ml", price: "39.90", image_url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80" }
      ],
      "Mercearia": [
         { name: "Arroz Agulhinha Tipo 1", brand: "Tio João", size: "5kg", price: "29.90", image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
         { name: "Feijão Carioca", brand: "Camil", size: "1kg", price: "8.50", image_url: "https://images.unsplash.com/photo-1551462147-37885acc3c41?w=400&q=80" },
         { name: "Açúcar Refinado", brand: "União", size: "1kg", price: "4.90", image_url: "https://images.unsplash.com/photo-1581447100595-37735c3bc2d4?w=400&q=80" },
         { name: "Café Torrado e Moído", brand: "Pilão", size: "500g", price: "18.90", image_url: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80" },
         { name: "Macarrão Espaguete", brand: "Barilla", size: "500g", price: "6.50", image_url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&q=80" },
         { name: "Óleo de Soja", brand: "Soya", size: "900ml", price: "7.90", image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" }
      ],
      "Hortifruti": [
        { name: "Banana Nanica", brand: "Produtor Local", size: "kg", price: "5.50" },
        { name: "Maçã Gala", brand: "Nacional", size: "kg", price: "12.90" },
        { name: "Batata Lavada", brand: "Nacional", size: "kg", price: "6.90" },
        { name: "Cebola Nacional", brand: "Nacional", size: "kg", price: "5.90" },
        { name: "Alface Crespa", brand: "Hidropônico", size: "Un", price: "3.50" }
      ],
      "Limpeza": [
        { name: "Sabão em Pó Lavagem Perfeita", brand: "OMO", size: "1.6kg", price: "24.90" },
        { name: "Limpador Multiuso", brand: "Veja", size: "500ml", price: "5.50" },
        { name: "Desinfetante", brand: "Lysoform", size: "1L", price: "14.90" },
        { name: "Água Sanitária", brand: "Qboa", size: "2L", price: "6.90" },
        { name: "Esponja de Aço", brand: "Bombril", size: "pacote", price: "3.20" },
        { name: "Detergente Líquido", brand: "Ypê", size: "500ml", price: "2.40" },
        { name: "Amaciante de Roupas", brand: "Downy", size: "500ml", price: "15.90" },
        { name: "Desinfetante Pinho Sol", brand: "Pinho Sol", size: "500ml", price: "8.90" },
        { name: "Papel Higiênico", brand: "Neve", size: "12 Rolos", price: "22.90" }
      ],
      "Higiene": [
        { name: "Creme Dental Total 12", brand: "Colgate", size: "90g", price: "7.90" },
        { name: "Sabonete Líquido", brand: "Lux", size: "250ml", price: "8.90" },
        { name: "Papel Higiênico Folha Dupla", brand: "Neve", size: "12 rolos", price: "24.90" },
        { name: "Fio Dental", brand: "Oral-B", size: "50m", price: "11.50" },
        { name: "Enxaguante Bucal", brand: "Listerine", size: "500ml", price: "22.90" },
      ],
      "Pet Shop": [
        { name: "Ração para Cães Adultos", brand: "Pedigree", size: "10kg", price: "129.90" },
        { name: "Ração Úmida para Gatos", brand: "Whiskas", size: "85g", price: "3.50" },
        { name: "Areia Sanitária para Gatos", brand: "Pipicat", size: "4kg", price: "15.90" },
        { name: "Petisco para Cães", brand: "Doguito", size: "65g", price: "6.50" }
      ],
      "Padaria": [
        { name: "Pão de Forma Tradicional", brand: "Wickbold", size: "500g", price: "9.50" },
        { name: "Biscoito de Polvilho", brand: "Produtor Local", size: "200g", price: "7.90" },
        { name: "Pão Francês", brand: "Produção Própria", size: "unidade", price: "0.50" },
        { name: "Bolo de Cenoura", brand: "Produção Própria", size: "unidade", price: "15.00" }
      ],
      "Açougue": [
        { name: "Patinho Bovino Moído", brand: "Friboi", size: "500g", price: "22.50" },
        { name: "Coxa e Sobrecoxa de Frango", brand: "Seara", size: "1kg", price: "14.90" },
        { name: "Linguiça Toscana", brand: "Sadia", size: "1kg", price: "24.90" },
        { name: "Filé de Peito de Frango", brand: "Seara", size: "1kg", price: "19.90" }
      ],
      "Laticínios": [
        { name: "Leite Integral UHT", brand: "Piracanjuba", size: "1L", price: "5.50" },
        { name: "Iogurte Natural", brand: "Danone", size: "170g", price: "3.20" },
        { name: "Manteiga com Sal", brand: "Aviação", size: "200g", price: "14.50" },
        { name: "Requeijão Cremoso", brand: "Itambé", size: "200g", price: "9.90" },
        { name: "Queijo Mussarela Fatiado", brand: "President", size: "150g", price: "12.90" }
      ],
      "Frios": [
        { name: "Presunto Cozido fatiado", brand: "Seara", size: "200g", price: "9.90" },
        { name: "Peito de Peru Fatiado", brand: "Sadia", size: "200g", price: "14.90" },
        { name: "Salame Italiano", brand: "Sadia", size: "100g", price: "12.50" },
        { name: "Mortadela Defumada", brand: "Seara", size: "200g", price: "6.90" }
      ],
      "Congelados": [
        { name: "Pizza de Calabresa", brand: "Sadia", size: "460g", price: "16.90" },
        { name: "Lasanha à Bolonhesa", brand: "Seara", size: "600g", price: "15.50" },
        { name: "Batata Pré-Frita Congelada", brand: "McCain", size: "400g", price: "12.90" },
        { name: "Nuggets de Frango", brand: "Sadia", size: "300g", price: "11.50" },
        { name: "Sorvete de Chocolate", brand: "Kibon", size: "1.5L", price: "29.90" }
      ],
      "Doces e Biscoitos": [
        { name: "Biscoito Recheado Chocolate", brand: "Passatempo", size: "130g", price: "3.20" },
        { name: "Chocolate em Barra Ao Leite", brand: "Nestlé", size: "90g", price: "5.50" },
        { name: "Wafer Morango", brand: "Bauducco", size: "140g", price: "4.50" },
        { name: "Bombom Sonho de Valsa", brand: "Lacta", size: "unidade", price: "1.50" },
        { name: "Bala de Goma", brand: "Fini", size: "90g", price: "6.90" }
      ],
      "Massas e Grãos": [
        { name: "Arroz Integral", brand: "Tio João", size: "1kg", price: "7.90" },
        { name: "Feijão Preto", brand: "Camil", size: "1kg", price: "9.50" },
        { name: "Grão de Bico", brand: "Yoki", size: "500g", price: "11.90" },
        { name: "Lentilha", brand: "Yoki", size: "500g", price: "10.50" },
        { name: "Quinoa em Grãos", brand: "Mãe Terra", size: "200g", price: "18.90" }
      ],
      "Café e Matinais": [
        { name: "Café Solúvel Tradicional", brand: "Nescafé", size: "100g", price: "16.90" },
        { name: "Cereal Matinal de Milho", brand: "Kellogg's", size: "240g", price: "12.50" },
        { name: "Achocolatado em Pó", brand: "Nescau", size: "400g", price: "9.90" },
        { name: "Aveia em Flocos", brand: "Quaker", size: "165g", price: "6.50" },
        { name: "Geleia de Morango", brand: "Queensberry", size: "320g", price: "24.90" }
      ],
      "Utilidades Domésticas": [
        { name: "Pilha Alcalina AA", brand: "Duracell", size: "4 unidades", price: "28.90" },
        { name: "Lâmpada LED 9W", brand: "Philips", size: "unidade", price: "12.50" },
        { name: "Papel Alumínio", brand: "Wyda", size: "45cm x 4m", price: "8.90" },
        { name: "Filtro de Café 103", brand: "Melitta", size: "30 unidades", price: "5.50" }
      ]
    }

    const baseData = datasets[category] || datasets["Mercearia"]
    
    // Filter out existing products and try to generate unique ones
    let suggestions: any[] = []
    let attempts = 0
    const maxItems = Math.min(batchSize, 50)
    
    // Sort baseData randomly to provide fresh suggestions each time
    const randomizedData = [...baseData].sort(() => Math.random() - 0.5);

    while (suggestions.length < maxItems && attempts < randomizedData.length) {
      const template = randomizedData[attempts]
      const key = `${template.name.toLowerCase().trim()}|${(template.brand || '').toLowerCase().trim()}|${(template.size || '').toLowerCase().trim()}`
      
      if (!existingSet.has(key)) {
        const id = Math.random().toString(36).substr(2, 9)
        const price = (parseFloat(template.price) * (0.9 + Math.random() * 0.2)).toFixed(2);
        const image_url = template.image_url || `https://tse1.mm.bing.net/th?q=${encodeURIComponent(template.name + " " + (template.brand || "") + " " + (template.size || "") + " fundo branco")}&w=400&h=400&c=7&rs=1`;
        
        suggestions.push({
          id,
          name: template.name,
          brand: template.brand,
          size: template.size,
          price,
          category: category,
          is_available: true,
          image_url
        })
        existingSet.add(key) // Don't suggest the same item twice in the same batch
      }
      attempts++
    }

    if (suggestions.length === 0) {
      toast.error('Todos os produtos sugeridos já estão cadastrados!')
      setLoading(false)
      return
    }

    setSuggestedProducts(suggestions)
    setSelectedIds(suggestions.map(s => s.id))
    setLoading(false)
    toast.success(`${suggestions.length} sugestões geradas para ${category}`)
  }

   const handleImport = async () => {
     if (selectedIds.length === 0) return toast.error('Selecione ao menos um produto')
     setImporting(true)
     
     try {
       console.log('Starting product import...', selectedIds.length, 'items');
       const toImport = suggestedProducts.filter(p => selectedIds.includes(p.id))
       
       // Check if user is admin
       const { data: isAdmin, error: adminCheckErr } = await supabase.rpc('is_admin');
       if (adminCheckErr) console.warn('Admin check error:', adminCheckErr);
       
       if (isAdmin === false) {
         toast.error('Você não tem permissão de administrador. Use o Reparador Admin.');
         setImporting(false);
         return;
       }
 
       const categoryCache: Record<string, string> = {};
       let successCount = 0;
       let errorCount = 0;
       let lastErrorMessage = '';
 
       for (const p of toImport) {
         const pCategory = p.category || category || 'Mercearia';
         let catId = categoryCache[pCategory];
 
         if (!catId) {
           let { data: existingCat } = await supabase.from('categories').select('id').eq('name', pCategory).maybeSingle();
           if (existingCat) {
             catId = existingCat.id;
           } else {
             const slug = pCategory.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, '-').trim();
             const { data: newCat, error: catErr } = await supabase.from('categories').insert({ name: pCategory, slug }).select().single();
             if (newCat) catId = newCat.id;
             else {
               const { data: retryCat } = await supabase.from('categories').select('id').eq('name', pCategory).maybeSingle();
               if (retryCat) catId = retryCat.id;
             }
           }
           if (catId) categoryCache[pCategory] = catId;
         }
 
         const priceValue = parseFloat(p.price);
         const productData = {
           name: p.name.trim().substring(0, 255),
           price: isNaN(priceValue) ? 0 : priceValue,
           category_id: catId || null,
           brand: (p.brand || '').substring(0, 100),
           stock: 100,
           is_approved: true,
           is_available: true,
            image_url: p.image_url || `https://tse1.mm.bing.net/th?q=${encodeURIComponent(p.name + " " + (p.brand || "") + " fundo branco")}&w=300&h=300&c=7`
          };
 
         const { error } = await supabase.from('products').insert(productData);
         
         if (!error) successCount++;
         else {
           console.error('Failed to import product:', p.name, error);
           lastErrorMessage = error.message;
           errorCount++;
         }
       }

       try {
         await supabase.from('import_logs').insert({
           category: category,
           total_attempted: toImport.length,
           successful_count: successCount,
           duplicate_count: toImport.length - successCount,
           details: { products: toImport.map(p => p.name) }
         });
       } catch (e) {
         console.warn('Failed to save import log:', e);
       }
 
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
       <div className="flex bg-zinc-100 p-1 rounded-xl w-fit mb-6">
         <button onClick={() => setActiveTab('importer')} className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${activeTab === 'importer' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}>Sugestões</button>
         <button onClick={() => setActiveTab('review')} className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${activeTab === 'review' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}>Aprovação</button>
         <button onClick={() => setActiveTab('csv')} className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${activeTab === 'csv' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}>Importar CSV/Lote</button>
         <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}>Histórico</button>
       </div>
 
       {activeTab === 'csv' && (
         <div className="space-y-6">
           <Card className="border-2 border-zinc-900 shadow-xl overflow-hidden">
             <CardHeader className="bg-zinc-900 text-white">
               <div className="flex justify-between items-center">
                 <div>
                   <CardTitle className="font-black italic uppercase italic tracking-tighter">Importação em Lote (CSV)</CardTitle>
                   <CardDescription className="text-zinc-400 font-bold uppercase text-[10px]">Carregue uma planilha com seus produtos</CardDescription>
                 </div>
                 <Button onClick={downloadTemplate} variant="outline" className="text-white border-zinc-700 hover:bg-zinc-800 font-black uppercase text-[10px]">
                   <Download className="mr-2 h-4 w-4" /> Template CSV
                 </Button>
               </div>
             </CardHeader>
             <CardContent className="p-12">
               <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-2xl p-12 hover:border-zinc-900 transition-colors cursor-pointer group relative">
                 <Input 
                   type="file" 
                   accept=".csv" 
                   onChange={handleCsvUpload} 
                   className="absolute inset-0 opacity-0 cursor-pointer" 
                 />
                 <div className="bg-zinc-100 p-6 rounded-full group-hover:bg-zinc-900 group-hover:text-white transition-all">
                   <FileUp className="h-12 w-12" />
                 </div>
                 <div className="mt-6 text-center">
                   <h3 className="font-black uppercase italic text-xl">Clique para selecionar ou arraste o arquivo</h3>
                   <p className="text-zinc-500 font-bold uppercase text-[10px] mt-2">Suporta arquivos .csv (Colunas: nome, marca, tamanho, preco, categoria)</p>
                 </div>
                 {csvFile && (
                   <div className="mt-6 flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
                     <CheckCircle2 className="h-4 w-4" />
                     <span className="text-xs font-black uppercase">{csvFile.name}</span>
                   </div>
                 )}
               </div>
             </CardContent>
           </Card>
 
           {csvData.length > 0 && (
             <Card className="border-2 border-zinc-100 shadow-xl">
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle className="font-black uppercase tracking-tighter">Produtos Detectados no Arquivo</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase">Revise os dados antes de salvar no sistema</CardDescription>
                 </div>
                 <div className="flex gap-2">
                   <Button onClick={() => { setCsvData([]); setSuggestedProducts([]); setCsvFile(null); }} variant="outline" className="border-2 border-zinc-200 font-black uppercase text-[10px] h-12">
                     <Trash2 className="mr-2 h-4 w-4" /> Limpar
                   </Button>
                   <Button onClick={handleImport} disabled={importing} className="bg-green-600 hover:bg-green-700 font-black uppercase text-[10px] px-8 h-12">
                     {importing ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                     Importar {selectedIds.length} Itens do CSV
                   </Button>
                 </div>
               </CardHeader>
               <CardContent className="p-0">
                 <Table>
                   <TableHeader className="bg-zinc-50">
                     <TableRow>
                       <TableHead className="w-12"><Checkbox checked={selectedIds.length === csvData.length} onCheckedChange={(checked) => setSelectedIds(checked ? csvData.map(p => p.id) : [])} /></TableHead>
                       <TableHead className="text-[10px] font-black uppercase">Nome</TableHead>
                       <TableHead className="text-[10px] font-black uppercase">Marca</TableHead>
                       <TableHead className="text-[10px] font-black uppercase">Tam/Peso</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">Preço</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">Foto</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Categoria</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {csvData.map(p => (
                       <TableRow key={p.id}>
                         <TableCell><Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                         <TableCell><Input value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)} className="h-8 text-xs font-bold" /></TableCell>
                         <TableCell><Input value={p.brand} onChange={e => updateProduct(p.id, 'brand', e.target.value)} className="h-8 text-xs" /></TableCell>
                         <TableCell><Input value={p.size} onChange={e => updateProduct(p.id, 'size', e.target.value)} className="h-8 text-xs w-24" /></TableCell>
                          <TableCell><Input type="number" value={p.price} onChange={e => updateProduct(p.id, 'price', e.target.value)} className="h-8 text-xs w-24 text-center" /></TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-8 h-8 rounded border overflow-hidden bg-zinc-100 flex-shrink-0">
                                {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Camera className="w-full h-full p-2 text-zinc-300" />}
                              </div>
                              <Button onClick={() => openImageSearch(p)} variant="outline" size="icon" className="h-8 w-8 rounded-full border-zinc-200">
                                <Search className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell><Input value={p.category} onChange={e => updateProduct(p.id, 'category', e.target.value)} className="h-8 text-xs w-32" /></TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
           )}
         </div>
       )}
 
       {activeTab === 'importer' && (
        <div className="space-y-6">
          <Card className="border-2 border-zinc-900 shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-900 text-white">
              <CardTitle className="font-black italic uppercase italic tracking-tighter">Gerador de Catálogo</CardTitle>
               <CardDescription className="text-zinc-400 font-bold uppercase text-[10px]">Busca inteligente de produtos com pesquisa automática de imagens</CardDescription>
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
                       {availableCategories.length > 0 ? (
                         availableCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
                       ) : (
                         categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                       )}
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
                 <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2 italic">
                   Dica: Após gerar, clique na lupa <Search className="inline h-2 w-2" /> para buscar fotos reais de cada produto.
                 </p>
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
                       <TableHead className="text-[10px] font-black uppercase text-center">Tam/Vol</TableHead>
                       <TableHead className="text-[10px] font-black uppercase text-center">Preço</TableHead>
                       <TableHead className="text-[10px] font-black uppercase text-center">Foto</TableHead>
                       <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestedProducts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell><Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                        <TableCell><Input value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)} className="h-8 text-xs font-bold" /></TableCell>
                        <TableCell><Input value={p.brand} onChange={e => updateProduct(p.id, 'brand', e.target.value)} className="h-8 text-xs" /></TableCell>
                         <TableCell><Input value={p.size} onChange={e => updateProduct(p.id, 'size', e.target.value)} className="h-8 text-xs w-24 text-center" /></TableCell>
                         <TableCell><Input type="number" value={p.price} onChange={e => updateProduct(p.id, 'price', e.target.value)} className="h-8 text-xs w-24 text-center" /></TableCell>
                         <TableCell>
                           <div className="flex items-center justify-center gap-2">
                             <div className="w-8 h-8 rounded border overflow-hidden bg-zinc-100 flex-shrink-0">
                               {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Camera className="w-full h-full p-2 text-zinc-300" />}
                             </div>
                             <Button onClick={() => openImageSearch(p)} variant="outline" size="icon" className="h-8 w-8 rounded-full border-zinc-200">
                               <Search className="h-3 w-3" />
                             </Button>
                           </div>
                         </TableCell>
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
 
       <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
         <DialogContent className="max-w-2xl border-4 border-zinc-900 shadow-2xl">
           <DialogHeader>
             <DialogTitle className="font-black uppercase italic text-2xl tracking-tighter">Buscador de Fotos</DialogTitle>
             <DialogDescription className="font-bold uppercase text-[10px]">Encontre a melhor imagem para {searchingProduct?.name}</DialogDescription>
           </DialogHeader>
           
           <div className="space-y-6 py-4">
             <div className="flex gap-2">
               <Input 
                 value={searchQuery} 
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Ex: Coca Cola 2L garrafa"
                 className="font-bold"
               />
               <Button onClick={performSearch} disabled={searching} className="bg-zinc-900 hover:bg-zinc-800">
                 {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
               </Button>
               <Button variant="outline" className="border-2 border-zinc-200" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`, '_blank')}>
                 <ExternalLink className="h-4 w-4" />
               </Button>
             </div>
 
             {searchResults.length > 0 ? (
               <div className="grid grid-cols-3 gap-4">
                 {searchResults.map((url, i) => (
                   <div 
                     key={i} 
                     className="group relative aspect-square rounded-xl overflow-hidden border-2 border-zinc-100 hover:border-zinc-900 cursor-pointer transition-all"
                     onClick={() => selectImage(url)}
                   >
                     <img src={url} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <span className="text-white font-black uppercase text-[10px]">Selecionar</span>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="border-2 border-dashed border-zinc-100 rounded-2xl p-12 text-center">
                 <ImageIcon className="h-12 w-12 mx-auto text-zinc-200 mb-4" />
                 <p className="text-zinc-400 font-bold uppercase text-[10px]">Clique em pesquisar para ver sugestões ou use o botão do Google ao lado</p>
               </div>
             )}
 
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-zinc-500">Ou cole a URL da imagem diretamente</label>
               <Input 
                 placeholder="https://exemplo.com/foto.jpg" 
                 onChange={(e) => {
                   if (e.target.value.startsWith('http')) {
                     selectImage(e.target.value)
                   }
                 }}
                 className="text-xs"
               />
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="ghost" onClick={() => setSearchDialogOpen(false)} className="font-black uppercase text-[10px]">Cancelar</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </div>
  )
}
