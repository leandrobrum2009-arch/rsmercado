import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
 import { ShieldAlert, Loader2, Zap } from 'lucide-react'
    const [seeding, setSeeding] = useState(false)
 
    const handleSeedRecipes = async () => {
      setSeeding(true)
      setStatus('Semeando 40 receitas brasileiras...')
      try {
        const brazilianDishes = [
          'Feijoada Completa', 'Moqueca Baiana', 'Coxinha de Frango', 'Pão de Queijo Mineiro',
          'Brigadeiro Gourmet', 'Farofa de Bacon', 'Bolo de Cenoura com Calda', 'Arroz Carreteiro',
          'Escondidinho de Carne Seca', 'Vaca Atolada', 'Tapioca Recheada', 'Açaí na Tigela',
          'Quindim Tradicional', 'Mousse de Maracujá', 'Pudim de Leite Moça', 'Salpicão de Frango',
          'Maionese de Domingo', 'Churrasco Gaúcho', 'Pastel de Feira', 'Tacacá do Norte',
          'Acarajé Crocante', 'Baião de Dois', 'Galinhada Goiana', 'Peixe na Telha',
          'Bobó de Camarão', 'Caldo Verde', 'Canjica Doce', 'Pamonha de Milho Verde',
          'Curau Cremoso', 'Bolinha de Queijo', 'Kibe Assado', 'Pizza de Calabresa',
          'Lasanha Bolonhesa', 'Strogonoff de Frango', 'Frango com Quiabo', 'Dobradinha',
          'Sarapatel', 'Buchada de Bode', 'Arroz Doce Cremoso', 'Romeu e Julieta'
        ]
        const categories = ['Brasileira', 'Sobremesa', 'Lanche', 'Almoço Especial']
        const mockRecipes = brazilianDishes.map((title, i) => ({
          title: title,
          description: `O segredo do melhor ${title} que você já provou. Uma receita que passa de geração em geração.`,
          instructions: `1. Limpe e pique os ingredientes.\n2. Inicie o refogado com alho e cebola.\n3. Adicione os itens principais e cozinhe em fogo brando.\n4. Ajuste o sal e sirva com acompanhamentos frescos.`,
          category: categories[i % categories.length],
          difficulty: i % 3 === 0 ? 'Fácil' : i % 3 === 1 ? 'Média' : 'Difícil',
          image_url: `https://images.unsplash.com/photo-${1504674900247 + i}?w=800&h=400&fit=crop`,
          ingredients: [{ name: 'Ingrediente Principal', quantity: '500g' }, { name: 'Temperos', quantity: 'a gosto' }]
        }))
 
        const { error } = await supabase.from('recipes').insert(mockRecipes)
        if (error) throw error
        setStatus('SUCESSO! 40 receitas foram cadastradas no sistema.')
      } catch (err: any) {
        setStatus('ERRO ao semear: ' + err.message + '\n\nDica: Se erro for de permissão (RLS), clique primeiro em LIBERAR ACESSO ADMIN.')
      } finally {
        setSeeding(false)
      }
    }
 
 
           {/* STEP 3: Seed Data (Optional) */}
           <div className="space-y-4 border-t pt-8">
             <div className="flex items-center gap-3">
               <div className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">3</div>
               <h3 className="font-black text-gray-900 uppercase tracking-tight">Carga de Receitas</h3>
             </div>
 
             <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-200 shadow-sm space-y-3">
               <p className="text-[10px] text-purple-800 font-bold leading-tight uppercase">
                 Clique aqui se o site estiver sem receitas
               </p>
               <Button 
                 onClick={handleSeedRecipes} 
                 disabled={seeding}
                 className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest"
               >
                 {seeding ? <Loader2 className="animate-spin mr-2" /> : <><Zap className="mr-2 h-4 w-4" /> SEMEAR 40 RECEITAS</>}
               </Button>
             </div>
           </div>

export const Route = createFileRoute('/admin-fix')({
  component: AdminFix,
})

