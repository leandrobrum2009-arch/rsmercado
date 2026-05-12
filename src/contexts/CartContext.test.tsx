 import { renderHook, act } from '@testing-library/react';
 import { CartProvider, useCart } from './CartContext';
 import { expect, it, describe, beforeEach, vi } from 'vitest';
 import React from 'react';
 
 const wrapper = ({ children }: { children: React.ReactNode }) => (
   <CartProvider>{children}</CartProvider>
 );
 
 describe('CartContext', () => {
   beforeEach(() => {
     localStorage.clear();
     vi.clearAllMocks();
   });
 
   it('should start with an empty cart', () => {
     const { result } = renderHook(() => useCart(), { wrapper });
     expect(result.current.items).toEqual([]);
     expect(result.current.total).toBe(0);
   });
 
   it('should add a discrete item to the cart', () => {
     const { result } = renderHook(() => useCart(), { wrapper });
     const product = { id: '1', name: 'Product 1', price: 10, points_value: 5, stock: 10 };
 
     act(() => {
       result.current.addToCart(product, 2);
     });
 
     expect(result.current.items).toHaveLength(1);
     expect(result.current.items[0]).toMatchObject({
       id: '1',
       quantity: 2,
       price: 10
     });
     expect(result.current.total).toBe(20);
     expect(result.current.totalPoints).toBe(10);
   });
 
   it('should add a weight-based item to the cart', () => {
     const { result } = renderHook(() => useCart(), { wrapper });
     const product = { 
       id: '2', 
       name: 'Alho', 
       price: 25.00, 
       points_value: 0, 
       is_weight_based: true,
       unit: 'kg',
       stock: 100 
     };
 
     act(() => {
       result.current.addToCart(product, 0.5); // 500g
     });
 
     expect(result.current.items).toHaveLength(1);
     expect(result.current.items[0].quantity).toBe(0.5);
     expect(result.current.total).toBe(12.50);
   });
 
   it('should update quantity correctly', () => {
     const { result } = renderHook(() => useCart(), { wrapper });
     const product = { id: '1', name: 'Product 1', price: 10, points_value: 0, stock: 10 };
 
     act(() => {
       result.current.addToCart(product, 1);
     });
 
     act(() => {
       result.current.updateQuantity('1', 5);
     });
 
     expect(result.current.items[0].quantity).toBe(5);
     expect(result.current.total).toBe(50);
   });
 
   it('should remove item when quantity is set to 0', () => {
     const { result } = renderHook(() => useCart(), { wrapper });
     const product = { id: '1', name: 'Product 1', price: 10, points_value: 0, stock: 10 };
 
     act(() => {
       result.current.addToCart(product, 1);
     });
 
     act(() => {
       result.current.updateQuantity('1', 0);
     });
 
     expect(result.current.items).toHaveLength(0);
   });
 
   it('should not add item if out of stock', () => {
     const { result } = renderHook(() => useCart(), { wrapper });
     const product = { id: '1', name: 'Product 1', price: 10, points_value: 0, stock: 0 };
 
     act(() => {
       result.current.addToCart(product, 1);
     });
 
     expect(result.current.items).toHaveLength(0);
   });
 
   it('should respect stock limits when increasing quantity', () => {
     const { result } = renderHook(() => useCart(), { wrapper });
     const product = { id: '1', name: 'Product 1', price: 10, points_value: 0, stock: 5 };
 
     act(() => {
       result.current.addToCart(product, 3);
     });
 
     act(() => {
       result.current.addToCart(product, 3); // Total would be 6, which is > stock 5
     });
 
     expect(result.current.items[0].quantity).toBe(3); // Should remain 3
   });
 
   it('should respect stock limits in updateQuantity', () => {
     const { result } = renderHook(() => useCart(), { wrapper });
     const product = { id: '1', name: 'Product 1', price: 10, points_value: 0, stock: 5 };
 
     act(() => {
       result.current.addToCart(product, 1);
     });
 
     act(() => {
       result.current.updateQuantity('1', 10); // Attempting to set to 10 when stock is 5
     });
 
     expect(result.current.items[0].quantity).toBe(1); // Should remain 1
   });
 });