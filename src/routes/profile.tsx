import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'
import { AdminSetup } from '@/components/admin/AdminSetup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, LogOut, ShieldCheck, ShoppingBag, User } from 'lucide-react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        supabase.from('profiles').select('*').eq('id', data.session.user.id).single().then(({ data: profileData }) => {
          setProfile(profileData)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
  }, [])

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="flex flex-col items-center mb-10">
        <Avatar className="w-24 h-24 mb-4 ring-4 ring-primary/10">
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {session.user.email?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold">{profile?.full_name || session.user.email}</h1>
        <div className="bg-amber-100 text-amber-700 px-4 py-1 rounded-full text-xs font-bold mt-2">
          Pontos: {profile?.points_balance || 0}
        </div>
      </div>

      <AdminSetup />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => window.location.href = '/admin'}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-primary">Painel Administrativo</CardTitle>
            <ShieldCheck size={18} className="text-primary" />
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">Cadastrar produtos e categorias.</p></CardContent>
        </Card>

        <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold">Meus Pedidos</CardTitle>
            <ShoppingBag size={18} />
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">Acompanhe suas compras.</p></CardContent>
        </Card>

        <Card className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => supabase.auth.signOut().then(() => window.location.reload())}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-destructive">Sair da Conta</CardTitle>
            <LogOut size={18} className="text-destructive" />
          </CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">Encerrar sessão com segurança.</p></CardContent>
        </Card>
      </div>
    </div>
  )
}
