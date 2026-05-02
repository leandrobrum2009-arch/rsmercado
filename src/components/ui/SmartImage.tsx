import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ImageIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  tableName?: string;
  itemId?: string;
  fallback?: React.ReactNode;
}

export function SmartImage({ src, alt, className, tableName, itemId, fallback, ...props }: SmartImageProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  const handleError = async () => {
    setError(true)
    setLoading(false)
    
    if (tableName && itemId) {
      console.warn(`Media error detected for ${tableName} ID: ${itemId}`)
      // Report to database via RPC
      try {
        await supabase.rpc('report_media_error', { 
          table_name: tableName, 
          item_id: itemId 
        })
      } catch (e) {
        console.error('Failed to report media error:', e)
      }
    }
  }

  if (error || !src) {
    return (
      <div className={cn("bg-muted flex items-center justify-center text-muted-foreground", className)}>
        {fallback || <AlertCircle className="w-1/2 h-1/2 opacity-20" />}
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {loading && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <ImageIcon className="w-8 h-8 opacity-10" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(className, loading ? 'opacity-0' : 'opacity-100')}
        onLoad={() => setLoading(false)}
        onError={handleError}
        {...props}
      />
    </div>
  )
}
