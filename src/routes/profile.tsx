import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-20 text-center">Carregando...</div>

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold mb-4">Olá, {session.user.email}</h1>
      <p className="mb-8">Você está logado com sucesso.</p>
      <button 
        onClick={() => { supabase.auth.signOut().then(() => window.location.reload()) }}
        className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold"
      >
        SAIR
      </button>
      <div className="mt-8">
        <a href="/admin" className="text-green-600 font-bold underline">Acessar Painel Administrativo</a>
      </div>
    </div>
  )
}