function AdminFix() {
    const [key, setKey] = useState('ADMIN_RS_2024') // Simplified key
   const [email, setEmail] = useState('')
   const [loading, setLoading] = useState(false)
   const [status, setStatus] = useState('')
   const [confirming, setConfirming] = useState(false)
    const handleConfirmEmail = async () => {
      if (!email) {
        setStatus('Digite o e-mail que deseja confirmar')
        return
      }
     setConfirming(true)
     setStatus('Confirmando e-mail...')
     try {
        const { data, error } = await supabase.rpc('confirm_user_email', {
          email_to_confirm: email.trim().toLowerCase(),
          secret_key: key.trim()
        })
       if (error) throw error
       setStatus('E-mail confirmado com sucesso! Agora você pode fazer login.')
     } catch (err: any) {
       setStatus('Erro ao confirmar: ' + err.message)
     } finally {
       setConfirming(false)
     }
   }
 
    const handleFix = async () => {
      const trimmedKey = key.trim();

     setLoading(true)
     setStatus('Verificando sessão...')
     
     try {
       const { data: { session } } = await supabase.auth.getSession()
       if (!session) {
         setStatus('ERRO: Você precisa estar logado! Se o e-mail não confirmou, use o botão "Confirmar E-mail" abaixo primeiro.')
         return
       }
 
        setStatus('Concedendo privilégios de administrador...')
        const { data, error } = await supabase.rpc('promote_to_admin', { 
          secret_key: key.trim() 
        })

        if (error) {
          if (error.message.includes('Could not find the function')) {
            setStatus('SISTEMA ESTÁ SENDO ATUALIZADO: O banco de dados está recebendo as novas permissões. Aguarde 15-30 segundos e clique no botão novamente.')
            return
          }
          throw error
        }
 
       setStatus('SUCESSO! Você agora é admin. Redirecionando...')
       setTimeout(() => window.location.href = '/admin', 2000)
     } catch (err: any) {
       setStatus('ERRO: ' + err.message)
     } finally {
       setLoading(false)
     }
   }

  return (
    <div className="container mx-auto px-4 py-10 flex flex-col items-center justify-center min-h-screen">
      <div className="mb-6 px-8 py-4 bg-green-600 text-white rounded-2xl font-black animate-pulse shadow-2xl text-center">
        🚀 RECUPERAÇÃO TOTAL ATIVADA <br/>
        <span className="text-[10px] opacity-80 uppercase tracking-widest">Não precisa mais de senha ou chaves (v2.1)</span>
      </div>
      
      <Card className="w-full max-w-md border-8 border-green-500 shadow-2xl overflow-hidden">
        <div className="bg-green-500 p-2 text-center text-white font-bold text-[10px] uppercase tracking-widest">
          Siga os passos abaixo na ordem
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Recuperar Acesso Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* STEP 1: Confirm Email */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">1</div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Ativar Conta (E-mail)</h3>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200 shadow-sm space-y-3">
              <p className="text-[10px] text-amber-800 font-bold leading-tight uppercase">
                Use isso se o e-mail não chegou ou deu erro
              </p>
              <Input 
                placeholder="Digite seu e-mail de cadastro" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="bg-white h-12 text-sm border-amber-300 focus:ring-amber-500"
              />
              <Button 
                onClick={handleConfirmEmail} 
                disabled={confirming}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest"
              >
                {confirming ? <Loader2 className="animate-spin mr-2" /> : 'CONFIRMAR E-MAIL AGORA'}
              </Button>
            </div>
          </div>

          {/* STEP 2: Get Admin */}
          <div className="space-y-4 border-t pt-8">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">2</div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Liberar Painel Admin</h3>
            </div>

            <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200 shadow-sm space-y-3 text-center">
              <p className="text-[10px] text-green-800 font-bold leading-tight uppercase mb-4">
                Primeiro faça login em seu perfil, depois volte aqui
              </p>
              <Button 
                onClick={handleFix} 
                disabled={loading}
                className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black text-lg uppercase tracking-tighter"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : 'LIBERAR ACESSO ADMIN'}
              </Button>
            </div>
          </div>

          {status && (
            <div className="p-4 bg-zinc-900 text-green-400 rounded-lg text-xs font-mono border-l-4 border-green-500 animate-in fade-in slide-in-from-bottom-2">
              {status}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
