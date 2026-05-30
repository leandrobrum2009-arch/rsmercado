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

  const [isSaving, setIsSaving] = useState(false)
  const [activeSpeechDuration, setActiveSpeechDuration] = useState<number | null>(null)


  // Configuration state
  const [config, setConfig] = useState(() => {
    const savedConfig = localStorage.getItem('last_story_config')
    const defaults = {
      introDuration: 4.5,
      productDuration: 2.5,
      introPhrase: "Confira as ofertas de hoje no {store}",
      productPhrase: "{name}, por apenas {price}",
      outroPhrase: "Aproveite essas ofertas! Esperamos por você.",
      logoTop: 40,
      contentTop: 320,
      fontFamily: 'sans-serif',
      fontWeight: '1000',
      priceColor: '#ef4444',
      productNameColor: '#09090b',
      showLogo: true,
      productSpacing: 16,
      productImageSize: 90,
      backgroundMusic: null,
      voiceOffset: 0.3,
      selectedVoice: localStorage.getItem('last_story_voice') || ''
    }



    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        // Global config (from localStorage) takes precedence over flyer specific config
        // to satisfy "always save last config for next story"
        return { ...defaults, ...flyer.config, ...parsed }
      } catch (e) {
        return { ...defaults, ...flyer.config }
      }
    }
    return { ...defaults, ...flyer.config }
  })

  // Auto-save story config
  useEffect(() => {
    localStorage.setItem('last_story_config', JSON.stringify(config))
  }, [config])


  const slides: SlideType[] = [
    { type: 'intro', title: 'OFERTAS DE HOJE', subtitle: flyer.title },
    ...flyer.products_data.map(p => ({ type: 'product' as const, product: p })),
    { type: 'outro', title: 'CONFIRA NOSSAS OFERTAS!', subtitle: 'Esperamos por você' }
  ]

  const getCurrentSlideDuration = () => {
    const slide = slides[currentSlide]
    const baseDuration = (slide?.type === 'product' ? config.productDuration : config.introDuration) * 1000
    if (activeSpeechDuration) {
      return Math.max(baseDuration, (activeSpeechDuration * 1000) + 300)
    }
    return baseDuration
  }

  
  const slideDuration = getCurrentSlideDuration()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const slideRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const activeAudioRef = useRef<{ pause: () => void; currentTime: number } | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const isRecordingRef = useRef(false)



  // Load voices with polling
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      if (availableVoices.length === 0) return

      const ptVoices = availableVoices.filter(v => v.lang.startsWith('pt'))
      
      setVoices(ptVoices)
      if (ptVoices.length > 0 && !config.selectedVoice) {
        const naturalVoice = ptVoices.find(v => 
          v.lang === 'pt-BR' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
        )
        setConfig((prev: any) => ({ ...prev, selectedVoice: naturalVoice ? naturalVoice.name : ptVoices[0].name }))
      }

    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    
    const interval = setInterval(() => {
      if (voices.length === 0) loadVoices()
      else clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [config.selectedVoice, voices.length])

  useEffect(() => {
    if (config.selectedVoice) {
      localStorage.setItem('last_story_voice', config.selectedVoice)
    }
  }, [config.selectedVoice])


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

  const speakSlide = async (index: number, forceRecording: boolean = false) => {
    if (isMuted) return
    
    const recording = forceRecording || isRecording || isRecordingRef.current;
    console.log(`[StoryGenerator] Speaking slide ${index}, recording: ${recording}`);

    // Stop any current audio
    window.speechSynthesis.cancel()
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause()
      } catch (e) {
        console.warn('Error pausing active audio:', e)
      }
      activeAudioRef.current = null
    }

    // Reset duration for the new slide
    setActiveSpeechDuration(null)

    const slide = slides[index]
    if (!slide) return;
    
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

    // Apply voice offset (delay)
    if (config.voiceOffset > 0) {
      await new Promise(resolve => setTimeout(resolve, config.voiceOffset * 1000));
    }

    // If we are recording, we MUST use the Edge Function TTS to capture the audio in the stream
    if (recording && audioDestRef.current && audioContextRef.current) {
      console.log('[StoryGenerator] Using Edge Function TTS for recording');
      try {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Map selected voice to OpenAI voices
        let voiceId = 'alloy';
        const lowerVoice = (config.selectedVoice || '').toLowerCase();
        
        // Comprehensive mapping for PT-BR and common voices
        if (lowerVoice.includes('female') || lowerVoice.includes('feminina') || lowerVoice.includes('maria') || lowerVoice.includes('francisca') || lowerVoice.includes('google português do brasil')) {
          voiceId = 'nova';
        } else if (lowerVoice.includes('male') || lowerVoice.includes('masculina') || lowerVoice.includes('daniel') || lowerVoice.includes('antonio') || lowerVoice.includes('lucas')) {
          voiceId = 'onyx';
        } else if (lowerVoice.includes('google') || lowerVoice.includes('natural') || lowerVoice.includes('fable')) {
          voiceId = 'fable';
        } else if (lowerVoice.includes('shimmer') || lowerVoice.includes('soft')) {
          voiceId = 'shimmer';
        } else if (lowerVoice.includes('echo') || lowerVoice.includes('bold')) {
          voiceId = 'echo';
        }


        console.log(`[StoryGenerator] Calling TTS edge function with voice: ${voiceId} for text: ${text.substring(0, 30)}...`);
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { text, lang: 'pt-BR', voice: voiceId }
        });

        if (error) throw error;
        if (!data) throw new Error('No data received from TTS function');

        const arrayBuffer = await data.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        
        // Update slide duration based on actual audio length
        setActiveSpeechDuration(audioBuffer.duration);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        
        source.connect(audioDestRef.current);
        source.connect(audioContextRef.current.destination);
        
        source.start();
        console.log(`[StoryGenerator] TTS audio started, duration: ${audioBuffer.duration}s`);
        
        activeAudioRef.current = { 
          pause: () => {
            try { source.stop(); } catch(e) {}
          },
          currentTime: 0
        };

      } catch (e) {
        console.error('[StoryGenerator] TTS Recording Error:', e);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
      }
    } else {
      console.log('[StoryGenerator] Using browser TTS');
      const utterance = new SpeechSynthesisUtterance(text)
      if (config.selectedVoice) {
        const voice = voices.find(v => v.name === config.selectedVoice)
        if (voice) utterance.voice = voice
      }
      utterance.lang = 'pt-BR'
      const duration = slide.type === 'product' ? config.productDuration : config.introDuration
      utterance.rate = duration < 3 ? 1.2 : 1.0

      
      // For browser TTS, we can't get duration upfront, but we can try to estimate
      // or just rely on the fixed duration.
      window.speechSynthesis.speak(utterance)
    }
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
    
    console.log('[StoryGenerator] Starting video recording...');
    isRecordingRef.current = true
    setIsRecording(true)
    setCurrentSlide(0)
    setProgress(0)
    setIsPlaying(true)
    
    const canvas = document.createElement('canvas')
    canvas.width = 1080 
    canvas.height = 1920
    recordingCanvasRef.current = canvas
    
    // Create a high-quality stream
    const stream = canvas.captureStream(30)
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    console.log('[StoryGenerator] AudioContext state:', audioContext.state);
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    
    const dest = audioContext.createMediaStreamDestination()
    audioContextRef.current = audioContext
    audioDestRef.current = dest
    
    // Silent track to keep audio context alive and ensure the stream has an audio track from the start
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    gain.gain.value = 0.0001 // Almost silent but not zero to keep some encoders happy
    oscillator.connect(gain)
    gain.connect(dest)
    oscillator.start()
    
    let combinedStream = stream
    if (dest.stream.getAudioTracks().length > 0) {
      console.log('[StoryGenerator] Successfully created audio track');
      combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ])
    } else {
      console.warn('[StoryGenerator] Failed to create audio track in combined stream');
    }
    
    const extension = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2') ? 'mp4' : 'webm';
    const mimeType = extension === 'mp4' 
      ? 'video/mp4;codecs=avc1,mp4a.40.2'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
        
    console.log(`[StoryGenerator] Using mimeType: ${mimeType}, extension: ${extension}`);

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 10000000 
    })

    // Handle background music if selected
    let bgAudio: HTMLAudioElement | null = null
    if (config.backgroundMusic) {
      console.log('[StoryGenerator] Adding background music to recording');
      bgAudio = new Audio(config.backgroundMusic)
      bgAudio.crossOrigin = "anonymous"
      bgAudio.loop = true
      const source = audioContext.createMediaElementSource(bgAudio)
      source.connect(dest)
      source.connect(audioContext.destination)
      bgAudio.play().catch(e => console.error("[StoryGenerator] Error playing background music:", e))
    }
    
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    
    recorder.onstop = () => {
      console.log('[StoryGenerator] Recording stopped, generating file...');
      if (bgAudio) {
        bgAudio.pause()
        bgAudio.currentTime = 0
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause()
      }
      
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `story-${flyer.title.replace(/\s+/g, '-')}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // Clean up refs
      isRecordingRef.current = false
      setIsRecording(false)
      setIsPlaying(false)
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.error('[StoryGenerator] Error closing AudioContext:', e));
      }
      
      audioContextRef.current = null
      audioDestRef.current = null
      
      toast.success('Vídeo gerado com sucesso!')
    }

    
    recorderRef.current = recorder
    recorder.start()
    
    // Now that everything is set up, start the first slide's audio
    setTimeout(() => {
      speakSlide(0, true)
    }, 500); // Give 500ms for the recorder to warm up

    
    console.log('Recording started...')
    
    let isCapturing = false;
    const captureFrame = async () => {
      if (!recorderRef.current || recorderRef.current.state === 'inactive' || !slideRef.current || isCapturing) {
        return;
      }
      
      isCapturing = true;
      try {
        // Use the actual element dimensions for the canvas to avoid stretching
        const rect = slideRef.current.getBoundingClientRect();
        const frameCanvas = await htmlToImage.toCanvas(slideRef.current, {
          pixelRatio: 3, // Even higher resolution
          backgroundColor: flyer.config?.backgroundColor || '#ffffff',
          cacheBust: true,
          style: { 
            borderRadius: '0px',
            transform: 'none',
            margin: '0',
            padding: '0'
          },
          width: rect.width,
          height: rect.height
        });
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, 1080, 1920);
          
          // Draw image maintaining aspect ratio
          const scale = Math.min(1080 / frameCanvas.width, 1920 / frameCanvas.height);
          const x = (1080 - frameCanvas.width * scale) / 2;
          const y = (1920 - frameCanvas.height * scale) / 2;
          ctx.drawImage(frameCanvas, x, y, frameCanvas.width * scale, frameCanvas.height * scale);
        }
      } catch (e) {
        console.error('Frame capture error:', e);
      } finally {
        isCapturing = false;
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          // Optimized interval for smoother capture while allowing for high-res processing
          setTimeout(captureFrame, 33); // Target ~30fps if processing allows
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
                fontFamily: config.fontFamily
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

              {config.showLogo && (
                <div 
                  className="absolute left-0 right-0 z-30 flex justify-center px-8 transition-all duration-300"
                  style={{ top: `${config.logoTop}px` }}
                >
                  {storeSettings?.logo_url && (
                    <img src={storeSettings.logo_url} alt="Logo" className="h-20 max-w-full object-contain drop-shadow-lg" crossOrigin="anonymous" />
                  )}
                </div>
              )}

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
                  <div 
                    className="w-full flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-500"
                    style={{ gap: `${config.productSpacing}px` }}
                  >
                    <div className="relative w-full aspect-square p-1">
                      <img 
                        src={currentSlideData.product.image_url} 
                        alt={currentSlideData.product.name}
                        className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] mx-auto"
                        style={{ transform: `scale(${config.productImageSize / 100})` }}
                        crossOrigin="anonymous"
                      />
                    </div>
                    <h3 
                      className="text-xl uppercase tracking-tighter leading-[1.1] drop-shadow-sm px-4 max-w-sm"
                      style={{ 
                        fontFamily: config.fontFamily,
                        fontWeight: config.fontWeight,
                        color: config.productNameColor
                      }}
                    >
                      {currentSlideData.product.name}
                    </h3>
                    <div 
                      className="flex items-center justify-center px-8 py-4 rounded-[50px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] transform -rotate-2 scale-110 border-4 border-white/30 whitespace-nowrap min-w-[220px]"
                      style={{ 
                        background: `linear-gradient(135deg, ${config.priceColor}, ${config.priceColor}dd)`,
                        fontFamily: config.fontFamily
                      }}
                    >
                      <span className="text-white text-3xl italic tracking-tighter drop-shadow-md leading-none" style={{ fontWeight: config.fontWeight }}>
                        R$ {currentSlideData.product.price.toFixed(2).replace('.', ',')}
                      </span>
                      {currentSlideData.product.unit && (
                        <span className="text-white/90 text-xl ml-2 uppercase leading-none" style={{ fontWeight: config.fontWeight }}>
                          {currentSlideData.product.unit}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {currentSlideData.type === 'outro' && (
                  <div className="animate-in zoom-in fade-in duration-700">
                    <h2 
                      className="text-3xl italic tracking-tighter uppercase mb-8 leading-[0.85]"
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
                    <div 
                      className="bg-green-600 text-white px-6 py-3 rounded-full text-xl shadow-[0_10px_30px_rgba(22,163,74,0.5)] flex items-center gap-4 animate-bounce border-4 border-white/20" 
                      style={{ 
                        fontFamily: config.fontFamily,
                        fontWeight: config.fontWeight 
                      }}
                    >
                      VISITE NOSSA LOJA!
                    </div>
                  </div>
                )}
              </div>


              {/* Footer text removed as requested */}
            </div>

            <div className="absolute inset-0 z-20 flex">
              <div className="w-1/2 h-full cursor-pointer" onClick={handlePrev} />
              <div className="w-1/2 h-full cursor-pointer" onClick={handleNext} />
            </div>
          </div>

          <div className="w-full md:w-80 bg-zinc-950 flex flex-col overflow-hidden">
            <Tabs defaultValue="controls" className="flex-1 flex flex-col h-full">
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
                  <Select value={config.selectedVoice} onValueChange={(val) => setConfig({ ...config, selectedVoice: val })}>
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
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>GERANDO VÍDEO HD...</span>
                        </div>
                        <span className="text-[8px] opacity-70 font-normal">Isso pode levar um momento devido à alta qualidade</span>
                      </div>
                    ) : (
                      <><Video className="h-6 w-6" /> BAIXAR VÍDEO COMPLETO HD</>
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

              <TabsContent value="settings" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0 custom-scrollbar min-h-0 max-h-[calc(90vh-60px)]">
                <div>
                  <h3 className="text-white font-black uppercase italic text-xl tracking-tighter flex items-center gap-2">
                    Configurações
                  </h3>
                  <p className="text-zinc-500 text-xs font-bold uppercase">Personalize seu Story</p>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Sincronização: Atraso da Voz (segundos)</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          value={[config.voiceOffset || 0]} 
                          min={0} 
                          max={2} 
                          step={0.1}
                          onValueChange={(val) => setConfig({...config, voiceOffset: val[0]})}
                          className="flex-1"
                        />
                        <span className="text-white font-bold text-sm w-12 text-right">{(config.voiceOffset || 0).toFixed(1)}s</span>
                      </div>
                      <p className="text-[9px] text-zinc-500 italic">Aumente se a voz começar muito cedo.</p>
                    </div>
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

                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest cursor-pointer" htmlFor="show-logo">Exibir Logotipo</Label>
                    <input 
                      type="checkbox" 
                      id="show-logo"
                      checked={config.showLogo}
                      onChange={(e) => setConfig({...config, showLogo: e.target.checked})}
                      className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-purple-600 focus:ring-purple-500"
                    />
                  </div>

                  {config.showLogo && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Posição do Logo</Label>
                      <Slider 
                        value={[config.logoTop]} 
                        min={0} 
                        max={200} 
                        onValueChange={(val) => setConfig({...config, logoTop: val[0]})}
                      />
                    </div>
                  )}

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
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Tamanho da Imagem do Produto</Label>
                    <div className="flex items-center gap-4">
                      <Slider 
                        value={[config.productImageSize]} 
                        min={50} 
                        max={120} 
                        step={1}
                        onValueChange={(val) => setConfig({...config, productImageSize: val[0]})}
                        className="flex-1"
                      />
                      <span className="text-white font-bold text-xs w-8">{config.productImageSize}%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Espaçamento (Produto/Nome/Preço)</Label>
                    <div className="flex items-center gap-4">
                      <Slider 
                        value={[config.productSpacing]} 
                        min={0} 
                        max={100} 
                        step={1}
                        onValueChange={(val) => setConfig({...config, productSpacing: val[0]})}
                        className="flex-1"
                      />
                      <span className="text-white font-bold text-xs w-8">{config.productSpacing}px</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Cor do Preço</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="color" 
                          value={config.priceColor} 
                          onChange={(e) => setConfig({...config, priceColor: e.target.value})}
                          className="w-10 h-10 p-1 bg-zinc-900 border-zinc-800"
                        />
                        <Input 
                          type="text" 
                          value={config.priceColor} 
                          onChange={(e) => setConfig({...config, priceColor: e.target.value})}
                          className="flex-1 bg-zinc-900 border-zinc-800 text-white text-xs h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Cor do Nome</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="color" 
                          value={config.productNameColor} 
                          onChange={(e) => setConfig({...config, productNameColor: e.target.value})}
                          className="w-10 h-10 p-1 bg-zinc-900 border-zinc-800"
                        />
                        <Input 
                          type="text" 
                          value={config.productNameColor} 
                          onChange={(e) => setConfig({...config, productNameColor: e.target.value})}
                          className="flex-1 bg-zinc-900 border-zinc-800 text-white text-xs h-10"
                        />
                      </div>
                    </div>
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

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Música de Fundo (MP3 URL)</Label>
                      <Input 
                        placeholder="Cole aqui a URL de um MP3"
                        value={config.backgroundMusic || ''}
                        onChange={(e) => setConfig({...config, backgroundMusic: e.target.value})}
                        className="bg-zinc-900 border-zinc-800 text-white text-xs"
                      />
                      <p className="text-[9px] text-zinc-500 italic">Dica: Use links do Pixabay Audio ou similares para música ambiente.</p>
                    </div>

                    <div className="p-4 bg-amber-900/20 border border-amber-900/30 rounded-xl space-y-2">
                      <p className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-2">
                        <Volume2 className="h-3 w-3" /> Narração Ativada
                      </p>
                      <p className="text-[9px] text-amber-200/70 leading-relaxed">
                        A voz do narrador agora é incluída automaticamente no vídeo baixado usando inteligência artificial. Para melhores resultados, aguarde o vídeo processar completamente.
                      </p>
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
