  import React, { createContext, useContext, useState, useEffect } from 'react';
  import { toast } from '@/lib/toast'
 
 interface CartItem {
   id: string;
   name: string;
   price: number;
   image_url: string;
   quantity: number;
   points_value: number;
 }
 
 interface CartContextType {
   items: CartItem[];
   addToCart: (product: any) => void;
   removeFromCart: (productId: string) => void;
   updateQuantity: (productId: string, quantity: number) => void;
   clearCart: () => void;
   total: number;
   totalPoints: number;
 }
 
 const CartContext = createContext<CartContextType | undefined>(undefined);
 
 export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [items, setItems] = useState<CartItem[]>([]);
 
    useEffect(() => {
      if (typeof window !== 'undefined') {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          try {
            setItems(JSON.parse(savedCart));
          } catch (e) {
            console.error('Error parsing cart from localStorage:', e);
          }
        }
      }
    }, []);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(items));
      }
    }, [items]);
 
    const addToCart = (product: any) => {
      if (product.stock !== undefined && product.stock <= 0) {
        toast.error('Produto sem estoque no momento!')
        return
      }

      setItems(prev => {
        const existing = prev.find(i => i.id === product.id);
        if (existing) {
          if (product.stock !== undefined && existing.quantity >= product.stock) {
            toast.error(`Desculpe, só temos ${product.stock} unidades em estoque.`)
            return prev
          }
          return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { ...product, quantity: 1 }];
      });
    };
 
   const removeFromCart = (productId: string) => {
     setItems(prev => prev.filter(i => i.id !== productId));
   };
 
   const updateQuantity = (productId: string, quantity: number) => {
     if (quantity <= 0) {
       removeFromCart(productId);
       return;
     }
     setItems(prev => prev.map(i => i.id === productId ? { ...i, quantity } : i));
   };
 
   const clearCart = () => setItems([]);
 
   const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
   const totalPoints = items.reduce((acc, item) => acc + (item.points_value * item.quantity), 0);
 
   return (
     <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, totalPoints }}>
       {children}
     </CartContext.Provider>
   );
 };
 
 export const useCart = () => {
   const context = useContext(CartContext);
   if (!context) throw new Error('useCart must be used within a CartProvider');
   return context;
 };