const SUGGESTED_COLORED_ICONS = [
  { name: 'Hortifruti', url: 'https://cdn-icons-png.flaticon.com/512/2329/2329865.png' },
  { name: 'Açougue', url: 'https://cdn-icons-png.flaticon.com/512/1046/1046769.png' },
  { name: 'Padaria', url: 'https://cdn-icons-png.flaticon.com/512/992/992743.png' },
  { name: 'Bebidas', url: 'https://cdn-icons-png.flaticon.com/512/3122/3122040.png' },
  { name: 'Mercearia', url: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png' },
  { name: 'Higiene', url: 'https://cdn-icons-png.flaticon.com/512/2553/2553642.png' },
  { name: 'Limpeza', url: 'https://cdn-icons-png.flaticon.com/512/995/995016.png' },
  { name: 'Pet Shop', url: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' },
  { name: 'Doces', url: 'https://cdn-icons-png.flaticon.com/512/1904/1904425.png' },
  { name: 'Laticínios', url: 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png' },
  { name: 'Frios', url: 'https://cdn-icons-png.flaticon.com/512/1154/1154625.png' },
  { name: 'Congelados', url: 'https://cdn-icons-png.flaticon.com/512/2210/2210565.png' },
  { name: 'Burguer', url: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png' },
  { name: 'Pizza', url: 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png' },
  { name: 'Cachorro Quente', url: 'https://cdn-icons-png.flaticon.com/512/2362/2362313.png' },
  { name: 'Batata Frita', url: 'https://cdn-icons-png.flaticon.com/512/1046/1046786.png' },
  { name: 'Refrigerante', url: 'https://cdn-icons-png.flaticon.com/512/2405/2405479.png' },
  { name: 'Sorvete', url: 'https://cdn-icons-png.flaticon.com/512/938/938063.png' },
  { name: 'Sushi', url: 'https://cdn-icons-png.flaticon.com/512/2252/2252430.png' },
  { name: 'Tacos', url: 'https://cdn-icons-png.flaticon.com/512/612/612260.png' },
  { name: 'Burrito', url: 'https://cdn-icons-png.flaticon.com/512/2362/2362252.png' },
  { name: 'Frango Frito', url: 'https://cdn-icons-png.flaticon.com/512/1895/1895681.png' },
  { name: 'Sanduíche', url: 'https://cdn-icons-png.flaticon.com/512/3076/3076044.png' },
  { name: 'Pipoca', url: 'https://cdn-icons-png.flaticon.com/512/3503/3503803.png' },
  { name: 'Donut', url: 'https://cdn-icons-png.flaticon.com/512/3144/3144505.png' },
  { name: 'Panquecas', url: 'https://cdn-icons-png.flaticon.com/512/2484/2484024.png' },
  { name: 'Carne/Steak', url: 'https://cdn-icons-png.flaticon.com/512/3143/3143643.png' },
  { name: 'Macarrão', url: 'https://cdn-icons-png.flaticon.com/512/3480/3480618.png' },
  { name: 'Cookies', url: 'https://cdn-icons-png.flaticon.com/512/541/541732.png' },
  { name: 'Milkshake', url: 'https://cdn-icons-png.flaticon.com/512/2405/2405527.png' },
  { name: 'Suco', url: 'https://cdn-icons-png.flaticon.com/512/3076/3076007.png' },
  { name: 'Croissant', url: 'https://cdn-icons-png.flaticon.com/512/3014/3014514.png' },
  { name: 'Pretzel', url: 'https://cdn-icons-png.flaticon.com/512/3014/3014532.png' },
  { name: 'Combo', url: 'https://cdn-icons-png.flaticon.com/512/3075/3075929.png' },
  { name: 'Wraps', url: 'https://cdn-icons-png.flaticon.com/512/2362/2362260.png' },
  { name: 'Ovos', url: 'https://cdn-icons-png.flaticon.com/512/2619/2619557.png' },
  { name: 'Bolo', url: 'https://cdn-icons-png.flaticon.com/512/2682/2682435.png' },
  { name: 'Café', url: 'https://cdn-icons-png.flaticon.com/512/3054/3054889.png' },
  { name: 'Cerveja', url: 'https://cdn-icons-png.flaticon.com/512/931/931949.png' },
  { name: 'Vinho', url: 'https://cdn-icons-png.flaticon.com/512/3122/3122040.png' },
  { name: 'Milkshake', url: 'https://cdn-icons-png.flaticon.com/512/2405/2405527.png' },
  { name: 'Sushi', url: 'https://cdn-icons-png.flaticon.com/512/2252/2252430.png' },
  { name: 'Salada', url: 'https://cdn-icons-png.flaticon.com/512/2153/2153788.png' },
  { name: 'Sopa', url: 'https://cdn-icons-png.flaticon.com/512/3480/3480618.png' },
  { name: 'Frango Frito', url: 'https://cdn-icons-png.flaticon.com/512/1895/1895681.png' },
  { name: 'Peixe', url: 'https://cdn-icons-png.flaticon.com/512/1141/1141771.png' },
  { name: 'Ovos', url: 'https://cdn-icons-png.flaticon.com/512/2619/2619557.png' },
  { name: 'Bolo', url: 'https://cdn-icons-png.flaticon.com/512/2682/2682435.png' },
  { name: 'Donut', url: 'https://cdn-icons-png.flaticon.com/512/3144/3144505.png' },
  { name: 'Cookie', url: 'https://cdn-icons-png.flaticon.com/512/541/541732.png' },
  { name: 'Pão', url: 'https://cdn-icons-png.flaticon.com/512/992/992743.png' },
  { name: 'Queijo', url: 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png' },
  { name: 'Leite', url: 'https://cdn-icons-png.flaticon.com/512/2674/2674505.png' },
  { name: 'Café', url: 'https://cdn-icons-png.flaticon.com/512/3054/3054889.png' },
  { name: 'Cerveja', url: 'https://cdn-icons-png.flaticon.com/512/931/931949.png' },
  { name: 'Refrigerante', url: 'https://cdn-icons-png.flaticon.com/512/2405/2405479.png' },
  { name: 'Pipoca', url: 'https://cdn-icons-png.flaticon.com/512/3503/3503803.png' },
  { name: 'Batata', url: 'https://cdn-icons-png.flaticon.com/512/1046/1046786.png' }
];

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
 import * as LucideIcons from 'lucide-react'
import {
  Loader2, Plus, Trash2, Edit, Upload, Image as ImageIcon, Apple, Beef, Milk, Beer, Fish, IceCream, Coffee,
  Carrot, Pizza, Wine, Egg, GlassWater, ChefHat, ShoppingBag, Sparkles, Baby, Dog, Grape, Wheat, Cookie, Bath, Flower2,
  Snowflake, Candy, Box, Soup, Sandwich, Popcorn, Salad, Cherry, Search, Utensils, Cigarette, Home, Heart,
  Shirt, Scissors, Zap, Gift, Book, Camera, Tv, Smartphone, Watch, Bike, Car, Briefcase, Calculator,
  Calendar, Clipboard, Clock, Cloud, Compass, CreditCard, Database, Eye, FileText, Film, Flag, FlaskConical,
  Folder, Gauge, Globe, HardDrive, Headphones, HelpCircle, Key, Layers, LifeBuoy, Link, List, Lock, Map,
  MessageSquare, Mic, Moon, MousePointer, Music, Navigation, Palette, Paperclip, Phone, PieChart, Printer,
  Radio, Save, Search as SearchIcon, Send, Settings, Share2, Shield, ShoppingCart, Star, Sun, Tag,
  Terminal, ThumbsUp, Ticket, Trophy, Truck, Umbrella, User, Video, Volume2, Wifi, Zap as ZapIcon
} from 'lucide-react'

  const getIconComponent = (name: string) => {
    // @ts-ignore
    return LucideIcons[name] || LucideIcons.ShoppingBag;
  };

 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { SmartImage } from '@/components/ui/SmartImage'

const CATEGORY_ICONS = [
  { name: 'Apple', label: 'Frutas' },
  { name: 'Beef', label: 'Carnes' },
  { name: 'Milk', label: 'Laticínios' },
  { name: 'Beer', label: 'Bebidas' },
  { name: 'Fish', label: 'Peixaria' },
  { name: 'IceCream', label: 'Sorvetes' },
  { name: 'Snowflake', label: 'Congelados' },
  { name: 'Coffee', label: 'Café' },
  { name: 'Carrot', label: 'Legumes' },
  { name: 'Pizza', label: 'Massas' },
  { name: 'Wine', label: 'Vinhos' },
  { name: 'Egg', label: 'Ovos' },
  { name: 'GlassWater', label: 'Água' },
  { name: 'ChefHat', label: 'Gourmet' },
  { name: 'ShoppingBag', label: 'Geral' },
  { name: 'Trash2', label: 'Limpeza' },
  { name: 'Sparkles', label: 'Higiene' },
  { name: 'Baby', label: 'Infantil' },
  { name: 'Dog', label: 'Pet Shop' },
  { name: 'Grape', label: 'Frutas' },
  { name: 'Wheat', label: 'Grãos' },
  { name: 'Cookie', label: 'Biscoitos' },
  { name: 'Bath', label: 'Banho' },
  { name: 'Flower2', label: 'Flores' },
  { name: 'Candy', label: 'Doces' },
  { name: 'Box', label: 'Estoque' },
  { name: 'Soup', label: 'Caldos' },
  { name: 'Sandwich', label: 'Lanches' },
  { name: 'Popcorn', label: 'Cinema' },
  { name: 'Salad', label: 'Saudável' },
  { name: 'Cherry', label: 'Cerejas' },
  { name: 'Utensils', label: 'Restaurante' },
  { name: 'Cigarette', label: 'Tabacaria' },
  { name: 'Home', label: 'Casa' },
  { name: 'Heart', label: 'Bem Estar' },
  { name: 'Shirt', label: 'Vestuário' },
  { name: 'Scissors', label: 'Beleza' },
  { name: 'Zap', label: 'Eletrônicos' },
  { name: 'Gift', label: 'Presentes' },
  { name: 'Book', label: 'Livraria' },
  { name: 'Truck', label: 'Logística' },
  { name: 'Trophy', label: 'Esportes' },
  { name: 'ShoppingCart', label: 'Mercado' },
  { name: 'Palette', label: 'Artes' },
  { name: 'Smartphone', label: 'Mobile' },
  { name: 'Music', label: 'Música' },
  { name: 'Camera', label: 'Foto' },
  { name: 'Tv', label: 'Vídeo' },
  { name: 'Shield', label: 'Segurança' },
  { name: 'Sun', label: 'Verão' },
  { name: 'Moon', label: 'Noite' }
];

export function CategoryManagement({ editCategoryName }: { editCategoryName?: string }) {
  const [categories, setCategories] = useState<(any & { product_count?: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [lastEditedName, setLastEditedName] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [currentCategory, setCurrentCategory] = useState({ 
    id: '', 
    name: '', 
    slug: '', 
    icon_url: '', 
    icon_name: 'ShoppingBag:minimalist', 
    banner_url: '' 
  })
  
  const [selectedStyle, setSelectedStyle] = useState('minimalist')

  const filteredIcons = useMemo(() => {
    return CATEGORY_ICONS.filter(icon => 
      icon.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])
 
   const [uploading, setUploading] = useState<'icon' | 'banner' | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (editCategoryName && categories.length > 0 && editCategoryName !== lastEditedName) {
      const categoryToEdit = categories.find(c => 
        c.name.toLowerCase() === editCategoryName.toLowerCase() || 
        c.slug.toLowerCase() === editCategoryName.toLowerCase()
      )
      if (categoryToEdit) {
        setLastEditedName(editCategoryName)
        handleEdit(categoryToEdit)
      }
    }
  }, [editCategoryName, categories, lastEditedName])

  const fetchCategories = async () => {
    setIsLoading(true)
    const { data: catData } = await supabase.from('categories').select('*').order('name')
    
    if (catData) {
      // Fetch product counts for each category
      const { data: countData } = await supabase
        .from('products')
        .select('category_id')
      
      const counts: Record<string, number> = {}
      countData?.forEach(p => {
        if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1
      })
      
      setCategories(catData.map(c => ({
        ...c,
        product_count: counts[c.id] || 0
      })))
    }
    setIsLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'banner') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(type)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `categories/${type}/${fileName}`

      // Try categories bucket, fallback to products
      let bucketName = 'categories';
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

      setCurrentCategory({ ...currentCategory, [type === 'icon' ? 'icon_url' : 'banner_url']: publicUrl })
      toast.success(`${type === 'icon' ? 'Ícone' : 'Banner'} carregado!`)
    } catch (error: any) {
      toast.error('Erro no upload: ' + error.message)
    } finally {
      setUploading(null)
    }
  }

  const handleSaveCategory = async () => {
    if (!currentCategory.name || !currentCategory.slug) return toast.error('Nome e Slug são obrigatórios')
    
    setIsSubmitting(true)
    const categoryData = {
      name: currentCategory.name,
      slug: currentCategory.slug,
      icon_url: currentCategory.icon_url,
      icon_name: currentCategory.icon_name,
      banner_url: currentCategory.banner_url
    }

    let error;
    if (isEditing) {
      const { error: updateError } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', currentCategory.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('categories')
        .insert([categoryData])
      error = insertError
    }
    
    setIsSubmitting(false)
    
    if (error) toast.error('Erro ao salvar categoria')
    else {
      toast.success(isEditing ? 'Categoria atualizada!' : 'Categoria adicionada!')
      resetForm()
      setIsDialogOpen(false)
      fetchCategories()
    }
  }

  const resetForm = () => {
    setCurrentCategory({ id: '', name: '', slug: '', icon_url: '', icon_name: `ShoppingBag:${selectedStyle}`, banner_url: '' })
    setIsEditing(false)
    setSearchTerm('')
  }

  const handleEdit = (category: any) => {
    const safeCategory = {
      ...category,
      icon_name: category.icon_name || 'ShoppingBag:minimalist',
      icon_url: category.icon_url || '',
      banner_url: category.banner_url || ''
    }
    setCurrentCategory(safeCategory)
    const style = safeCategory.icon_name.split(':')[1] || 'minimalist'
    setSelectedStyle(style)
    setIsEditing(true)
    setIsDialogOpen(true)
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setIsEditing(false);
                resetForm();
              }}>
                <Plus className="w-4 h-4 mr-1" /> Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Categoria' : 'Adicionar Categoria'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[80vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input 
                          value={currentCategory.name} 
                          onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug (URL)</Label>
                        <Input value={currentCategory.slug} onChange={(e) => setCurrentCategory({...currentCategory, slug: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Visualização na Loja</Label>
                    <div className="bg-zinc-50 rounded-3xl p-4 border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center gap-2 h-full min-h-[120px]">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-zinc-100 flex items-center justify-center overflow-hidden relative group/prev">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/prev:opacity-100 transition-opacity" />
                        {currentCategory.icon_url ? (
                          <img src={currentCategory.icon_url} className="w-10 h-10 object-contain relative z-10" alt="Preview" />
                        ) : (() => {
                          const iconData = currentCategory.icon_name?.split(':') || ['ShoppingBag', 'minimalist'];
                          const Icon = getIconComponent(iconData[0]);
                          const style = iconData[1] || 'minimalist';
                          const strokeWidth = style === 'bold' ? 2.5 : style === 'classic' ? 2.0 : style === 'thin' ? 1.0 : 1.5;
                          return <Icon size={28} strokeWidth={strokeWidth} className="text-primary relative z-10" />;
                        })()}
                      </div>
                      <span className="text-[9px] font-black uppercase text-zinc-400 tracking-tighter">Como aparecerá na barra</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Ícone Ilustrado (Recomendado)</Label>
                  <div className={`grid grid-cols-4 md:grid-cols-6 gap-2 p-3 rounded-2xl border-2 transition-all ${currentCategory.icon_url ? 'bg-primary/5 border-primary shadow-sm' : 'bg-zinc-50 border-zinc-100 opacity-80'}`}>
                    {SUGGESTED_COLORED_ICONS.map((icon) => (
                      <button
                        key={icon.url}
                        type="button"
                        onClick={() => setCurrentCategory({...currentCategory, icon_url: icon.url, icon_name: ''})}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2 ${currentCategory.icon_url === icon.url ? 'bg-white border-primary shadow-md scale-105' : 'bg-white border-zinc-100 hover:border-primary/30 opacity-70 hover:opacity-100'}`}
                      >
                        <img src={icon.url} className="w-8 h-8 object-contain" alt={icon.name} />
                        <span className="text-[8px] font-bold uppercase truncate w-full text-center">{icon.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Imagem Personalizada (URL ou Upload)</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="URL da imagem..." 
                        value={currentCategory.icon_url} 
                        onChange={(e) => setCurrentCategory({...currentCategory, icon_url: e.target.value})} 
                      />
                      <label className="cursor-pointer bg-zinc-100 p-2 rounded-lg hover:bg-zinc-200 transition-colors shrink-0">
                        {uploading === 'icon' ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload className="w-5 h-5" />}
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'icon')} accept="image/*" />
                      </label>
                      {currentCategory.icon_url && (
                        <Button variant="outline" size="icon" onClick={() => setCurrentCategory({...currentCategory, icon_url: ''})} className="shrink-0">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Escolha o Ícone do Sistema</Label>
                    <div className="flex bg-zinc-100 p-1 rounded-lg gap-1">
                      {['thin', 'minimalist', 'classic', 'bold'].map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => {
                            setSelectedStyle(style);
                            const name = currentCategory.icon_name.split(':')[0];
                            setCurrentCategory({...currentCategory, icon_name: `${name}:${style}`});
                          }}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${selectedStyle === style ? 'bg-primary text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input 
                      placeholder="Buscar ícones..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[300px] overflow-y-auto p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    {filteredIcons.map((icon) => {
                      const Icon = getIconComponent(icon.name);
                      const currentName = currentCategory.icon_name.split(':')[0];
                      const isSelected = currentName === icon.name;
                      
                      return (
                        <button
                          key={icon.name}
                          type="button"
                          onClick={() => setCurrentCategory({...currentCategory, icon_name: `${icon.name}:${selectedStyle}`, icon_url: ''})}
                          className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all border-2 ${isSelected ? 'bg-primary border-primary text-white scale-105 shadow-md' : 'bg-white border-zinc-100 hover:border-primary/30 text-zinc-400 hover:text-primary opacity-70 hover:opacity-100'}`}
                        >
                          {Icon ? (
                            <Icon 
                              size={20} 
                              strokeWidth={selectedStyle === 'bold' ? 2.5 : selectedStyle === 'classic' ? 2.0 : selectedStyle === 'thin' ? 1.0 : 1.5} 
                            />
                          ) : (
                            <ShoppingBag size={20} strokeWidth={1.5} />
                          )}
                          <span className={`text-[8px] font-bold uppercase truncate w-full text-center ${isSelected ? 'text-white' : 'text-zinc-500'}`}>{icon.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label className="text-[10px] uppercase font-bold">Banner da Categoria (Opcional)</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="URL do banner ou Upload ->" 
                      value={currentCategory.banner_url} 
                      onChange={(e) => setCurrentCategory({...currentCategory, banner_url: e.target.value})} 
                    />
                    <label className="cursor-pointer bg-zinc-100 p-2 rounded-lg hover:bg-zinc-200 transition-colors">
                      {uploading === 'banner' ? <Loader2 className="animate-spin w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'banner')} accept="image/*" />
                    </label>
                  </div>
                  {currentCategory.banner_url && (
                    <div className="relative group">
                      <img src={currentCategory.banner_url} className="w-full h-24 object-cover rounded-xl border mt-2 shadow-sm" alt="Preview Banner" />
                      <button 
                        onClick={() => setCurrentCategory({...currentCategory, banner_url: ''})}
                        className="absolute top-4 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveCategory} disabled={isSubmitting} className="w-full h-12 bg-zinc-900 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-zinc-200">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : (isEditing ? 'Atualizar Categoria' : 'Salvar Categoria')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const iconData = cat.icon_name?.split(':') || ['ShoppingBag', 'minimalist'];
              const Icon = getIconComponent(iconData[0]);
              const style = iconData[1] || 'minimalist';
              
              return (
                <div key={cat.id} className="group relative bg-white border border-zinc-100 rounded-3xl p-5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-zinc-50 group-hover:bg-primary/5 transition-colors overflow-hidden border border-zinc-50`}>
                        {cat.icon_url ? (
                          <SmartImage 
                            src={cat.icon_url} 
                            tableName="categories" 
                            itemId={cat.id} 
                            className="w-full h-full object-cover" 
                          />
                        ) : Icon ? (
                          <Icon 
                            size={24} 
                            className="text-zinc-400 group-hover:text-primary transition-colors"
                            strokeWidth={style === 'bold' ? 2.5 : style === 'classic' ? 2.0 : style === 'thin' ? 1.0 : 1.5} 
                          />
                        ) : (
                          <ShoppingBag size={24} className="text-zinc-400" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black uppercase text-sm tracking-tight text-zinc-800">{cat.name}</h3>
                          {cat.product_count !== undefined && (
                            <span className="bg-zinc-100 text-zinc-500 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                              {cat.product_count}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-medium italic">/{cat.slug}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} className="h-8 w-8 text-zinc-400 hover:text-primary hover:bg-primary/5 rounded-full">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="h-8 w-8 text-zinc-400 hover:text-destructive hover:bg-destructive/5 rounded-full">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {cat.banner_url && (
                    <div className="mt-2 rounded-2xl overflow-hidden h-16 border border-zinc-100">
                      <img src={cat.banner_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    </div>
                  )}
                  
                  {!cat.banner_url && (
                    <div className="mt-2 h-1 rounded-full bg-zinc-50 overflow-hidden">
                      <div className="w-1/3 h-full bg-primary/20 group-hover:w-full transition-all duration-700"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
