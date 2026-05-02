 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
 import { Badge } from '@/components/ui/badge'
 import { ShieldCheck, ShieldAlert, Loader2, Lock, Unlock, Eye, EyeOff } from 'lucide-react'
 import { toast } from '@/lib/toast'
 
 export function RLSAuditor() {
   const [auditData, setAuditData] = useState<any[]>([])
   const [isLoading, setIsLoading] = useState(true)
 
   useEffect(() => {
     fetchAudit()
   }, [])
 
   const fetchAudit = async () => {
     setIsLoading(true)
     try {
       const { data, error } = await supabase.rpc('audit_rls_status')
       if (error) throw error
       setAuditData(data || [])
     } catch (error: any) {
       console.error('Audit error:', error)
       toast.error('Erro ao auditar RLS: ' + error.message)
     } finally {
       setIsLoading(false)
     }
   }
 
   const getSecurityScore = () => {
     if (auditData.length === 0) return 0
     const enabled = auditData.filter(t => t.rls_enabled).length
     return Math.round((enabled / auditData.length) * 100)
   }
 
   if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
 
   const score = getSecurityScore()
 
   return (
     <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="bg-zinc-900 text-white">
           <CardHeader className="pb-2">
             <CardDescription className="text-zinc-400 uppercase text-[10px] font-bold">Saúde da Segurança</CardDescription>
             <CardTitle className="text-4xl font-black italic tracking-tighter flex items-end gap-2">
               {score}% <span className="text-xs uppercase text-zinc-500 font-bold mb-1">Protegido</span>
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${score}%` }} />
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardDescription className="uppercase text-[10px] font-bold">Status RLS</CardDescription>
             <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
               {score === 100 ? <ShieldCheck className="text-green-500" /> : <ShieldAlert className="text-amber-500" />}
               {score === 100 ? 'Configuração Segura' : 'Ação Necessária'}
             </CardTitle>
           </CardHeader>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardDescription className="uppercase text-[10px] font-bold">Controle de Acesso</CardDescription>
             <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-primary">
               <Lock className="h-5 w-5" /> Privado
             </CardTitle>
           </CardHeader>
         </Card>
       </div>
 
       <Card className="border-2 border-zinc-100 shadow-xl overflow-hidden">
         <div className="bg-zinc-900 text-white p-4 flex justify-between items-center">
           <h3 className="font-black uppercase italic tracking-tighter">Relatório de Auditoria RLS (Tempo Real)</h3>
           <Badge variant="outline" className="text-green-400 border-green-400/30">ATIVO</Badge>
         </div>
         <CardContent className="p-0">
           <Table>
             <TableHeader className="bg-zinc-50">
               <TableRow>
                 <TableHead className="font-bold uppercase text-[10px]">Tabela</TableHead>
                 <TableHead className="font-bold uppercase text-[10px]">Segurança (RLS)</TableHead>
                 <TableHead className="font-bold uppercase text-[10px]">Políticas Ativas</TableHead>
                 <TableHead className="font-bold uppercase text-[10px]">Risco</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {auditData.map((row) => (
                 <TableRow key={row.table_name}>
                   <TableCell className="font-black uppercase tracking-tight text-xs">{row.table_name}</TableCell>
                   <TableCell>
                     {row.rls_enabled ? (
                       <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1 border-0">
                         <Lock size={10} /> ATIVADO
                       </Badge>
                     ) : (
                       <Badge variant="destructive" className="gap-1">
                         <Unlock size={10} /> DESATIVADO
                       </Badge>
                     )}
                   </TableCell>
                   <TableCell>
                     <span className="font-mono text-xs font-bold">{row.policy_count} políticas</span>
                   </TableCell>
                   <TableCell>
                     {!row.rls_enabled ? (
                       <div className="flex items-center gap-1 text-red-600 font-black uppercase text-[10px]">
                         <ShieldAlert size={14} /> Crítico
                       </div>
                     ) : row.policy_count === 0 ? (
                       <div className="flex items-center gap-1 text-amber-600 font-black uppercase text-[10px]">
                         <Eye size={14} /> Médio (Sem Regras)
                       </div>
                     ) : (
                       <div className="flex items-center gap-1 text-green-600 font-black uppercase text-[10px]">
                         <ShieldCheck size={14} /> Baixo
                       </div>
                     )}
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-2xl flex gap-4 items-start shadow-sm">
         <div className="bg-blue-500 p-2 rounded-full text-white shadow-lg">
           <ShieldCheck />
         </div>
         <div className="space-y-1">
           <h4 className="font-black uppercase tracking-tight text-sm text-blue-900 italic">Auditado por IA Security</h4>
           <p className="text-[10px] font-bold text-blue-700/70 uppercase leading-relaxed">
             Todas as tabelas críticas (produtos, categorias, ordens) devem estar com RLS ATIVADO para evitar vazamento de dados.
             A auditoria em tempo real verifica a integridade das políticas de acesso do proprietário master.
           </p>
         </div>
       </div>
     </div>
   )
 }