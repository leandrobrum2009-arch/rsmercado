 import { StrictMode } from 'react'
 import ReactDOM from 'react-dom/client'
 import { RouterProvider } from '@tanstack/react-router'
 import { getRouter } from './router'
 import './styles.css'
 
 const router = getRouter()
 
const rootElement = document.getElementById('root')!
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  
  // Remove initial loader after app mounts
  setTimeout(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
      setTimeout(() => loader.remove(), 500);
    }
  }, 100);
}