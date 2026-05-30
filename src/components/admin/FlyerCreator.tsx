import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas-pro'
import { useStoreSettings } from '@/hooks/useStoreSettings'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, Printer, Download, Instagram, Layout, Palette, Image as ImageIcon, MessageSquare, Camera } from 'lucide-react'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { sendWhatsAppMessage, formatWhatsAppMessage, getWhatsAppTemplates } from '@/lib/whatsapp'
import { toast } from '@/lib/toast'
import { sanitizeClonedDocColors } from '@/lib/sanitizeColors'
type FlyerProduct = {
id: string
name: string
price: number
original_price: number
image_url: string
}

export function FlyerCreator() {
const [layout, setLayout] = useState(() => localStorage.getItem('last_flyer_layout') || 'grid-4')
const [designStyle, setDesignStyle] = useState(() => localStorage.getItem('last_flyer_style') || 'varejo')
const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('last_flyer_primary_color') || '#e11d48')
const [secondaryColor, setSecondaryColor] = useState(() => localStorage.getItem('last_flyer_secondary_color') || '#fbbf24')
const { settings: storeSettings } = useStoreSettings()
const [title, setTitle] = useState('Ofertas Especiais')
const [printImage, setPrintImage] = useState<string | null>(null)
const [previewImage, setPreviewImage] = useState<string | null>(null)
const [isPreparingPrint, setIsPreparingPrint] = useState(false)

useEffect(() => {
if (printImage) {
const handleAfterPrint = () => {
setPrintImage(null)
window.removeEventListener('afterprint', handleAfterPrint)
}
window.addEventListener('afterprint', handleAfterPrint)

const timer = setTimeout(() => {
window.print()
}, 1000)

return () => {
clearTimeout(timer)
window.removeEventListener('afterprint', handleAfterPrint)
}
}
}, [printImage])

useEffect(() => {
if (storeSettings.site_name) {
setTitle(`Ofertas - ${storeSettings.site_name}`)
}
if (storeSettings.colors.primary) {
setPrimaryColor(storeSettings.colors.primary)
}
if (storeSettings.colors.secondary) {
setSecondaryColor(storeSettings.colors.secondary)
}
}, [storeSettings])

const [selectedProducts, setSelectedProducts] = useState<FlyerProduct[]>([])
const [allProducts, setAllProducts] = useState<any[]>([])
const [productSearchTerm, setProductSearchTerm] = useState('')
const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false)

