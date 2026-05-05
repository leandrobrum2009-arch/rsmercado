 import { Instagram, Play, Heart, MessageCircle, X } from 'lucide-react'
 import { useState } from 'react'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
 import { useStoreSettings } from '@/hooks/useStoreSettings'
 import { Button } from '@/components/ui/button'
 import { motion } from 'framer-motion'
 
  export function InstagramFeed() {
    const { settings } = useStoreSettings()
    const [selectedReel, setSelectedReel] = useState<any>(null)
   
   if (!settings.instagram_url) return null
 
   const postCount = parseInt(settings.instagram_post_count || '6')
 
   const allReels = [
     { id: 1, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=300', likes: '1.2k', comments: '45' },
     { id: 2, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1506484334402-40ff22e05a6d?q=80&w=300', likes: '850', comments: '12' },
     { id: 3, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1607623273562-6338d8503cb6?q=80&w=300', likes: '2.1k', comments: '89' },
     { id: 4, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=300', likes: '940', comments: '23' },
     { id: 5, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=300', likes: '3.4k', comments: '156' },
     { id: 6, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=300', likes: '1.5k', comments: '67' },
     { id: 7, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1571771894821-ad9902510f57?q=80&w=300', likes: '2.8k', comments: '112' },
     { id: 8, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=300', likes: '4.2k', comments: '203' },
     { id: 9, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=300', likes: '1.9k', comments: '54' },
     { id: 10, url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=300', likes: '3.1k', comments: '142' },
   ]
 
   const reels = allReels.slice(0, postCount)
 
   const handleFollow = () => {
     window.open(settings.instagram_url, '_blank')
   }
 
   return (
     <section className="py-12 bg-white overflow-hidden">
       <div className="container mx-auto px-4">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
           <div>
             <div className="flex items-center gap-2 mb-1">
               <Instagram className="text-pink-600" size={20} />
               <span className="text-[10px] font-black uppercase tracking-widest text-pink-600">Nossa Comunidade</span>
             </div>
             <h2 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-900">Siga-nos no Instagram</h2>
             <p className="text-zinc-500 text-sm font-medium">Fique por dentro das ofertas, receitas e bastidores!</p>
           </div>
           <Button 
             onClick={handleFollow}
             className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white font-black uppercase text-[10px] h-10 px-8 rounded-2xl shadow-lg shadow-pink-100 self-start md:self-center"
           >
             @Seguir Agora
           </Button>
         </div>
 
         <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {reels.map((reel) => (
             <motion.div 
               key={reel.id}
               whileHover={{ y: -5 }}
               className="min-w-[200px] md:min-w-[240px] aspect-[9/16] relative rounded-[32px] overflow-hidden group cursor-pointer shadow-xl border-4 border-white"
                onClick={() => setSelectedReel(reel)}
             >
               <img 
                 src={reel.thumbnail} 
                 alt="Instagram Reel" 
                 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
               />
               <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
               
               <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full">
                 <Play size={16} className="text-white fill-white" />
               </div>
 
               <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-between items-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="flex items-center gap-1.5">
                   <Heart size={16} className="fill-white" />
                   <span className="text-xs font-black">{reel.likes}</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <MessageCircle size={16} className="fill-white" />
                   <span className="text-xs font-black">{reel.comments}</span>
                 </div>
               </div>
 
               {/* Instagram Logo Overlay */}
               <div className="absolute top-4 left-4">
                 <Instagram size={14} className="text-white/70" />
               </div>
             </motion.div>
           ))}
         </div>
       </div>
      </section>

      <Dialog open={!!selectedReel} onOpenChange={(open) => !open && setSelectedReel(null)}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-black border-zinc-800 rounded-[32px]">
          <DialogHeader className="sr-only">
            <DialogTitle>Instagram Reel</DialogTitle>
          </DialogHeader>
          {selectedReel && (
            <div className="relative aspect-[9/16] w-full">
              <iframe
                src={`${selectedReel.url.split('?')[0]}embed`}
                className="w-full h-full border-0"
                allowFullScreen
                scrolling="no"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              />
              <div className="absolute top-4 right-4 z-50">
                 <DialogClose asChild>
                   <button className="bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition-colors">
                     <X size={20} />
                   </button>
                 </DialogClose>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <Button 
                  onClick={() => window.open(selectedReel.url, '_blank')}
                  className="w-full bg-white text-black hover:bg-zinc-200 font-black uppercase text-xs rounded-xl h-12"
                >
                  Abrir no Instagram
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    )
  }