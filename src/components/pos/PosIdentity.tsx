import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, Store } from 'lucide-react'
import { useStoreSettings } from '@/hooks/useStoreSettings'

export function PosIdentity() {
  const { settings } = useStoreSettings()
  const [failed, setFailed] = useState(false)
  const name = settings.site_name && settings.site_name !== 'Minha Loja' ? settings.site_name : 'RS Supermercado'
  return <div className="flex min-w-0 items-center gap-3">
    <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-card p-1">
      {settings.logo_url && !failed ? <img src={settings.logo_url} alt={`Logotipo ${name}`} onError={() => setFailed(true)} className="size-full object-contain" /> : <Store className="size-7 text-primary" />}
    </div>
    <div className="min-w-0"><p className="truncate text-base font-bold text-foreground">{name}</p><p className="text-xs text-muted-foreground">Frente de caixa · Matriz</p></div>
  </div>
}

export function PosClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  return <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
    <span className="flex items-center gap-2"><CalendarDays className="size-4" />{now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
    <time className="flex items-center gap-2 font-mono text-sm font-semibold tabular-nums text-foreground"><Clock3 className="size-4 text-muted-foreground" />{now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time>
  </div>
}