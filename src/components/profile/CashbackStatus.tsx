import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, TrendingUp } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function CashbackStatus({ userId }: { userId: string }) {
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data: p } = await supabase.from('profiles').select('cashback_balance').eq('id', userId).maybeSingle()
      setBalance(Number(p?.cashback_balance || 0))
      const { data: h } = await supabase
        .from('cashback_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      setHistory(h || [])
    })()
  }, [userId])

  const fmt = (v: number) => `R$ ${Number(v || 0).toFixed(2)}`

  return (
    <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-6">
        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <Wallet size={18} /> Cashback
        </CardTitle>
        <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest mt-1">Saldo disponível</p>
        <p className="text-4xl font-black italic tracking-tighter mt-1">{fmt(balance)}</p>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2 flex items-center gap-1">
          <TrendingUp size={12} /> Últimos créditos
        </p>
        {history.length === 0 ? (
          <p className="text-[11px] text-zinc-400 font-bold py-4 text-center uppercase">
            Nenhum cashback ainda. Faça compras para começar a acumular!
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {history.map(h => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-[11px] font-bold text-zinc-700">{h.description || 'Cashback'}</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(h.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-[12px] font-black ${h.type === 'earn' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {h.type === 'earn' ? '+' : '-'}{fmt(h.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/cashback"
          className="block mt-3 text-center text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-900 py-2 border-t border-zinc-100"
        >
          Ver extrato completo →
        </Link>
      </CardContent>
    </Card>
  )
}