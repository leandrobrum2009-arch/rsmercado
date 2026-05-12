 import '@testing-library/react';
 import { vi } from 'vitest';
 
 // Mock localStorage
 const localStorageMock = {
   getItem: vi.fn(),
   setItem: vi.fn(),
   clear: vi.fn(),
   removeItem: vi.fn(),
   length: 0,
   key: vi.fn(),
 };
 global.localStorage = localStorageMock as any;
 
 // Mock toast
 vi.mock('@/lib/toast', () => ({
   toast: {
     success: vi.fn(),
     error: vi.fn(),
     info: vi.fn(),
     warning: vi.fn(),
   },
 }));