const filteredProducts = allProducts.filter(p =>
p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
(p.brand && p.brand.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
(p.description && p.description.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
(p.sku && p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
)

useEffect(() => {
const saved = sessionStorage.getItem('simple_flyer_search');
if (saved) setProductSearchTerm(saved);
}, []);

useEffect(() => {
sessionStorage.setItem('simple_flyer_search', productSearchTerm);
}, [productSearchTerm]);

useEffect(() => {
  localStorage.setItem('last_flyer_layout', layout)
}, [layout])

useEffect(() => {
  localStorage.setItem('last_flyer_style', designStyle)
}, [designStyle])

useEffect(() => {
  localStorage.setItem('last_flyer_primary_color', primaryColor)
}, [primaryColor])

useEffect(() => {
  localStorage.setItem('last_flyer_secondary_color', secondaryColor)
}, [secondaryColor])

useEffect(() => {
fetchProducts()
}, [])

const fetchProducts = async () => {
const { data } = await supabase.from('products').select('*').limit(500).order('name', { ascending: true })
setAllProducts(data || [])
}

const addProductToFlyer = (product: any) => {
if (selectedProducts.length >= 12) {
toast.error('Limite de 12 produtos atingido')
return
}
const newProduct: FlyerProduct = {
id: product.id,
name: product.name,
price: product.price,
original_price: product.old_price || product.price * 1.2,
image_url: product.image_url
}
setSelectedProducts([...selectedProducts, newProduct])
toast.success('Produto adicionado ao encarte')
}

const removeProduct = (id: string) => {
setSelectedProducts(selectedProducts.filter(p => p.id !== id))
}

// Helper: converte URL de imagem para base64 para evitar erro de CORS no html2canvas
const convertImagesToBase64 = async (element: HTMLElement): Promise<() => void> => {
const imgs = Array.from(element.getElementsByTagName('img'))
const originalSrcs = imgs.map(img => img.src)

await Promise.all(imgs.map(async (img) => {
if (!img.src || img.src.startsWith('data:')) return
try {
const response = await fetch(img.src, { cache: 'force-cache' })
const blob = await response.blob()
const base64 = await new Promise<string>((resolve) => {
const reader = new FileReader()
reader.onloadend = () => resolve(reader.result as string)
reader.readAsDataURL(blob)
})
img.src = base64
await new Promise<void>(resolve => {
img.onload = () => resolve()
img.onerror = () => resolve()
})
} catch {
// Se não conseguir converter, mantém a original
}
}))

// Retorna função para restaurar as srcs originais
return () => {
imgs.forEach((img, i) => { img.src = originalSrcs[i] })
}
}

const handlePrint = async () => {
if (selectedProducts.length === 0) {
toast.error('Adicione produtos ao encarte primeiro');
return;
}

const flyerElement = document.getElementById('flyer-content');
if (!flyerElement) {
toast.error('Conteúdo do encarte não encontrado');
return;
}

setIsPreparingPrint(true);
const loadingToast = toast.loading('Gerando imagem de alta fidelidade...');

try {
// Ensure all images are loaded before capture
const images = Array.from(flyerElement.getElementsByTagName('img'));
await Promise.all(images.map(img => {
if (img.complete) return Promise.resolve();
return new Promise((resolve) => {
img.onload = resolve;
img.onerror = resolve;
});
}));

// Force specific dimensions for A4 capture
const originalWidth = flyerElement.style.width;
const originalHeight = flyerElement.style.height;
const originalMaxWidth = flyerElement.style.maxWidth;

// A4 is 794x1123 at 96dpi
flyerElement.style.width = '794px';
flyerElement.style.height = layout === 'story' ? '1411px' : '1123px';
flyerElement.style.maxWidth = 'none';

// Wait for re-layout
await new Promise(resolve => setTimeout(resolve, 300));

// Converte imagens para base64 para evitar CORS
const restoreSrcs = await convertImagesToBase64(flyerElement);

// Capture as image for perfect print reproduction
const canvas = await html2canvas(flyerElement, {
useCORS: true,
scale: 4, // Higher scale for extreme detail
backgroundColor: '#ffffff',
logging: false,
imageTimeout: 60000,
allowTaint: true,
onclone: (clonedDoc) => {
  sanitizeClonedDocColors(clonedDoc);
}
});

// Restore everything
restoreSrcs();
flyerElement.style.width = originalWidth;
flyerElement.style.height = originalHeight;
flyerElement.style.maxWidth = originalMaxWidth;

const dataUrl = canvas.toDataURL('image/png', 1.0);
setPrintImage(dataUrl);
toast.dismiss(loadingToast);
toast.success('Pronto para imprimir!');
} catch (error) {
console.error('Error preparing print:', error);
toast.error('Erro ao preparar impressão');
toast.dismiss(loadingToast);
} finally {
setIsPreparingPrint(false);
}
};

const handleDownloadImage = async () => {
if (selectedProducts.length === 0) {
toast.error('Adicione produtos ao encarte primeiro')
return
}

const element = document.getElementById('flyer-content')
if (!element) {
toast.error('Conteúdo do encarte não encontrado')
return
}

setIsPreparingPrint(true)
const loadingToast = toast.loading('Gerando imagem de alta qualidade...')

try {
// Converte imagens para base64 para evitar SecurityError de CORS no html2canvas
const restoreSrcs = await convertImagesToBase64(element)

const canvas = await html2canvas(element, {
useCORS: true,
allowTaint: true,
scale: 3,
backgroundColor: '#ffffff',
logging: false,
imageTimeout: 60000,
onclone: (clonedDoc) => {
  sanitizeClonedDocColors(clonedDoc);
}
})

// Restaura as srcs originais
restoreSrcs()

const image = canvas.toDataURL('image/png')
const link = document.createElement('a')
link.href = image
link.download = `encarte-${new Date().getTime()}.png`
document.body.appendChild(link)
link.click()
document.body.removeChild(link)

toast.success('Imagem baixada com sucesso!')
toast.dismiss(loadingToast)
} catch (error) {
console.error('Error downloading image:', error)
toast.error('Erro ao baixar imagem. Tente novamente.')
toast.dismiss(loadingToast)
} finally {
setIsPreparingPrint(false)
}
}

const handleWhatsAppShare = async () => {
if (selectedProducts.length === 0) {
toast.error('Adicione produtos ao encarte primeiro')
return
}

let productList = ''
selectedProducts.forEach((p: any) => {
productList += `📍 *${p.name}*\n`
productList += `💰 Por apenas: *R$ ${p.price.toFixed(2)}*\n`
productList += `➖➖\n`
})

const templates = await getWhatsAppTemplates()
const message = formatWhatsAppMessage('flyer_share', {
site_name: storeSettings.site_name || 'RS SUPERMERCADO',
product_list: productList
}, templates)

const url = `https://wa.me/?text=${encodeURIComponent(message)}`
window.open(url, '_blank')

toast.success('WhatsApp aberto para compartilhamento!')
}

return (
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
{printImage && (
<div className="fixed inset-0 z-[99999] bg-white flex items-center justify-center print:block print:static">
<img
src={printImage}
className="max-w-full max-h-full object-contain print:w-[210mm] print:h-[297mm] print:object-fill"
alt="Print Preview"
/>
</div>
)}

<div className={`contents ${printImage ? 'print:hidden' : ''}`}>
{/* Controls Sidebar */}
{/* Controls Sidebar */}
<div className="lg:col-span-4 space-y-6 print:hidden lg:sticky lg:top-8 pb-20 max-h-[calc(100vh-2rem)] min-h-[600px] overflow-y-auto no-scrollbar">
<Card>
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Layout className="w-5 h-5" /> Configuração do Encarte
</CardTitle>
</CardHeader>
<CardContent className="space-y-4">
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label>Modelo de Layout</Label>
<Select value={layout} onValueChange={setLayout}>
<SelectTrigger>
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="grid-3">3 Produtos</SelectItem>
<SelectItem value="grid-4">4 Produtos</SelectItem>
<SelectItem value="grid-8">8 Produtos</SelectItem>
<SelectItem value="grid-12">12 Produtos</SelectItem>
<SelectItem value="story">Story</SelectItem>
</SelectContent>
</Select>
</div>
<div className="space-y-2">
<Label>Estilo Visual</Label>
<Select value={designStyle} onValueChange={setDesignStyle}>
<SelectTrigger>
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="varejo">Varejo Clássico</SelectItem>
<SelectItem value="minimal">Minimalista</SelectItem>
<SelectItem value="elegante">Premium/Elegante</SelectItem>
<SelectItem value="promo">Super Promo</SelectItem>
<SelectItem value="dark">Black Edition</SelectItem>
</SelectContent>
</Select>
</div>
</div>

<div className="space-y-2">
<Label>Título do Encarte</Label>
<Input value={title} onChange={(e) => setTitle(e.target.value)} />
</div>

<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label>Cor Principal</Label>
<div className="flex gap-2">
<Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 p-1" />
<Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
</div>
</div>
<div className="space-y-2">
<Label>Cor de Oferta</Label>
<div className="flex gap-2">
<Input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-12 p-1" />
<Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1" />
</div>
</div>
</div>

<div className="space-y-2 pt-2 border-t">
<Label className="flex justify-between items-center">
Produtos ({selectedProducts.length}/12)
<Dialog>
<DialogTrigger asChild>
<Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
</DialogTrigger>
<DialogContent className="max-w-[98vw] w-full md:max-w-6xl overflow-hidden flex flex-col h-[95vh] md:h-[90vh] p-0 gap-0 bg-white shadow-2xl border-none ring-0">
<DialogHeader className="p-4 md:p-6 pb-2 space-y-4 shrink-0 border-b bg-zinc-50/80 text-left">
<DialogTitle className="flex items-center justify-between text-xl font-bold">
<span>Selecionar Produtos</span>
<div className="flex items-center gap-2 mr-8">
<div className="relative w-64">
<Input
placeholder="Buscar produto..."
value={productSearchTerm}
onChange={(e) => setProductSearchTerm(e.target.value)}
className="h-8 text-xs"
/>
</div>
<Button
variant="outline"
size="icon"
className="h-8 w-8 shrink-0 border-2"
onClick={() => setBarcodeScannerOpen(true)}
>
<Camera size={14} />
</Button>
</div>
<Button
variant="ghost"
size="sm"
className="text-[10px] font-bold uppercase text-zinc-400"
onClick={() => setProductSearchTerm('')}
>
Limpar
</Button>
</DialogTitle>
</DialogHeader>
<div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50/30 scrollbar-thin">
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
{filteredProducts.map(p => (
<div key={p.id} className="border rounded p-2 text-center space-y-2">
<img src={p.image_url} className="w-20 h-20 object-cover mx-auto rounded" />
<p className="text-xs font-bold line-clamp-1">{p.name}</p>
<Button size="sm" className="w-full" onClick={() => addProductToFlyer(p)}>Add</Button>
</div>
))}
</div>
</div>
</DialogContent>
</Dialog>
</Label>
<div className="space-y-2 max-h-[200px] overflow-y-auto">
{selectedProducts.map((p, idx) => (
<div key={idx} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
<span className="truncate flex-1 pr-2">{p.name}</span>
<div className="flex items-center gap-2">
<Input
className="w-20 h-8 text-xs"
defaultValue={p.price}
onChange={(e) => {
const updated = [...selectedProducts]
updated[idx].price = Number(e.target.value)
setSelectedProducts(updated)
}}
/>
<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeProduct(p.id)}>
<Trash2 className="w-4 h-4" />
</Button>
</div>
</div>
))}
</div>
</div>

<div className="grid grid-cols-2 gap-2 pt-4">
<div className="flex gap-2">
<Button
variant="outline"
onClick={handlePrint}
disabled={isPreparingPrint}
className="flex-1"
>
{isPreparingPrint ? (
<Loader2 className="w-4 h-4 mr-2 animate-spin" />
) : (
<Printer className="w-4 h-4 mr-2" />
)}
Imprimir
</Button>
<Dialog>
<DialogTrigger asChild>
<Button
variant="outline"
onClick={async () => {
const element = document.getElementById('flyer-content');
if (!element) return;
setIsPreparingPrint(true);
try {
const restoreSrcs = await convertImagesToBase64(element);
const canvas = await html2canvas(element, { 
  useCORS: true, 
  allowTaint: true, 
  scale: 2,
  onclone: (clonedDoc) => {
    sanitizeClonedDocColors(clonedDoc);
  }
});
restoreSrcs();
setPreviewImage(canvas.toDataURL('image/png'));
} catch {
toast.error('Erro ao gerar prévia');
} finally {
setIsPreparingPrint(false);
}
}}
disabled={isPreparingPrint}
>
<ImageIcon className="w-4 h-4 mr-2" /> Prévia
</Button>
</DialogTrigger>
<DialogContent className="max-w-3xl">
<DialogHeader>
<DialogTitle>Prévia do Encarte (Imagem)</DialogTitle>
</DialogHeader>
<div className="flex justify-center p-4 bg-zinc-100 rounded-xl overflow-auto max-h-[70vh]">
{previewImage ? (
<img src={previewImage} className="max-w-full shadow-2xl animate-in fade-in zoom-in duration-300" alt="Flyer Preview" />
) : (
<div className="flex flex-col items-center gap-2 p-8">
<Loader2 className="w-8 h-8 animate-spin text-primary" />
<p className="text-xs font-bold uppercase text-zinc-500">Gerando Prévia...</p>
</div>
)}
</div>
<div className="flex justify-end gap-2 mt-4">
<Button variant="outline" onClick={() => setPreviewImage(null)}>Fechar</Button>
<Button onClick={() => { setPreviewImage(null); handlePrint(); }}><Printer className="w-4 h-4 mr-2" /> Imprimir Agora</Button>
</div>
</DialogContent>
</Dialog>
</div>
<Button
variant="default"
onClick={handleDownloadImage}
disabled={isPreparingPrint}
className="bg-indigo-600 hover:bg-indigo-700 text-white"
>
<Download className="w-4 h-4 mr-2" /> Baixar Encarte (Alta Fidelidade)
</Button>
<Button variant="outline" onClick={handleWhatsAppShare} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
<MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
</Button>
</div>
</CardContent>
</Card>
</div>

{/* Preview Area */}
<div className="lg:col-span-8 flex justify-center bg-gray-200 p-8 rounded-xl overflow-hidden min-h-[1000px] print:p-0 print:bg-white print:rounded-none no-scrollbar">
<div
id="flyer-content"
className={`bg-white shadow-2xl overflow-hidden flex flex-col ${layout === 'story' ? 'aspect-[9/16] w-[400px]' : 'aspect-[1/1.414] w-[700px]'} print:w-full print:shadow-none`}
style={{ borderColor: primaryColor }}
>
{/* Header */}
<div
className={`h-32 relative flex items-center justify-center text-white overflow-hidden ${designStyle === 'dark' ? 'bg-black' : ''}`}
style={{ backgroundColor: designStyle === 'dark' ? '#000' : primaryColor }}
>
<div className="absolute inset-0 opacity-20">
<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
<path d="M0 0 L100 0 L100 100 L0 80 Z" fill={designStyle === 'promo' ? 'yellow' : 'black'} />
</svg>
</div>
<div className="relative z-10 text-center">
<h2 className={`text-4xl font-black italic uppercase tracking-tighter ${designStyle === 'elegante' ? 'font-serif normal-case italic' : ''}`}>{title}</h2>
<p className="text-sm font-bold opacity-80">QUALIDADE E PREÇO BAIXO TODO DIA</p>
</div>
<div className="absolute top-4 left-4 bg-white p-2 rounded shadow-lg">
<div className="w-12 h-6 bg-primary flex items-center justify-center text-[8px] font-black italic">SUPERMERCADO</div>
</div>
</div>

{/* Products Grid */}
<div className={`flex-1 p-6 grid gap-4 ${designStyle === 'dark' ? 'bg-zinc-900' : ''} ${
layout === 'grid-3' ? 'grid-cols-1' :
layout === 'grid-4' ? 'grid-cols-2' :
layout === 'grid-8' ? 'grid-cols-2' :
'grid-cols-3'
}`}>
{selectedProducts.map((p, i) => (
<div
key={i}
className={`border-2 rounded-2xl p-4 flex flex-col items-center justify-between text-center relative overflow-hidden bg-white shadow-sm ${
designStyle === 'minimal' ? 'border-none shadow-none bg-gray-50' :
designStyle === 'elegante' ? 'rounded-none border-x-0 border-t-0 border-b' :
''
}`}
style={{ borderColor: `${primaryColor}20` }}
>
<img src={p.image_url} alt={p.name} className="w-32 h-32 object-contain mb-2" />
<h3 className={`font-bold text-sm leading-tight h-10 overflow-hidden line-clamp-2 ${designStyle === 'elegante' ? 'font-serif italic' : ''}`}>{p.name}</h3>

<div className="mt-2 w-full">
{designStyle !== 'minimal' && <p className="text-[10px] text-gray-400 line-through">De: R$ {p.original_price.toFixed(2)}</p>}
<div
className={`bg-yellow-400 text-black rounded-lg py-1 px-4 inline-block font-black text-xl shadow-sm ${
designStyle === 'elegante' ? 'bg-transparent text-rose-700 shadow-none' :
designStyle === 'dark' ? 'bg-amber-400' : ''
}`}
style={{ backgroundColor: (designStyle === 'elegante' || designStyle === 'minimal') ? 'transparent' : secondaryColor }}
>
<span className="text-xs align-top mt-1 mr-0.5">R$</span>
<span className={designStyle === 'elegante' ? 'text-3xl' : ''}>{p.price.toFixed(2).split('.')[0]}</span>
<span className="text-sm align-top">,{p.price.toFixed(2).split('.')[1]}</span>
</div>
</div>
<div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-bold py-1 px-2 rounded-full rotate-12">OFERTA</div>
</div>
))}
{selectedProducts.length === 0 && (
<div className="col-span-full flex flex-col items-center justify-center text-gray-300 py-20">
<ImageIcon size={64} strokeWidth={1} />
<p className="mt-4 font-medium">Nenhum produto selecionado</p>
</div>
)}
</div>

{/* Footer */}
<div className="p-4 text-center border-t-4" style={{ borderColor: secondaryColor, backgroundColor: `${primaryColor}05` }}>
<div className="flex justify-between items-center px-4">
<div className="text-left">
<p className="text-[10px] font-bold">OFERTAS VÁLIDAS ENQUANTO DURAREM OS ESTOQUES</p>
<p className="text-[10px] opacity-70">Fotos meramente ilustrativas. Reservamo-nos o direito de corrigir erros gráficos.</p>
</div>
<div className="text-right flex items-center gap-4">
<div className="flex flex-col items-end">
<p className="text-[10px] font-bold">PEÇA PELO WHATSAPP</p>
<p className="font-black text-lg" style={{ color: primaryColor }}>{storeSettings.whatsapp || '(11) 99999-9999'}</p>
</div>
<div className="w-12 h-12 bg-black flex items-center justify-center text-white text-[6px]">QR CODE</div>
</div>
</div>
</div>
</div>
</div>
</div>

<style>{`
@media print {
@page { size: A4 portrait; margin: 0; }
body { background: white !important; }
.print\:hidden { display: none !important; }
#flyer-content {
position: fixed !important;
left: 0 !important;
top: 0 !important;
width: 210mm !important;
height: 297mm !important;
margin: 0 !important;
padding: 0 !important;
border: none !important;
box-shadow: none !important;
transform: none !important;
transition: none !important;
background: white !important;
}
}
`}</style>
<BarcodeScanner
isOpen={barcodeScannerOpen}
onClose={() => setBarcodeScannerOpen(false)}
onScan={(code) => {
setProductSearchTerm(code);
toast.success(`Buscando por: ${code}`);
}}
/>
</div>
)
}
