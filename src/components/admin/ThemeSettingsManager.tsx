import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Save, Palette, Type, Square, RefreshCcw } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ThemeSettingsManager() {
  const [settings, setSettings] = useState<any>({
    colors: {
      primary: '#16a34a',
      secondary: '#facc15',
      background: '#ffffff',
      foreground: '#09090b',
      muted: '#71717a',
      card: '#ffffff',
      border: '#e4e4e7',
      accent: '#f4f4f5'
    },
    radius: 0.625,
    fontFamily: 'sans',
    fontSize: 16,
    lineHeight: 1.5
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchThemeSettings()
  }, [])

  const fetchThemeSettings = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('store_settings').select('*').in('key', ['theme_settings', 'color_palette'])
      
      if (error) throw error

      const newSettings = { ...settings }
      data.forEach((item: any) => {
        if (item.key === 'theme_settings') {
          Object.assign(newSettings, item.value)
        } else if (item.key === 'color_palette') {
          // Fallback for legacy color_palette key
          newSettings.colors.primary = item.value.primary || newSettings.colors.primary
          newSettings.colors.secondary = item.value.secondary || newSettings.colors.secondary
        }
      })
      setSettings(newSettings)
    } catch (err: any) {
      console.error('Error fetching theme settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase.from('store_settings').upsert({
        key: 'theme_settings',
        value: settings
      }, { onConflict: 'key' })

      if (error) throw error

      // Also update legacy color_palette for compatibility
      await supabase.from('store_settings').upsert({
        key: 'color_palette',
        value: { primary: settings.colors.primary, secondary: settings.colors.secondary }
      }, { onConflict: 'key' })

      toast.success('Tema atualizado com sucesso!')
      
      // Apply immediately to current session
      applyTheme(settings)
    } catch (err: any) {
      console.error('Save error:', err)
      toast.error('Erro ao salvar tema: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const applyTheme = (theme: any) => {
    const root = document.documentElement
    root.style.setProperty('--primary', theme.colors.primary)
    root.style.setProperty('--secondary', theme.colors.secondary)
    if (theme.colors.background) root.style.setProperty('--background', theme.colors.background)
    if (theme.colors.foreground) root.style.setProperty('--foreground', theme.colors.foreground)
    if (theme.colors.muted) root.style.setProperty('--muted-foreground', theme.colors.muted)
    if (theme.colors.card) root.style.setProperty('--card', theme.colors.card)
    if (theme.colors.border) root.style.setProperty('--border', theme.colors.border)
    if (theme.colors.accent) root.style.setProperty('--accent', theme.colors.accent)
    if (theme.radius !== undefined) root.style.setProperty('--radius', `${theme.radius}rem`)
    if (theme.fontSize) root.style.setProperty('--base-font-size', `${theme.fontSize}px`)
    
    // Font family
    const fontVal = theme.fontFamily === 'serif' ? 'serif' : theme.fontFamily === 'mono' ? 'monospace' : 'ui-sans-serif, system-ui, sans-serif'
    root.style.setProperty('--font-family', fontVal)
    document.body.style.fontFamily = fontVal
  }

  const resetToDefault = () => {
    setSettings({
      colors: {
        primary: '#16a34a',
        secondary: '#facc15',
        background: '#ffffff',
        foreground: '#09090b',
        muted: '#71717a',
        card: '#ffffff',
        border: '#e4e4e7',
        accent: '#f4f4f5'
      },
      radius: 0.625,
      fontFamily: 'sans',
      fontSize: 16,
      lineHeight: 1.5
    })
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-900">Personalizar Tema</h2>
          <p className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Ajuste as cores e o estilo visual da loja</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setSettings({
                ...settings,
                colors: {
                  ...settings.colors,
                  background: '#ffffff',
                  foreground: '#000000',
                  muted: '#4b5563',
                  border: '#d1d5db'
                }
              })
            }} 
            className="rounded-xl border-zinc-200 font-bold uppercase text-[10px] gap-2"
          >
            Alto Contraste
          </Button>
          <Button variant="outline" onClick={resetToDefault} className="rounded-xl border-zinc-200 font-bold uppercase text-[10px] gap-2">
            <RefreshCcw size={14} /> Resetar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-xl bg-zinc-900 text-white font-bold uppercase text-[10px] gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Salvar Alterações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cores Principais */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-zinc-800 text-sm font-black uppercase tracking-tight">
              <Palette className="h-5 w-5 text-primary" />
              Cores de Destaque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500">Cor Primária</label>
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-lg border border-zinc-200 relative overflow-hidden">
                    <input 
                      type="color" 
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                      value={settings.colors.primary}
                      onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                    />
                    <div className="w-full h-full" style={{ backgroundColor: settings.colors.primary }} />
                  </div>
                  <Input 
                    value={settings.colors.primary}
                    onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                    className="rounded-xl border-zinc-200 h-10 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500">Cor Secundária</label>
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-lg border border-zinc-200 relative overflow-hidden">
                    <input 
                      type="color" 
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                      value={settings.colors.secondary}
                      onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                    />
                    <div className="w-full h-full" style={{ backgroundColor: settings.colors.secondary }} />
                  </div>
                  <Input 
                    value={settings.colors.secondary}
                    onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                    className="rounded-xl border-zinc-200 h-10 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50 space-y-3">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Preview</p>
              <div className="flex gap-2">
                <Button size="sm" className="rounded-xl text-[10px] font-black uppercase" style={{ backgroundColor: settings.colors.primary, color: '#fff' }}>Botão Primário</Button>
                <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-black uppercase border-2" style={{ borderColor: settings.colors.secondary, color: settings.colors.secondary }}>Contorno</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interface */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-zinc-800 text-sm font-black uppercase tracking-tight">
              <Square className="h-5 w-5 text-blue-500" />
              Cores de Interface
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500">Fundo da Página</label>
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-lg border border-zinc-200 relative overflow-hidden">
                    <input 
                      type="color" 
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                      value={settings.colors.background}
                      onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, background: e.target.value } })}
                    />
                    <div className="w-full h-full" style={{ backgroundColor: settings.colors.background }} />
                  </div>
                  <Input 
                    value={settings.colors.background}
                    onChange={(e) => setSettings({ ...settings, colors: { ...settings.colors, background: e.target.value } })}
                    className="rounded-xl border-zinc-200 h-10 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500">Cor do Texto</label>
                <ColorInput 
                  label="Texto Principal" 
                  value={settings.colors.foreground} 
                  onChange={(val) => setSettings({ ...settings, colors: { ...settings.colors, foreground: val } })} 
                />
              </div>
              <div className="space-y-2">
                <ColorInput 
                  label="Texto Secundário (Muted)" 
                  value={settings.colors.muted} 
                  onChange={(val) => setSettings({ ...settings, colors: { ...settings.colors, muted: val } })} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <ColorInput 
                  label="Cor de Fundo" 
                  value={settings.colors.background} 
                  onChange={(val) => setSettings({ ...settings, colors: { ...settings.colors, background: val } })} 
                />
              </div>
              <div className="space-y-2">
                <ColorInput 
                  label="Bordas" 
                  value={settings.colors.border} 
                  onChange={(val) => setSettings({ ...settings, colors: { ...settings.colors, border: val } })} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tipografia e Bordas */}
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-zinc-800 text-sm font-black uppercase tracking-tight">
              <Type className="h-5 w-5 text-purple-500" />
              Tipografia e Estilo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase text-zinc-500">Arredondamento ({settings.radius}rem)</label>
                </div>
                <Slider 
                  value={[settings.radius]} 
                  min={0} 
                  max={2} 
                  step={0.125}
                  onValueChange={(val) => setSettings({ ...settings, radius: val[0] })}
                  className="py-4"
                />
                <div className="flex justify-between text-[8px] font-bold text-zinc-400 uppercase">
                  <span>Quadrado</span>
                  <span>Padrão</span>
                  <span>Muito Redondo</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500">Fonte Principal</label>
                <Select value={settings.fontFamily} onValueChange={(val) => setSettings({ ...settings, fontFamily: val })}>
                  <SelectTrigger className="rounded-xl border-zinc-200 font-bold uppercase text-[10px] h-10 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sans">Sans Serif (Moderna)</SelectItem>
                    <SelectItem value="serif">Serif (Clássica)</SelectItem>
                    <SelectItem value="mono">Monospace (Técnica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase text-zinc-500">Tamanho da Fonte ({settings.fontSize}px)</label>
                </div>
                <Slider 
                  value={[settings.fontSize]} 
                  min={12} 
                  max={20} 
                  step={1}
                  onValueChange={(val) => setSettings({ ...settings, fontSize: val[0] })}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50 space-y-3">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Exemplo Visual</p>
              <div 
                className="p-4 bg-white border shadow-sm transition-all" 
                style={{ 
                  borderRadius: `${settings.radius}rem`,
                  borderColor: settings.colors.border,
                  fontFamily: settings.fontFamily === 'serif' ? 'serif' : settings.fontFamily === 'mono' ? 'monospace' : 'sans-serif'
                }}
              >
                <h4 className="font-bold text-xs uppercase mb-1">Título do Exemplo</h4>
                <p className="text-[10px] text-zinc-500">Este é um exemplo de como os elementos da sua loja ficarão com as configurações atuais.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Preview */}
        <Card className="border-zinc-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
            <CardTitle className="text-zinc-800 text-sm font-black uppercase tracking-tight">Preview Mobile</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex justify-center bg-zinc-100">
            <div className="my-6 mx-auto w-[240px] h-[480px] bg-white rounded-[40px] border-[8px] border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col scale-90 origin-top">
              {/* Status bar */}
              <div className="h-6 bg-zinc-800 w-1/2 mx-auto rounded-b-2xl mb-2" />
              
              {/* App Content */}
              <div className="flex-1 p-3 space-y-3" style={{ backgroundColor: settings.colors.background, fontFamily: settings.fontFamily === 'serif' ? 'serif' : settings.fontFamily === 'mono' ? 'monospace' : 'sans-serif' }}>
                <div className="h-8 rounded-lg w-3/4 bg-zinc-100" />
                <div className="h-24 rounded-2xl w-full" style={{ backgroundColor: settings.colors.primary }} />
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-square bg-white border p-2 shadow-sm" style={{ borderRadius: `${settings.radius}rem`, borderColor: settings.colors.border }}>
                      <div className="w-full h-2/3 bg-zinc-100 rounded-lg mb-2" />
                      <div className="w-full h-2 bg-zinc-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="h-12 bg-white border-t flex justify-around items-center px-4">
                <div className="w-6 h-6 rounded-full bg-zinc-100" />
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: settings.colors.primary }} />
                <div className="w-6 h-6 rounded-full bg-zinc-100" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ColorInput({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-zinc-500">{label}</label>
      <div className="flex gap-2">
        <div className="w-10 h-10 rounded-lg border border-zinc-200 relative overflow-hidden flex-shrink-0">
          <input 
            type="color" 
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="w-full h-full" style={{ backgroundColor: value }} />
        </div>
        <Input 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border-zinc-200 h-10 font-mono text-xs"
        />
      </div>
    </div>
  )
}