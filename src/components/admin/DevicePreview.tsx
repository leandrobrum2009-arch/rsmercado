import { useState } from 'react'
import { Smartphone, Tablet, Monitor, X, ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function DevicePreview() {
  const [isOpen, setIsOpen] = useState(false)
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile')
  const [refreshKey, setRefreshKey] = useState(0)

  const dimensions = {
    mobile: { width: '375px', height: '667px' },
    tablet: { width: '768px', height: '1024px' },
    desktop: { width: '100%', height: '80vh' }
  }

  const baseUrl = window.location.origin

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[60] bg-zinc-900 text-white rounded-full h-14 w-14 shadow-2xl hover:scale-110 transition-all border-4 border-white"
        title="Ver Loja"
      >
        <Monitor size={24} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden flex flex-col gap-0 border-none bg-zinc-100">
          <DialogHeader className="bg-zinc-900 text-white p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="font-black uppercase italic tracking-tighter text-xl">Visualizador</DialogTitle>
              
              <div className="flex bg-white/10 p-1 rounded-xl gap-1">
                <button 
                  onClick={() => setDevice('mobile')}
                  className={`p-2 rounded-lg transition-all ${device === 'mobile' ? 'bg-white text-zinc-900 shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                  <Smartphone size={18} />
                </button>
                <button 
                  onClick={() => setDevice('tablet')}
                  className={`p-2 rounded-lg transition-all ${device === 'tablet' ? 'bg-white text-zinc-900 shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                  <Tablet size={18} />
                </button>
                <button 
                  onClick={() => setDevice('desktop')}
                  className={`p-2 rounded-lg transition-all ${device === 'desktop' ? 'bg-white text-zinc-900 shadow-lg' : 'text-white/60 hover:text-white'}`}
                >
                  <Monitor size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setRefreshKey(prev => prev + 1)} className="text-white hover:bg-white/10">
                <RefreshCw size={18} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => window.open('/', '_blank')} className="text-white hover:bg-white/10">
                <ExternalLink size={18} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10">
                <X size={18} />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:20px_20px]">
            <div 
              className={`bg-white shadow-2xl transition-all duration-500 overflow-hidden relative ${device !== 'desktop' ? 'rounded-[3rem] border-[12px] border-zinc-800' : 'rounded-xl'}`}
              style={{ 
                width: dimensions[device].width, 
                height: dimensions[device].height,
                maxHeight: '100%'
              }}
            >
              {/* Fake Speaker and Camera for Mobile/Tablet */}
              {device !== 'desktop' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl z-20 flex items-center justify-center gap-2">
                  <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                  <div className="w-2 h-2 bg-zinc-700 rounded-full" />
                </div>
              )}
              
              <iframe 
                key={refreshKey}
                src={`${baseUrl}?preview=true`} 
                className="w-full h-full border-none"
                title="Site Preview"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}