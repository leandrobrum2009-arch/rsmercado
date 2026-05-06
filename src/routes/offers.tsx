import { createFileRoute } from "@tanstack/react-router";
import { ProductGrid } from "@/components/home/ProductGrid";
import { ChevronLeft, Zap, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/offers")({
  component: OffersPage,
});

function OffersPage() {
  return (
    <div className="bg-zinc-50 min-h-screen pb-20">
      <div className="bg-red-600 text-white p-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute -right-20 -top-20 bg-white/10 w-64 h-64 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -left-10 -bottom-10 bg-black/10 w-40 h-40 rounded-full blur-2xl" />
        
        <div className="container mx-auto relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ChevronLeft size={20} />
            <span className="font-bold uppercase text-xs tracking-widest">Voltar para Início</span>
          </Link>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-inner">
              <Zap className="text-amber-300 animate-bounce" size={32} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Ofertas do Dia</h1>
              <p className="text-red-100 font-bold uppercase text-[10px] tracking-widest mt-1">Os melhores preços de Piraí em um só lugar</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-4">
        <ProductGrid title="Preços Imbatíveis" tag="OFERTA" />
        
        <div className="px-4 mt-8">
          <div className="bg-white p-6 rounded-[32px] border-2 border-dashed border-red-100 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="font-black uppercase italic tracking-tight text-zinc-800">Economia Garantida</h3>
              <p className="text-xs text-zinc-500 max-w-[240px] mx-auto mt-1">Novas ofertas todos os dias. Fique de olho e não perca nada!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}