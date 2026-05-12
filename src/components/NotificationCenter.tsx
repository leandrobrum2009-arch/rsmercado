 import { useState, useEffect } from 'react'
 import { supabase } from '@/lib/supabase'
 import { subscribeToPush } from '@/lib/webpush'
 import { Bell, BellDot, X, Check, ShoppingBag, Trophy, Tag, Megaphone, Smartphone, Trash2 } from 'lucide-react'
   const getTypeIcon = (type: string) => {
     switch (type) {
       case 'order_status': return <ShoppingBag className="h-4 w-4 text-blue-500" />
       case 'loyalty': return <Trophy className="h-4 w-4 text-yellow-500" />
       case 'promo': return <Tag className="h-4 w-4 text-green-500" />
       case 'admin_msg': return <Megaphone className="h-4 w-4 text-purple-500" />
       default: return <Bell className="h-4 w-4 text-gray-500" />
     }
   }
 
 import { Button } from '@/components/ui/button'
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from '@/components/ui/popover'
 import { ScrollArea } from '@/components/ui/scroll-area'
 import { formatDistanceToNow } from 'date-fns'
 import { ptBR } from 'date-fns/locale'
 import { toast } from '@/lib/toast'
 
 export function NotificationCenter() {
   const [notifications, setNotifications] = useState<any[]>([])
   const [unreadCount, setUnreadCount] = useState(0)
   const [isOpen, setIsOpen] = useState(false)
 
   const handleSubscribe = async () => {
     const success = await subscribeToPush()
     if (success) {
       toast.success('Notificações ativadas!')
     } else {
       toast.error('Erro ao ativar notificações. Verifique as permissões do navegador.')
     }
   }
 
   useEffect(() => {
     const fetchNotifications = async () => {
       const { data: { user } } = await supabase.auth.getUser()
       if (!user) return
 
        const [notifsResult, countResult] = await Promise.all([
          supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
        ]);

        if (notifsResult.error) {
          console.error('Error fetching notifications:', notifsResult.error)
        } else {
          setNotifications(notifsResult.data || [])
        }

        if (!countResult.error) {
          setUnreadCount(countResult.count || 0)
        }
     }
 
     fetchNotifications()
 
      let channel: any;

      const setupSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Use a unique channel name to avoid "already subscribed" errors when mounted twice
        const channelName = `user-notifications-${user.id}-${Math.random().toString(36).substr(2, 9)}`
        
        channel = supabase
          .channel(channelName)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            setNotifications(prev => [payload.new, ...prev].slice(0, 20))
            setUnreadCount(prev => prev + 1)
            toast.info(payload.new.title, {
              description: payload.new.message
            })
          })
          .subscribe()
      }

      setupSubscription()

      return () => {
        if (channel) {
          supabase.removeChannel(channel)
        }
      }
   }, [])
 
   const markAsRead = async (id: string) => {
     const { error } = await supabase
       .from('notifications')
       .update({ is_read: true })
       .eq('id', id)
 
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id))
      const wasUnread = notifications.find(n => n.id === id && !n.is_read)
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      toast.success('Notificação removida')
    }
  }

  const clearAllNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (!confirm('Deseja apagar todas as notificações permanentemente?')) return

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    if (!error) {
      setNotifications([])
      setUnreadCount(0)
      toast.success('Histórico limpo!')
    }
  }
 
   return (
     <Popover open={isOpen} onOpenChange={setIsOpen}>
       <PopoverTrigger asChild>
         <Button variant="ghost" size="icon" className="relative">
           {unreadCount > 0 ? (
             <BellDot className="h-5 w-5 text-primary animate-pulse" />
           ) : (
             <Bell className="h-5 w-5" />
           )}
           {unreadCount > 0 && (
             <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
               {unreadCount}
             </span>
           )}
         </Button>
       </PopoverTrigger>
       <PopoverContent className="w-80 p-0" align="end">
         <div className="flex items-center justify-between p-4 border-b">
           <h4 className="font-semibold">Notificações</h4>
           <div className="flex gap-2">
               <Button variant="outline" size="sm" onClick={handleSubscribe} className="text-[10px] h-7 px-2 border-primary/50 bg-primary/5 hover:bg-primary/10">
                 <Smartphone className="h-3 w-3 mr-1" /> Ativar Push
               </Button>
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllNotifications} className="text-[10px] h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50">
                  Apagar Tudo
                </Button>
              )}
           </div>
         </div>
         <ScrollArea className="h-[400px]">
           {notifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
               <Bell className="h-8 w-8 mb-2 opacity-20" />
               <p className="text-sm">Nenhuma notificação por aqui.</p>
             </div>
           ) : (
             <div className="divide-y">
               {notifications.map((notification) => (
                 <div 
                   key={notification.id} 
                   className={`p-4 transition-colors ${!notification.is_read ? 'bg-muted/50' : ''}`}
                 >
                   <div className="flex justify-between gap-2">
                     <div className="flex items-center gap-2">
                       {getTypeIcon(notification.type)}
                       <p className={`text-sm font-medium ${!notification.is_read ? 'text-primary' : ''}`}>
                         {notification.title}
                       </p>
                     </div>
                      <div className="flex gap-1">
                        {!notification.is_read && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-green-600 hover:bg-green-50" 
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-zinc-300 hover:text-red-500 hover:bg-red-50" 
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                   </div>
                   <p className="text-xs text-muted-foreground mt-1">
                     {notification.message}
                   </p>
                   <p className="text-[10px] text-muted-foreground mt-2">
                     {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                   </p>
                 </div>
               ))}
             </div>
           )}
         </ScrollArea>
       </PopoverContent>
     </Popover>
   )
 }