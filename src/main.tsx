// App bootstrap
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import './styles.css'

console.log('App initialization starting...');

try {
  const rootElement = document.getElementById('root');
  console.log('Root element:', rootElement);
  
  if (rootElement) {
    const router = getRouter();
    console.log('Router created');
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
    console.log('App rendered to DOM');
    
    const removeLoader = () => {
      console.log('Removing loader...');
      const loader = document.getElementById('initial-loader') as HTMLElement | null;
      if (loader) {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        setTimeout(() => {
          if (loader.parentNode) loader.remove();
          console.log('Loader removed from DOM');
        }, 500);
      }
    };

    // Remove quickly
    setTimeout(removeLoader, 100);
    window.addEventListener('load', removeLoader);
    
    // Safety fallback
    setTimeout(removeLoader, 2000);
  } else {
    console.error('Root element not found!');
  }
} catch (error) {
  console.error('Fatal error during app initialization:', error);
  const loader = document.getElementById('initial-loader') as HTMLElement | null;
  if (loader) {
    const loaderText = loader.querySelector('.loader-text') as HTMLElement | null;
    if (loaderText) {
      loaderText.textContent = 'Erro de carregamento. Tente recarregar.';
      loaderText.style.color = 'red';
    }
  }
}
