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
import { supabase as oldSupabase } from '@/lib/supabase'
import { supabase } from '@/integrations/supabase/client'

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
  const [exportProgress, setExportProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [slideDurations, setSlideDurations] = useState<Record<number, number>>({})
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)

  // Refs for recording
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const slideRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const activeAudioRef = useRef<{ pause: () => void; currentTime: number } | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const isRecordingRef = useRef(false)
  const startTimeRef = useRef<number>(0)
  const startProgressRef = useRef<number>(0)

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
    if (slideDurations[currentSlide]) {
      // Audio duration + small buffer
      return Math.max(baseDuration, (slideDurations[currentSlide] * 1000) + 300)
    }
    return baseDuration
  }
  
  const slideDuration = getCurrentSlideDuration()

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

  // Timer logic for slides
  useEffect(() => {
    if (isPlaying && !isAudioLoading) {
      startTimeRef.current = Date.now()
      startProgressRef.current = progress

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        const newProgress = Math.min(startProgressRef.current + (elapsed / slideDuration) * 100, 100)
        
        setProgress(newProgress)

        if (isRecordingRef.current) {
          const totalProgress = ((currentSlide + (newProgress / 100)) / slides.length) * 100
          setExportProgress(totalProgress)
        }

        if (newProgress >= 100) {
          if (currentSlide < slides.length - 1) {
            const nextSlide = currentSlide + 1
            setCurrentSlide(nextSlide)
            setProgress(0)
            speakSlide(nextSlide)
          } else {
            setIsPlaying(false)
            setProgress(100)
            if (isRecordingRef.current) {
              setExportProgress(100)
              setTimeout(() => stopRecording(), 1000)
            }
          }
        }
      }, 50)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, currentSlide, slides.length, isAudioLoading, slideDuration])

  const saveConfig = async () => {
    if (!flyer.id) {
      console.warn('[StoryGenerator] Missing flyer ID, saving to localStorage only');
      localStorage.setItem('last_story_config', JSON.stringify(config));
      toast.info('Configurações salvas no navegador! Para salvar permanentemente, salve o encarte principal primeiro.');
      return;
    }

    setIsSaving(true)
    try {
      console.log('[StoryGenerator] Attempting to save config to database for flyer:', flyer.id);
      // Sanitize config
      const sanitizedConfig = JSON.parse(JSON.stringify({ ...flyer.config, ...config }));
      
      const { data, error } = await oldSupabase
        .from('flyers')
        .update({ config: sanitizedConfig })
        .eq('id', flyer.id)
        .select();
      
      if (error) {
        console.error('[StoryGenerator] Database update error:', error);
        throw error;
      }
      
      console.log('[StoryGenerator] Save successful:', data);
      toast.success('Configurações salvas com sucesso no banco de dados!');
    } catch (err: any) {
      console.error('[StoryGenerator] Save error details:', err)
      toast.error(`Erro ao salvar no banco: ${err.message || 'Verifique sua conexão ou se o encarte ainda existe.'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const generateAllAudio = async () => {
    setIsGeneratingAudio(true)
    const newAudioUrls: Record<number, string> = {}
    const newDurations: Record<number, number> = {}

    console.log('[StoryGenerator] Starting audio generation for', slides.length, 'slides');

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        let text = ''
        const replacePlaceholders = (template: string, product?: Product) => {
          let result = (template || '').replace(/{store}/g, storeSettings?.site_name || 'nosso supermercado')
          if (product) {
            result = result.replace(/{name}/g, product.name || '')
            result = result.replace(/{price}/g, (product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
          }
          return result
        }

        if (slide.type === 'intro') text = replacePlaceholders(config.introPhrase)
        else if (slide.type === 'product') text = replacePlaceholders(config.productPhrase, slide.product)
        else if (slide.type === 'outro') text = replacePlaceholders(config.outroPhrase)

        let voiceId = 'alloy'
        const lowerVoice = (config.selectedVoice || '').toLowerCase()
        if (lowerVoice.includes('female') || lowerVoice.includes('feminina')) voiceId = 'nova'
        else if (lowerVoice.includes('male') || lowerVoice.includes('masculina')) voiceId = 'onyx'

        console.log(`[StoryGenerator] Generating audio for slide ${i}: "${text.substring(0, 30)}..." with voice ${voiceId}`)

        try {
          const { data, error } = await supabase.functions.invoke('text-to-speech', {
            body: { text, lang: 'pt-BR', voice: voiceId }
          })

          if (error) {
            console.error(`[StoryGenerator] Audio generation error for slide ${i}:`, error)
            continue
          }

          if (data) {
            let blob: Blob;
            if (data instanceof Blob) {
              blob = data;
            } else if (data instanceof ArrayBuffer) {
              blob = new Blob([data], { type: 'audio/mpeg' });
            } else {
              // Handle case where it might be returned as an object { error: ... }
              const potentialData = data as any;
              if (potentialData.error) {
                console.error(`[StoryGenerator] Error in data for slide ${i}:`, potentialData.error);
                continue;
              }
              console.warn(`[StoryGenerator] Unexpected data type for slide ${i}:`, typeof data);
              continue;
            }

            const url = URL.createObjectURL(blob)
            newAudioUrls[i] = url
            
            const arrayBuffer = await blob.arrayBuffer()
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
            newDurations[i] = audioBuffer.duration
            console.log(`[StoryGenerator] Audio generated for slide ${i}, duration: ${audioBuffer.duration}s`);
          }
        } catch (e: any) {
          console.error(`[StoryGenerator] Exception generating audio for slide ${i}:`, e);
          continue;
        }
      }
      
      setAudioUrls(newAudioUrls)
      setSlideDurations(newDurations)
      
      const count = Object.keys(newAudioUrls).length;
      if (count === 0) {
        toast.error('Nenhum áudio foi gerado. Verifique as configurações e sua conexão.');
      } else if (count < slides.length) {
        toast.warning(`${count} de ${slides.length} áudios gerados. Alguns slides ficarão sem narração.`);
      } else {
        toast.success(`Todas as ${count} locuções estão prontas!`);
      }

      // Close temporary context
      audioContext.close().catch(() => {});
    } catch (err: any) {
      console.error('[StoryGenerator] Error in generateAllAudio:', err)
      toast.error(`Erro ao gerar áudios: ${err.message || 'Tente novamente'}`)
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const speakSlide = async (index: number, forceRecording: boolean = false) => {
    if (isMuted) return
    
    const recording = forceRecording || isRecording || isRecordingRef.current;
    
    // Stop current audio
    window.speechSynthesis.cancel()
    if (activeAudioRef.current) {
      try { (activeAudioRef.current as any).pause() } catch (e) {}
      activeAudioRef.current = null
    }

    const slide = slides[index]
    if (!slide) return;

    let text = ''
    const replacePlaceholders = (template: string, product?: Product) => {
      let result = (template || '').replace(/{store}/g, storeSettings?.site_name || 'nosso supermercado')
      if (product) {
        result = result.replace(/{name}/g, product.name || '')
        result = result.replace(/{price}/g, (product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
      }
      return result
    }

    if (slide.type === 'intro') text = replacePlaceholders(config.introPhrase)
    else if (slide.type === 'product') text = replacePlaceholders(config.productPhrase, slide.product)
    else if (slide.type === 'outro') text = replacePlaceholders(config.outroPhrase)

    // Use cached audio if available
    if (audioUrls[index]) {
      try {
        const audio = new Audio(audioUrls[index])
        audio.crossOrigin = "anonymous"
        
        if (recording && audioDestRef.current && audioContextRef.current) {
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          
          console.log(`[StoryGenerator] Connecting slide ${index} audio to recording stream`);
          try {
            // Re-use or create source
            const source = audioContextRef.current.createMediaElementSource(audio)
            source.connect(audioDestRef.current)
            source.connect(audioContextRef.current.destination)
          } catch (err) {
            // This error often happens if the element is already connected to another source node
            console.warn('[StoryGenerator] MediaElementSource connection info:', err);
          }
        }
        
        audio.play().catch(e => console.error('[StoryGenerator] Audio play error:', e))
        console.log(`[StoryGenerator] Playing cached audio for slide ${index}`);
        activeAudioRef.current = audio
        return
      } catch (e) {
        console.error('[StoryGenerator] Audio play error:', e);
        // Fallback to synthesis if play fails and NOT recording
        if (!recording) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'pt-BR';
          window.speechSynthesis.speak(utterance);
        }
      }
      return
    }

    if (recording && audioDestRef.current && audioContextRef.current) {
      setIsAudioLoading(true)
      try {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        let voiceId = 'alloy';
        const lowerVoice = (config.selectedVoice || '').toLowerCase();
        
        if (lowerVoice.includes('female') || lowerVoice.includes('feminina') || lowerVoice.includes('maria') || lowerVoice.includes('francisca') || lowerVoice.includes('vitoria')) voiceId = 'nova';
        else if (lowerVoice.includes('male') || lowerVoice.includes('masculina') || lowerVoice.includes('daniel') || lowerVoice.includes('antonio')) voiceId = 'onyx';
        else if (lowerVoice.includes('fable') || lowerVoice.includes('soft')) voiceId = 'fable';
        else if (lowerVoice.includes('shimmer')) voiceId = 'shimmer';
        else if (lowerVoice.includes('echo')) voiceId = 'echo';

        console.log(`[StoryGenerator] Direct TTS for recording slide ${index}: "${text.substring(0, 30)}..."`)
        
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { text, lang: 'pt-BR', voice: voiceId }
        });

        if (error) throw error;
        if (!data) throw new Error('No audio data');

        const blob = data instanceof Blob ? data : new Blob([data], { type: 'audio/mpeg' });
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        
        setSlideDurations(prev => ({ ...prev, [index]: audioBuffer.duration }));
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioDestRef.current);
        source.connect(audioContextRef.current.destination);
        source.start();
        
        activeAudioRef.current = { 
          pause: () => { try { source.stop(); } catch(e) {} },
          currentTime: 0
        } as any;
      } catch (e) {
        console.error('[StoryGenerator] TTS Error during recording:', e);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
      } finally {
        setIsAudioLoading(false)
      }
    } else {
      setIsAudioLoading(false)
      const utterance = new SpeechSynthesisUtterance(text)
      if (config.selectedVoice) {
        const voice = voices.find(v => v.name === config.selectedVoice)
        if (voice) utterance.voice = voice
      }
      utterance.lang = 'pt-BR'
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
        toast.success('Slide baixado!')
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao exportar imagem')
    } finally {
      setIsExporting(false)
    }
  }

  const startVideoRecording = async () => {
    if (!slideRef.current) return
    
    if (Object.keys(audioUrls).length < slides.length) {
      toast.error('Gere os áudios (Passo 2) antes de baixar o vídeo para garantir a narração.')
      // We still allow it but warn, though better would be to return.
      // return 
    }
    
    isRecordingRef.current = true
    setIsRecording(true)
    setExportProgress(0)
    setCurrentSlide(0)
    setProgress(0)
    setIsPlaying(true)
    
    // Create recording canvas
    const canvas = document.createElement('canvas')
    canvas.width = 1080 
    canvas.height = 1920
    recordingCanvasRef.current = canvas
    
    console.log('[StoryGenerator] Started video recording at 1080x1920');

    // Video stream from canvas
    const videoStream = canvas.captureStream(30)
    
    // Web Audio setup for recording
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContextRef.current = audioContext
    
    const dest = audioContext.createMediaStreamDestination()
    audioDestRef.current = dest
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    
    // Constant low-level signal to keep the audio track active in some browsers
    const osc = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    gainNode.gain.value = 0.00001
    osc.connect(gainNode)
    gainNode.connect(dest)
    osc.start()
    
    // Combine video and audio tracks
    const combinedStream = new MediaStream()
    
    // Video tracks
    videoStream.getVideoTracks().forEach(track => {
      console.log('[StoryGenerator] Adding video track:', track.id);
      combinedStream.addTrack(track);
    });
    
    // Audio tracks from destination
    const audioTracks = dest.stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error('CRITICAL: No audio tracks found in the destination stream!');
      // Create a silent audio track as fallback to ensure the file has audio track
      const silence = audioContext.createGain();
      silence.gain.value = 0;
      silence.connect(dest);
    }
    
    audioTracks.forEach(track => {
      console.log('[StoryGenerator] Adding audio track:', track.id);
      combinedStream.addTrack(track);
    });
    
    const isMp4Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2');
    const mimeType = isMp4Supported
      ? 'video/mp4;codecs=avc1,mp4a.40.2'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
        
    console.log('[StoryGenerator] Using MIME type:', mimeType);

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 12000000 
    })

    // Handle background music
    let bgAudio: HTMLAudioElement | null = null
    if (config.backgroundMusic) {
      bgAudio = new Audio(config.backgroundMusic)
      bgAudio.crossOrigin = "anonymous"
      bgAudio.loop = true
      
      // Connect to the recording context
      const source = audioContext.createMediaElementSource(bgAudio)
      source.connect(dest)
      source.connect(audioContext.destination)
      
      bgAudio.play().catch(e => console.error("BG music error:", e))
    }
    
    chunksRef.current = []
    recorder.ondataavailable = (e) => { 
      if (e.data.size > 0) {
        chunksRef.current.push(e.data) 
        console.log(`[StoryGenerator] Received chunk of size: ${e.data.size}`);
      }
    }
    
    recorder.onstop = async () => {
      console.log('[StoryGenerator] Recording stopped, processing chunks...');
      if (bgAudio) { bgAudio.pause(); bgAudio.currentTime = 0; }
      if (activeAudioRef.current) {
        try { (activeAudioRef.current as any).pause(); } catch(e) {}
      }
      
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const link = document.createElement('a');
      link.href = url;
      link.download = `story-${flyer.title.replace(/\s+/g, '-')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      isRecordingRef.current = false
      setIsRecording(false)
      setIsPlaying(false)
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null
      audioDestRef.current = null
      toast.success('Vídeo baixado com sucesso!')
    }
    
    recorderRef.current = recorder
    recorder.start()
    
    // Start first audio after a small delay
    setTimeout(() => { speakSlide(0, true) }, 500);

    let isCapturing = false;
    const captureFrame = async () => {
      if (!recorderRef.current || recorderRef.current.state === 'inactive' || !slideRef.current || isCapturing) return;
      isCapturing = true;
      try {
        const element = slideRef.current;
        
        // Temporarily prepare element for high-quality capture
        const originalStyle = element.getAttribute('style') || '';
        const originalClassName = element.className;
        
        element.style.borderRadius = '0';
        element.style.boxShadow = 'none';
        element.style.transform = 'none';
        
        // Target 1080x1920 for Instagram Stories
        const dataUrl = await htmlToImage.toJpeg(element, {
          width: 1080,
          height: 1920,
          style: {
            transform: 'none',
            borderRadius: '0',
            width: '1080px',
            height: '1920px',
          },
          backgroundColor: config.backgroundColor || '#ffffff',
          cacheBust: true,
          quality: 0.95
        });

        // Restore styles immediately
        element.className = originalClassName;
        element.setAttribute('style', originalStyle);

        const img = new Image();
        img.src = dataUrl;
        await new Promise((res) => { 
          img.onload = res; 
          img.onerror = res; 
        });
        
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx && img.complete && img.naturalWidth > 0) {
          ctx.fillStyle = config.backgroundColor || '#ffffff';
          ctx.fillRect(0, 0, 1080, 1920);
          ctx.drawImage(img, 0, 0, 1080, 1920);
        }
      } catch (e) {
        console.error('[StoryGenerator] Frame capture error:', e);
      } finally {
        isCapturing = false;
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          // Keep capturing at approx 24-30fps
          setTimeout(captureFrame, 33); 
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
          <div className="flex h-[90vh] flex-col md:flex-row">
            <div className="flex-1 relative flex items-center justify-center bg-zinc-900 p-4">
              <div 
                ref={slideRef}
                className="relative aspect-[9/16] h-full max-h-[85vh] rounded-[32px] overflow-hidden shadow-2xl bg-white"
                style={{ fontFamily: config.fontFamily }}
              >
                {flyer.config?.backgroundType === 'image' && flyer.config.backgroundUrl ? (
                  <img 
                    src={flyer.config.backgroundUrl} 
                    className="absolute inset-0 z-0 w-full h-full object-cover" 
                    crossOrigin="anonymous"
                    alt="background"
                  />
                ) : (
                  <div 
                    className="absolute inset-0 z-0"
                    style={{
                      background: flyer.config?.backgroundType === 'gradient' 
                        ? flyer.config.backgroundGradient 
                        : flyer.config?.backgroundColor || '#ffffff',
                    }}
                  />
                )}

                <div className="absolute top-6 left-6 right-6 z-30 flex gap-1.5">
                  {slides.map((_, idx) => (
                    <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-100 ease-linear"
                        style={{ width: idx < currentSlide ? '100%' : idx === currentSlide ? `${progress}%` : '0%' }}
                      />
                    </div>
                  ))}
                </div>

                {config.showLogo && (
                  <div className="absolute left-0 right-0 z-30 flex justify-center px-8" style={{ top: `${config.logoTop}px` }}>
                    {storeSettings?.logo_url && (
                      <img src={storeSettings.logo_url} alt="Logo" className="h-20 max-w-full object-contain drop-shadow-lg" crossOrigin="anonymous" />
                    )}
                  </div>
                )}

                <div 
                  className="absolute inset-0 z-10 flex flex-col items-center justify-start p-8 text-center"
                  style={{ paddingTop: `${config.contentTop}px` }}
                >
                  {currentSlideData.type === 'intro' && (
                    <div className="animate-in zoom-in fade-in duration-700">
                      <h2 className="text-3xl italic tracking-tighter uppercase mb-6 leading-[0.85] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]" style={{ color: config.priceColor, fontWeight: config.fontWeight }}>
                        {currentSlideData.title}
                      </h2>
                      <p className="text-lg uppercase text-zinc-900 tracking-[0.2em] bg-white/60 backdrop-blur-md px-6 py-2 rounded-xl inline-block border-2 border-zinc-900/10" style={{ fontWeight: config.fontWeight }}>
                        {currentSlideData.subtitle}
                      </p>
                    </div>
                  )}

                  {currentSlideData.type === 'product' && (
                    <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-500" style={{ gap: `${config.productSpacing}px` }}>
                      <div className="relative w-full aspect-square p-1">
                        <img 
                          src={currentSlideData.product.image_url} 
                          className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] mx-auto"
                          style={{ transform: `scale(${config.productImageSize / 100})` }}
                          crossOrigin="anonymous"
                        />
                      </div>
                      <h3 className="text-xl uppercase tracking-tighter leading-[1.1] drop-shadow-sm px-4 max-w-sm" style={{ fontWeight: config.fontWeight, color: config.productNameColor }}>
                        {currentSlideData.product.name}
                      </h3>
                      <div className="flex items-center justify-center px-8 py-4 rounded-[50px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] transform -rotate-2 scale-110 border-4 border-white/30 whitespace-nowrap min-w-[220px]" style={{ background: `linear-gradient(135deg, ${config.priceColor}, ${config.priceColor}dd)` }}>
                        <span className="text-white text-3xl italic tracking-tighter drop-shadow-md leading-none" style={{ fontWeight: config.fontWeight }}>
                          R$ {currentSlideData.product.price.toFixed(2).replace('.', ',')}
                        </span>
                        {currentSlideData.product.unit && (
                          <span className="text-white/90 text-xl ml-2 uppercase leading-none" style={{ fontWeight: config.fontWeight }}>{currentSlideData.product.unit}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {currentSlideData.type === 'outro' && (
                    <div className="animate-in zoom-in fade-in duration-700">
                      <h2 className="text-3xl italic tracking-tighter uppercase mb-8 leading-[0.85]" style={{ color: config.priceColor, fontWeight: config.fontWeight }}>
                        {currentSlideData.title}
                      </h2>
                      <p className="text-xl uppercase text-zinc-900 tracking-[0.1em] mb-12 bg-white/50 backdrop-blur-md px-6 py-2 rounded-xl border-2 border-zinc-900/10" style={{ fontWeight: config.fontWeight }}>
                        {currentSlideData.subtitle}
                      </p>
                      <div className="bg-green-600 text-white px-6 py-3 rounded-full text-xl shadow-[0_10px_30px_rgba(22,163,74,0.5)] flex items-center gap-4 animate-bounce border-4 border-white/20" style={{ fontWeight: config.fontWeight }}>
                        VISITE NOSSA LOJA!
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute inset-0 z-20 flex">
                <div className="w-1/2 h-full cursor-pointer" onClick={handlePrev} />
                <div className="w-1/2 h-full cursor-pointer" onClick={handleNext} />
              </div>
            </div>

            <div className="w-full md:w-80 bg-zinc-950 flex flex-col overflow-hidden">
              <Tabs defaultValue="controls" className="flex-1 flex flex-col h-full">
                <TabsList className="grid grid-cols-2 bg-zinc-900 rounded-none h-14">
                  <TabsTrigger value="controls" className="font-bold uppercase text-[10px] tracking-widest gap-2">
                    <Play className="h-3 w-3" /> Controles
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="font-bold uppercase text-[10px] tracking-widest gap-2">
                    <Settings2 className="h-3 w-3" /> Ajustes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="controls" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
                  <div className="space-y-4">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Settings2 className="h-3 w-3" /> Narrador</p>
                    <Select value={config.selectedVoice} onValueChange={(val) => setConfig({ ...config, selectedVoice: val })}>
                      <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white h-12 rounded-xl border-2">
                        <SelectValue placeholder="Selecione o narrador" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        {voices.map(voice => (
                          <SelectItem key={voice.name} value={voice.name} className="focus:bg-purple-900/50">
                            <div className="flex flex-col">
                              <span className="font-bold">{voice.name}</span>
                              <span className="text-[10px] opacity-50">{voice.lang}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-zinc-900">
                    <div className="space-y-2">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Passo 1: Salvar Edições</p>
                      <Button className="w-full h-12 rounded-xl font-black uppercase text-xs bg-zinc-800 hover:bg-zinc-700 border-2 border-zinc-700" onClick={saveConfig} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Story'}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Passo 2: Áudio da IA</p>
                      <Button className="w-full h-12 rounded-xl font-black uppercase text-xs bg-zinc-800 hover:bg-zinc-700 border-2 border-zinc-700" onClick={generateAllAudio} disabled={isGeneratingAudio}>
                        {isGeneratingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar Áudio de Locutor'}
                      </Button>
                      {Object.keys(audioUrls).length > 0 && (
                        <p className="text-[8px] text-green-500 font-bold uppercase text-center">✓ Locução pronta para todos os slides</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Passo 3: Finalizar</p>
                      <Button variant="default" className="w-full h-16 rounded-xl font-black uppercase text-xs bg-gradient-to-r from-purple-600 to-blue-600 shadow-xl border-0" onClick={isRecording ? stopRecording : startVideoRecording} disabled={isExporting}>
                        {isRecording ? (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" /> 
                              <span>GERANDO VÍDEO: {Math.round(exportProgress)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-white transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                            </div>
                            <span className="text-[8px] opacity-70 font-normal italic">Não feche esta janela</span>
                          </div>
                        ) : <><Video className="h-6 w-6 mr-2" /> BAIXAR VÍDEO COMPLETO</>}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-4 border-t border-zinc-900">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Testar Preview</p>
                    <div className="flex gap-2">
                      <Button variant={isPlaying ? "destructive" : "outline"} className="flex-1 h-12 rounded-xl font-black uppercase text-xs border-2 border-zinc-800" onClick={handleTogglePlay} disabled={isRecording}>
                        {isPlaying ? <><Pause className="mr-2 h-4 w-4" /> Parar</> : <><Play className="mr-2 h-4 w-4" /> Ouvir</>}
                      </Button>
                      <Button variant="outline" className="w-12 h-12 rounded-xl border-2 border-zinc-800 text-white" onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0 custom-scrollbar max-h-[calc(90vh-60px)]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Sincronização: Atraso da Voz (segundos)</Label>
                      <Slider value={[config.voiceOffset || 0]} min={0} max={2} step={0.1} onValueChange={(val) => setConfig({...config, voiceOffset: val[0]})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Tempo Slide Inicial/Final</Label>
                      <Slider value={[config.introDuration]} min={2} max={15} step={0.5} onValueChange={(val) => setConfig({...config, introDuration: val[0]})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Tempo Slide Produtos</Label>
                      <Slider value={[config.productDuration]} min={1} max={10} step={0.5} onValueChange={(val) => setConfig({...config, productDuration: val[0]})} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest cursor-pointer" htmlFor="show-logo">Exibir Logotipo</Label>
                      <input type="checkbox" id="show-logo" checked={config.showLogo} onChange={(e) => setConfig({...config, showLogo: e.target.checked})} className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-purple-600" />
                    </div>
                    {config.showLogo && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Posição do Logo</Label>
                        <Slider value={[config.logoTop]} min={0} max={200} onValueChange={(val) => setConfig({...config, logoTop: val[0]})} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Posição do Conteúdo</Label>
                      <Slider value={[config.contentTop]} min={100} max={600} onValueChange={(val) => setConfig({...config, contentTop: val[0]})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Cor do Preço</Label>
                        <Input type="color" value={config.priceColor} onChange={(e) => setConfig({...config, priceColor: e.target.value})} className="w-full h-10 p-1 bg-zinc-900 border-zinc-800" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Cor do Nome</Label>
                        <Input type="color" value={config.productNameColor} onChange={(e) => setConfig({...config, productNameColor: e.target.value})} className="w-full h-10 p-1 bg-zinc-900 border-zinc-800" />
                      </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-zinc-900">
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2"><MessageSquare className="h-3 w-3" /> Frases</p>
                      <Textarea value={config.introPhrase} onChange={(e) => setConfig({...config, introPhrase: e.target.value})} className="bg-zinc-900 border-zinc-800 text-white text-xs h-16" placeholder="Introdução" />
                      <Textarea value={config.productPhrase} onChange={(e) => setConfig({...config, productPhrase: e.target.value})} className="bg-zinc-900 border-zinc-800 text-white text-xs h-16" placeholder="Produto" />
                      <Textarea value={config.outroPhrase} onChange={(e) => setConfig({...config, outroPhrase: e.target.value})} className="bg-zinc-900 border-zinc-800 text-white text-xs h-16" placeholder="Encerramento" />
                    </div>
                    <Button className="w-full h-12 rounded-xl font-black uppercase text-xs bg-green-600 hover:bg-green-500" onClick={saveConfig} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Configurações'}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  )
}
