 import { useState } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Button } from '@/components/ui/button'
 import { Textarea } from '@/components/ui/textarea'
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
 import { Loader2, Play, Table, AlertCircle, CheckCircle2, Info } from 'lucide-react'
 import { toast } from '@/lib/toast'
 
 export function SQLEditor() {
   const [sql, setSql] = useState('')
   const [results, setResults] = useState<any[] | null>(null)
   const [error, setError] = useState<string | null>(null)
   const [isLoading, setIsLoading] = useState(false)
 
   const handleExecute = async () => {
     if (!sql.trim()) return toast.error('Digite um comando SQL')
     
     setIsLoading(true)
     setResults(null)
     setError(null)
     
     try {
       // We use a custom RPC to execute arbitrary SQL
       // This RPC must be created in the database first
       const { data, error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql })
       
       if (rpcError) {
         if (rpcError.message.includes('function public.exec_sql(text) does not exist')) {
           throw new Error('O Editor SQL não está ativado no banco de dados. Use o Reparador primeiro.')
         }
         throw rpcError
       }
       
       setResults(Array.isArray(data) ? data : [data])
       toast.success('Comando executado com sucesso!')
     } catch (err: any) {
       console.error('SQL Execution error:', err)
       setError(err.message)
       toast.error('Erro na execução do SQL')
     } finally {
       setIsLoading(false)
     }
   }
 
   return (
     <div className="space-y-6">
       <Card className="border-zinc-900 border-2 shadow-xl">
         <CardHeader className="bg-zinc-900 text-white">
           <CardTitle className="flex items-center gap-2 uppercase italic tracking-tighter">
             <Play className="h-5 w-5 text-green-500 fill-green-500" /> Editor SQL Avançado
           </CardTitle>
           <CardDescription className="text-zinc-400 font-bold text-[10px] uppercase">
             Execute comandos diretamente no banco de dados Supabase
           </CardDescription>
         </CardHeader>
         <CardContent className="pt-6 space-y-4">
           <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl flex gap-3 items-start">
             <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
             <div className="space-y-1">
               <p className="text-xs font-black uppercase text-amber-900">Atenção: Perigo de Perda de Dados</p>
               <p className="text-[10px] text-amber-700 font-bold leading-tight">
                 Este editor ignora as regras de segurança (RLS). Comandos como DELETE ou DROP podem apagar dados permanentemente. Use com cautela extrema.
               </p>
             </div>
           </div>
 
           <div className="relative">
             <Textarea 
               value={sql}
               onChange={(e) => setSql(e.target.value)}
               placeholder="SELECT * FROM products LIMIT 10;"
               className="min-h-[200px] font-mono text-sm bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-900 rounded-xl p-4"
             />
             <div className="absolute bottom-4 right-4 flex gap-2">
                <Button 
                 variant="outline" 
                 size="sm"
                 onClick={() => setSql('')}
                 className="bg-white font-bold text-[10px] uppercase"
               >
                 Limpar
               </Button>
               <Button 
                 onClick={handleExecute}
                 disabled={isLoading}
                 className="bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase text-[10px] px-6"
               >
                 {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-3 w-3 fill-white" />}
                 Executar Comando
               </Button>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {error && (
         <Card className="border-red-200 bg-red-50 border-2">
           <CardContent className="pt-6 flex gap-3">
             <AlertCircle className="text-red-600 shrink-0" />
             <div className="space-y-1">
               <p className="font-black text-red-900 text-xs uppercase tracking-tight">Erro no Banco de Dados</p>
               <pre className="text-[10px] font-mono text-red-700 whitespace-pre-wrap">{error}</pre>
               {error.includes('exec_sql') && (
                 <Button 
                   size="sm" 
                   variant="link" 
                   className="p-0 h-auto text-red-800 font-black underline text-[10px]"
                   onClick={() => window.location.href = '/admin-fix'}
                 >
                   ATIVAR EDITOR NO REPARADOR
                 </Button>
               )}
             </div>
           </CardContent>
         </Card>
       )}
 
       {results && (
         <Card className="border-green-200 bg-white border-2 shadow-lg overflow-hidden">
           <CardHeader className="bg-green-50 border-b border-green-100 py-3">
             <CardTitle className="text-xs font-black text-green-800 uppercase flex items-center gap-2">
               <CheckCircle2 className="h-4 w-4" /> Resultado da Consulta ({results.length} linhas)
             </CardTitle>
           </CardHeader>
           <CardContent className="p-0">
             <div className="overflow-x-auto max-h-[400px]">
               {results.length > 0 ? (
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-zinc-50 border-b border-zinc-100">
                       {Object.keys(results[0]).map(key => (
                         <th key={key} className="p-3 text-[10px] font-black uppercase text-zinc-500 whitespace-nowrap">{key}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {results.map((row, i) => (
                       <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                         {Object.values(row).map((val: any, j) => (
                           <td key={j} className="p-3 text-[10px] font-mono text-zinc-600">
                             {val === null ? <span className="text-zinc-300 italic">null</span> : 
                              typeof val === 'object' ? JSON.stringify(val) : String(val)}
                           </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               ) : (
                 <div className="p-10 text-center space-y-2">
                   <Info className="mx-auto text-zinc-300" />
                   <p className="text-xs font-bold text-zinc-400 uppercase">Comando executado com sucesso, mas não retornou dados.</p>
                 </div>
               )}
             </div>
           </CardContent>
         </Card>
       )}
     </div>
   )
 }