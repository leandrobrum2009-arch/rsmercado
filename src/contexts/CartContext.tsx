  import React, { createContext, useContext, useState, useEffect } from 'react';
  import { toast } from '@/lib/toast'
 
 export interface CartItem {
   id: string;
   name: string;
   price: number;
   image_url: string;
   quantity: number;
   points_value: number;
   unit?: string;
   is_weight_based?: boolean;
   stock?: number;
 }
 
 interface CartContextType {
   items: CartItem[];
   addToCart: (product: any, quantity?: number) => void;
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
 
    const addToCart = (product: any, requestedQuantity?: number) => {
      if (product.stock !== undefined && product.stock <= 0) {
        toast.error('Produto sem estoque no momento!')
        return
      }

      const quantityToAdd = requestedQuantity !== undefined ? requestedQuantity : 1;

      setItems(prev => {
        const existing = prev.find(i => i.id === product.id);
        if (existing) {
          const newQuantity = existing.quantity + quantityToAdd;
          
          if (product.stock !== undefined && newQuantity > product.stock) {
            toast.error(`Desculpe, só temos ${product.stock} unidades em estoque.`)
            return prev
          }
          return prev.map(i => i.id === product.id ? { ...i, quantity: newQuantity } : i);
        }
        return [...prev, { ...product, quantity: quantityToAdd }];
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
 
      setItems(prev => prev.map(i => {
        if (i.id === productId) {
          if (i.stock !== undefined && quantity > i.stock) {
            toast.error(`Desculpe, só temos ${i.stock} ${i.is_weight_based ? 'kg' : (i.unit || 'un')} em estoque.`);
            return i;
          }
          return { ...i, quantity };
        }
        return i;
      }));
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