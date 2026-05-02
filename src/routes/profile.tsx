import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/sb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Settings, LogOut, ShieldCheck, ShoppingBag, History, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/profile')({
  component: RouteComponent,
})

function RouteComponent() {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate({ to: '/' })
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setProfile(data)
      setIsLoading(false)
    }

    getProfile()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logout realizado com sucesso!')
    navigate({ to: '/' })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center mb-8">
        <Avatar className="w-24 h-24 mb-4">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold">{profile?.full_name || 'Usuário'}</h1>
        <p className="text-muted-foreground">{profile?.whatsapp || 'Sem WhatsApp cadastrado'}</p>
        
        <div className="flex gap-4 mt-4">
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full font-bold flex items-center gap-2">
            <span className="text-xs">Pontos:</span> {profile?.points_balance || 0}
          </div>
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold text-xs flex items-center">
            Nível {profile?.loyalty_tier || 'Bronze'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate({ to: '/admin' })}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Administração</CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Gerencie produtos, notícias e pedidos.</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meus Pedidos</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Acompanhe suas compras e histórico.</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Configurações</CardTitle>
            <Settings className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Altere seus dados e preferências.</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={handleLogout}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sair</CardTitle>
            <LogOut className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Finalizar sua sessão com segurança.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
