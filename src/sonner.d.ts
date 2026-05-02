declare module 'sonner' {
  import * as React from 'react';
  export interface ToasterProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
    hotkey?: string[];
    richColors?: boolean;
    expand?: boolean;
    duration?: number;
    visibleToasts?: number;
    closeButton?: boolean;
    className?: string;
    style?: React.CSSProperties;
    offset?: string | number;
    dir?: 'rtl' | 'ltr' | 'auto';
  }
  export const Toaster: React.FC<ToasterProps>;
  export const toast: {
    (message: string | React.ReactNode, data?: any): string | number;
    success: (message: string | React.ReactNode, data?: any) => string | number;
    info: (message: string | React.ReactNode, data?: any) => string | number;
    warning: (message: string | React.ReactNode, data?: any) => string | number;
    error: (message: string | React.ReactNode, data?: any) => string | number;
    custom: (jsx: (id: string | number) => React.ReactNode, data?: any) => string | number;
    dismiss: (id?: string | number) => string | number;
    promise: <T>(promise: Promise<T> | (() => Promise<T>), data?: any) => Promise<T>;
  };
}
