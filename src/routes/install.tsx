import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Smartphone, Apple, Chrome, Share, PlusSquare, Download } from 'lucide-react'

export const Route = createFileRoute('/install')({
  component: InstallPage,
})

function InstallPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black mb-4">Instalar Nosso App</h1>
        <p className="text-muted-foreground">Tenha as melhores ofertas do supermercado direto na sua tela inicial.</p>
      </div>

      <div className="space-y-8">
        {/* iOS Section */}
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center gap-4 bg-zinc-50">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
              <Apple size={24} />
            </div>
            <div>
              <CardTitle>iPhone / iPad (iOS)</CardTitle>
              <p className="text-xs text-muted-foreground">Usando o Safari</p>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">1</span>
                <span>Abra este site no navegador <span className="font-bold">Safari</span>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">2</span>
                <span className="flex items-center gap-1">Toque no botão <span className="bg-blue-50 p-1 rounded text-blue-600"><Share size={16} /></span> na barra inferior.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">3</span>
                <span>Role para baixo e selecione <span className="font-bold">"Adicionar à Tela de Início"</span>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">4</span>
                <span className="flex items-center gap-1">Toque em <span className="font-bold text-blue-600">Adicionar</span> no canto superior.</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Android Section */}
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center gap-4 bg-green-50">
            <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white">
              <Smartphone size={24} />
            </div>
            <div>
              <CardTitle>Android (Samsung, Xiaomi, etc)</CardTitle>
              <p className="text-xs text-muted-foreground">Usando o Google Chrome</p>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ol className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">1</span>
                <span>Abra este site no <span className="font-bold">Google Chrome</span>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">2</span>
                <span>Toque nos <span className="font-bold text-lg leading-none">⋮</span> no canto superior direito.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">3</span>
                <span>Selecione <span className="font-bold">"Instalar aplicativo"</span> ou "Adicionar à tela inicial".</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-white w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold">4</span>
                <span>Confirme em <span className="font-bold">Instalar</span> e pronto!</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <div className="text-center bg-muted p-6 rounded-2xl border-dashed border-2">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-2">Vantagens</p>
          <div className="flex justify-around gap-4 text-[10px] font-bold">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-primary"><Smartphone size={16} /></div>
              Acesso Rápido
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-primary"><Download size={16} /></div>
              Menos Dados
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-primary"><Smartphone size={16} /></div>
              Notificações
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-12">
        <Button className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg" onClick={() => window.history.back()}>
          VOLTAR PARA A LOJA
        </Button>
      </div>
    </div>
  )
}
