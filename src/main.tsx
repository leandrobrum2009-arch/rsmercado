// App bootstrap
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

    // Remove quickly
    setTimeout(removeLoader, 200);
    window.addEventListener('load', removeLoader);
    
    // Safety fallback
    setTimeout(removeLoader, 4000);
  }
} catch (error) {
  console.error('Fatal error during app initialization:', error);
  const loader = document.getElementById('initial-loader');
  if (loader) {
    const loaderText = loader.querySelector('.loader-text');
    if (loaderText) loaderText.textContent = 'Erro de carregamento. Tente recarregar.';
    setTimeout(() => {
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
    }, 2000);
  }
}
