import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapPin, Search, Truck, CheckCircle2, AlertCircle, ArrowLeft, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/whatsapp'

export const Route = createFileRoute('/delivery')({
  component: DeliveryPage,
})

function DeliveryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [neighborhoods, setNeighborhoods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNeighborhoods()
  }, [])

  const fetchNeighborhoods = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('delivery_neighborhoods')
      .select('*')
      .order('name')
    setNeighborhoods(data || [])
    setLoading(false)
  }

  const filtered = neighborhoods.filter(n => 
    n.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-zinc-900 text-white p-6 pb-20 rounded-b-[40px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 font-bold uppercase text-[10px] mb-6 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Voltar para a Loja
        </Link>
        
        <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2">
          Áreas de <span className="text-green-400">Entrega</span>
        </h1>
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Consulte se entregamos em seu bairro</p>
      </div>

      <div className="container mx-auto px-4 -mt-12 space-y-6">
        {/* Search Box */}
        <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-6 border border-zinc-100">
          <div className="relative">
            <Input 
              placeholder="Digite seu bairro..." 
              className="h-14 pl-12 rounded-2xl border-zinc-200 text-sm font-bold"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
            <Info size={14} className="text-zinc-400" />
            <span>Atendemos diversos bairros em Piraí e região</span>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase text-zinc-400 tracking-widest px-2">Bairros Atendidos</h3>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-zinc-200 border-t-green-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase text-zinc-400">Carregando mapa de entregas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-zinc-200 text-center space-y-4">
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertCircle size={32} />
              </div>
              <div>
                <p className="font-black uppercase text-zinc-800">Bairro não encontrado</p>
                <p className="text-xs text-zinc-500 font-medium max-w-[200px] mx-auto mt-1">
                  Infelizmente não encontramos o bairro "{searchTerm}" em nossa lista de entregas.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm('')}
                className="rounded-xl font-bold uppercase text-[10px]"
              >
                Ver todos os bairros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filtered.map(n => (
                <div key={n.id} className="bg-white p-5 rounded-[28px] border border-zinc-100 shadow-sm flex items-center justify-between group hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      n.active 
                        ? "bg-zinc-50 text-zinc-400 group-hover:bg-green-50 group-hover:text-green-600" 
                        : "bg-red-50 text-red-300"
                    }`}>
                      <MapPin size={24} />
                    </div>
                    <div>
                      <p className={`font-black uppercase text-sm ${n.active ? "text-zinc-800" : "text-zinc-400"}`}>
                        {n.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {n.active ? (
                          <>
                            <CheckCircle2 size={12} className="text-green-500" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Entrega Disponível</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} className="text-red-400" />
                            <span className="text-[10px] font-bold text-red-400 uppercase">Indisponível no momento</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {n.active ? (
                      <>
                        <p className="text-[10px] font-black text-zinc-400 uppercase mb-0.5 tracking-tighter">Taxa</p>
                        {n.fee > 0 ? (
                          <p className="text-lg font-black text-green-700">{formatCurrency(n.fee)}</p>
                        ) : (
                          <p className="text-lg font-black text-green-600 uppercase italic">Grátis</p>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-red-400 border-red-100 font-black uppercase text-[8px]">Indisponível</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="bg-green-600 rounded-[32px] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 -mr-8 -mt-8 rotate-12">
            <Truck size={120} />
          </div>
          
          <h4 className="text-xl font-black uppercase italic tracking-tighter mb-2">Pedido Mínimo</h4>
          <p className="text-green-100 text-xs font-medium leading-relaxed mb-6">
            Realizamos entregas em toda a região. O valor do pedido mínimo pode variar de acordo com a distância do bairro selecionado.
          </p>
          
          <Link to="/" className="inline-flex items-center gap-2 bg-white text-green-700 px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:scale-105 transition-transform active:scale-95">
            Começar Compras <ArrowLeft className="rotate-180" size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
