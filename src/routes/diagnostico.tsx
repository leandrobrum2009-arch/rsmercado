import { createFileRoute } from '@tanstack/react-router'
import { AdminSecurityVerification } from '@/components/admin/AdminHealthCheck'

export const Route = createFileRoute('/diagnostico')({
  component: DiagnosticoPage,
})

function DiagnosticoPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <AdminSecurityVerification />
      </div>
    </div>
  )
}