import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Loader2, Download } from 'lucide-react'

export const Route = createFileRoute('/cashback')({
  component: CashbackStatementPage,
})

function CashbackStatementPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'earn' | 'redeem'>('all')

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate({ to: '/profile' }); return }

      const [{ data: p }, { data: h }] = await Promise.all([
        supabase.from('profiles').select('cashback_balance').eq('id', session.user.id).maybeSingle(),
        supabase.from('cashback_history').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ])
      setBalance(Number(p?.cashback_balance || 0))
      setItems(h || [])
      setLoading(false)
    })()
  }, [navigate])

  const fmt = (v: number) => `R$ ${Number(v || 0).toFixed(2)}`
  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)
  const totalEarn = items.filter(i => i.type === 'earn').reduce((a, b) => a + Number(b.amount), 0)
  const totalRedeem = items.filter(i => i.type === 'redeem').reduce((a, b) => a + Number(b.amount), 0)

  const exportCSV = () => {
    const rows = [['Data', 'Tipo', 'Descrição', 'Status', 'Valor']]
    filtered.forEach(i => rows.push([
      new Date(i.created_at).toLocaleString(),
      i.type,
      i.description || '',
      i.status,
      Number(i.amount).toFixed(2),
    ]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `extrato-cashback-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <Link to="/profile" className="inline-flex items-center gap-2 text-xs font-black uppercase text-zinc-500 hover:text-zinc-900">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <Button variant="outline" size="sm" onClick={exportCSV} className="text-[10px] font-black uppercase rounded-xl">
          <Download size={14} className="mr-1" /> Exportar CSV
        </Button>
      </div>

      <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-80">
            <Wallet size={16} /> Saldo de Cashback
          </div>
          <p className="text-5xl font-black italic tracking-tighter mt-2">{fmt(balance)}</p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase opacity-80 tracking-widest">Total Acumulado</p>
              <p className="text-lg font-black">{fmt(totalEarn)}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase opacity-80 tracking-widest">Total Resgatado</p>
              <p className="text-lg font-black">{fmt(totalRedeem)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {(['all', 'earn', 'redeem'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="text-[10px] font-black uppercase rounded-xl"
          >
            {f === 'all' ? 'Tudo' : f === 'earn' ? 'Créditos' : 'Resgates'}
          </Button>
        ))}
      </div>

      <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-[11px] text-zinc-400 font-bold py-16 text-center uppercase">
              Nenhum lançamento no extrato.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {filtered.map(h => (
                <li key={h.id} className="flex items-center justify-between p-4 hover:bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${h.type === 'earn' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {h.type === 'earn' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-zinc-800">{h.description || (h.type === 'earn' ? 'Cashback' : 'Resgate')}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        {new Date(h.created_at).toLocaleString()} · {h.status}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-black ${h.type === 'earn' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {h.type === 'earn' ? '+' : '-'}{fmt(h.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}