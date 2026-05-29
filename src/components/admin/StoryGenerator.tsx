import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Play, Pause, Volume2, VolumeX, Loader2, Camera, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from '@/lib/toast'
import html2canvas from 'html2canvas-pro'
import { useStoreSettings } from '@/hooks/useStoreSettings'

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  unit?: string
}

type SlideType = 
  | { type: 'intro'; title: string; subtitle: string }
  | { type: 'product'; product: Product }
  | { type: 'outro'; title: string; subtitle: string }

interface StoryGeneratorProps {
  isOpen: boolean
  onClose: () => void
  flyer: {
    title: string
    products_data: Product[]
    config: any
  }
}

export function StoryGenerator({ isOpen, onClose, flyer }: StoryGeneratorProps) {
  const { settings: storeSettings } = useStoreSettings()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const slideDuration = 2000 // 2 seconds per slide
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const slideRef = useRef<HTMLDivElement>(null)

  const slides: SlideType[] = [
    { type: 'intro', title: 'OFERTAS DE HOJE', subtitle: flyer.title },
    ...flyer.products_data.map(p => ({ type: 'product' as const, product: p })),
    { type: 'outro', title: 'FAÇA SEU PEDIDO!', subtitle: 'Ou visite nossa loja' }
  ]

  useEffect(() => {
    if (isPlaying) {
      const startTime = Date.now()
      const startProgress = progress

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const newProgress = Math.min(startProgress + (elapsed / slideDuration) * 100, 100)
        
        setProgress(newProgress)

        if (newProgress >= 100) {
          if (currentSlide < slides.length - 1) {
            const nextSlide = currentSlide + 1
            setCurrentSlide(nextSlide)
            setProgress(0)
            speakSlide(nextSlide)
          } else {
            setIsPlaying(false)
            setProgress(100)
          }
        }
      }, 50)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, currentSlide, progress, slides.length])

  const speakSlide = (index: number) => {
    if (isMuted) return
    
    window.speechSynthesis.cancel()
    const slide = slides[index]
    let text = ''

    if (slide.type === 'intro') {
      text = `Confira as ofertas de hoje no ${storeSettings?.site_name || 'nosso supermercado'}`
    } else if (slide.type === 'product') {
      text = `${slide.product.name}, por apenas ${slide.product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    } else if (slide.type === 'outro') {
      text = 'Aproveite essas ofertas! Faça seu pedido agora ou venha nos visitar.'
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'
    utterance.rate = 1.1
    window.speechSynthesis.speak(utterance)
  }

  const handleTogglePlay = () => {
    if (!isPlaying && (currentSlide === slides.length - 1 && progress >= 100)) {
      setCurrentSlide(0)
      setProgress(0)
      speakSlide(0)
      setIsPlaying(true)
    } else {
      if (!isPlaying) speakSlide(currentSlide)
      setIsPlaying(!isPlaying)
    }
  }

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      const next = currentSlide + 1
      setCurrentSlide(next)
      setProgress(0)
      speakSlide(next)
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      const prev = currentSlide - 1
      setCurrentSlide(prev)
      setProgress(0)
      speakSlide(prev)
    }
  }

  const exportAsImages = async () => {
    setIsExporting(true)
    setIsPlaying(false)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (slideRef.current) {
        const canvas = await html2canvas(slideRef.current, {
          useCORS: true,
          scale: 2,
          backgroundColor: flyer.config?.backgroundColor || '#ffffff'
        })
        
        const link = document.createElement('a')
        link.download = `story-${flyer.title.replace(/\s+/g, '-')}-slide-${currentSlide + 1}.jpg`
        link.href = canvas.toDataURL('image/jpeg', 0.9)
        link.click()
        
        toast.success('Slide baixado com sucesso!')
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao exportar story')
    } finally {
      setIsExporting(false)
    }
  }

  const currentSlideData = slides[currentSlide]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
        <div className="flex h-[90vh] flex-col md:flex-row">
          {/* Preview Area */}
          <div className="flex-1 relative flex items-center justify-center bg-zinc-900 p-4">
            <div 
              ref={slideRef}
              className="relative aspect-[9/16] h-full max-h-[700px] rounded-[32px] overflow-hidden shadow-2xl bg-white"
              style={{
                fontFamily: flyer.config?.fontFamily || 'sans-serif'
              }}
            >
              {/* Background */}
              <div 
                className="absolute inset-0 z-0"
                style={{
                  background: flyer.config?.backgroundType === 'gradient' 
                    ? flyer.config.backgroundGradient 
                    : flyer.config?.backgroundColor || '#ffffff',
                  backgroundImage: flyer.config?.backgroundType === 'image' && flyer.config.backgroundUrl ? `url(${flyer.config.backgroundUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />

              {/* Progress Bars */}
              <div className="absolute top-6 left-6 right-6 z-30 flex gap-1.5">
                {slides.map((_, idx) => (
                  <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-100 ease-linear"
                      style={{ 
                        width: idx < currentSlide ? '100%' : idx === currentSlide ? `${progress}%` : '0%' 
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Logo */}
              <div className="absolute top-12 left-0 right-0 z-30 flex justify-center">
                {storeSettings?.logo_url && (
                  <img src={storeSettings.logo_url} alt="Logo" className="h-16 object-contain drop-shadow-md" />
                )}
              </div>

              {/* Content */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center">
                {currentSlideData.type === 'intro' && (
                  <div className="animate-in zoom-in fade-in duration-700">
                    <h2 
                      className="text-5xl font-black italic tracking-tighter uppercase mb-4 leading-none"
                      style={{ color: flyer.config?.priceColor || '#ef4444' }}
                    >
                      {currentSlideData.title}
                    </h2>
                    <p className="text-xl font-bold uppercase text-zinc-600 tracking-widest">
                      {currentSlideData.subtitle}
                    </p>
                  </div>
                )}

                {currentSlideData.type === 'product' && (
                  <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <div className="relative w-full aspect-square mb-8 p-4">
                      <img 
                        src={currentSlideData.product.image_url} 
                        alt={currentSlideData.product.name}
                        className="w-full h-full object-contain drop-shadow-2xl"
                      />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight mb-4 text-zinc-800 leading-tight">
                      {currentSlideData.product.name}
                    </h3>
                    <div 
                      className="inline-block px-8 py-4 rounded-3xl shadow-xl transform -rotate-2 scale-110"
                      style={{ background: flyer.config?.priceColor || '#ef4444' }}
                    >
                      <span className="text-white text-5xl font-black italic">
                        R$ {currentSlideData.product.price.toFixed(2).replace('.', ',')}
                      </span>
                      {currentSlideData.product.unit && (
                        <span className="text-white/80 text-lg font-bold ml-2">
                          {currentSlideData.product.unit}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {currentSlideData.type === 'outro' && (
                  <div className="animate-in zoom-in fade-in duration-700">
                    <h2 
                      className="text-5xl font-black italic tracking-tighter uppercase mb-4 leading-none"
                      style={{ color: flyer.config?.priceColor || '#ef4444' }}
                    >
                      {currentSlideData.title}
                    </h2>
                    <p className="text-xl font-bold uppercase text-zinc-600 tracking-widest mb-8">
                      {currentSlideData.subtitle}
                    </p>
                    <div className="bg-green-500 text-white px-8 py-4 rounded-full font-black text-xl shadow-lg flex items-center gap-3">
                      FAZER PEDIDO AGORA
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="absolute bottom-8 left-0 right-0 z-30 flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  {storeSettings?.site_name}
                </p>
              </div>
            </div>

            {/* Navigation Overlays (Transparent) */}
            <div className="absolute inset-0 z-20 flex">
              <div className="w-1/2 h-full cursor-pointer" onClick={handlePrev} />
              <div className="w-1/2 h-full cursor-pointer" onClick={handleNext} />
            </div>
          </div>

          {/* Controls Area */}
          <div className="w-full md:w-80 bg-zinc-950 p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-white font-black uppercase italic text-xl tracking-tighter flex items-center gap-2">
                Gerador de Stories
              </h3>
              <p className="text-zinc-500 text-xs font-bold uppercase">Aumente suas vendas</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                variant={isPlaying ? "destructive" : "default"}
                className="flex-1 h-12 rounded-xl font-black uppercase text-xs"
                onClick={handleTogglePlay}
              >
                {isPlaying ? <><Pause className="mr-2 h-4 w-4" /> Pausar</> : <><Play className="mr-2 h-4 w-4" /> Iniciar</>}
              </Button>
              <Button 
                variant="outline"
                className="w-12 h-12 rounded-xl border-zinc-800 text-white hover:bg-zinc-900"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-4">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Exportação</p>
              <Button 
                variant="secondary"
                className="w-full h-12 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2"
                onClick={exportAsImages}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Baixar Slide Atual
              </Button>
              <p className="text-zinc-600 text-[9px] font-medium leading-tight">
                * Use o botão acima para salvar o slide que está aparecendo como imagem para o Instagram.
              </p>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-zinc-500 text-[10px] font-black uppercase">Slide {currentSlide + 1} de {slides.length}</p>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={handlePrev} disabled={currentSlide === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={handleNext} disabled={currentSlide === slides.length - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Progress value={((currentSlide + 1) / slides.length) * 100} className="h-1 bg-zinc-800 shadow-inner overflow-hidden" />
            </div>

            <Button 
              variant="ghost" 
              className="text-zinc-500 hover:text-white hover:bg-zinc-900 h-10 font-bold uppercase text-[10px] shadow-none border-none"
              onClick={onClose}
            >
              <X className="mr-2 h-4 w-4" /> Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
