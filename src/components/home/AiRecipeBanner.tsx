 import { BrainCircuit, Sparkles } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useState } from "react";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { toast } from "@/lib/toast";
 import { supabase } from "@/lib/supabase";
 
 export function AiRecipeBanner() {
   const [isOpen, setIsOpen] = useState(false);
   const [input, setInput] = useState("");
   const [loading, setLoading] = useState(false);
 
   const handleGenerate = async () => {
     if (!input.trim()) return toast.error("Digite os ingredientes!");
     setLoading(true);
     try {
       // Simulate IA logic or call the same logic as in RecipeManager
       const products = input.split(',').map(p => p.trim());
       const mainProduct = products[0] || 'Ingrediente';
       
       const newRecipe = {
         title: `Chef IA: ${mainProduct} Especial`,
         description: `Uma criação personalizada da nossa IA baseada nos seus produtos: ${input}.`,
         instructions: `1. Separe os itens: ${input}.\n2. Misture com criatividade.\n3. Cozinhe em fogo médio por 15 minutos.\n4. Sirva ainda quente e aproveite!`,
         category: 'Criação IA',
         difficulty: 'Fácil',
         image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=400&fit=crop',
         ingredients: products.map(p => ({ name: p, quantity: 'a gosto' }))
       };
 
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from('recipes').insert({
          ...newRecipe,
          author_id: userData.user?.id
        });
       if (error) throw error;
 
       toast.success("Receita criada com sucesso! Veja no seu feed.");
       setIsOpen(false);
       setInput("");
       // We could redirect to /recipes or just stay here
     } catch (error) {
       toast.error("Erro ao gerar receita");
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <div className="px-4 py-4">
       <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
         <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />
         
         <div className="relative z-10 flex flex-col items-center text-center space-y-4">
           <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center animate-bounce shadow-xl border border-white/30">
             <BrainCircuit size={32} className="text-white" />
           </div>
           
           <div>
             <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-tight">
               O que tem na sua geladeira?
             </h3>
             <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">
               A nossa IA cria 3 receitas instantâneas pra você!
             </p>
           </div>
 
           <Button 
             onClick={() => setIsOpen(true)}
             className="bg-white text-indigo-600 hover:bg-indigo-50 font-black uppercase text-[10px] tracking-widest px-8 h-12 rounded-2xl shadow-lg border-b-4 border-indigo-200 active:border-b-0 active:translate-y-1 transition-all"
           >
             <Sparkles size={16} className="mr-2" />
             CRIAR RECEITAS AGORA
           </Button>
         </div>
       </div>
 
       <Dialog open={isOpen} onOpenChange={setIsOpen}>
         <DialogContent className="max-w-md rounded-[40px] border-8 border-indigo-50 p-8 shadow-2xl">
           <DialogHeader>
             <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-zinc-900">
                Chef IA RS SUPERMERCADO
             </DialogTitle>
             <DialogDescription className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">
               Liste os produtos que você tem ou quer comprar
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4 py-6">
             <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Seus Ingredientes</Label>
               <Textarea 
                 placeholder="Ex: Frango, Batata, Creme de leite..." 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 className="min-h-[150px] border-4 border-zinc-100 rounded-[30px] focus:ring-indigo-500 focus:border-indigo-500 p-6 text-sm font-medium"
               />
             </div>
           </div>
 
           <DialogFooter>
             <Button 
               onClick={handleGenerate}
               disabled={loading}
               className="w-full bg-zinc-900 text-white hover:bg-black h-16 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl"
             >
               {loading ? "PROCESSANDO..." : "GERAR MINHAS RECEITAS 🚀"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }