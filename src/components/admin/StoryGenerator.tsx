import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, Pause, Volume2, VolumeX, Loader2, Camera, X, Video, Settings2, Sliders, Type, MessageSquare } from 'lucide-react'
import { toast } from '@/lib/toast'
import * as htmlToImage from 'html-to-image'
import { useStoreSettings } from '@/hooks/useStoreSettings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { supabase } from '@/lib/supabase'

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
    id?: string
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
  const [isRecording, setIsRecording] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Configuration state
  const [config, setConfig] = useState({
    introDuration: flyer.config?.introDuration || 4.5,
    productDuration: flyer.config?.productDuration || 2.5,
    introPhrase: flyer.config?.introPhrase || "Confira as ofertas de hoje no {store}",
    productPhrase: flyer.config?.productPhrase || "{name}, por apenas {price}",
    outroPhrase: flyer.config?.outroPhrase || "Aproveite essas ofertas! Faça seu pedido agora ou venha nos visitar.",
    logoTop: flyer.config?.logoTop || 40,
    contentTop: flyer.config?.contentTop || 320,
    fontFamily: flyer.config?.fontFamily || 'sans-serif',
    fontWeight: flyer.config?.fontWeight || '1000',
    priceColor: flyer.config?.priceColor || '#ef4444'
  })


  const slides: SlideType[] = [
    { type: 'intro', title: 'OFERTAS DE HOJE', subtitle: flyer.title },
    ...flyer.products_data.map(p => ({ type: 'product' as const, product: p })),
    { type: 'outro', title: 'FAÇA SEU PEDIDO!', subtitle: 'Ou visite nossa loja' }
  ]

  const getCurrentSlideDuration = () => {
    const slide = slides[currentSlide]
    if (slide?.type === 'product') return config.productDuration * 1000
    return config.introDuration * 1000
  }
  
  const slideDuration = getCurrentSlideDuration()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const slideRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)


  // Load voices with polling
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      if (availableVoices.length === 0) return

      const ptVoices = availableVoices.filter(v => v.lang.startsWith('pt'))
      
      setVoices(ptVoices)
      if (ptVoices.length > 0 && !selectedVoice) {
        const naturalVoice = ptVoices.find(v => 
          v.lang === 'pt-BR' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
        )
        setSelectedVoice(naturalVoice ? naturalVoice.name : ptVoices[0].name)
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    
    const interval = setInterval(() => {
      if (voices.length === 0) loadVoices()
      else clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [selectedVoice, voices.length])

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
            if (isRecording) stopRecording()
          }
        }
      }, 50)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, currentSlide, progress, slides.length, isRecording, slideDuration])


  const saveConfig = async () => {
    if (!flyer.id) {
      toast.error('Não é possível salvar: ID do flyer não encontrado')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('flyers')
        .update({ config: { ...flyer.config, ...config } })
        .eq('id', flyer.id)

      if (error) throw error
      toast.success('Configurações salvas com sucesso!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  const speakSlide = (index: number) => {
    if (isMuted) return
    
    window.speechSynthesis.cancel()
    const slide = slides[index]
    let text = ''

    const replacePlaceholders = (template: string, product?: Product) => {
      let result = template.replace('{store}', storeSettings?.site_name || 'nosso supermercado')
      if (product) {
        result = result.replace('{name}', product.name)
        result = result.replace('{price}', product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
      }
      return result
    }

    if (slide.type === 'intro') {
      text = replacePlaceholders(config.introPhrase)
    } else if (slide.type === 'product') {
      text = replacePlaceholders(config.productPhrase, slide.product)
    } else if (slide.type === 'outro') {
      text = replacePlaceholders(config.outroPhrase)
    }

    const utterance = new SpeechSynthesisUtterance(text)
    if (selectedVoice) {
      const voice = voices.find(v => v.name === selectedVoice)
      if (voice) utterance.voice = voice
    }
    utterance.lang = 'pt-BR'
    // Increase rate if duration is short to avoid cutting
    const duration = slide.type === 'product' ? config.productDuration : config.introDuration
    utterance.rate = duration < 3 ? 1.2 : 1.0
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

  const exportAsImage = async () => {
    setIsExporting(true)
    setIsPlaying(false)
    
    try {
      if (slideRef.current) {
        const dataUrl = await htmlToImage.toJpeg(slideRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: flyer.config?.backgroundColor || '#ffffff',
          cacheBust: true,
        })
        
        const link = document.createElement('a')
        link.download = `story-${flyer.title.replace(/\s+/g, '-')}-slide-${currentSlide + 1}.jpg`
        link.href = dataUrl
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

  const startVideoRecording = async () => {
    if (!slideRef.current) return
    
    setIsRecording(true)
    setCurrentSlide(0)
    setProgress(0)
    setIsPlaying(true)
    speakSlide(0)
    
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 1280
    recordingCanvasRef.current = canvas
    
    const stream = canvas.captureStream(30) // higher fps for smoother video
    
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm'
        
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000
    })
    
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `story-${flyer.title.replace(/\s+/g, '-')}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      setIsRecording(false)
      setIsPlaying(false)
      toast.success('Vídeo gerado com sucesso!')
    }
    
    recorderRef.current = recorder
    recorder.start()
    
    console.log('Recording started...')
    
    let isCapturing = false;
    const captureFrame = async () => {
      if (!recorderRef.current || recorderRef.current.state === 'inactive' || !slideRef.current || isCapturing) {
        return;
      }
      
      isCapturing = true;
      try {
        const dataUrl = await htmlToImage.toPng(slideRef.current, {
          pixelRatio: 1,
          backgroundColor: flyer.config?.backgroundColor || '#ffffff',
          cacheBust: true,
          style: { borderRadius: '0px' }
        });
        
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(() => reject(new Error('Image load timeout')), 2000);
        });
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 720, 1280);
          ctx.drawImage(img, 0, 0, 720, 1280);
        }
      } catch (e) {
        console.error('Frame capture error:', e);
      } finally {
        isCapturing = false;
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          setTimeout(captureFrame, 100); // Wait 100ms before next frame
        }
      }

    };

    captureFrame();
  }


  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }

  const currentSlideData = slides[currentSlide]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
        <div className="flex h-[90vh] flex-col md:flex-row">
          <div className="flex-1 relative flex items-center justify-center bg-zinc-900 p-4">
            <div 
              ref={slideRef}
              className="relative aspect-[9/16] h-full max-h-[700px] rounded-[32px] overflow-hidden shadow-2xl bg-white"
              style={{
                fontFamily: flyer.config?.fontFamily || 'sans-serif'
              }}
            >
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

              <div 
                className="absolute left-0 right-0 z-30 flex justify-center px-8 transition-all duration-300"
                style={{ top: `${config.logoTop}px` }}
              >
                {storeSettings?.logo_url && (
                  <img src={storeSettings.logo_url} alt="Logo" className="h-20 max-w-full object-contain drop-shadow-lg" />
                )}
              </div>

              <div 
                className="absolute inset-0 z-10 flex flex-col items-center justify-start p-8 text-center transition-all duration-300"
                style={{ paddingTop: `${config.contentTop}px` }}
              >
                {currentSlideData.type === 'intro' && (
                  <div className="animate-in zoom-in fade-in duration-700">
                    <h2 
                      className="text-3xl italic tracking-tighter uppercase mb-6 leading-[0.85] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
                      style={{ 
                        color: config.priceColor,
                        fontFamily: config.fontFamily,
                        fontWeight: config.fontWeight
                      }}
                    >
                      {currentSlideData.title}
                    </h2>
                    <p 
                      className="text-lg uppercase text-zinc-900 tracking-[0.2em] bg-white/60 backdrop-blur-md px-6 py-2 rounded-xl inline-block border-2 border-zinc-900/10"
                      style={{ 
                        fontFamily: config.fontFamily,
                        fontWeight: config.fontWeight
                      }}
                    >
                      {currentSlideData.subtitle}
                    </p>
                  </div>
                )}

                {currentSlideData.type === 'product' && (
                  <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <div className="relative w-full aspect-square mb-4 p-4">
                      <img 
                        src={currentSlideData.product.image_url} 
                        alt={currentSlideData.product.name}
                        className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] scale-90"
                      />
                    </div>
                    <h3 
                      className="text-xl uppercase tracking-tighter mb-6 text-zinc-950 leading-[1.1] drop-shadow-sm px-4 max-w-sm"
                      style={{ 
                        fontFamily: config.fontFamily,
                        fontWeight: config.fontWeight
                      }}
                    >
                      {currentSlideData.product.name}
                    </h3>
                    <div 
                      className="inline-block px-8 py-4 rounded-[50px] shadow-2xl transform -rotate-2 scale-110 border-4 border-white/20"
                      style={{ 
                        background: config.priceColor,
                        fontFamily: config.fontFamily
                      }}
                    >
                      <span className="text-white text-4xl italic tracking-tighter drop-shadow-md" style={{ fontWeight: config.fontWeight }}>
                        R$ {currentSlideData.product.price.toFixed(2).replace('.', ',')}
                      </span>
                      {currentSlideData.product.unit && (
                        <span className="text-white/90 text-2xl ml-3 uppercase" style={{ fontWeight: config.fontWeight }}>
                          {currentSlideData.product.unit}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {currentSlideData.type === 'outro' && (
                  <div className="animate-in zoom-in fade-in duration-700">
                    <h2 
                      className="text-4xl italic tracking-tighter uppercase mb-8 leading-[0.85]"
                      style={{ 
                        color: config.priceColor,
                        fontFamily: config.fontFamily,
                        fontWeight: config.fontWeight
                      }}
                    >
                      {currentSlideData.title}
                    </h2>
                    <p 
                      className="text-xl uppercase text-zinc-900 tracking-[0.1em] mb-12 bg-white/50 backdrop-blur-md px-6 py-2 rounded-xl border-2 border-zinc-900/10"
                      style={{ 
                        fontFamily: config.fontFamily,
                        fontWeight: config.fontWeight
                      }}
                    >
                      {currentSlideData.subtitle}
                    </p>
                    <div className="bg-green-600 text-white px-6 py-3 rounded-full text-xl shadow-[0_10px_30px_rgba(22,163,74,0.5)] flex items-center gap-4 animate-bounce border-4 border-white/20" style={{ fontWeight: config.fontWeight }}>
                      FAZER PEDIDO AGORA
                    </div>
                  </div>
                )}
              </div>


              <div className="absolute bottom-12 left-0 right-0 z-30 flex flex-col items-center">
                <p className="text-xs font-black uppercase tracking-[0.4em] text-zinc-800 bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full">
                  {storeSettings?.site_name}
                </p>
              </div>
            </div>

            <div className="absolute inset-0 z-20 flex">
              <div className="w-1/2 h-full cursor-pointer" onClick={handlePrev} />
              <div className="w-1/2 h-full cursor-pointer" onClick={handleNext} />
            </div>
          </div>

          <div className="w-full md:w-80 bg-zinc-950 flex flex-col overflow-hidden">
            <Tabs defaultValue="controls" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 bg-zinc-900 rounded-none h-14">
                <TabsTrigger value="controls" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white gap-2 font-bold uppercase text-[10px] tracking-widest">
                  <Play className="h-3 w-3" /> Controles
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white gap-2 font-bold uppercase text-[10px] tracking-widest">
                  <Settings2 className="h-3 w-3" /> Ajustes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="controls" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
                <div>
                  <h3 className="text-white font-black uppercase italic text-xl tracking-tighter flex items-center gap-2">
                    Story Player
                  </h3>
                  <p className="text-zinc-500 text-xs font-bold uppercase">Visualizar e Exportar</p>
                </div>

                <div className="space-y-4">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Settings2 className="h-3 w-3" /> Narrador (Escolha abaixo)
                  </p>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white h-12 rounded-xl border-2 focus:ring-purple-500">
                      <SelectValue placeholder="Selecione o narrador" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {voices.map(voice => (
                        <SelectItem key={voice.name} value={voice.name} className="focus:bg-purple-900/50 focus:text-white">
                          <div className="flex flex-col">
                            <span className="font-bold">{voice.name}</span>
                            <span className="text-[10px] opacity-50">{voice.lang}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Reprodução</p>
                  <div className="flex gap-2">
                    <Button 
                      variant={isPlaying ? "destructive" : "default"}
                      className="flex-1 h-14 rounded-xl font-black uppercase text-sm shadow-lg shadow-purple-500/20"
                      onClick={handleTogglePlay}
                      disabled={isRecording}
                    >
                      {isPlaying ? <><Pause className="mr-2 h-5 w-5" /> Pausar</> : <><Play className="mr-2 h-5 w-5" /> Reproduzir</>}
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-14 h-14 rounded-xl border-2 border-zinc-800 text-white hover:bg-zinc-900 hover:border-zinc-700"
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-900 bg-zinc-900/50 p-4 rounded-2xl border-2 border-purple-500/20 shadow-2xl">
                  <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Video className="h-3 w-3" /> Exportar MP4
                  </p>
                  
                  <Button 
                    variant="default"
                    className="w-full h-14 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-xl shadow-purple-900/20 border-0"
                    onClick={isRecording ? stopRecording : startVideoRecording}
                    disabled={isExporting}
                  >
                    {isRecording ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> GERANDO VÍDEO...</>
                    ) : (
                      <><Video className="h-6 w-6" /> BAIXAR VÍDEO COMPLETO</>
                    )}
                  </Button>
                  
                  <Button 
                    variant="secondary"
                    className="w-full h-10 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 border-2 border-zinc-800"
                    onClick={exportAsImage}
                    disabled={isExporting || isRecording}
                  >
                    <Camera className="h-4 w-4" /> Baixar Slide Atual (JPG)
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0 custom-scrollbar">
                <div>
                  <h3 className="text-white font-black uppercase italic text-xl tracking-tighter flex items-center gap-2">
                    Configurações
                  </h3>
                  <p className="text-zinc-500 text-xs font-bold uppercase">Personalize seu Story</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Tempo Slide Inicial/Final (segundos)</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          value={[config.introDuration]} 
                          min={2} 
                          max={15} 
                          step={0.5}
                          onValueChange={(val) => setConfig({...config, introDuration: val[0]})}
                          className="flex-1"
                        />
                        <span className="text-white font-bold text-sm w-12 text-right">{config.introDuration}s</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Tempo Slide Produtos (segundos)</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          value={[config.productDuration]} 
                          min={1} 
                          max={10} 
                          step={0.5}
                          onValueChange={(val) => setConfig({...config, productDuration: val[0]})}
                          className="flex-1"
                        />
                        <span className="text-white font-bold text-sm w-12 text-right">{config.productDuration}s</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Posição do Logo</Label>
                    <Slider 
                      value={[config.logoTop]} 
                      min={0} 
                      max={200} 
                      onValueChange={(val) => setConfig({...config, logoTop: val[0]})}
                    />
                  </div>

                   <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Posição do Conteúdo</Label>
                    <Slider 
                      value={[config.contentTop]} 
                      min={100} 
                      max={600} 
                      onValueChange={(val) => setConfig({...config, contentTop: val[0]})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Fonte</Label>
                    <Select value={config.fontFamily} onValueChange={(val) => setConfig({...config, fontFamily: val})}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="sans-serif">Padrão</SelectItem>
                        <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                        <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                        <SelectItem value="'Roboto Condensed', sans-serif">Roboto Condensed</SelectItem>
                        <SelectItem value="'Oswald', sans-serif">Oswald</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Peso da Fonte</Label>
                    <Select value={config.fontWeight} onValueChange={(val) => setConfig({...config, fontWeight: val})}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="400">Normal</SelectItem>
                        <SelectItem value="600">Semibold</SelectItem>
                        <SelectItem value="700">Bold</SelectItem>
                        <SelectItem value="800">Extra Bold</SelectItem>
                        <SelectItem value="900">Black</SelectItem>
                        <SelectItem value="1000">Ultra Black</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-zinc-900">
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" /> Frases da Narração
                    </p>
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase text-zinc-400">Introdução ({'{store}'})</Label>
                      <Textarea 
                        value={config.introPhrase} 
                        onChange={(e) => setConfig({...config, introPhrase: e.target.value})}
                        className="bg-zinc-900 border-zinc-800 text-white text-xs h-16"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase text-zinc-400">Produto ({'{name}'}, {'{price}'})</Label>
                      <Textarea 
                        value={config.productPhrase} 
                        onChange={(e) => setConfig({...config, productPhrase: e.target.value})}
                        className="bg-zinc-900 border-zinc-800 text-white text-xs h-16"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase text-zinc-400">Encerramento</Label>
                      <Textarea 
                        value={config.outroPhrase} 
                        onChange={(e) => setConfig({...config, outroPhrase: e.target.value})}
                        className="bg-zinc-900 border-zinc-800 text-white text-xs h-16"
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full h-12 rounded-xl font-black uppercase text-xs bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20"
                    onClick={saveConfig}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Configurações'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
