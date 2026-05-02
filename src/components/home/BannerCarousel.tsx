 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Link } from '@tanstack/react-router'
 import { Skeleton } from '@/components/ui/skeleton'
 
 export function BannerCarousel() {
   const [banners, setBanners] = useState<any[]>([])
   const [isLoading, setIsLoading] = useState(true)
   const [currentIndex, setCurrentIndex] = useState(0)
 
   useEffect(() => {
      const fetchBanners = async () => {
        try {
          const { data, error } = await supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
          
          if (error) {
            console.error('Error fetching banners:', error)
            // Don't show toast for home page banners to avoid annoying users if table is empty
          }
          setBanners(data || [])
        } catch (err) {
          console.error('Catch fetching banners:', err)
        } finally {
          setIsLoading(false)
        }
      }
     fetchBanners()
   }, [])
 
   useEffect(() => {
     if (banners.length <= 1) return
     const timer = setInterval(() => {
       setCurrentIndex((prev) => (prev + 1) % banners.length)
     }, 5000)
     return () => clearInterval(timer)
   }, [banners.length])
 
   if (isLoading) {
     return <div className="px-4 py-2"><Skeleton className="w-full h-40 rounded-2xl" /></div>
   }
 
   if (banners.length === 0) return null
 
   return (
     <div className="px-4 py-2 relative overflow-hidden">
       <div 
         className="flex transition-transform duration-500 ease-in-out"
         style={{ transform: `translateX(-${currentIndex * 100}%)` }}
       >
         {banners.map((banner) => (
           <div key={banner.id} className="min-w-full">
             {banner.link_url ? (
               <Link to={banner.link_url}>
                 <img 
                   src={banner.image_url} 
                   className="w-full h-40 md:h-64 object-cover rounded-2xl shadow-md" 
                   alt="Banner" 
                 />
               </Link>
             ) : (
               <img 
                 src={banner.image_url} 
                 className="w-full h-40 md:h-64 object-cover rounded-2xl shadow-md" 
                 alt="Banner" 
               />
             )}
           </div>
         ))}
       </div>
       
       {banners.length > 1 && (
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
           {banners.map((_, i) => (
             <div 
               key={i} 
               className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} 
             />
           ))}
         </div>
       )}
     </div>
   )
 }
