import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { logEvent } from './lib/clientDiagnostic'

// E29: capturar JS errors silenciosos que podem matar handlers antes do invoke
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    logEvent('window_error', 'global', {
      msg: String(e.message).slice(0, 200),
      file: e.filename?.slice(-60),
      line: e.lineno,
      col: e.colno,
    })
  })
  window.addEventListener('unhandledrejection', (e) => {
    logEvent('unhandled_rejection', 'global', {
      reason: String(e.reason).slice(0, 200),
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker removido (E23). App nunca foi PWA. SW antigo cacheava bundle
// JS, fazendo deploys novos não chegarem ao cliente sem hard refresh manual.
// public/sw.js virou auto-destruct — clientes que ainda têm SW v1 instalado
// vão limpar na próxima visita e nunca mais re-registrar.
