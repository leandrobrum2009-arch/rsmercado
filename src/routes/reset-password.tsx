import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [
      { title: 'Redefinir senha | RS Supermercado' },
      { name: 'description', content: 'Crie uma nova senha para acessar sua conta no RS Supermercado.' },
      { property: 'og:title', content: 'Redefinir senha | RS Supermercado' },
      { property: 'og:description', content: 'Crie uma nova senha para acessar sua conta no RS Supermercado.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [message, setMessage] = useState('')
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    let active = true
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const isRecoveryLink = hashParams.get('type') === 'recovery' || new URLSearchParams(window.location.search).has('code')

    const verifyRecovery = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!active) return
      setHasRecoverySession(Boolean(data.session) && (isRecoveryLink || Boolean(data.session)))
      if (error || !data.session) {
        setMessage('Este link é inválido ou expirou. Solicite um novo link em Minha Conta.')
      }
      setChecking(false)
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || (isRecoveryLink && session)) {
        setHasRecoverySession(true)
        setMessage('')
        setChecking(false)
      }
    })

    void verifyRecovery()
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')

    if (password.length < 8) {
      setMessage('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setMessage('As senhas informadas não são iguais.')
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      setMessage(error.message.includes('same password')
        ? 'Escolha uma senha diferente da senha anterior.'
        : 'Não foi possível salvar a nova senha. Solicite outro link e tente novamente.')
      return
    }

    setComplete(true)
    setTimeout(() => navigate({ to: '/admin', search: { tab: 'dashboard' } }), 1800)
  }

  return (
    <main className="min-h-[75vh] bg-muted/30 px-4 py-12 flex items-center justify-center">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="size-7" />
          </div>
          <CardTitle className="text-2xl font-black uppercase">Criar nova senha</CardTitle>
          <CardDescription>Digite e confirme a senha que deseja usar daqui em diante.</CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="animate-spin" /> Verificando seu link...
            </div>
          ) : complete ? (
            <Alert className="border-primary/30 bg-primary/5">
              <CheckCircle2 className="size-4 text-primary" />
              <AlertTitle>Senha atualizada</AlertTitle>
              <AlertDescription>Seu acesso foi recuperado. Abrindo o painel administrativo...</AlertDescription>
            </Alert>
          ) : hasRecoverySession ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {message && (
                <Alert variant="destructive">
                  <TriangleAlert className="size-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    className="h-12 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1 top-1.5"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className="h-12"
                  required
                />
              </div>
              <Button type="submit" className="h-12 w-full font-bold" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <KeyRound />}
                Salvar nova senha
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />
                <AlertTitle>Link indisponível</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="h-12 w-full">
                <Link to="/profile">Solicitar novo link</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}