import { createFileRoute, useSearch, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ProductCard } from '@/components/ProductCard'
import { Loader2, Search as SearchIcon, ArrowLeft, Tag, ShoppingBag } from 'lucide-react'

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>): { q?: string; category?: string } => {
    return {
      q: (search.q as string) || undefined,
      category: (search.category as string) || undefined,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { q, category } = useSearch({ from: '/search' })
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [multiplier, setMultiplier] = useState(1)
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<any>(null)

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      try {
        // Fetch multiplier
        const { data: settingsData } = await supabase.from('store_settings').select('value').eq('key', 'points_multiplier').maybeSingle()
        if (settingsData?.value) {
          const val = typeof settingsData.value === 'object' ? settingsData.value.points_per_real : settingsData.value
          setMultiplier(Number(val) || 1)
        }

        // Fetch categories for filtering
        const { data: catData } = await supabase.from('categories').select('*').order('name')
        setCategories(catData || [])

        // Build query
        let query = supabase
          .from('products')
          .select('*, categories(name, slug, icon_url, icon_name)')
          .eq('is_available', true)
          .eq('is_approved', true)

        if (q) {
          query = query.ilike('name', `%${q}%`)
        }

        const { data: prodData, error } = await query.order('name')
        if (error) throw error

        let filteredProducts = prodData || []
        
        // Client side filtering for category if name or slug provided
        if (category) {
          filteredProducts = filteredProducts.filter(p => 
            p.categories?.slug === category || 
            p.categories?.name.toLowerCase() === category.toLowerCase()
          )
          const foundCat = (catData || []).find(c => c.slug === category || c.name.toLowerCase() === category.toLowerCase())
          setActiveCategory(foundCat)
        } else if (q) {
          // If we have a query, check if it matches a category exactly
          const matchingCat = (catData || []).find(c => c.name.toLowerCase() === q.toLowerCase())
          if (matchingCat) {
            setActiveCategory(matchingCat)
          }
        }

        setProducts(filteredProducts)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(true) // Just to show loader for a bit longer if needed? No, false.
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [q, category])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-green-600 px-4 py-6 sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <form action="/search" method="GET">
              <input 
                name="q"
                defaultValue={q}
                placeholder="O que você procura?"
                className="w-full bg-white rounded-2xl py-3 pl-12 pr-4 shadow-inner outline-none text-gray-800 font-medium"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Categories Filter Bar */}
      <div className="bg-white border-b overflow-x-auto no-scrollbar py-3 px-4 flex gap-2">
        <Link 
          to="/search" 
          search={{ q: '' }}
          className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all whitespace-nowrap border-2 ${!category && !activeCategory ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200'}`}
        >
          Todos
        </Link>
        {categories.map(cat => (
          <Link
            key={cat.id}
            to="/search"
            search={{ category: cat.slug }}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all whitespace-nowrap border-2 ${category === cat.slug || activeCategory?.id === cat.id ? 'bg-green-600 text-white border-green-600' : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200'}`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="p-4 max-w-6xl mx-auto">
        {activeCategory && (
          <div className="mb-6 bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center border border-zinc-100 overflow-hidden">
              {activeCategory.icon_url ? (
                <img src={activeCategory.icon_url} className="w-10 h-10 object-contain" alt={activeCategory.name} />
              ) : (
                <Tag size={32} className="text-zinc-200" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900 leading-none">{activeCategory.name}</h1>
              <p className="text-xs font-bold uppercase text-zinc-400 mt-1 tracking-widest">{products.length} {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}</p>
            </div>
          </div>
        )}

        {!activeCategory && (q || category) && (
          <div className="mb-4">
            <p className="text-xs font-bold uppercase text-zinc-400 tracking-widest">
              Resultado para: <span className="text-zinc-900">"{q || category}"</span>
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-green-600 h-10 w-10" />
            <p className="text-xs font-black uppercase text-zinc-400 tracking-widest">Buscando no catálogo...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} multiplier={multiplier} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border-2 border-dashed border-zinc-100 p-12 text-center flex flex-col items-center gap-4 shadow-sm">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200">
              <ShoppingBag size={40} />
            </div>
            <div>
              <p className="text-zinc-500 font-black uppercase text-sm tracking-tight">Ops! Nenhum produto encontrado</p>
              <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold max-w-[200px] mx-auto">Tente buscar por termos mais genéricos ou explore outras categorias.</p>
            </div>
            <Link to="/" className="mt-4 bg-zinc-900 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-transform">
              Voltar ao Início
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
