 import { createFileRoute } from "@tanstack/react-router";
 import { CategoryBar } from "../components/home/CategoryBar";
 import { ProductGrid } from "../components/home/ProductGrid";
 import { StoriesCarousel } from "../components/home/StoriesCarousel";
import { Search, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

// IMPORTANT: Replace this placeholder. For sites with multiple pages (About, Services, Contact, etc.),
// create separate route files (about.tsx, services.tsx, contact.tsx) — don't put all pages in this file.
 function Index() {
   return (
     <div className="bg-gray-50 pb-10">
       {/* Hero Search */}
       <div className="bg-green-600 px-4 pt-6 pb-10 md:pb-16 rounded-b-[40px] shadow-lg">
         <div className="container mx-auto">
           <h1 className="text-white text-2xl font-bold mb-4">Olá, o que você busca hoje?</h1>
           <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <input 
               type="text" 
               placeholder="Busque por produtos, marcas..."
               className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 shadow-inner outline-none text-gray-800"
             />
           </div>
         </div>
       </div>
 
       <div className="container mx-auto -mt-6">
         <div className="bg-white mx-4 rounded-2xl shadow-sm p-4 flex items-center justify-between border">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold">
               P
             </div>
             <div>
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Seus Pontos</p>
               <p className="text-lg font-bold text-gray-800">1.250 pts</p>
             </div>
           </div>
           <button className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors">
             RESGATAR
           </button>
         </div>
       </div>
 
       <StoriesCarousel />
       
       <CategoryBar />
 
       {/* Banner Promo */}
       <div className="px-4 py-4">
         <div className="w-full h-40 rounded-3xl overflow-hidden shadow-md relative">
           <img 
             src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1000&auto=format&fit=crop" 
             className="w-full h-full object-cover"
             alt="Promoção da semana"
           />
           <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-6">
             <span className="text-green-400 font-bold text-xs uppercase">Oferta da Semana</span>
             <h2 className="text-white text-xl font-bold max-w-[150px]">Até 40% OFF em Hortifruti</h2>
             <button className="mt-3 bg-white text-black text-xs font-bold w-max px-4 py-2 rounded-lg">
               APROVEITAR
             </button>
           </div>
         </div>
       </div>
 
        <ProductGrid title="Destaques" />

        {/* Encartes Digitais */}
        <div className="px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen size={20} className="text-green-600" />
              Encartes Digitais
            </h2>
            <button className="text-green-600 text-sm font-bold">VER TODOS</button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {[1, 2].map((i) => (
              <div key={i} className="min-w-[280px] bg-white rounded-2xl shadow-sm border p-2">
                <img 
                  src={i === 1 ? "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=600" : "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=600"} 
                  alt="Encarte"
                  className="w-full h-40 object-cover rounded-xl mb-3"
                />
                <div className="flex justify-between items-center px-2 pb-1">
                  <div>
                    <h3 className="font-bold text-sm">Ofertas de Fim de Semana</h3>
                    <p className="text-[10px] text-gray-500">Válido até 15/05</p>
                  </div>
                  <button className="bg-green-600 text-white p-2 rounded-lg">
                    <Search size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ProductGrid title="Mais Vendidos" />
 
       {/* First Purchase Coupon */}
       <div className="px-4 py-6">
         <div className="bg-amber-500 rounded-3xl p-6 text-white flex items-center justify-between overflow-hidden relative">
           <div className="relative z-10">
             <h3 className="text-lg font-bold">Primeira Compra?</h3>
             <p className="text-sm opacity-90">Use o cupom <span className="font-bold underline">BEMVINDO</span></p>
             <p className="text-2xl font-black mt-1">R$ 20 OFF</p>
           </div>
           <div className="text-6xl opacity-20 absolute -right-4 -bottom-4 transform rotate-12">
             🎟️
           </div>
         </div>
       </div>
 
       <ProductGrid title="Ofertas de Limpeza" />
     </div>
   );
 }
