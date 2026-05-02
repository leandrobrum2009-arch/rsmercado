import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileEditor } from '@/components/profile/ProfileEditor'
import { AuthForm } from '@/components/auth/AuthForm'
import { AdminSetup } from '@/components/admin/AdminSetup'
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
      console.log('Starting getProfile...')
      try {
      const { data: { session } } = await supabase.auth.getSession()
        console.log('Session data:', session?.user?.id)
      if (!session) {
          console.log('No session found')
        setIsLoading(false)
        return
      }

        console.log('Fetching profile and roles...')
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', session.user.id).single()
      ])

        console.log('Fetch results:', { profile: profileRes.data, role: roleRes.data })

      if (profileRes.data) {
        setProfile({
          ...profileRes.data,
          is_admin: roleRes.data?.role === 'admin'
        })
        } else {
          console.warn('Profile record not found in database')
          // Even if no profile, we should probably allow them to see something
          setProfile({ id: session.user.id, full_name: 'Novo Usuário', is_admin: false })
      }
      } catch (error) {
        console.error('Error fetching profile:', error)
        toast.error('Erro ao carregar perfil. Tente novamente.')
      } finally {
      setIsLoading(false)
      }
    }

    getProfile()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logout realizado com sucesso!')
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col items-center mb-8">
        <Avatar className="w-24 h-24 mb-4 ring-4 ring-primary/10">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold">{profile?.full_name || 'Usuário'}</h1>
        <p className="text-muted-foreground">{profile?.whatsapp || 'Sem WhatsApp cadastrado'}</p>
        
        <div className="flex gap-4 mt-4">
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-sm">
            <span className="text-xs">Pontos:</span> {profile?.points_balance || 0}
          </div>
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold text-xs flex items-center shadow-sm">
            Nível {profile?.loyalty_tier?.toUpperCase() || 'BRONZE'}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="overview">Início</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="settings">Perfil</TabsTrigger>
          <TabsTrigger value="logout" onClick={handleLogout}>Sair</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AdminSetup />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile?.is_admin && (
              <Card className="hover:bg-muted/50 cursor-pointer transition-all border-l-4 border-l-primary" onClick={() => navigate({ to: '/admin' })}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold">Painel Administrativo</CardTitle>
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Acesso às configurações globais da loja.</p>
                </CardContent>
              </Card>
            )}

            <Card className="hover:bg-muted/50 cursor-pointer transition-all border-l-4 border-l-green-600">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold">Status de Entrega</CardTitle>
                <ShoppingBag className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Você não possui pedidos em andamento.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="bg-white rounded-xl border p-8 text-center">
            <History className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="font-bold text-lg">Histórico Vazio</h3>
            <p className="text-sm text-muted-foreground">Suas compras aparecerão aqui quando você realizar o primeiro pedido.</p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <ProfileEditor profile={profile} onUpdate={() => window.location.reload()} />
        </TabsContent>

        <TabsContent value="logout">
           <div className="flex justify-center p-12">
             <Loader2 className="animate-spin text-primary" />
           </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
