// App init
import { StrictMode } from 'react'

 import ReactDOM from 'react-dom/client'
 import { RouterProvider } from '@tanstack/react-router'
 import { getRouter } from './router'
 import './styles.css'
 
try {
  const router = getRouter()
  
  const rootElement = document.getElementById('root')!
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )

    
    // Ensure initial loader is removed

    const removeLoader = () => {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        setTimeout(() => {
          if (loader.parentNode) loader.remove();
        }, 500);
      }
    };

    // Remove after a short delay to ensure React has started rendering
    setTimeout(removeLoader, 200);
    // Also remove on window load as a fallback
    window.addEventListener('load', removeLoader);
  }
} catch (error) {
  console.error('Fatal error during app initialization:', error);
  // Fallback to remove loader so user isn't stuck forever
  const loader = document.getElementById('initial-loader');
  if (loader) {
    const loaderText = loader.querySelector('.loader-text');
    if (loaderText) loaderText.textContent = 'Erro ao carregar o aplicativo. Tente recarregar.';
  }
}
