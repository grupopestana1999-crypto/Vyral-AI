import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker removido (E23). App nunca foi PWA. SW antigo cacheava bundle
// JS, fazendo deploys novos não chegarem ao cliente sem hard refresh manual.
// public/sw.js virou auto-destruct — clientes que ainda têm SW v1 instalado
// vão limpar na próxima visita e nunca mais re-registrar.
