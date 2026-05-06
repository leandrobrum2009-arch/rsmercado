 import { Instagram, Play, Heart, MessageCircle, X } from 'lucide-react'
 import { useState } from 'react'
 import { supabase } from '@/lib/supabase'
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
 import { useStoreSettings } from '@/hooks/useStoreSettings'
 import { Button } from '@/components/ui/button'
 import { motion } from 'framer-motion'
 
  export function InstagramFeed() {
    const { settings } = useStoreSettings()
    const [selectedReel, setSelectedReel] = useState<any>(null)
   
   if (!settings.instagram_url && (!settings.instagram_items || settings.instagram_items.length === 0)) return null
 
   const postCount = parseInt(settings.instagram_post_count || '6')
 
   const defaultItems = [
     { id: 1, type: 'reel', url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=300', likes: '1.2k', comments: '45' },
     { id: 2, type: 'post', url: 'https://www.instagram.com/p/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1506484334402-40ff22e05a6d?q=80&w=300', likes: '850', comments: '12' },
     { id: 3, type: 'reel', url: 'https://www.instagram.com/reels/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1607623273562-6338d8503cb6?q=80&w=300', likes: '2.1k', comments: '89' },
     { id: 4, type: 'story', url: 'https://www.instagram.com/stories/highlights/C5oXn8huk3T/', thumbnail: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=300', likes: '940', comments: '23' },
   ]

   const instagramItems = settings.instagram_items || defaultItems;
   const reels = instagramItems.slice(0, postCount);
 
   const handleFollow = async () => {
     const { data: { user } } = await supabase.auth.getUser();
     await supabase.from('site_visits').insert({
       user_id: user?.id || null,
       path: 'action:instagram_follow',
       user_agent: navigator.userAgent
     });
     window.open(settings.instagram_url, '_blank')
   }
 
   return (
     <>
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
               {reel.type === 'reel' ? <Play size={16} className="text-white fill-white" /> : 
                reel.type === 'story' ? <div className="w-4 h-4 rounded-full border-2 border-white" /> :
                <Instagram size={16} className="text-white" />}
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
                   onClick={async () => {
                     const { data: { user } } = await supabase.auth.getUser();
                     await supabase.from('site_visits').insert({
                       user_id: user?.id || null,
                       path: `action:instagram_reel_click:${selectedReel.id}`,
                       user_agent: navigator.userAgent
                     });
                     window.open(selectedReel.url, '_blank');
                   }}
                  className="w-full bg-white text-black hover:bg-zinc-200 font-black uppercase text-xs rounded-xl h-12"
                >
                  Abrir no Instagram
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
       </Dialog>
     </>
   )
  }